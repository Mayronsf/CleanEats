import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import s from './Botao.module.css';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'escuro' | 'perigo';
type Tamanho = 'sm' | 'md' | 'lg';

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  larguraTotal?: boolean;
  iconeEsquerda?: ReactNode;
  iconeDireita?: ReactNode;
}

export function Botao({
  variante = 'primario', tamanho = 'md', carregando = false, larguraTotal = false,
  iconeEsquerda, iconeDireita, children, disabled, className, type = 'button', ...resto
}: BotaoProps) {
  const classes = [s.botao, s[variante], s[tamanho], larguraTotal && s.total, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || carregando} aria-busy={carregando || undefined} {...resto}>
      {carregando ? <Loader2 className={s.girando} size={18} aria-hidden /> : iconeEsquerda}
      <span>{children}</span>
      {!carregando && iconeDireita}
    </button>
  );
}
