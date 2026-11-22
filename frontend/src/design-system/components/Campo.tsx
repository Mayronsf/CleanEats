import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import s from './Campo.module.css';

export interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
}

export function Campo({ rotulo, erro, dica, id, className, ...resto }: CampoProps) {
  const autoId = useId();
  const idCampo = id ?? autoId;
  const idDescricao = erro || dica ? `${idCampo}-descricao` : undefined;
  return (
    <div className={[s.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={idCampo} className={s.rotulo}>{rotulo}</label>
      <input
        id={idCampo}
        className={[s.entrada, erro && s.comErro].filter(Boolean).join(' ')}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idDescricao}
        {...resto}
      />
      {(erro || dica) && (
        <p id={idDescricao} className={erro ? s.erro : s.dica} role={erro ? 'alert' : undefined}>{erro ?? dica}</p>
      )}
    </div>
  );
}

export function CampoSenha(props: Omit<CampoProps, 'type'>) {
  const [visivel, setVisivel] = useState(false);
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <div className={s.senha}>
      <Campo {...props} id={id} type={visivel ? 'text' : 'password'} />
      <button
        type="button"
        className={s.alternar}
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-controls={id}
      >
        {visivel ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
