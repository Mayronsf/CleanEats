import { chamarApi } from './api';

export type TipoNotificacao = 'PEDIDO' | 'CARDAPIO' | 'NUTRICIONISTA' | 'ASSINATURA' | 'SISTEMA';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

export interface Pagina<T> { itens: T[]; pagina: number; totalPaginas: number; totalItens: number }

export const listarNotificacoes = (pagina = 0, tamanho = 10) =>
  chamarApi<Pagina<Notificacao>>(`/notificacoes?pagina=${pagina}&tamanho=${tamanho}`);
export const contarNaoLidas = () => chamarApi<{ total: number }>('/notificacoes/nao-lidas');
export const marcarComoLida = (id: string) => chamarApi<Notificacao>(`/notificacoes/${id}/leitura`, { method: 'PATCH' });
export const marcarTodasComoLidas = () => chamarApi<{ atualizadas: number }>('/notificacoes/leitura', { method: 'PATCH' });
