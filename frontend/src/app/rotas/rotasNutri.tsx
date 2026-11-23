import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { Activity, BookOpen, ClipboardList, FileText, LayoutGrid, MessageCircle, User, Users, Wallet } from 'lucide-react';
import type { GrupoMenu } from '../../design-system';
import { LayoutPainel } from '../layouts/LayoutPainel';

const CadastroNutriPage = lazy(() => import('../../features/nutri/cadastro/CadastroNutriPage'));
const DashboardNutriPage = lazy(() => import('../../features/nutri/dashboard/DashboardNutriPage'));
const TriagensPage = lazy(() => import('../../features/nutri/triagens/TriagensPage'));
const ClientesPage = lazy(() => import('../../features/nutri/clientes/ClientesPage'));
const AcompanhamentoPage = lazy(() => import('../../features/nutri/clientes/AcompanhamentoPage'));
const ClientePerfilPage = lazy(() => import('../../features/nutri/clientes/ClientePerfilPage'));
const EditorPlanoPage = lazy(() => import('../../features/nutri/plano/EditorPlanoPage'));
const CatalogoNutriPage = lazy(() => import('../../features/nutri/catalogo/CatalogoNutriPage'));
const PrescricaoNovaPage = lazy(() => import('../../features/nutri/prescricoes/PrescricaoNovaPage'));
const PrescricoesPage = lazy(() => import('../../features/nutri/prescricoes/PrescricoesPage'));
const MensagensPage = lazy(() => import('../../features/nutri/mensagens/MensagensPage'));
const FinanceiroNutriPage = lazy(() => import('../../features/nutri/financeiro/FinanceiroNutriPage'));
const PerfilNutriPage = lazy(() => import('../../features/nutri/perfil/PerfilNutriPage'));

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
  { path: '/cadastro/nutricionista', element: <CadastroNutriPage /> },
  {
    path: '/nutri',
    element: <LayoutPainel variante="nutri" grupos={menuNutri} subtitulo="Nutricionista" />,
    children: [
      { index: true, element: <DashboardNutriPage /> },
      { path: 'triagens', element: <TriagensPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'clientes/:id', element: <ClientePerfilPage /> },
      { path: 'clientes/:id/plano', element: <EditorPlanoPage /> },
      { path: 'catalogo', element: <CatalogoNutriPage /> },
      { path: 'prescricoes/nova', element: <PrescricaoNovaPage /> },
      { path: 'prescricoes', element: <PrescricoesPage /> },
      { path: 'acompanhamento', element: <AcompanhamentoPage /> },
      { path: 'mensagens', element: <MensagensPage /> },
      { path: 'financeiro', element: <FinanceiroNutriPage /> },
      { path: 'perfil', element: <PerfilNutriPage /> },
    ],
  },
];
