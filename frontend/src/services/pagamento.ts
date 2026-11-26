import { chamarApi } from './api';

export interface ConfigGatewayPagamento {
  modo: 'MERCADO_PAGO' | 'MERCADO_PAGO_PIX' | 'SIMULADO';
  publicKey: string | null;
}

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

export interface PagamentoCartaoReq {
  valor: number;
  descricao: string;
  referencia?: string;
  token?: string;
  paymentMethodId: string;
  parcelas: number;
  ultimos4: string;
  titular: string;
  cpf: string;
  validade: string;
  cvv?: string;
}

export interface PagamentoCartaoRes {
  id: string;
  modo: 'MERCADO_PAGO' | 'SIMULADO';
  status: 'APROVADO' | 'PENDENTE' | 'REJEITADO';
  detalheStatus: string;
  valor: number;
  parcelas: number;
  bandeira: string;
  ultimos4: string;
  codigoAutorizacao: string | null;
  pagoEm: string | null;
}

export const buscarConfigPagamento = () => chamarApi<ConfigGatewayPagamento>('/pagamentos/config');

export const criarCobrancaPix = (dados: { valor: number; descricao: string; referencia?: string }) =>
  chamarApi<CobrancaPix>('/pagamentos/pix', { method: 'POST', body: JSON.stringify(dados) });

export const consultarStatusPix = (id: string) =>
  chamarApi<StatusPix>(`/pagamentos/pix/${encodeURIComponent(id)}/status`);

export const confirmarPixDemo = (id: string) =>
  chamarApi<StatusPix>(`/pagamentos/pix/${encodeURIComponent(id)}/confirmar-demo`, { method: 'POST' });

export const processarPagamentoCartao = (dados: PagamentoCartaoReq) =>
  chamarApi<PagamentoCartaoRes>('/pagamentos/cartao', { method: 'POST', body: JSON.stringify(dados) });
