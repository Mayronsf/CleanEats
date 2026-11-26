import { chamarApi } from '../api';

export type StatusTriagem = 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDA';
export type OrdenacaoTriagem = 'ANTIGAS' | 'RECENTES' | 'TIER';
export interface CalculoBasalTriagem {
  tmb: number; get: number; ajusteKcal: number; protocolo: string; descricaoProtocolo: string;
  calorias: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number; aguaMl: number;
}
export interface Triagem {
  id: string; idCliente: string; status: StatusTriagem; nome: string; tier: string; idade: number | null; pesoKg: number | null; alturaCm: number | null;
  sexo?: string | null; nivelAtividade?: string | null;
  objetivo: string; calculoBasal?: CalculoBasalTriagem | null;
  restricoes: string[]; rotina: string; condicoesSaude: string[]; criadoEm: string; iniciadaEm: string | null;
  concluidaEm: string | null; observacoes: string | null;
}
export interface ListaTriagens {
  pagina: { itens: Triagem[]; pagina: number; totalPaginas: number; totalItens: number };
  contagens: Record<StatusTriagem, number>;
}
export interface MetasTriagem {
  kcal: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number; aguaMl: number; observacoes: string;
}
export const buscarTriagens = (status: StatusTriagem, ordenacao: OrdenacaoTriagem, pagina: number) =>
  chamarApi<ListaTriagens>(`/nutri/triagens?status=${status}&ordenacao=${ordenacao}&pagina=${pagina}&limite=10`);
export const iniciarTriagem = (id: string) => chamarApi(`/nutri/triagens/${id}/iniciar`, { method: 'POST' });
export const concluirTriagem = (id: string, metas: MetasTriagem) =>
  chamarApi(`/nutri/triagens/${id}/concluir`, { method: 'POST', body: JSON.stringify(metas) });

export interface Disponibilidade { dia: number; inicio: string; fim: string }
export interface CadastroNutri {
  nome: string; crn: string; especialidades: string[]; anosExperiencia: number; bio: string;
  disponibilidade: Disponibilidade[]; aceiteTermosEm: string;
}
export const cadastrarNutricionista = (dados: CadastroNutri) =>
  chamarApi('/cadastro/nutricionista', { method: 'POST', body: JSON.stringify(dados) });
