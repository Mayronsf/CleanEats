import { useEffect, useRef, useState } from 'react';
import { CreditCard, QrCode, X } from 'lucide-react';
import { Botao } from '../../design-system';
import { formatarMoeda } from '../../lib/formato';
import { ErroApi } from '../../services/api';
import { assinarPlano, type Ciclo, type FormaPagamento, type Tier } from '../../services/planos';
import s from './ConfirmarAssinatura.module.css';

/**
 * Confirmação da assinatura (CE-15). O pagamento é SIMULADO nesta versão: aprova na hora e gera a fatura.
 * Ação protegida (cobrança) → diálogo com foco preso.
 */
export function ConfirmarAssinatura({ tier, ciclo, onFechar, onConcluido }: {
  tier: Tier; ciclo: Ciclo; onFechar: () => void; onConcluido: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => { dialogo.current?.showModal?.(); }, []);

  const valor = ciclo === 'ANUAL' ? Number(tier.precoAnual) : Number(tier.precoMensal);

  async function confirmar() {
    setErro(undefined);
    setEnviando(true);
    try {
      await assinarPlano(tier.codigo, ciclo, forma);
      onConcluido();
    } catch (e) {
      setErro(e instanceof ErroApi && e.status !== 404
        ? e.message
        : 'Não foi possível concluir a assinatura agora. Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <dialog ref={dialogo} className={s.dialogo} onClose={onFechar} aria-labelledby="assinatura-titulo">
      <div className={s.corpo}>
        <header className={s.cabeca}>
          <h2 id="assinatura-titulo">Assinar o plano <span className="script">{tier.nome}</span></h2>
          <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
        </header>
        <dl className={s.resumo}>
          <div><dt>Plano</dt><dd>{tier.nome} · {ciclo === 'ANUAL' ? 'anual' : 'mensal'}</dd></div>
          <div><dt>Valor</dt><dd>{formatarMoeda(valor)}{ciclo === 'ANUAL' ? '/ano' : '/mês'}</dd></div>
          <div><dt>Teste grátis</dt><dd>7 dias — cancele sem custo</dd></div>
        </dl>
        <fieldset className={s.formas}>
          <legend>Forma de pagamento</legend>
          {([['PIX', 'PIX', 'Aprovação instantânea', QrCode], ['CARTAO', 'Cartão de crédito', 'Visa, Mastercard', CreditCard]] as const).map(([v, rotulo, sub, Icone]) => (
            <label key={v} className={`${s.forma} ${forma === v ? s.formaAtiva : ''}`}>
              <input type="radio" name="forma" value={v} checked={forma === v} onChange={() => setForma(v)} />
              <Icone size={20} aria-hidden />
              <span><strong>{rotulo}</strong>{sub}</span>
            </label>
          ))}
        </fieldset>
        <p className={s.aviso}>Ambiente de demonstração: o pagamento é aprovado na hora e a fatura aparece em Minha assinatura.</p>
        {erro && <p className={s.erro} role="alert">{erro}</p>}
        <div className={s.acoes}>
          <Botao variante="secundario" onClick={onFechar}>Voltar</Botao>
          <Botao carregando={enviando} onClick={confirmar}>Confirmar assinatura</Botao>
        </div>
      </div>
    </dialog>
  );
}
