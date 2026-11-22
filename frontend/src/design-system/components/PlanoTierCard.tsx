import { Check, Crown, Leaf, Sparkles, X, Zap } from 'lucide-react';
import { Botao } from './Botao';
import s from './PlanoTierCard.module.css';

export type CodigoTier = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';

export interface PlanoTier {
  codigo: CodigoTier;
  nome: string;
  descricao: string;
  precoMensal: number;
  precoAnual: number;
  inclui: string[];
  naoInclui: string[];
  tituloInclui: string;
  cta: string;
  etiqueta?: string;
}

const ICONES = { FREE: Leaf, BASIC: Zap, PRO: Sparkles, PREMIUM: Crown } as const;

export function PlanoTierCard({ plano, ciclo, atual = false, carregando = false, onAssinar }: {
  plano: PlanoTier; ciclo: 'MENSAL' | 'ANUAL'; atual?: boolean; carregando?: boolean; onAssinar?: () => void;
}) {
  const Icone = ICONES[plano.codigo];
  const gratis = plano.precoMensal === 0;
  const valorMes = ciclo === 'ANUAL' ? plano.precoAnual / 12 : plano.precoMensal;
  const [reais, centavos] = valorMes.toFixed(2).split('.');
  const classe = [s.plano, plano.codigo === 'PRO' && s.recomendado, plano.codigo === 'PREMIUM' && s.premium].filter(Boolean).join(' ');

  return (
    <article className={classe} aria-label={`Plano ${plano.nome}`}>
      {plano.etiqueta && <span className={s.etiqueta}>{plano.etiqueta}</span>}
      <header className={s.cabeca}>
        <span className={`${s.icone} ${s[`icone-${plano.codigo}`]}`} aria-hidden><Icone size={26} /></span>
        <h3 className={s.nome}>{plano.nome}</h3>
        <p className={s.descricao}>{plano.descricao}</p>
      </header>
      <div className={s.preco}>
        {gratis ? (
          <p className={s.linhaPreco}><span className={`${s.num} ${s.gratis}`}>R$ 0</span><span className={s.periodo}>/mês</span></p>
        ) : (
          <p className={s.linhaPreco}>
            <span className={s.moeda}>R$</span><span className={s.num}>{reais}</span><span className={s.centavos}>,{centavos}</span><span className={s.periodo}>/mês</span>
          </p>
        )}
        <p className={s.notaPreco}>
          {gratis ? 'Para sempre · Sem cartão'
            : ciclo === 'ANUAL'
              ? `R$ ${plano.precoAnual.toFixed(2).replace('.', ',')}/ano · cobrado anualmente`
              : `ou R$ ${(plano.precoAnual / 12).toFixed(2).replace('.', ',')}/mês no anual`}
        </p>
      </div>
      <p className={s.secao}>{plano.tituloInclui}</p>
      <ul className={s.recursos}>
        {plano.inclui.map((r) => <li key={r} className={s.recurso}><Check size={16} aria-hidden className={s.sim} />{r}</li>)}
      </ul>
      {plano.naoInclui.length > 0 && (
        <>
          <p className={s.secao}>Não inclui</p>
          <ul className={s.recursos}>
            {plano.naoInclui.map((r) => <li key={r} className={`${s.recurso} ${s.ausente}`}><X size={16} aria-hidden />{r}</li>)}
          </ul>
        </>
      )}
      <Botao
        className={s.botao}
        variante={plano.codigo === 'PRO' ? 'primario' : plano.codigo === 'PREMIUM' ? 'escuro' : 'secundario'}
        larguraTotal carregando={carregando} disabled={atual} onClick={onAssinar}
      >
        {atual ? 'Seu plano atual' : plano.cta}
      </Botao>
    </article>
  );
}
