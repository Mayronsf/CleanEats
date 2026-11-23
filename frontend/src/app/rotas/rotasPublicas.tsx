import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

/**
 * Rotas públicas, autenticação e telas novas — DONA: sessão principal.
 * Telas 01–05, 08, 09 + /ficha/:id, /termos, /privacidade, /auth/callback, 404.
 */
const LoginPage = lazy(() => import('../../features/conta/LoginPage'));
const CadastroContaPage = lazy(() => import('../../features/conta/CadastroContaPage'));
const CallbackAuthPage = lazy(() => import('../../features/conta/CallbackAuthPage'));
const EscolhaPerfilPage = lazy(() => import('../../features/conta/EscolhaPerfilPage'));
const CadastroClientePage = lazy(() => import('../../features/conta/CadastroClientePage'));
const RecuperarSenhaPage = lazy(() => import('../../features/conta/RecuperarSenhaPage'));
const PlanosPage = lazy(() => import('../../features/planos/PlanosPage'));
const FichaPublicaPage = lazy(() => import('../../features/ficha/FichaPublicaPage'));
const TermosPage = lazy(() => import('../../features/legal/TermosPage'));
const LandingPage = lazy(() => import('../../features/landing/LandingPage'));
const PrivacidadePage = lazy(() => import('../../features/legal/PrivacidadePage'));

export const rotasPublicas: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroContaPage /> },
  { path: '/cadastro/perfil', element: <EscolhaPerfilPage /> },
  { path: '/cadastro/cliente', element: <CadastroClientePage /> },
  { path: '/recuperar-senha', element: <RecuperarSenhaPage /> },
  { path: '/planos', element: <PlanosPage /> },
  { path: '/ficha/:id', element: <FichaPublicaPage /> },
  { path: '/termos', element: <TermosPage /> },
  { path: '/privacidade', element: <PrivacidadePage /> },
  { path: '/auth/callback', element: <CallbackAuthPage /> },
];
