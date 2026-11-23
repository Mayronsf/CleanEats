import { chamarApi } from '../api';

export interface PaginaDto<T> { itens: T[]; pagina: number; totalPaginas: number; totalItens: number }

export interface MacrosNutri {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras?: number | null;
}

export interface PratoCatalogoNutri {
  id: string;
  nome: string;
  categoria: string;
  imagemUrl: string | null;
  preco: number;
  calorias?: number;
  proteinas?: number;
  carboidratos?: number;
  gorduras?: number;
  fibras?: number | null;
  macros?: MacrosNutri;
  restaurante: { id: string; nome: string; sigla: string };
  compatibilidades?: string[];
}

export interface FiltrosCatalogoNutri {
  busca?: string;
  restaurante?: string;
  categoria?: string;
  proteina?: string[];
  restricao?: string;
  pagina?: number;
  tamanho?: number;
}

export interface ClienteNutri {
  id: string;
  nome: string;
  avatarUrl?: string | null;
  objetivo?: string | null;
  tier?: string | null;
  metas?: MacrosNutri;
}

export type TipoRefeicaoNutri = 'CAFE_DA_MANHA' | 'LANCHE_MANHA' | 'ALMOCO' | 'LANCHE_TARDE' | 'JANTAR' | 'CEIA';

export interface RefeicaoPlanoNutri {
  id?: string;
  diaSemana: number;
  tipo?: TipoRefeicaoNutri;
  tipoRefeicao?: TipoRefeicaoNutri;
  observacao: string | null;
  prato: PratoCatalogoNutri | null;
}

export interface PlanoNutri {
  id?: string;
  semanaInicio: string;
  semanaFim?: string;
  metas: MacrosNutri;
  refeicoes: RefeicaoPlanoNutri[];
}

export interface SalvarPlanoNutri {
  refeicoes: { diaSemana: number; tipo: TipoRefeicaoNutri; idMarmita: string; observacao: string | null }[];
}

function consulta(params: Record<string, string | number | string[] | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== '' && !(Array.isArray(valor) && valor.length === 0)) query.set(chave, Array.isArray(valor) ? valor.join(',') : String(valor));
  });
  const texto = query.toString();
  return texto ? `?${texto}` : '';
}

export const listarCatalogoNutri = (filtros: FiltrosCatalogoNutri) =>
  chamarApi<PaginaDto<PratoCatalogoNutri>>(`/nutri/catalogo${consulta({ ...filtros, tamanho: 12 })}`);

export const listarClientesNutri = () =>
  chamarApi<PaginaDto<ClienteNutri> | ClienteNutri[]>('/nutri/clientes?pagina=0&tamanho=100').then((resposta) =>
    Array.isArray(resposta) ? resposta : resposta.itens,
  );

export const buscarPlanoNutri = (idCliente: string) =>
  chamarApi<PlanoNutri | undefined>(`/nutri/clientes/${idCliente}/plano`).then((plano) => plano ?? null);

export const salvarPlanoNutri = (idCliente: string, plano: SalvarPlanoNutri) =>
  chamarApi<PlanoNutri>(`/nutri/clientes/${idCliente}/plano`, { method: 'PUT', body: JSON.stringify(plano) });
