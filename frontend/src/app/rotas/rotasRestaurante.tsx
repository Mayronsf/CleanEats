import type { RouteObject } from 'react-router-dom';
import { MessageSquare, Percent, ShieldCheck, Star } from 'lucide-react';
import type { GrupoMenu } from '../../design-system';
import { LayoutPainel } from '../layouts/LayoutPainel';
import { lazy } from 'react';
import { emConstrucao } from '../EmConstrucao';
import { LayoutRestaurante } from '../../features/restaurante/LayoutRestaurante';

const DashboardRestaurantePage = lazy(() => import('../../features/restaurante/dashboard/DashboardPage'));
const CardapioPage = lazy(() => import('../../features/restaurante/cardapio/CardapioPage'));
const PratoFormPage = lazy(() => import('../../features/restaurante/cardapio/PratoFormPage'));
const AprovacaoRestaurantePage = lazy(() => import('../../features/restaurante/aprovacao/AprovacaoPage'));
const AprovacoesAdminPage = lazy(() => import('../../features/admin/AprovacoesPage'));
const AvaliacoesAdminPage = lazy(() => import('../../features/admin/AvaliacoesAdminPage'));
const SuporteAdminPage = lazy(() => import('../../features/admin/SuporteAdminPage'));
const PlataformaAdminPage = lazy(() => import('../../features/admin/PlataformaAdminPage'));
const AnalyticsPage = lazy(() => import('../../features/restaurante/gestao/AnalyticsPage'));
const FinanceiroRestaurantePage = lazy(() => import('../../features/restaurante/gestao/FinanceiroPage'));
const RelatoriosPage = lazy(() => import('../../features/restaurante/gestao/RelatoriosPage'));
const PedidosRestaurantePage = lazy(() => import('../../features/restaurante/pedidos/PedidosPage'));

/**
 * Rotas do restaurante (/restaurante) e do admin (/admin) — DONA: FRENTE C (telas 07, 36–44 + admin).
 */
export { menuRestaurante } from '../../features/restaurante/menu';

export const menuAdmin: GrupoMenu[] = [
  { titulo: 'Curadoria', itens: [
    { para: '/admin', rotulo: 'Aprovações', icone: ShieldCheck, fim: true },
    { para: '/admin/avaliacoes', rotulo: 'Avaliações', icone: Star },
    { para: '/admin/suporte', rotulo: 'Suporte', icone: MessageSquare },
  ] },
  { titulo: 'Plataforma', itens: [
    { para: '/admin/restaurantes', rotulo: 'Comissões', icone: Percent },
  ] },
];

export const rotasRestaurante: RouteObject[] = [
  { path: '/cadastro/restaurante', element: emConstrucao('07', '07-cadastro-restaurante') },
  {
    path: '/restaurante',
    element: <LayoutRestaurante />,
    children: [
      { index: true, element: <DashboardRestaurantePage /> },
      { path: 'pedidos', element: <PedidosRestaurantePage /> },
      { path: 'cardapio', element: <CardapioPage /> },
      { path: 'cardapio/novo', element: <PratoFormPage key="novo" /> },
      { path: 'cardapio/:id/editar', element: <PratoFormPage /> },
      { path: 'aprovacao', element: <AprovacaoRestaurantePage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'financeiro', element: <FinanceiroRestaurantePage /> },
      { path: 'relatorios', element: <RelatoriosPage /> },
      { path: 'perfil', element: emConstrucao('44', '44-resto-perfil') },
    ],
  },
  {
    path: '/admin',
    element: <LayoutPainel variante="admin" grupos={menuAdmin} subtitulo="Equipe CleanEats" />,
    children: [
      { index: true, element: <AprovacoesAdminPage /> },
      { path: 'aprovacoes', element: <AprovacoesAdminPage /> },
      { path: 'avaliacoes', element: <AvaliacoesAdminPage /> },
      { path: 'suporte', element: <SuporteAdminPage /> },
      { path: 'restaurantes', element: <PlataformaAdminPage /> },
    ],
  },
];
