import type { RouteObject } from 'react-router-dom';
import {
  ClipboardCheck, DollarSign, FileText, LayoutGrid, LineChart, MessageSquare, Percent, Settings, ShieldCheck, ShoppingBag, Star, UtensilsCrossed,
} from 'lucide-react';
import type { GrupoMenu } from '../../design-system';
import { LayoutPainel } from '../layouts/LayoutPainel';
import { emConstrucao } from '../EmConstrucao';

/**
 * Rotas do restaurante (/restaurante) e do admin (/admin) — DONA: FRENTE C (telas 07, 36–44 + admin).
 */
export const menuRestaurante: GrupoMenu[] = [
  { titulo: 'Operação', itens: [
    { para: '/restaurante', rotulo: 'Dashboard', icone: LayoutGrid, fim: true },
    { para: '/restaurante/pedidos', rotulo: 'Pedidos', icone: ShoppingBag },
    { para: '/restaurante/cardapio', rotulo: 'Cardápio', icone: UtensilsCrossed },
    { para: '/restaurante/aprovacao', rotulo: 'Aprovação', icone: ClipboardCheck },
  ] },
  { titulo: 'Gestão', itens: [
    { para: '/restaurante/analytics', rotulo: 'Analytics', icone: LineChart },
    { para: '/restaurante/financeiro', rotulo: 'Financeiro', icone: DollarSign },
    { para: '/restaurante/relatorios', rotulo: 'Relatórios', icone: FileText },
    { para: '/restaurante/perfil', rotulo: 'Perfil', icone: Settings },
  ] },
];

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
    element: <LayoutPainel variante="restaurante" grupos={menuRestaurante} subtitulo="Restaurante · Recife" />,
    children: [
      { index: true, element: emConstrucao('36', '36-resto-dashboard') },
      { path: 'pedidos', element: emConstrucao('37', '37-resto-pedidos') },
      { path: 'cardapio', element: emConstrucao('38', '38-resto-cardapio') },
      { path: 'cardapio/novo', element: emConstrucao('39', '39-resto-criar-prato') },
      { path: 'cardapio/:id/editar', element: emConstrucao('39', '39-resto-criar-prato') },
      { path: 'aprovacao', element: emConstrucao('40', '40-resto-aprovacao') },
      { path: 'analytics', element: emConstrucao('41', '41-resto-analytics') },
      { path: 'financeiro', element: emConstrucao('42', '42-resto-financeiro') },
      { path: 'relatorios', element: emConstrucao('43', '43-resto-relatorios') },
      { path: 'perfil', element: emConstrucao('44', '44-resto-perfil') },
    ],
  },
  {
    path: '/admin',
    element: <LayoutPainel variante="admin" grupos={menuAdmin} subtitulo="Equipe CleanEats" />,
    children: [
      { index: true, element: emConstrucao('admin', 'aprovações de CRN, CNPJ e pratos (sem tela no Figma)') },
      { path: 'aprovacoes', element: emConstrucao('admin', 'aprovações (alias de /admin)') },
      { path: 'avaliacoes', element: emConstrucao('admin', 'moderação de avaliações (CE-11)') },
      { path: 'suporte', element: emConstrucao('admin', 'fila de "Fale conosco"') },
      { path: 'restaurantes', element: emConstrucao('admin', 'comissão por restaurante + simular renovação (CE-16)') },
    ],
  },
];
