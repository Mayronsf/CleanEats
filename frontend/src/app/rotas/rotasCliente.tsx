import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LayoutCliente } from '../layouts/LayoutCliente';
import { emConstrucao } from '../EmConstrucao';

const HomeClientePage = lazy(() => import('../../features/cliente/home/HomeClientePage'));
const MarketplacePage = lazy(() => import('../../features/cliente/marketplace/MarketplacePage'));
const DetalhePratoPage = lazy(() => import('../../features/cliente/detalhe/DetalhePratoPage'));
const CarrinhoPage = lazy(() => import('../../features/cliente/carrinho/CarrinhoPage'));
const PedidoConfirmadoPage = lazy(() => import('../../features/cliente/pedidos/PedidoConfirmadoPage'));
const AcompanhamentoPage = lazy(() => import('../../features/cliente/pedidos/AcompanhamentoPage'));
const HistoricoPage = lazy(() => import('../../features/cliente/pedidos/HistoricoPage'));
const RestaurantesPage = lazy(() => import('../../features/cliente/restaurantes/RestaurantesPage'));
const PerfilRestaurantePage = lazy(() => import('../../features/cliente/restaurantes/PerfilRestaurantePage'));
const AssinaturaPage = lazy(() => import('../../features/cliente/assinatura/AssinaturaPage'));
const PerfilPage = lazy(() => import('../../features/cliente/perfil/PerfilPage'));
const EditarPerfilPage = lazy(() => import('../../features/cliente/perfil/EditarPerfilPage'));
const AvaliarPage = lazy(() => import('../../features/cliente/avaliar/AvaliarPage'));
const MeuPlanoPage = lazy(() => import('../../features/cliente/plano/MeuPlanoPage'));

/**
 * Rotas do cliente (/app) — DONA: FRENTE A (telas 10–25).
 * Troque cada emConstrucao(...) por um componente lazy de src/features/cliente/.
 */
export const rotasCliente: RouteObject[] = [
  {
    path: '/app',
    element: <LayoutCliente />,
    children: [
      { index: true, element: <HomeClientePage /> },
      { path: 'marketplace', element: <MarketplacePage /> },
      { path: 'marmitas/:id', element: <DetalhePratoPage /> },
      { path: 'restaurantes', element: <RestaurantesPage /> },
      { path: 'restaurantes/:id', element: <PerfilRestaurantePage /> },
      { path: 'monte-sua-marmita', element: emConstrucao('15', '15-cliente-personalizacao') },
      { path: 'carrinho', element: <CarrinhoPage /> },
      { path: 'pedidos/:id/confirmado', element: <PedidoConfirmadoPage /> },
      { path: 'pedidos/:id', element: <AcompanhamentoPage /> },
      { path: 'pedidos', element: <HistoricoPage /> },
      { path: 'pedidos/:id/avaliar', element: <AvaliarPage /> },
      { path: 'perfil', element: <PerfilPage /> },
      { path: 'perfil/editar', element: <EditarPerfilPage /> },
      { path: 'assinatura', element: <AssinaturaPage /> },
      { path: 'meu-plano', element: <MeuPlanoPage /> },
      { path: 'nutribot', element: emConstrucao('25', '25-cliente-chatbot') },
    ],
  },
];
