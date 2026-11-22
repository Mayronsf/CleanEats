import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { EmptyState } from '../design-system';

/** Placeholder de rota ainda não implementada. Cada frente substitui pelos seus componentes. */
export function EmConstrucao({ tela, arquivo }: { tela: string; arquivo: string }) {
  const { pathname } = useLocation();
  return (
    <div style={{ padding: '48px var(--page-pad-x)' }}>
      <EmptyState
        icone={<Hammer size={26} />}
        titulo={`Tela ${tela} em construção`}
        descricao={`${pathname} · referência: telas-html/${arquivo}.html`}
      />
    </div>
  );
}

/** Atalho para declarar rotas placeholder. */
export const emConstrucao = (tela: string, arquivo: string) => <EmConstrucao tela={tela} arquivo={arquivo} />;
