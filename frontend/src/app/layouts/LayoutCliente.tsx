import { Outlet, useNavigate } from 'react-router-dom';
import { NavbarCliente } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { RotaProtegida } from '../rotas/RotaProtegida';
import { CentralNotificacoes } from '../../features/notificacoes/CentralNotificacoes';

/**
 * Layout do cliente (/app): navbar superior; no celular, tabbar inferior.
 * Compartilhado — itensCarrinho e notificações serão ligados pela sessão principal
 * (central de notificações) e pela frente A (carrinho) via hooks.
 */
export function LayoutCliente() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  return (
    <RotaProtegida perfil="CLIENTE">
      <NavbarCliente
        nomeUsuario={usuario?.nome ?? ''}
        onBuscar={(termo) => navegar(`/app/marketplace?busca=${encodeURIComponent(termo)}`)}
        notificacoes={<CentralNotificacoes variante="navbar" />}
      />
      <main style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 92px)', paddingBottom: 96 }}>
        <Outlet />
      </main>
    </RotaProtegida>
  );
}
