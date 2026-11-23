import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, useLocation, useRoutes, type RouteObject } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { ToastProvider } from '../design-system';
import { CarregandoPagina } from './CarregandoPagina';
import { rotasPublicas } from './rotas/rotasPublicas';
import { rotasCliente } from './rotas/rotasCliente';
import { rotasNutri } from './rotas/rotasNutri';
import { rotasRestaurante } from './rotas/rotasRestaurante';

// Ferramentas internas (Fase 0)
const DesignSystemPage = lazy(() => import('../features/design-system/DesignSystemPage'));
const ConexaoPage = lazy(() => import('../features/dev/ConexaoPage'));
const NaoEncontradaPage = lazy(() => import('./NaoEncontradaPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

/**
 * Cada frente é dona do SEU arquivo em ./rotas — este arquivo só junta as listas.
 * Não edite aqui a partir de uma frente: peça à sessão principal.
 */
const rotas: RouteObject[] = [
  ...rotasPublicas,
  ...rotasCliente,
  ...rotasNutri,
  ...rotasRestaurante,
  { path: '/design-system', element: <DesignSystemPage /> },
  { path: '/dev/conexao', element: <ConexaoPage /> },
  { path: '*', element: <NaoEncontradaPage /> },
];

/** Rola sempre para o topo (ou âncora #hash) ao trocar de página e anima a entrada de forma fluida. */
function Rotas() {
  const { pathname, hash } = useLocation();
  const elemento = useRoutes(rotas);

  useEffect(() => {
    if (hash) {
      const alvo = document.getElementById(hash.slice(1));
      if (alvo) {
        alvo.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.querySelector<HTMLElement>('main')?.scrollTo?.({ top: 0, left: 0 });
  }, [pathname, hash]);

  return <div key={pathname} className="paginaTransicao">{elemento}</div>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<CarregandoPagina />}>
              <Rotas />
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
