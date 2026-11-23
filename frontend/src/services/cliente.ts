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
export interface ItemPedidoReq { idMarmita: string | null; quantidade: number; observacao?: string; personalizacao?: Record<string, unknown> }
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
export const registrarAgua = (ml: number) => chamarApi<Consumo>('/consumo-diario/agua', { method: 'POST', body: JSON.stringify({ ml }) });

// ---------- Minha assinatura (tela 23) ----------
export type StatusAssinatura = 'FREE' | 'TRIAL' | 'ATIVA' | 'PAUSADA' | 'CANCELADA' | 'EXPIRADA';
export interface FaturaAssinatura {
  id: string; referencia: string; valor: number; status: 'PENDENTE' | 'PAGA' | 'FALHOU' | 'ESTORNADA';
  vencimento: string; pagaEm: string | null; tier: CodigoTierCliente; ciclo: 'MENSAL' | 'ANUAL'; formaPagamento: 'PIX' | 'CARTAO';
}
export type CodigoTierCliente = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
export interface MinhaAssinatura {
  tier: CodigoTierCliente; status: StatusAssinatura; ciclo: 'MENSAL' | 'ANUAL' | null; valor: number;
  formaPagamento: 'PIX' | 'CARTAO' | null; membroDesde: string | null; inicioEm: string | null; renovacaoEm: string | null;
  encerraEm: string | null; pausadaAte: string | null; totalEconomizado: number;
  uso: { nutribotMes: number; limiteNutribotDia: number; mensagensNutriSemana: number; descontoMes: number; percentualDesconto: number; semanaPlano: string | null };
  faturas: FaturaAssinatura[]; nutricionista: { nome: string; crn: string } | null;
}
export const buscarAssinatura = () => chamarApi<MinhaAssinatura>('/assinatura');
const acaoAssinatura = (caminho: string) => () => chamarApi<MinhaAssinatura>(`/assinatura/${caminho}`, { method: 'POST' });
export const cancelarAssinatura = acaoAssinatura('cancelamento');
export const reativarAssinatura = acaoAssinatura('reativacao');
export const pausarAssinatura = acaoAssinatura('pausa');
export const retomarAssinatura = acaoAssinatura('retomada');
export const trocarFormaPagamento = (formaPagamento: 'PIX' | 'CARTAO') =>
  chamarApi<MinhaAssinatura>('/assinatura/forma-pagamento', { method: 'PATCH', body: JSON.stringify({ formaPagamento }) });

// ---------- Perfil (telas 21 e 22) ----------
export type Objetivo = keyof typeof ROTULO_OBJETIVO;
export type NivelAtividade = 'SEDENTARIO' | 'LEVE' | 'MODERADO' | 'INTENSO' | 'ATLETA';
export interface PerfilCliente {
  id: string; nome: string; email: string; telefone: string | null; avatarUrl: string | null; capaUrl: string | null;
  username: string | null; bio: string | null; membroDesde: string; tier: CodigoTierCliente; sexo: 'F' | 'M' | 'O' | null;
  dataNascimento: string | null; idade: number | null; pesoKg: number | null; alturaCm: number | null; nivelAtividade: NivelAtividade | null;
  imc: number | null; classificacaoImc: string | null; objetivo: Objetivo;
  metas: { calorias: number | null; proteinas: number | null; carboidratos: number | null; gorduras: number | null; fibras: number | null; aguaMl: number | null };
  metaPesoKg: number | null; prazoMetaMeses: number | null; restricoes: { id: number; slug: string; nome: string }[];
  observacoesAlimentares: string | null; cidade: string | null; totalEnderecos: number; preferencias: Record<string, boolean>;
  nutricionista: { nome: string; crn: string; avatarUrl: string | null } | null;
}
export interface AtualizarPerfil {
  nome: string; telefone: string | null; username: string | null; bio: string | null; dataNascimento: string | null; sexo: 'F' | 'M' | 'O' | null;
  pesoKg: number | null; alturaCm: number | null; nivelAtividade: NivelAtividade | null; objetivo: Objetivo;
  metaPesoKg: number | null; prazoMetaMeses: number | null; restricoes: string[]; observacoesAlimentares: string | null;
}
export interface Conquista { codigo: string; nome: string; descricao: string; icone: string; obtida: boolean; obtidaEm: string | null; progresso: number; alvo: number }
export interface EstatisticasPerfil {
  pedidos: number; calorias: number; proteinas: number; avaliacoes: number; semanaInicio: string; diasRestantes: number;
  semana: { nome: string; consumido: number; meta: number | null; previstoRestante: number }[]; conquistas: Conquista[];
}
export const buscarPerfil = () => chamarApi<PerfilCliente>('/perfil');
export const atualizarPerfil = (dados: AtualizarPerfil) => chamarApi<PerfilCliente>('/perfil', { method: 'PUT', body: JSON.stringify(dados) });
export const buscarEstatisticasPerfil = () => chamarApi<EstatisticasPerfil>('/perfil/estatisticas');
const enviarImagemPerfil = (caminho: string) => (arquivo: File) => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return chamarApi<PerfilCliente>(caminho, { method: 'POST', body: corpo });
};
export const enviarAvatar = enviarImagemPerfil('/perfil/avatar');
export const enviarCapa = enviarImagemPerfil('/perfil/capa');
export const removerAvatar = () => chamarApi<PerfilCliente>('/perfil/avatar', { method: 'DELETE' });
export const salvarPreferenciasNotificacao = (p: Record<string, boolean>) =>
  chamarApi<Record<string, boolean>>('/perfil/preferencias-notificacao', { method: 'PUT', body: JSON.stringify(p) });
