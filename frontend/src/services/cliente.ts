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
  avaliacoes: { id: string; autor: string; nota: number; comentario: string | null; tags: string[]; data: string }[];
  similares: Prato[];
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

export interface FiltrosMarketplace {
  busca?: string; categoria?: string[]; proteinaMin?: number; caloriasMax?: number; precoMin?: number; precoMax?: number;
  idRestaurante?: string; notaMin?: number; ordenar?: string; favoritos?: boolean; pagina?: number; tamanho?: number;
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
export const listarCategorias = () => chamarApi<{ nome: string; total: number }[]>('/marmitas/categorias');
export const buscarMarmita = (id: string) => chamarApi<PratoDetalhe>(`/marmitas/${id}`);
export const favoritar = (id: string) => chamarApi<void>(`/favoritos/${id}`, { method: 'POST' });
export const desfavoritar = (id: string) => chamarApi<void>(`/favoritos/${id}`, { method: 'DELETE' });
export const buscarConsumo = (data?: string) => chamarApi<Consumo>(`/consumo-diario${query({ data })}`);
/** null = a nutricionista ainda não montou o plano (204). */
export const buscarPlano = async () => (await chamarApi<PlanoAlimentar | undefined>('/plano-alimentar')) ?? null;
export const buscarResumo = () => chamarApi<ResumoCliente>('/cliente/resumo');
