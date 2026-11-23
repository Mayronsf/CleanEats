import { ClipboardCheck, DollarSign, FileText, LayoutGrid, LineChart, Plus, Settings, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { GrupoMenu } from '../../design-system';

/** Menu do painel do restaurante (sidebar). */
export const menuRestaurante: GrupoMenu[] = [
  { titulo: 'Operação', itens: [
    { para: '/restaurante', rotulo: 'Dashboard', icone: LayoutGrid, fim: true },
    { para: '/restaurante/pedidos', rotulo: 'Pedidos', icone: ShoppingBag },
    { para: '/restaurante/cardapio', rotulo: 'Cardápio', icone: UtensilsCrossed, fim: true },
    { para: '/restaurante/cardapio/novo', rotulo: 'Novo prato', icone: Plus },
    { para: '/restaurante/aprovacao', rotulo: 'Aprovação', icone: ClipboardCheck },
  ] },
  { titulo: 'Gestão', itens: [
    { para: '/restaurante/analytics', rotulo: 'Analytics', icone: LineChart },
    { para: '/restaurante/financeiro', rotulo: 'Financeiro', icone: DollarSign },
    { para: '/restaurante/relatorios', rotulo: 'Relatórios', icone: FileText },
    { para: '/restaurante/perfil', rotulo: 'Perfil', icone: Settings },
  ] },
];
