import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { ToastProvider } from '../design-system';
import { CarregandoPagina } from './CarregandoPagina';

// Rotas com lazy loading (cada tela vira um chunk)
const DesignSystemPage = lazy(() => import('../features/design-system/DesignSystemPage'));
const ConexaoPage = lazy(() => import('../features/dev/ConexaoPage'));
const NaoEncontradaPage = lazy(() => import('./NaoEncontradaPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<CarregandoPagina />}>
              <Routes>
                {/* Fase 0: a landing (tela 01) entra na Fase 1 */}
                <Route path="/" element={<Navigate to="/design-system" replace />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="/dev/conexao" element={<ConexaoPage />} />
                <Route path="*" element={<NaoEncontradaPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
