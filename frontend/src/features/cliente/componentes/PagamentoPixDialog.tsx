import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, CheckCircle2, Clock, Copy, ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Botao } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { confirmarPixDemo, consultarStatusPix, criarCobrancaPix, type CobrancaPix } from '../../../services/pagamento';
import s from './PagamentoPixDialog.module.css';

interface Props {
  aberto: boolean;
  valor: number;
  descricao: string;
  referencia?: string;
  detalhe?: string;
  finalizando?: boolean;
  onFechar: () => void;
  onAprovado: (idPagamento: string) => void;
}

/**
 * Modal de pagamento PIX com QR Code real (Mercado Pago API ou BR Code EMVCo demonstração),
 * timer de expiração e polling automático enquanto aguarda a confirmação do pagamento.
 */
export function PagamentoPixDialog({
  aberto, valor, descricao, referencia, detalhe, finalizando = false, onFechar, onAprovado,
}: Props) {
  const tituloId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const aprovadoDisparado = useRef(false);

  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [status, setStatus] = useState<'CARREGANDO' | 'PENDENTE' | 'APROVADO' | 'EXPIRADO' | 'ERRO'>('CARREGANDO');
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(300);
  const [verificando, setVerificando] = useState(false);
  const [simulando, setSimulando] = useState(false);

  const gerar = useCallback(async () => {
    aprovadoDisparado.current = false;
    setStatus('CARREGANDO');
    setErro(null);
    setCobranca(null);
    setCopiado(false);
    try {
      const dados = await criarCobrancaPix({ valor, descricao, referencia });
      setCobranca(dados);
      const restante = Math.max(0, Math.floor((new Date(dados.expiraEm).getTime() - Date.now()) / 1000));
      setSegundosRestantes(restante || 300);
      setStatus(dados.status === 'APROVADO' ? 'APROVADO' : 'PENDENTE');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível gerar o QR Code Pix agora.');
      setStatus('ERRO');
    }
  }, [valor, descricao, referencia]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (aberto) {
      if (!el.open) el.showModal?.();
      void gerar();
    } else if (el.open) {
      el.close();
    }
  }, [aberto, gerar]);

  // Contador regressivo de expiração do QR Code
  useEffect(() => {
    if (!aberto || status !== 'PENDENTE') return;
    const t = setInterval(() => {
      setSegundosRestantes((atual) => {
        if (atual <= 1) {
          setStatus('EXPIRADO');
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [aberto, status]);

  const dispararAprovacao = useCallback((idPagamento: string) => {
    if (aprovadoDisparado.current) return;
    aprovadoDisparado.current = true;
    setStatus('APROVADO');
    setTimeout(() => onAprovado(idPagamento), 700);
  }, [onAprovado]);

  // Polling automático de confirmação de pagamento a cada 3s
  useEffect(() => {
    if (!aberto || status !== 'PENDENTE' || !cobranca) return;
    const t = setInterval(async () => {
      try {
        const res = await consultarStatusPix(cobranca.id);
        if (res.status === 'APROVADO') dispararAprovacao(cobranca.id);
        else if (res.status === 'EXPIRADO') setStatus('EXPIRADO');
      } catch { /* tenta novamente no próximo ciclo */ }
    }, 3000);
    return () => clearInterval(t);
  }, [aberto, status, cobranca, dispararAprovacao]);

  async function copiarCodigo() {
    if (!cobranca?.qrCode) return;
    try {
      await navigator.clipboard.writeText(cobranca.qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* fallback silencioso */ }
  }

  async function verificarAgora() {
    if (!cobranca) return;
    setVerificando(true);
    setErro(null);
    try {
      const res = await consultarStatusPix(cobranca.id);
      if (res.status === 'APROVADO') dispararAprovacao(cobranca.id);
      else if (res.status === 'EXPIRADO') setStatus('EXPIRADO');
      else setErro('Pagamento ainda não identificado. Aguarde alguns segundos após pagar no app do seu banco.');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível verificar agora.');
    } finally {
      setVerificando(false);
    }
  }

  async function simularPagamento() {
    if (!cobranca) return;
    setSimulando(true);
    setErro(null);
    try {
      const res = await confirmarPixDemo(cobranca.id);
      if (res.status === 'APROVADO') dispararAprovacao(cobranca.id);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível confirmar o pagamento.');
    } finally {
      setSimulando(false);
    }
  }

  const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
  const ss = String(segundosRestantes % 60).padStart(2, '0');

  return (
    <dialog ref={dialogRef} className={s.dialogo} aria-labelledby={tituloId} onCancel={(e) => { if (finalizando || status === 'APROVADO') e.preventDefault(); else onFechar(); }}
      onClose={() => { if (aberto) onFechar(); }}>
      <div className={s.corpo}>
        <header className={s.cabeca}>
          <div>
            <div className={s.selos}>
              <span className={s.seloPix}>PIX</span>
              <span className={s.seloGateway}>
                {cobranca?.modo === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Gateway Mercado Pago · Modo demo'}
              </span>
            </div>
            <h1 id={tituloId} className={s.titulo}>Pague com <span className="script">Pix</span></h1>
          </div>
          {!finalizando && status !== 'APROVADO' && (
            <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar pagamento Pix">
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

        {status === 'CARREGANDO' && (
          <div className={s.estadoCentro} role="status">
            <Loader2 size={32} className={s.girar} aria-hidden />
            <p>Gerando QR Code Pix...</p>
          </div>
        )}

        {status === 'ERRO' && (
          <div className={s.estadoCentro} role="alert">
            <p className={s.erroTexto}>{erro}</p>
            <Botao onClick={() => void gerar()} iconeEsquerda={<RefreshCw size={15} aria-hidden />}>Tentar novamente</Botao>
          </div>
        )}

        {status === 'EXPIRADO' && (
          <div className={s.estadoCentro} role="status">
            <Clock size={32} aria-hidden />
            <p className={s.expiradoTitulo}>Este código Pix expirou</p>
            <p className={s.expiradoSub}>Gere um novo QR Code para concluir o pagamento.</p>
            <Botao onClick={() => void gerar()} iconeEsquerda={<RefreshCw size={15} aria-hidden />}>Gerar novo QR Code</Botao>
          </div>
        )}

        {status === 'APROVADO' && (
          <div className={s.aprovado} role="status" aria-live="polite">
            <span className={s.aprovadoIcone} aria-hidden><CheckCircle2 size={44} /></span>
            <h2>Pagamento aprovado!</h2>
            <p>{finalizando ? 'Registrando seu pedido e enviando para o restaurante...' : 'Confirmando seus dados...'}</p>
          </div>
        )}

        {status === 'PENDENTE' && cobranca && (
          <>
            <div className={s.aguardando} role="status" aria-live="polite">
              <span className={s.pulso} aria-hidden />
              <span>Aguardando pagamento...</span>
              <span className={s.timer}><Clock size={13} aria-hidden /> {mm}:{ss}</span>
            </div>

            <div className={s.qrBloco}>
              <div className={s.qrMoldura}>
                {cobranca.qrCodeBase64 ? (
                  <img src={`data:image/png;base64,${cobranca.qrCodeBase64}`} alt="QR Code Pix para pagamento" width={200} height={200} />
                ) : (
                  <QRCodeSVG value={cobranca.qrCode} size={200} level="M" bgColor="#FFFFFF" fgColor="#1A2E1A" />
                )}
              </div>
              <ol className={s.passos}>
                <li>Abra o app do seu banco e escolha <strong>Pix → Pagar com QR Code</strong>.</li>
                <li>Aponte a câmera para o código ou copie o <strong>Pix Copia e Cola</strong> abaixo.</li>
                <li>Assim que você pagar, esta tela confirma automaticamente.</li>
              </ol>
            </div>

            <div className={s.copiaCola}>
              <label htmlFor="pix-brcode" className={s.copiaRotulo}>Pix Copia e Cola</label>
              <div className={s.copiaLinha}>
                <input id="pix-brcode" type="text" readOnly value={cobranca.qrCode} className={s.copiaInput} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className={`${s.copiaBtn} ${copiado ? s.copiaBtnOk : ''}`} onClick={copiarCodigo} autoFocus>
                  {copiado ? <><Check size={15} aria-hidden /> Copiado</> : <><Copy size={15} aria-hidden /> Copiar</>}
                </button>
              </div>
            </div>

            {erro && <p className={s.avisoErro} role="alert">{erro}</p>}

            <div className={s.acoes}>
              {cobranca.modo === 'MERCADO_PAGO' ? (
                <>
                  {cobranca.ticketUrl && (
                    <a href={cobranca.ticketUrl} target="_blank" rel="noreferrer" className={s.linkMp}>
                      Abrir no Mercado Pago <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                  <Botao carregando={verificando} onClick={verificarAgora}>Já paguei · verificar agora</Botao>
                </>
              ) : (
                <>
                  <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
                  <Botao carregando={simulando} onClick={simularPagamento} iconeEsquerda={<Check size={16} aria-hidden />}>
                    Simular pagamento aprovado
                  </Botao>
                </>
              )}
            </div>

            <p className={s.rodapeSeguro}>
              <ShieldCheck size={14} aria-hidden />
              {cobranca.modo === 'MERCADO_PAGO'
                ? 'Cobrança processada via Mercado Pago API com validação em tempo real.'
                : 'Ambiente acadêmico: BR Code EMVCo válido. Configure MERCADOPAGO_ACCESS_TOKEN no servidor para cobrança real.'}
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
