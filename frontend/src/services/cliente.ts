import { chamarApi } from './api';
export interface PaginaDto<T> { itens: T[]; pagina: number; totalPaginas: number; totalItens: number }

/** Serviços da área do cliente (telas 10–25). Dono: frente A. */

export interface MacrosApi { calorias: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number | null }
export interface RestauranteMini { id: string; nome: string; sigla: string; tempoEntregaMin: number; tempoEntregaMax: number; taxaEntrega: number }
export interface Prato {
  id: string; nome: string; descricao: string | null; categoria: string; imagemUrl: string | null; preco: number; porcaoG: number | null;
  macros: MacrosApi; nota: number; totalAvaliacoes: number; aprovadoPorNutri: boolean; objetivos: string[];
  restaurante: RestauranteMini; favorito: boolean; doObjetivo: boolean;
}
export interface PratoDetalhe {
  prato: Prato; sodioMg: number | null;
  ingredientes: { nome: string; quantidade: string | null; preparo: string | null }[];
  compativelCom: string[];
  avaliacoes: { id: string; autor: string; avatarUrl: string | null; nota: number; comentario: string | null; tags: string[]; data: string; codigoPedido: string }[];
  similares: Prato[];
  restaurante: { cidade: string; nota: number; totalAvaliacoes: number; logoUrl: string | null };
}
export interface Nutrientes { calorias: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number; aguaMl: number }
export interface Consumo { data: string; consumo: Nutrientes; metas: Nutrientes }
export type TipoRefeicao = 'CAFE_DA_MANHA' | 'LANCHE_MANHA' | 'ALMOCO' | 'LANCHE_TARDE' | 'JANTAR' | 'CEIA';
export interface RefeicaoPlano {
  id: string; diaSemana: number; data: string; tipo: TipoRefeicao; horario: string | null; observacao: string | null;
  consumida: boolean; prato: Prato;
}
export interface PlanoAlimentar {
  id: string; semanaInicio: string; semanaFim: string; observacoes: string | null; atualizadoEm: string; metas: Nutrientes;
  nutricionista: { id: string; nome: string; crn: string; avatarUrl: string | null };
  refeicoes: RefeicaoPlano[];
}
export interface ResumoCliente {
  nome: string; tier: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM'; objetivo: 'EMAGRECIMENTO' | 'GANHO_MASSA' | 'EQUILIBRIO' | null;
  restaurantes: number; pedidos: number; favoritos: number; notificacoesNaoLidas: number;
}

export const ROTULO_REFEICAO: Record<TipoRefeicao, string> = {
  CAFE_DA_MANHA: 'Café da manhã', LANCHE_MANHA: 'Lanche da manhã', ALMOCO: 'Almoço',
  LANCHE_TARDE: 'Lanche', JANTAR: 'Jantar', CEIA: 'Ceia',
};
export const ROTULO_OBJETIVO = { EMAGRECIMENTO: 'Emagrecimento', GANHO_MASSA: 'Ganho de massa', EQUILIBRIO: 'Dieta equilibrada' } as const;

export type Selo = 'alta-proteina' | 'vegano' | 'sem-gluten' | 'low-carb' | 'sem-lactose' | 'pescetariano';
export type Ordenacao = 'relevancia' | 'nota' | 'preco_asc' | 'preco_desc' | 'proteina' | 'calorias';
export interface FiltrosMarketplace {
  busca?: string; selo?: Selo; proteina?: string[]; calorias?: string[]; precoMin?: number; precoMax?: number;
  restaurante?: string[]; notaMin?: number; ordenar?: Ordenacao; favoritos?: boolean; pagina?: number; tamanho?: number;
}
export interface Facetas {
  total: number; precoMin: number | null; precoMax: number | null;
  calorias: { faixa: string; total: number }[]; proteinas: { faixa: string; total: number }[];
  restaurantes: { id: string; nome: string; total: number }[]; nota45: number; nota40: number;
}

