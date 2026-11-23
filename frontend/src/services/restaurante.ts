import { API_URL, chamarApi, ErroApi } from './api';
import { supabase } from './supabase';

/** Serviços do painel do restaurante (telas 07, 36–44). Dono: frente C. */
export type StatusPedido = 'NOVO' | 'ACEITO' | 'RECUSADO' | 'PREPARANDO' | 'PRONTO' | 'A_CAMINHO' | 'ENTREGUE' | 'CANCELADO';
export type AbaPedidos = 'TODOS' | 'NOVOS' | 'PREPARANDO' | 'PRONTOS' | 'ENTREGUES' | 'ENCERRADOS';
export type AcaoPedido = 'ACEITAR' | 'RECUSAR' | 'PRONTO' | 'RETIRADA';

export interface RestaurantePainel { id: string; nome: string; sigla: string; logoUrl: string | null; statusAprovacao: string; motivoRejeicao: string | null }
export interface PedidoPainel {
  id: string; codigo: string; cliente: string; status: StatusPedido; total: number; criadoEm: string;
  itens: { nome: string; quantidade: number; observacao: string | null }[]; observacao: string | null; motivoRecusa: string | null;
  entregador: string | null; previsaoEntregaEm: string | null; agendadoPara: string | null;
}
export interface ResumoPainel {
  restaurante: RestaurantePainel; emAndamento: number; novosUltimos15Min: number; novos: number;
  metricas: { pedidosMes: number; pedidosMesAnterior: number; receitaMes: number; receitaMesAnterior: number; notaMedia: number | null;
    avaliacoesMes: number; tempoPreparoMin: number | null; tempoPreparoAnterior: number | null };
  recentes: PedidoPainel[];
}
export interface FilaPedidos { pedidos: PedidoPainel[]; contagens: Record<AbaPedidos, number> }

