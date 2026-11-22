import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { emConstrucao } from '../EmConstrucao';

/**
 * Rotas públicas, autenticação e telas novas — DONA: sessão principal.
 * Telas 01–05, 08, 09 + /ficha/:id, /termos, /privacidade, /auth/callback, 404.
 */
const LoginPage = lazy(() => import('../../features/conta/LoginPage'));
const CadastroContaPage = lazy(() => import('../../features/conta/CadastroContaPage'));
const CallbackAuthPage = lazy(() => import('../../features/conta/CallbackAuthPage'));
const EscolhaPerfilPage = lazy(() => import('../../features/conta/EscolhaPerfilPage'));
const CadastroClientePage = lazy(() => import('../../features/conta/CadastroClientePage'));

export const rotasPublicas: RouteObject[] = [
  { path: '/', element: emConstrucao('01', '01-splash') },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroContaPage /> },
  { path: '/cadastro/perfil', element: <EscolhaPerfilPage /> },
  { path: '/cadastro/cliente', element: <CadastroClientePage /> },
  { path: '/recuperar-senha', element: emConstrucao('08', '08-recuperar-senha') },
  { path: '/planos', element: emConstrucao('09', '09-selecao-plano') },
  { path: '/ficha/:id', element: emConstrucao('nova', 'ficha técnica pública (QR Code da tela 12)') },
  { path: '/termos', element: emConstrucao('nova', 'termos de uso') },
  { path: '/privacidade', element: emConstrucao('nova', 'política de privacidade') },
  { path: '/auth/callback', element: <CallbackAuthPage /> },
];
