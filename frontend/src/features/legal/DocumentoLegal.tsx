import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../design-system';
import { FaleConosco } from '../suporte/FaleConosco';
import s from './DocumentoLegal.module.css';

export interface SecaoLegal { id: string; titulo: string; conteudo: ReactNode }

/** Casca das páginas /termos e /privacidade: índice lateral + texto com medida de leitura. */
export function DocumentoLegal({ titulo, destaque, atualizadoEm, resumo, secoes }: {
  titulo: string; destaque: string; atualizadoEm: string; resumo: string; secoes: SecaoLegal[];
}) {
  const [suporte, setSuporte] = useState(false);
  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <Logo />
        <Link to="/" className={s.voltar}><ArrowLeft size={16} aria-hidden /> <span>Voltar ao início</span></Link>
      </header>
      <div className={s.corpo}>
        <nav className={s.indice} aria-label="Nesta página">
          <p className={s.indiceTitulo}>Nesta página</p>
          <ol>{secoes.map((sc) => <li key={sc.id}><a href={`#${sc.id}`}>{sc.titulo}</a></li>)}</ol>
        </nav>
        <main className={s.texto}>
          <h1>{titulo} <span className="script">{destaque}</span></h1>
          <p className={s.atualizado}>Última atualização: {atualizadoEm}</p>
          <p className={s.resumo}>{resumo}</p>
          {secoes.map((sc) => (
            <section key={sc.id} id={sc.id} aria-labelledby={`${sc.id}-t`}>
              <h2 id={`${sc.id}-t`}>{sc.titulo}</h2>
              {sc.conteudo}
            </section>
          ))}
          <aside className={s.contato}>
            <p><strong>Dúvidas ou pedidos sobre seus dados?</strong> Fale com a equipe pelo canal de suporte da plataforma.</p>
            <button type="button" onClick={() => setSuporte(true)}>Falar com o suporte</button>
          </aside>
        </main>
      </div>
      <footer className={s.rodape}>
        <p>© 2026 CleanEats — TRICODE Solutions · Recife · Brasil</p>
        <p><Link to="/termos">Termos de uso</Link> · <Link to="/privacidade">Política de privacidade</Link> · v1.0 · MVP · UNIFACOL</p>
      </footer>
      <FaleConosco aberto={suporte} onFechar={() => setSuporte(false)} assuntoInicial="Privacidade e dados pessoais" />
    </div>
  );
}
