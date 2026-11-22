import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, EmptyState } from './Feedback';
import s from './TabelaDados.module.css';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  render: (linha: T) => ReactNode;
  alinhar?: 'esquerda' | 'direita';
}

/** Tabela dos painéis (financeiro, pedidos, aprovações). Paginação é sempre feita no servidor. */
export function TabelaDados<T>({ colunas, linhas, chaveLinha, carregando, vazio, legenda, pagina }: {
  colunas: Coluna<T>[];
  linhas: T[];
  chaveLinha: (l: T) => string;
  carregando?: boolean;
  vazio?: { titulo: string; descricao?: string };
  legenda: string;
  pagina?: { atual: number; total: number; onMudar: (p: number) => void };
}) {
  return (
    <div className={s.envoltorio}>
      <table className={s.tabela}>
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>{colunas.map((c) => <th key={c.chave} scope="col" className={c.alinhar === 'direita' ? s.direita : undefined}>{c.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {carregando
            ? Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>{colunas.map((c) => <td key={c.chave}><Skeleton altura={14} /></td>)}</tr>
            ))
            : linhas.map((l) => (
              <tr key={chaveLinha(l)}>
                {colunas.map((c) => <td key={c.chave} className={c.alinhar === 'direita' ? s.direita : undefined}>{c.render(l)}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
      {!carregando && linhas.length === 0 && vazio && <EmptyState titulo={vazio.titulo} descricao={vazio.descricao} compacto />}
      {pagina && pagina.total > 1 && (
        <nav className={s.paginacao} aria-label="Paginação">
          <button type="button" onClick={() => pagina.onMudar(pagina.atual - 1)} disabled={pagina.atual <= 1} aria-label="Página anterior"><ChevronLeft size={16} aria-hidden /></button>
          <span>Página {pagina.atual} de {pagina.total}</span>
          <button type="button" onClick={() => pagina.onMudar(pagina.atual + 1)} disabled={pagina.atual >= pagina.total} aria-label="Próxima página"><ChevronRight size={16} aria-hidden /></button>
        </nav>
      )}
    </div>
  );
}
