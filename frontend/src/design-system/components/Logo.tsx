import { Link } from 'react-router-dom';
import s from './Logo.module.css';

export function Logo({ para = '/', compacto = false }: { para?: string; compacto?: boolean }) {
  return (
    <Link to={para} className={[s.logo, compacto && s.compacto].filter(Boolean).join(' ')} aria-label="CleanEats — início">
      <span className={s.marca} aria-hidden>C</span>
      <span className={s.texto}>Clean<span className={s.verde}>Eats</span></span>
    </Link>
  );
}
