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
      { path: 'restaurantes', element: emConstrucao('13', '13-cliente-restaurantes') },
      { path: 'restaurantes/:id', element: emConstrucao('14', '14-cliente-perfil-restaurante') },
      { path: 'monte-sua-marmita', element: emConstrucao('15', '15-cliente-personalizacao') },
      { path: 'carrinho', element: <CarrinhoPage /> },
      { path: 'pedidos/:id/confirmado', element: <PedidoConfirmadoPage /> },
      { path: 'pedidos/:id', element: <AcompanhamentoPage /> },
      { path: 'pedidos', element: <HistoricoPage /> },
      { path: 'pedidos/:id/avaliar', element: emConstrucao('20', '20-cliente-avaliar') },
      { path: 'perfil', element: emConstrucao('21', '21-cliente-perfil') },
      { path: 'perfil/editar', element: emConstrucao('22', '22-cliente-editar-perfil') },
      { path: 'assinatura', element: emConstrucao('23', '23-cliente-planos') },
      { path: 'meu-plano', element: emConstrucao('24', '24-cliente-plano-alimentar') },
      { path: 'nutribot', element: emConstrucao('25', '25-cliente-chatbot') },
    ],
  },
];
