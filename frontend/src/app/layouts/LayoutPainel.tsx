import { Outlet } from 'react-router-dom';
import { SidebarPainel, type GrupoMenu, type VariantePainel } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import type { PerfilUsuario } from '../../services/api';
import { RotaProtegida } from '../rotas/RotaProtegida';
import { CentralNotificacoes } from '../../features/notificacoes/CentralNotificacoes';

const PERFIL: Record<VariantePainel, PerfilUsuario> = { nutri: 'NUTRICIONISTA', restaurante: 'RESTAURANTE', admin: 'ADMIN' };
const TEMA: Record<VariantePainel, string> = { nutri: 'tema-nutri', restaurante: 'tema-restaurante', admin: '' };

/** Layout dos painéis (nutri, restaurante, admin): sidebar 260px + conteúdo. O menu vem de cada frente. */
export function LayoutPainel({ variante, grupos, subtitulo }: { variante: VariantePainel; grupos: GrupoMenu[]; subtitulo: string }) {
  const { usuario } = useAuth();
  return (
    <RotaProtegida perfil={PERFIL[variante]}>
      <div className={TEMA[variante]} style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
        <SidebarPainel
          variante={variante}
          grupos={grupos}
          usuario={{ nome: usuario?.nome ?? '', subtitulo, avatarUrl: usuario?.avatarUrl ?? undefined }}
          acao={<CentralNotificacoes variante="painel" />}
        />
        <main style={{ flex: 1, minWidth: 0, padding: 32 }}>
          <Outlet />
        </main>
      </div>
    </RotaProtegida>
  );
}
