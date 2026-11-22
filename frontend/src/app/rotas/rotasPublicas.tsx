import type { RouteObject } from 'react-router-dom';
import { emConstrucao } from '../EmConstrucao';

/**
 * Rotas públicas, autenticação e telas novas — DONA: sessão principal.
 * Telas 01–05, 08, 09 + /ficha/:id, /termos, /privacidade, /auth/callback, 404.
 */
export const rotasPublicas: RouteObject[] = [
  { path: '/', element: emConstrucao('01', '01-splash') },
  { path: '/login', element: emConstrucao('02', '02-login') },
  { path: '/cadastro', element: emConstrucao('03', '03-cadastro-etapa1') },
  { path: '/cadastro/perfil', element: emConstrucao('04', '04-cadastro-perfil') },
  { path: '/cadastro/cliente', element: emConstrucao('05', '05-cadastro-cliente') },
  { path: '/recuperar-senha', element: emConstrucao('08', '08-recuperar-senha') },
  { path: '/planos', element: emConstrucao('09', '09-selecao-plano') },
  { path: '/ficha/:id', element: emConstrucao('nova', 'ficha técnica pública (QR Code da tela 12)') },
  { path: '/termos', element: emConstrucao('nova', 'termos de uso') },
  { path: '/privacidade', element: emConstrucao('nova', 'política de privacidade') },
  { path: '/auth/callback', element: emConstrucao('nova', 'retorno do login com Google') },
];
