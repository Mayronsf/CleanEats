import { chamarApi } from './api';

export interface CobrancaPix {
  id: string;
  modo: 'MERCADO_PAGO' | 'SIMULADO';
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
  valor: number;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiraEm: string;
}

export interface StatusPix {
  id: string;
  modo: 'MERCADO_PAGO' | 'SIMULADO';
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
  pagoEm: string | null;
}

export const criarCobrancaPix = (dados: { valor: number; descricao: string; referencia?: string }) =>
  chamarApi<CobrancaPix>('/pagamentos/pix', { method: 'POST', body: JSON.stringify(dados) });

export const consultarStatusPix = (id: string) =>
  chamarApi<StatusPix>(`/pagamentos/pix/${encodeURIComponent(id)}/status`);

export const confirmarPixDemo = (id: string) =>
  chamarApi<StatusPix>(`/pagamentos/pix/${encodeURIComponent(id)}/confirmar-demo`, { method: 'POST' });
