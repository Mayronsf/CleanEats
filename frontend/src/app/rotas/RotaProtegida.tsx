import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HOME_DO_PERFIL, type PerfilUsuario } from '../../services/api';
import { CarregandoPagina } from '../CarregandoPagina';

/**
 * Guarda de rota por perfil. Só UX: a autorização de verdade é feita no backend (SecurityConfig).
 * - sem sessão → /login (volta para a rota depois)
 * - conta sem perfil (ex.: 1º login com Google) → /cadastro/perfil
 * - perfil diferente → home do próprio perfil
 */
export function RotaProtegida({ perfil, children }: { perfil: PerfilUsuario; children: ReactNode }) {
  const { sessao, carregandoSessao, usuario, carregandoUsuario, erroUsuario } = useAuth();
  const local = useLocation();

  if (carregandoSessao || (sessao && carregandoUsuario)) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/login" replace state={{ voltarPara: local.pathname + local.search }} />;
  if (erroUsuario?.codigo === 'PERFIL_PENDENTE') return <Navigate to="/cadastro/perfil" replace />;
  if (!usuario) return <CarregandoPagina />;
  if (usuario.perfil !== perfil) return <Navigate to={HOME_DO_PERFIL[usuario.perfil]} replace />;
  return <>{children}</>;
}
