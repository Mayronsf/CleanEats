import { Fragment } from 'react';
import { Check } from 'lucide-react';
import s from './Stepper.module.css';

export function Stepper({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <ol className={s.stepper} aria-label={`Etapa ${atual + 1} de ${etapas.length}`}>
      {etapas.map((rotulo, i) => {
        const estado = i < atual ? s.feito : i === atual ? s.ativo : s.pendente;
        return (
          <Fragment key={rotulo}>
            {i > 0 && <li aria-hidden className={`${s.linha} ${i <= atual ? s.linhaFeita : ''}`} />}
            <li className={`${s.etapa} ${estado}`} aria-current={i === atual ? 'step' : undefined}>
              <span className={s.circulo}>{i < atual ? <Check size={14} aria-hidden /> : i + 1}</span>
              <span className={s.rotulo}>{rotulo}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
