import { useToast } from '../../../design-system';
import s from './BotoesSociais.module.css';

/**
 * Login social das telas 02 e 03. Google é REAL (Supabase Auth); Facebook é SIMULADO ("em breve").
 * Apple foi retirado do escopo (decisão de 22/11).
 */
export function BotoesSociais({ aoGoogle, verbo }: { aoGoogle: () => void; verbo?: string }) {
  const toast = useToast();
  return (
    <div className={s.linha}>
      <button type="button" className={s.botao} onClick={aoGoogle}>
        <span className={s.icone} style={{ background: '#EA4335' }} aria-hidden>G</span>
        <span>{verbo && <span className={s.completo}>{verbo} com </span>}Google</span>
      </button>
      <button type="button" className={s.botao} onClick={() => toast('Login com Facebook em breve. Use e-mail ou Google por enquanto.', 'info')}>
        <span className={s.icone} style={{ background: '#1877F2' }} aria-hidden>f</span>
        Facebook
      </button>
    </div>
  );
}
