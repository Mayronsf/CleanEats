import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { partesPreco } from '../../lib/formato';
import s from './Basicos.module.css';

/* ---------- Badge (status em pílula) ---------- */
export type TomBadge = 'novo' | 'preparo' | 'pronto' | 'entregue' | 'perigo' | 'neutro' | 'destaque' | 'ouro';

export function Badge({ tom = 'neutro', children }: { tom?: TomBadge; children: ReactNode }) {
  return <span className={`${s.badge} ${s[`tom-${tom}`]}`}>{children}</span>;
}

/** Mapeia StatusPedido / StatusAprovacao / StatusPrato da API para o tom e o texto exibidos. */
export const STATUS_VISUAL: Record<string, { tom: TomBadge; rotulo: string }> = {
  NOVO: { tom: 'novo', rotulo: 'Novo' },
  ACEITO: { tom: 'novo', rotulo: 'Aceito' },
  PREPARANDO: { tom: 'preparo', rotulo: 'Preparando' },
  PRONTO: { tom: 'pronto', rotulo: 'Pronto' },
  A_CAMINHO: { tom: 'preparo', rotulo: 'A caminho' },
  ENTREGUE: { tom: 'entregue', rotulo: 'Entregue' },
  RECUSADO: { tom: 'perigo', rotulo: 'Recusado' },
  CANCELADO: { tom: 'perigo', rotulo: 'Cancelado' },
  PENDENTE: { tom: 'preparo', rotulo: 'Pendente' },
  APROVADO: { tom: 'pronto', rotulo: 'Aprovado' },
  REJEITADO: { tom: 'perigo', rotulo: 'Rejeitado' },
  EM_ANALISE: { tom: 'novo', rotulo: 'Em análise' },
  RASCUNHO: { tom: 'neutro', rotulo: 'Rascunho' },
  PAUSADO: { tom: 'neutro', rotulo: 'Pausado' },
};

export function BadgeStatus({ status }: { status: string }) {
  const v = STATUS_VISUAL[status] ?? { tom: 'neutro' as const, rotulo: status };
  return <Badge tom={v.tom}>{v.rotulo}</Badge>;
}

/* ---------- Chip / FiltroCategoria ---------- */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ativo?: boolean;
  icone?: ReactNode;
}
export function Chip({ ativo = false, icone, children, className, ...resto }: ChipProps) {
  return (
    <button type="button" aria-pressed={ativo} className={[s.chip, ativo && s.chipAtivo, className].filter(Boolean).join(' ')} {...resto}>
      {icone}{children}
    </button>
  );
}

export function FiltroCategoria<T extends string>({ opcoes, valor, onChange, rotulo }: {
  opcoes: { valor: T; rotulo: string; contagem?: number }[];
  valor: T | null;
  onChange: (v: T | null) => void;
  rotulo: string;
}) {
  return (
    <div className={s.filtro} role="group" aria-label={rotulo}>
      <span className={s.filtroRotulo}>{rotulo}</span>
      {opcoes.map((o) => (
        <Chip key={o.valor} ativo={valor === o.valor} onClick={() => onChange(valor === o.valor ? null : o.valor)}>
          {o.rotulo}{o.contagem !== undefined && <span className={s.chipContagem}>{o.contagem}</span>}
        </Chip>
      ))}
    </div>
  );
}

/* ---------- Preço com centavos menores ---------- */
export function Preco({ valor, tamanho = 'md', riscado }: { valor: number; tamanho?: 'sm' | 'md' | 'lg'; riscado?: number }) {
  const { reais, centavos } = partesPreco(valor);
  return (
    <span className={`${s.preco} ${s[`preco-${tamanho}`]}`} aria-label={`R$ ${reais},${centavos}`}>
      {riscado !== undefined && <s className={s.riscado} aria-hidden>R$ {partesPreco(riscado).reais},{partesPreco(riscado).centavos}</s>}
      <span aria-hidden>R$ {reais}<small>,{centavos}</small></span>
    </span>
  );
}

/* ---------- Estrelas ---------- */
export function RatingStars({ nota, total, onChange, tamanho = 16 }: {
  nota: number; total?: number; onChange?: (n: number) => void; tamanho?: number;
}) {
  if (onChange) {
    return (
      <div className={s.estrelas} role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            className={`${s.estrelaBtn} ${n <= nota ? s.cheia : ''}`} onClick={() => onChange(n)}>
            <Star size={tamanho * 1.6} aria-hidden fill="currentColor" />
          </button>
        ))}
      </div>
    );
  }
  return (
    <span className={s.nota} aria-label={`Nota ${nota.toFixed(1).replace('.', ',')} de 5${total ? `, ${total} avaliações` : ''}`}>
      <Star size={tamanho - 2} aria-hidden fill="currentColor" className={s.estrelaIcone} />
      <span aria-hidden>{nota.toFixed(1)}</span>
      {total !== undefined && <span className={s.notaTotal} aria-hidden>({total})</span>}
    </span>
  );
}

/* ---------- Quantidade ---------- */
export function QuantityStepper({ valor, onChange, min = 1, max = 20 }: { valor: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className={s.qtd} role="group" aria-label="Quantidade">
      <button type="button" className={s.qtdBtn} onClick={() => onChange(valor - 1)} disabled={valor <= min} aria-label="Diminuir quantidade"><Minus size={16} aria-hidden /></button>
      <span className={s.qtdNum} aria-live="polite">{valor}</span>
      <button type="button" className={s.qtdBtn} onClick={() => onChange(valor + 1)} disabled={valor >= max} aria-label="Aumentar quantidade"><Plus size={16} aria-hidden /></button>
    </div>
  );
}
