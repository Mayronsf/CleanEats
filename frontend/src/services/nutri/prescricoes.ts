import { chamarApi } from '../api';

export interface PaginaDto<T> { itens: T[]; pagina: number; totalPaginas: number; totalItens: number }
export interface ClientePrescricao {
  id: string; nome: string; email: string; tier: string; pesoKg: number | null; alturaCm: number | null; objetivo: string | null;
  calorias: number | null; proteinas: number | null; carboidratos: number | null; gorduras: number | null; fibras: number | null; aguaMl: number | null; premium: boolean;
}
export interface RefeicaoPrescricao { dia: string; tipo: string; prato: string; observacao: string | null }
export interface PreviaPrescricao extends Omit<ClientePrescricao, 'id' | 'nome'> {
  idCliente: string; nomeCliente: string; planoAtivo: boolean; nomeNutri: string; crn: string; refeicoes: RefeicaoPrescricao[];
}
export interface PrescricaoHistorico { id: string; nomeCliente: string; tier: string; emitidaEm: string; hashDocumento: string; enviadaEmail: boolean }
export interface EmissaoPrescricao { id: string; pdfUrl: string; hashDocumento: string; emailEnviado: boolean; mensagem: string }

export const buscarClientesElegiveis = () => chamarApi<ClientePrescricao[]>('/nutri/prescricoes/clientes-elegiveis');
export const buscarPreviaPrescricao = (cliente: string) => chamarApi<PreviaPrescricao>(`/nutri/prescricoes/previa?cliente=${encodeURIComponent(cliente)}`);
export const emitirPrescricao = (idCliente: string, observacoes: string) => chamarApi<EmissaoPrescricao>('/nutri/prescricoes', { method: 'POST', body: JSON.stringify({ idCliente, observacoes }) });
export const listarPrescricoes = (pagina = 0, tamanho = 10) => chamarApi<PaginaDto<PrescricaoHistorico>>(`/nutri/prescricoes?pagina=${pagina}&tamanho=${tamanho}`);
export const baixarPrescricao = async (id: string) => {
  const { url } = await chamarApi<{ url: string }>(`/nutri/prescricoes/${id}/pdf`);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = 'prescricao-nutricional.pdf';
  link.click();
};
