import { chamarApi } from '../api';

export type Pagina<T> = { itens: T[]; pagina: number; totalPaginas: number; totalItens: number };
export type Adesao = { pedidas: number; planejadas: number; percentual: number | null };
export type ClienteLinha = {
  id: string; nome: string; avatarUrl: string | null; tier: string; objetivo: string;
  idade: number | null; pesoKg: number | null; alturaCm: number | null; adesao: Adesao;
  ultimoPedido: string | null; statusUltimoPedido: string | null;
};
export type FiltrosClientes = { busca?: string; tier?: string; objetivo?: string; ordem?: 'nome' | 'adesao' | 'recentes'; pagina?: number; tamanho?: number };
export type PedidoCliente = { id: string; codigo: string; status: string; criadoEm: string; itens: { nome: string; quantidade: number; imagemUrl: string | null; calorias: number; proteinas: number }[] };
export type Medicao = { id: string; data: string; pesoKg: number | null; gorduraPercentual: number | null; cinturaCm: number | null; observacao: string | null };
export type PerfilNutriCliente = {
  cliente: ClienteLinha; email: string; clienteDesde: string; sexo: string | null; dataNascimento: string | null; restricoes: string[];
  metas: { calorias: number | null; proteinas: number | null; carboidratos: number | null; gorduras: number | null; fibras: number | null; aguaMl: number | null };
  adesaoDias: { data: string; planejadas: number; pedidas: number }[]; pedidos: PedidoCliente[]; medicoes: Medicao[];
};

function query(f: FiltrosClientes) {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([chave, valor]) => { if (valor !== undefined && valor !== '') q.set(chave, String(valor)); });
  return q.size ? `?${q.toString()}` : '';
}
export const listarClientesNutri = (f: FiltrosClientes = {}) => chamarApi<Pagina<ClienteLinha>>(`/nutri/clientes${query(f)}`);
export const buscarPerfilNutriCliente = (id: string) => chamarApi<PerfilNutriCliente>(`/nutri/clientes/${id}`);
export const listarPedidosNutriCliente = (id: string) => chamarApi<PedidoCliente[]>(`/nutri/clientes/${id}/pedidos`);
export type NovaMedicao = { pesoKg: number; gorduraPercentual?: number | null; cinturaCm?: number | null; observacao?: string | null };
export function registrarMedicaoNutri(id: string, dados: NovaMedicao) {
  if (!Number.isFinite(dados.pesoKg) || dados.pesoKg < 20 || dados.pesoKg > 400) throw new Error('O peso deve estar entre 20 e 400 kg.');
  return chamarApi<Medicao>(`/nutri/clientes/${id}/medicoes`, { method: 'POST', body: JSON.stringify(dados) });
}
