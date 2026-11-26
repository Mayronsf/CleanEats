import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Botao } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import {
  buscarConfigPagamento, processarPagamentoCartao, type ConfigGatewayPagamento, type PagamentoCartaoRes,
} from '../../../services/pagamento';
import s from './PagamentoCartaoDialog.module.css';

interface Props {
  aberto: boolean;
  valor: number;
  descricao: string;
  detalhe?: string;
  referencia?: string;
  maxParcelas?: number;
  finalizando?: boolean;
  onFechar: () => void;
  onAprovado: (res: PagamentoCartaoRes) => void;
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => {
      createCardToken: (dados: {
        cardNumber: string;
        cardholderName: string;
        cardExpirationMonth: string;
        cardExpirationYear: string;
        securityCode: string;
        identificationType: string;
        identificationNumber: string;
      }) => Promise<{ id: string }>;
    };
  }
}

function detectarBandeira(digitos: string): { id: string; rotulo: string } {
  if (/^4/.test(digitos)) return { id: 'visa', rotulo: 'Visa' };
  if (/^(5[1-5]|2[2-7])/.test(digitos)) return { id: 'master', rotulo: 'Mastercard' };
  if (/^(34|37)/.test(digitos)) return { id: 'amex', rotulo: 'Amex' };
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|651|655)/.test(digitos)) return { id: 'elo', rotulo: 'Elo' };
  if (/^(606282|3841)/.test(digitos)) return { id: 'hipercard', rotulo: 'Hipercard' };
  return { id: 'visa', rotulo: 'Cartão' };
}

function formatarNumeroCartao(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatarValidade(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function formatarCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}

async function carregarSdkMercadoPago(): Promise<void> {
  if (window.MercadoPago) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));
    document.head.appendChild(script);
  });
}

/**
 * Modal de pagamento com Cartão de Crédito integrado à API do Mercado Pago (/v1/payments).
 * Segue boas práticas de autofill (`cc-number`, `cc-name`, `cc-exp`, `cc-csc`), dicas acima do campo
 * e tokenização client-side com MercadoPago.js v2 quando MERCADOPAGO_PUBLIC_KEY está configurada.
 */
