import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../../design-system';
import s from './LayoutAutenticacao.module.css';

/**
 * Casca das telas de autenticação (02, 03, 04, 05, 08): formulário à esquerda e painel visual verde à direita.
 * O conteúdo do painel muda por tela (passado em `visual`).
 */
export function LayoutAutenticacao({ children, visual, voltar = { para: '/', rotulo: 'Voltar ao início' }, largo = false, antesDoConteudo }: {
  children: ReactNode;
  visual?: ReactNode;
  /** para = navega; aoClicar = ação local (ex.: voltar um estado na tela 08) */
  voltar?: { para?: string; aoClicar?: () => void; rotulo: string };
  largo?: boolean;
  antesDoConteudo?: ReactNode;
}) {
  return (
    <div className={`${s.pagina} ${visual ? '' : s.semVisual}`}>
      <div className={s.ladoForm}>
        <div className={s.topo}>
          <Logo />
          {voltar.aoClicar ? (
            <button type="button" onClick={voltar.aoClicar} className={s.voltar}>
              <ArrowLeft size={16} aria-hidden /> <span>{voltar.rotulo}</span>
            </button>
          ) : (
            <Link to={voltar.para ?? '/'} className={s.voltar}>
              <ArrowLeft size={16} aria-hidden /> <span>{voltar.rotulo}</span>
            </Link>
          )}
        </div>
        {antesDoConteudo}
        <main className={`${s.conteudo} ${largo ? s.largo : ''}`}>{children}</main>
      </div>
      {visual && <aside className={s.ladoVisual}>{visual}</aside>}
    </div>
  );
}

/** Título com a palavra manuscrita ("Entrar na sua *conta*"). */
export function TituloAutenticacao({ antes, destaque, depois, subtitulo, rotulo }: {
  antes: string; destaque: string; depois?: string; subtitulo?: ReactNode; rotulo?: string;
}) {
  return (
    <header className={s.cabecalho}>
      {rotulo && <p className={s.rotulo}>{rotulo}</p>}
      <h1 className={s.titulo}>
        {antes} <span className="script">{destaque}</span>{depois}
      </h1>
      {subtitulo && <p className={s.subtitulo}>{subtitulo}</p>}
    </header>
  );
}

/** Folhas decorativas do painel visual (desenho das telas de autenticação). */
export function FolhasDecorativas() {
  return (
    <>
      <svg className={`${s.folha} ${s.folha1}`} viewBox="0 0 70 90" fill="none" aria-hidden>
        <path d="M35 0 C 60 25, 60 65, 35 90 C 10 65, 10 25, 35 0 Z" fill="#5BB033" opacity="0.7" />
        <path d="M35 5 L 35 85" stroke="#2D6A1F" strokeWidth="1" opacity="0.5" />
      </svg>
      <svg className={`${s.folha} ${s.folha2}`} viewBox="0 0 80 60" fill="none" aria-hidden>
        <path d="M0 30 C 20 5, 60 5, 80 30 C 60 55, 20 55, 0 30 Z" fill="#8BC34A" opacity="0.6" />
      </svg>
      <svg className={`${s.folha} ${s.folha3}`} viewBox="0 0 120 100" fill="none" aria-hidden>
        <path d="M60 0 C 110 20, 110 80, 60 100 C 10 80, 10 20, 60 0 Z" fill="#5BB033" opacity="0.5" />
      </svg>
    </>
  );
}
