import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LayoutCliente } from '../layouts/LayoutCliente';
import { emConstrucao } from '../EmConstrucao';

const HomeClientePage = lazy(() => import('../../features/cliente/home/HomeClientePage'));

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
      { path: 'marketplace', element: emConstrucao('11', '11-cliente-marketplace') },
      { path: 'marmitas/:id', element: emConstrucao('12', '12-cliente-detalhe-marmita') },
      { path: 'restaurantes', element: emConstrucao('13', '13-cliente-restaurantes') },
      { path: 'restaurantes/:id', element: emConstrucao('14', '14-cliente-perfil-restaurante') },
      { path: 'monte-sua-marmita', element: emConstrucao('15', '15-cliente-personalizacao') },
      { path: 'carrinho', element: emConstrucao('16', '16-cliente-carrinho') },
      { path: 'pedidos/:id/confirmado', element: emConstrucao('17', '17-cliente-pedido-confirmado') },
      { path: 'pedidos/:id', element: emConstrucao('18', '18-cliente-acompanhamento') },
      { path: 'pedidos', element: emConstrucao('19', '19-cliente-historico') },
      { path: 'pedidos/:id/avaliar', element: emConstrucao('20', '20-cliente-avaliar') },
      { path: 'perfil', element: emConstrucao('21', '21-cliente-perfil') },
      { path: 'perfil/editar', element: emConstrucao('22', '22-cliente-editar-perfil') },
      { path: 'assinatura', element: emConstrucao('23', '23-cliente-planos') },
      { path: 'meu-plano', element: emConstrucao('24', '24-cliente-plano-alimentar') },
      { path: 'nutribot', element: emConstrucao('25', '25-cliente-chatbot') },
    ],
  },
];
