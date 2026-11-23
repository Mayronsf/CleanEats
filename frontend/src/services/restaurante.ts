import { chamarApi } from './api';

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