export function PagamentoCartaoDialog({
  aberto, valor, descricao, detalhe, referencia, maxParcelas = 3, finalizando = false, onFechar, onAprovado,
}: Props) {
  const tituloId = useId();
  const expHintId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [config, setConfig] = useState<ConfigGatewayPagamento>({ modo: 'SIMULADO', publicKey: null });
  const [numero, setNumero] = useState('');
  const [titular, setTitular] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [aprovado, setAprovado] = useState<PagamentoCartaoRes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (aberto) {
      setAprovado(null);
      setErro(null);
      setEnviando(false);
      if (!el.open) el.showModal?.();
      buscarConfigPagamento().then(setConfig).catch(() => setConfig({ modo: 'SIMULADO', publicKey: null }));
    } else if (el.open) {
      el.close();
    }
  }, [aberto]);

  const digitos = numero.replace(/\D/g, '');
  const bandeira = detectarBandeira(digitos);

  function preencherCartaoTeste() {
    setNumero('4532 1488 0343 6467');
    setTitular('MARIA OLIVEIRA');
    setValidade('12/29');
    setCvv('345');
    setCpf('123.456.789-09');
    setErro(null);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (digitos.length < 13 || digitos.length > 16) {
      setErro('Informe um número de cartão válido (13 a 16 dígitos).');
      return;
    }
    if (titular.trim().length < 3) {
      setErro('Informe o nome completo impresso no cartão.');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validade)) {
      setErro('Validade inválida. Use o formato MM/AA.');
      return;
    }
    const cvvLimpo = cvv.replace(/\D/g, '');
    if (cvvLimpo.length < 3 || cvvLimpo.length > 4) {
      setErro('Informe o código de segurança (3 ou 4 dígitos).');
      return;
    }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErro('Informe o CPF do titular (11 dígitos).');
      return;
    }

    setEnviando(true);
    try {
      let tokenMp: string | undefined;
      if (config.modo === 'MERCADO_PAGO' && config.publicKey) {
        await carregarSdkMercadoPago();
        const mp = new window.MercadoPago!(config.publicKey, { locale: 'pt-BR' });
        const [mes, ano] = validade.split('/');
        const tok = await mp.createCardToken({
          cardNumber: digitos,
          cardholderName: titular.trim(),
          cardExpirationMonth: mes!,
          cardExpirationYear: `20${ano}`,
          securityCode: cvvLimpo,
          identificationType: 'CPF',
          identificationNumber: cpfLimpo,
        });
        tokenMp = tok.id;
      }

      const res = await processarPagamentoCartao({
        valor,
        descricao,
        referencia,
        token: tokenMp,
        paymentMethodId: bandeira.id,
        parcelas,
        ultimos4: digitos.slice(-4),
        titular: titular.trim(),
        cpf: cpfLimpo,
        validade,
        cvv: tokenMp ? undefined : cvvLimpo,
      });

      if (res.status === 'REJEITADO') {
        setErro(res.detalheStatus || 'Cartão recusado pela operadora.');
        setEnviando(false);
        return;
      }

      setAprovado(res);
      setTimeout(() => onAprovado(res), 750);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : (err instanceof Error ? err.message : 'Não foi possível processar o cartão agora.'));
      setEnviando(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={s.dialogo}
      aria-labelledby={tituloId}
      onCancel={(e) => { if (enviando || finalizando || aprovado) e.preventDefault(); else onFechar(); }}
      onClose={() => { if (aberto) onFechar(); }}
    >
      <div className={s.corpo}>
        <header className={s.cabeca}>
          <div>
            <div className={s.selos}>
              <span className={s.seloCartao}><CreditCard size={12} aria-hidden /> CARTÃO</span>
              <span className={s.seloGateway}>
                {config.modo === 'MERCADO_PAGO' ? 'Mercado Pago · Tokenizado' : 'Gateway Mercado Pago · Modo demo'}
              </span>
            </div>
            <h1 id={tituloId} className={s.titulo}>Pague com <span className="script">cartão</span></h1>
          </div>
          {!enviando && !finalizando && !aprovado && (
            <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar pagamento no cartão">
              <X size={18} aria-hidden />
            </button>
          )}
        </header>

        <div className={s.resumoValor}>
          <div>
            <p className={s.resumoDesc}>{descricao}</p>
            {detalhe && <p className={s.resumoDetalhe}>{detalhe}</p>}
          </div>
          <p className={s.valor}>{formatarMoeda(valor)}</p>
        </div>

        {aprovado ? (
          <div className={s.aprovado} role="status" aria-live="polite">
            <span className={s.aprovadoIcone} aria-hidden><CheckCircle2 size={44} /></span>
            <h2>Cartão aprovado!</h2>
            <p>{aprovado.detalheStatus} · {bandeira.rotulo} final {aprovado.ultimos4} ({aprovado.parcelas}×)</p>
            {aprovado.codigoAutorizacao && <span className={s.authTag}>Autorização {aprovado.codigoAutorizacao}</span>}
          </div>
        ) : (
          <form className={s.form} onSubmit={enviar}>
            {/* Prévia visual do cartão */}
            <div className={s.cartaoVisual} aria-hidden="true">
              <div className={s.cartaoTopo}>
                <span className={s.chip} />
                <span className={s.bandeira}>{bandeira.rotulo}</span>
              </div>
              <p className={s.cartaoNum}>{numero || '•••• •••• •••• ••••'}</p>
              <div className={s.cartaoBase}>
                <span><small>Titular</small><strong>{titular.trim().toUpperCase() || 'NOME NO CARTÃO'}</strong></span>
                <span><small>Validade</small><strong>{validade || 'MM/AA'}</strong></span>
              </div>
            </div>

            {config.modo !== 'MERCADO_PAGO' && (
              <button type="button" className={s.btnTeste} onClick={preencherCartaoTeste}>
                <Sparkles size={14} aria-hidden /> Preencher cartão de teste
              </button>
            )}

            <div className={s.campo}>
              <label htmlFor="cc-number">Número do cartão</label>
              <input
                id="cc-number"
                name="cc-number"
                type="text"
                autoComplete="cc-number"
                inputMode="numeric"
                enterKeyHint="next"
                maxLength={19}
                pattern="[\d ]{13,19}"
                placeholder="0000 0000 0000 0000"
                value={numero}
                onChange={(e) => setNumero(formatarNumeroCartao(e.target.value))}
                required
                autoFocus
              />
            </div>

            <div className={s.campo}>
              <label htmlFor="cc-name">Nome impresso no cartão</label>
              <input
                id="cc-name"
                name="cc-name"
                type="text"
                autoComplete="cc-name"
                enterKeyHint="next"
                maxLength={50}
                placeholder="Como aparece no cartão"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                required
              />
            </div>

            <div className={s.linha2}>
              <div className={s.campo}>
                <label htmlFor="cc-exp">Validade</label>
                <span id={expHintId} className={s.dicaAcima}>Formato: MM/AA</span>
                <input
                  id="cc-exp"
                  name="cc-exp"
                  type="text"
                  autoComplete="cc-exp"
                  aria-describedby={expHintId}
                  inputMode="numeric"
                  enterKeyHint="next"
                  maxLength={5}
                  placeholder="12/29"
                  value={validade}
                  onChange={(e) => setValidade(formatarValidade(e.target.value))}
                  required
                />
              </div>

              <div className={s.campo}>
                <label htmlFor="cc-csc">Código de segurança (CVV)</label>
                <span className={s.dicaAcima}>3 ou 4 dígitos no verso</span>
                <input
                  id="cc-csc"
                  name="cc-csc"
                  type="text"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  enterKeyHint="next"
                  maxLength={4}
                  pattern="[0-9]{3,4}"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
              </div>
            </div>

            <div className={s.linha2}>
              <div className={s.campo}>
                <label htmlFor="cc-cpf">CPF do titular</label>
                <input
                  id="cc-cpf"
                  name="cpf"
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  required
                />
              </div>

              <div className={s.campo}>
                <label htmlFor="cc-parcelas">Parcelamento</label>
                <select id="cc-parcelas" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}× de {formatarMoeda(valor / n)} sem juros
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {erro && <p className={s.erro} role="alert">{erro}</p>}

            <div className={s.acoes}>
              <Botao variante="secundario" type="button" onClick={onFechar} disabled={enviando || finalizando}>
                Voltar
              </Botao>
              <Botao type="submit" carregando={enviando || finalizando} iconeEsquerda={<Lock size={15} aria-hidden />}>
                Pagar {formatarMoeda(valor)} no cartão
              </Botao>
            </div>

            <p className={s.rodapeSeguro}>
              <ShieldCheck size={14} aria-hidden />
              {config.modo === 'MERCADO_PAGO'
                ? 'Cartão tokenizado diretamente pelo SDK Mercado Pago (PCI DSS). Nenhum dado bruto passa pelo servidor.'
                : 'Gateway Mercado Pago pronto: configure MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PUBLIC_KEY para cobrança real.'}
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