export const buscarResumoPainel = () => chamarApi<ResumoPainel>('/painel-restaurante/resumo');
export const buscarFilaPedidos = (aba: AbaPedidos) => chamarApi<FilaPedidos>(`/painel-restaurante/pedidos?aba=${aba}`);
export const mudarStatusPedido = (id: string, acao: AcaoPedido, motivo?: string) =>
  chamarApi<PedidoPainel>(`/painel-restaurante/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ acao, motivo }) });

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  NOVO: 'Novo', ACEITO: 'Aceito', PREPARANDO: 'Preparando', PRONTO: 'Pronto', A_CAMINHO: 'A caminho', ENTREGUE: 'Entregue', RECUSADO: 'Recusado', CANCELADO: 'Cancelado',
};

// ---------- Cardápio (telas 38, 39, 40) ----------
export type StatusPrato = 'RASCUNHO' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' | 'PAUSADO';
export interface PratoLinha {
  id: string; nome: string; categoria: string; imagemUrl: string | null; preco: number; calorias: number | null; pedidos: number;
  status: StatusPrato; motivoRejeicao: string | null; tags: string[]; enviadoEm: string | null; avaliadoEm: string | null; tempoPreparoMin: number | null;
}
export interface Cardapio { pratos: PratoLinha[]; total: number; ativos: number; categorias: string[] }
export interface PratoForm {
  nome: string; descricao: string | null; categoria: string; preco: number | null; porcaoG: number | null; tempoPreparoMin: number | null; servePessoas: number | null;
  calorias: number | null; proteinas: number | null; carboidratos: number | null; gorduras: number | null; fibras: number | null; sodioMg: number | null;
  objetivos: string[]; alergenos: string[]; compatibilidades: string[]; tags: string[]; observacoesInternas: string | null; imagemUrl: string | null;
  ingredientes: { nome: string; quantidade: string | null }[]; ativo: boolean;
}
export interface PratoDetalhe { id: string; status: StatusPrato; motivoRejeicao: string | null; dados: PratoForm }
export interface SalvarPrato { id: string; status: StatusPrato; mensagem: string }

export const buscarCardapio = () => chamarApi<Cardapio>('/painel-restaurante/pratos');
export const buscarAlergenos = () => chamarApi<string[]>('/painel-restaurante/pratos/alergenos');
export const buscarPrato = (id: string) => chamarApi<PratoDetalhe>(`/painel-restaurante/pratos/${id}`);
export const salvarPrato = (id: string | null, f: PratoForm) =>
  chamarApi<SalvarPrato>(id ? `/painel-restaurante/pratos/${id}` : '/painel-restaurante/pratos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(f) });
export const alternarPausaPrato = (id: string) => chamarApi<SalvarPrato>(`/painel-restaurante/pratos/${id}/pausa`, { method: 'POST' });
export const reenviarPrato = (id: string) => chamarApi<SalvarPrato>(`/painel-restaurante/pratos/${id}/reenvio`, { method: 'POST' });
export const enviarFotoPrato = (arquivo: File) => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return chamarApi<{ url: string }>('/painel-restaurante/pratos/foto', { method: 'POST', body: corpo });
};
export const ROTULO_STATUS_PRATO: Record<StatusPrato, string> = {
  RASCUNHO: 'Rascunho', EM_ANALISE: 'Em análise', APROVADO: 'Ativo', REJEITADO: 'Rejeitado', PAUSADO: 'Pausado',
};

// ---------- Gestão (telas 41, 42, 43) ----------
export interface Comparado { atual: number | null; anterior: number | null }
export interface AnalyticsRestaurante {
  dias: number; pedidos: Comparado; faturamento: Comparado; nota: Comparado; recompra: Comparado;
  serie: { rotulo: string; data: string; pedidos: number; receita: number }[]; topPratos: { nome: string; pedidos: number; receita: number }[];
  distribuicao: Record<string, number>; totalAvaliacoes: number;
}
export interface FinanceiroRestaurante {
  mes: string; comissaoPercentual: number; bruto: number; brutoAnterior: number; comissao: number; liquido: number; jaPago: number;
  meses: { mes: string; liquido: number }[]; transacoes: { tipo: 'ENTRADA' | 'SAIDA'; descricao: string; data: string; valor: number; status: string }[];
  chavePix: string | null; tipoChavePix: string | null; titularPix: string | null; mesesDisponiveis: string[];
}
export interface RelatorioGerado { id: string; tipo: TipoRelatorio; formato: 'PDF' | 'CSV'; inicio: string; fim: string; geradoEm: string }
export type TipoRelatorio = 'VENDAS' | 'FINANCEIRO' | 'AVALIACOES' | 'CLIENTES' | 'CARDAPIO' | 'OPERACIONAL';

export const buscarAnalytics = (dias: number) => chamarApi<AnalyticsRestaurante>(`/painel-restaurante/analytics?dias=${dias}`);
export const buscarFinanceiro = (mes?: string) => chamarApi<FinanceiroRestaurante>(`/painel-restaurante/financeiro${mes ? `?mes=${mes}` : ''}`);
export const buscarRelatorios = () => chamarApi<RelatorioGerado[]>('/painel-restaurante/relatorios');

// ---------- Cadastro (07) e Perfil (44) ----------
export interface HorarioRestaurante { dia: number; aberto: boolean; abre: string; fecha: string }
export interface PerfilRestauranteForm {
  nome: string; razaoSocial: string | null; cnpj: string; telefone: string | null; slogan: string | null; descricao: string | null;
  cep: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string;
  tiposCozinha: string[]; horarios: HorarioRestaurante[];
  tempoEntregaMin: number | null; tempoEntregaMax: number | null; taxaEntrega: number | null; pedidoMinimo: number | null;
  chavePix: string | null; tipoChavePix: string | null; titularPix: string | null;
  logoUrl: string | null; capaUrl: string | null;
}
export interface PerfilRestauranteDto {
  id: string; email: string; statusAprovacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO'; motivoRejeicao: string | null;
  notaMedia: number | null; totalAvaliacoes: number; criadoEm: string; dados: PerfilRestauranteForm;
}
export interface CadastroRestauranteReq { nomeResponsavel: string; aceiteTermosEm: string; restaurante: PerfilRestauranteForm }

export const buscarPerfilRestaurante = () => chamarApi<PerfilRestauranteDto>('/painel-restaurante/perfil');
export const salvarPerfilRestaurante = (form: PerfilRestauranteForm) =>
  chamarApi<PerfilRestauranteDto>('/painel-restaurante/perfil', { method: 'PUT', body: JSON.stringify(form) });
export const enviarImagemPerfilRestaurante = (arquivo: File) => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return chamarApi<{ url: string }>('/painel-restaurante/perfil/imagem', { method: 'POST', body: corpo });
};
export const cadastrarRestaurante = (req: CadastroRestauranteReq) =>
  chamarApi<PerfilRestauranteDto>('/cadastro/restaurante', { method: 'POST', body: JSON.stringify(req) });
export const enviarLogoCadastroRestaurante = (arquivo: File) => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return chamarApi<{ url: string }>('/cadastro/restaurante/logo', { method: 'POST', body: corpo });
};
export const buscarCozinhasCadastro = () => chamarApi<string[]>('/cadastro/restaurante/cozinhas');

export const COZINHAS_PADRAO = [
  'Fitness', 'Saudável', 'Vegano', 'Vegetariano', 'Low Carb', 'Sem Glúten',
  'Pescetariano', 'Bowls', 'Integral', 'Marmitas', 'Sucos', 'Açaí',
];

export const ESTADOS_BR: { uf: string; nome: string }[] = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' }, { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' }, { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' }, { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' }, { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' }, { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
];

export function formatarCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatarCep(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function cnpjValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (pesos: number[]) => {
    const soma = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(d[12]) === d1 && Number(d[13]) === d2;
}

/** Baixa um arquivo autenticado (PDF/CSV) e dispara o download no navegador. */
export async function baixarArquivo(caminho: string, nomePadrao: string) {
  const { data } = await supabase.auth.getSession();
  const resposta = await fetch(`${API_URL}${caminho}`, { headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroApi(resposta.status, corpo?.codigo ?? 'ERRO', corpo?.mensagem ?? 'Não foi possível gerar o arquivo.');
  }
  const nome = /filename\*=UTF-8''([^;]+)/.exec(resposta.headers.get('content-disposition') ?? '')?.[1];
  const url = URL.createObjectURL(await resposta.blob());
  const link = document.createElement('a');
  link.href = url; link.download = nome ? decodeURIComponent(nome) : nomePadrao; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