function query(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)));
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const listarMarmitas = (f: FiltrosMarketplace = {}) => chamarApi<PaginaDto<Prato>>(`/marmitas${query({ ...f })}`);
export const buscarFacetas = (f: Pick<FiltrosMarketplace, 'busca' | 'selo' | 'favoritos'>) => chamarApi<Facetas>(`/marmitas/facetas${query({ ...f })}`);
export const listarCategorias = () => chamarApi<{ nome: string; total: number }[]>('/marmitas/categorias');
export const buscarMarmita = (id: string) => chamarApi<PratoDetalhe>(`/marmitas/${id}`);
export const favoritar = (id: string) => chamarApi<void>(`/favoritos/${id}`, { method: 'POST' });
export const desfavoritar = (id: string) => chamarApi<void>(`/favoritos/${id}`, { method: 'DELETE' });
export const buscarConsumo = (data?: string) => chamarApi<Consumo>(`/consumo-diario${query({ data })}`);
/** null = a nutricionista ainda não montou o plano (204). */
export const buscarPlano = async () => (await chamarApi<PlanoAlimentar | undefined>('/plano-alimentar')) ?? null;
export const buscarResumo = () => chamarApi<ResumoCliente>('/cliente/resumo');

// ---------- Checkout (tela 16) ----------
export interface ItemPedidoReq { idMarmita: string; quantidade: number; observacao?: string; personalizacao?: Record<string, unknown> }
export interface PedidoReq {
  itens: ItemPedidoReq[]; cupom?: string; idEndereco?: string; formaPagamento?: 'PIX' | 'CREDITO' | 'DINHEIRO';
  agendadoPara?: string; observacao?: string;
}
export interface Previa {
  idRestaurante: string; restaurante: string; quantidadeItens: number; subtotal: number; tier: string; percentualTier: number;
  descontoTier: number; cupom: { codigo: string; descricao: string | null; percentual: number | null; valor: number } | null;
  erroCupom: string | null; taxaEntrega: number; entregaGratis: boolean; total: number; pedidoMinimo: number; abaixoDoMinimo: boolean;
  calorias: number; proteinas: number; carboidratos: number; gorduras: number; tempoEntregaMin: number; tempoEntregaMax: number;
  itens: { idMarmita: string; nome: string; quantidade: number; precoUnitario: number; total: number }[];
}
export const previaPedido = (req: PedidoReq) => chamarApi<Previa>('/pedidos/previa', { method: 'POST', body: JSON.stringify(req) });
export const confirmarPedido = (req: PedidoReq) => chamarApi<{ id: string; codigo: string }>('/pedidos', { method: 'POST', body: JSON.stringify(req) });

// ---------- Endereços (telas 16 e 22) ----------
export interface Endereco {
  id: string; apelido: string; cep: string; logradouro: string; numero: string; complemento: string | null;
  bairro: string; cidade: string; uf: string; principal: boolean;
}
export type EnderecoNovo = Omit<Endereco, 'id'>;
export const listarEnderecos = () => chamarApi<Endereco[]>('/enderecos');
export const criarEndereco = (e: EnderecoNovo) => chamarApi<Endereco>('/enderecos', { method: 'POST', body: JSON.stringify(e) });
export const atualizarEndereco = (id: string, e: EnderecoNovo) => chamarApi<Endereco>(`/enderecos/${id}`, { method: 'PUT', body: JSON.stringify(e) });
export const excluirEndereco = (id: string) => chamarApi<void>(`/enderecos/${id}`, { method: 'DELETE' });
export const formatarCep = (cep: string) => cep.replace(/\D/g, '').replace(/^(\d{5})(\d{0,3}).*/, (_, a: string, b: string) => (b ? `${a}-${b}` : a));