export const excluirConta = () => chamarApi<void>('/perfil', { method: 'DELETE' });

// ---------- Avaliar pedido (tela 20) ----------
export interface ContextoAvaliacao {
  idPedido: string; codigo: string; status: string; entregueEm: string | null; restaurante: string;
  itens: { idMarmita: string; nome: string; imagemUrl: string | null; avaliado: boolean }[]; tags: string[];
}
export interface NovaAvaliacao {
  idMarmita: string; nota: number; notaSabor: number | null; notaApresentacao: number | null; notaPorcao: number | null;
  notaEntrega: number | null; notaTemperatura: number | null; tags: string[]; comentario: string | null; fotos: string[]; anonima: boolean;
}
export const buscarContextoAvaliacao = (idPedido: string) => chamarApi<ContextoAvaliacao>(`/pedidos/${idPedido}/avaliacao`);
export const enviarAvaliacao = (idPedido: string, a: NovaAvaliacao) =>
  chamarApi<{ id: string; statusModeracao: string }>(`/pedidos/${idPedido}/avaliacoes`, { method: 'POST', body: JSON.stringify(a) });
export const enviarFotoAvaliacao = (arquivo: File) => {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  return chamarApi<{ url: string }>('/avaliacoes/fotos', { method: 'POST', body: corpo });
};

// ---------- Monte sua marmita (tela 15) ----------
export type CategoriaComponente = 'PROTEINA' | 'CARBOIDRATO' | 'VEGETAL' | 'ADICIONAL';
export interface ComponenteMarmita {
  id: string; categoria: CategoriaComponente; nome: string; porcaoG: number; calorias: number; proteinas: number; carboidratos: number;
  gorduras: number; fibras: number; preco: number; permiteTamanho: boolean; imagemUrl: string | null;
}
export interface CatalogoMonte {
  restaurante: RestauranteMini; componentes: ComponenteMarmita[];
  tamanhos: { codigo: 'P' | 'M' | 'G'; nome: string; fator: number; ajustePreco: number }[];
  limites: { categoria: CategoriaComponente; minimo: number; maximo: number }[];
  metaPorRefeicao: Record<Objetivo, number>; objetivo: Objetivo | null;
}
export interface SelecaoMonte { proteina: string | null; carboidrato: string | null; tamanho: 'P' | 'M' | 'G'; vegetais: string[]; adicionais: string[] }
export interface CalculoMonte {
  idRestaurante: string; nome: string; descricao: string; preco: number; calorias: number; proteinas: number; carboidratos: number;
  gorduras: number; fibras: number; personalizacao: Record<string, unknown>;
}
export const buscarComponentesMarmita = () => chamarApi<CatalogoMonte>('/componentes-marmita');
export const calcularMarmita = (s: SelecaoMonte) => chamarApi<CalculoMonte>('/componentes-marmita/calculo', { method: 'POST', body: JSON.stringify(s) });
