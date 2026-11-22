import type { RouteObject } from 'react-router-dom';
import { Activity, BookOpen, ClipboardList, FileText, LayoutGrid, MessageCircle, User, Users, Wallet } from 'lucide-react';
import type { GrupoMenu } from '../../design-system';
import { LayoutPainel } from '../layouts/LayoutPainel';
import { emConstrucao } from '../EmConstrucao';

/**
 * Rotas da nutricionista (/nutri) — DONA: FRENTE B (telas 06, 26–35 + /nutri/prescricoes e /nutri/acompanhamento).
 * O cadastro (06, /cadastro/nutricionista) também é da frente B.
 */
export const menuNutri: GrupoMenu[] = [
  { titulo: 'Principal', itens: [
    { para: '/nutri', rotulo: 'Dashboard', icone: LayoutGrid, fim: true },
    { para: '/nutri/triagens', rotulo: 'Triagens', icone: ClipboardList },
    { para: '/nutri/clientes', rotulo: 'Meus clientes', icone: Users },
    { para: '/nutri/acompanhamento', rotulo: 'Acompanhamento', icone: Activity },
    { para: '/nutri/catalogo', rotulo: 'Catálogo', icone: BookOpen },
    { para: '/nutri/prescricoes', rotulo: 'Prescrições', icone: FileText },
    { para: '/nutri/mensagens', rotulo: 'Mensagens', icone: MessageCircle },
  ] },
  { titulo: 'Negócio', itens: [
    { para: '/nutri/financeiro', rotulo: 'Financeiro', icone: Wallet },
    { para: '/nutri/perfil', rotulo: 'Meu perfil', icone: User },
  ] },
];

export const rotasNutri: RouteObject[] = [
  { path: '/cadastro/nutricionista', element: emConstrucao('06', '06-cadastro-nutricionista') },
  {
    path: '/nutri',
    element: <LayoutPainel variante="nutri" grupos={menuNutri} subtitulo="Nutricionista" />,
    children: [
      { index: true, element: emConstrucao('26', '26-nutri-home (com menos infos)') },
      { path: 'triagens', element: emConstrucao('27', '27-nutri-triagens') },
      { path: 'clientes', element: emConstrucao('28', '28-nutri-clientes') },
      { path: 'clientes/:id', element: emConstrucao('29', '29-nutri-cliente-perfil') },
      { path: 'clientes/:id/plano', element: emConstrucao('30', '30-nutri-editor-plano') },
      { path: 'catalogo', element: emConstrucao('31', '31-nutri-catalogo') },
      { path: 'prescricoes/nova', element: emConstrucao('32', '32-nutri-prescricao') },
      { path: 'prescricoes', element: emConstrucao('nova', 'histórico de prescrições (componentes da tela 32)') },
      { path: 'acompanhamento', element: emConstrucao('nova', 'acompanhamento por adesão (componentes da tela 28)') },
      { path: 'mensagens', element: emConstrucao('33', '33-nutri-chat') },
      { path: 'financeiro', element: emConstrucao('34', '34-nutri-financeiro') },
      { path: 'perfil', element: emConstrucao('35', '35-nutri-perfil-profissional') },
    ],
  },
];