// ---------- Pedidos (telas 17, 18, 19) ----------
export type StatusPedido = 'NOVO' | 'ACEITO' | 'RECUSADO' | 'PREPARANDO' | 'PRONTO' | 'A_CAMINHO' | 'ENTREGUE' | 'CANCELADO';
export interface PedidoDetalhe {
  id: string; codigo: string; status: StatusPedido; criadoEm: string; agendadoPara: string | null; previsaoEntregaEm: string | null;
  entregueEm: string | null; entregadorNome: string | null; formaPagamento: 'PIX' | 'CREDITO' | 'DINHEIRO'; subtotal: number; desconto: number;
  taxaEntrega: number; total: number; cupom: string | null; observacao: string | null; motivoRecusa: string | null; avaliado: boolean;
  podeCancelar: boolean; calorias: number; proteinas: number; carboidratos: number; gorduras: number;
  restaurante: { id: string; nome: string; sigla: string; telefone: string | null; tempoEntregaMin: number; tempoEntregaMax: number };
  endereco: { apelido: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string } | null;
  itens: { idMarmita: string | null; nome: string; quantidade: number; precoUnitario: number; calorias: number; proteinas: number; carboidratos: number; gorduras: number; imagemUrl: string | null; observacao: string | null }[];
  historico: { status: StatusPedido; em: string }[];
}
export interface PedidoResumo {
  id: string; codigo: string; status: StatusPedido; criadoEm: string; idRestaurante: string; restaurante: string; sigla: string;
  itens: string; quantidadeItens: number; calorias: number; proteinas: number; carboidratos: number; total: number; avaliado: boolean; notaDada: number | null; motivo: string | null;
  imagens: string[];
}
export interface ResumoHistorico {
  total: number; esteMes: number; gastoTotal: number; gastoMes: number; kcalTotal: number; notaMedia: number | null; avaliacoesDadas: number;
  andamento: number; entregues: number; cancelados: number; meses: { mes: string; pedidos: number; total: number }[];
}
export const FORMA_PAGAMENTO = { PIX: 'Pix', CREDITO: 'Cartão de crédito', DINHEIRO: 'Dinheiro' } as const;
export const buscarPedido = (id: string) => chamarApi<PedidoDetalhe>(`/pedidos/${id}`);
export const cancelarPedido = (id: string, motivo?: string) => chamarApi<PedidoDetalhe>(`/pedidos/${id}/cancelamento`, { method: 'POST', body: JSON.stringify({ motivo }) });
export const pedirNovamente = (id: string) => chamarApi<{ itens: { prato: Prato; quantidade: number; observacao: string | null }[]; indisponiveis: string[] }>(`/pedidos/${id}/pedir-novamente`, { method: 'POST' });
export const listarHistorico = (f: { status?: string; periodo?: string; ordenar?: string; pagina?: number; tamanho?: number }) =>
  chamarApi<PaginaDto<PedidoResumo>>(`/historico-pedidos${query({ ...f })}`);
export const buscarResumoHistorico = () => chamarApi<ResumoHistorico>('/historico-pedidos/resumo');

// ---------- Restaurantes (telas 13 e 14) ----------
export interface Restaurante {
  id: string; nome: string; sigla: string; descricao: string | null; capaUrl: string | null; logoUrl: string | null; cozinhas: string[];
  nota: number; totalAvaliacoes: number; tempoEntregaMin: number; tempoEntregaMax: number; taxaEntrega: number; pedidoMinimo: number;
  pratos: number; aberto: boolean; abreAs: string | null; destaque: boolean; bairro: string | null;
}
export interface RestauranteDetalhe {
  restaurante: Restaurante; logradouro: string | null; numero: string | null; cep: string | null; cidade: string; uf: string; telefone: string | null;
  horarios: { diaSemana: number; abre: string; fecha: string }[]; destaques: Prato[]; secoes: { categoria: string; pratos: Prato[] }[];
  curadoria: { nome: string; crn: string } | null;
}
export const listarRestaurantes = (f: { cozinha?: string; busca?: string; ordenar?: string; pagina?: number; tamanho?: number }) =>
  chamarApi<PaginaDto<Restaurante>>(`/restaurantes${query({ ...f })}`);
export const buscarResumoRestaurantes = () => chamarApi<{ total: number; tiposCozinha: number; notaMedia: number | null; cozinhas: { nome: string; total: number }[] }>('/restaurantes/resumo');
export const buscarRestaurante = (id: string) => chamarApi<RestauranteDetalhe>(`/restaurantes/${id}`);
