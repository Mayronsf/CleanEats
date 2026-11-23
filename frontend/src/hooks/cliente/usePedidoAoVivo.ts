import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtime } from '../useRealtime';
import { buscarPedido } from '../../services/cliente';

/**
 * Pedido do cliente atualizado em tempo real (telas 17 e 18, CE-14): qualquer mudança no pedido ou no histórico
 * de status (restaurante aceitou, saiu para entrega…) recarrega o detalhe na hora, via Supabase Realtime.
 */
export function usePedidoAoVivo(id: string) {
  const qc = useQueryClient();
  const consulta = useQuery({ queryKey: ['pedido', id], queryFn: () => buscarPedido(id), enabled: !!id });
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ['pedido', id] });
    void qc.invalidateQueries({ queryKey: ['cliente'] });
  };
  useRealtime('historico_status_pedido', `id_pedido=eq.${id}`, atualizar, 'INSERT', !!id);
  useRealtime('pedido', `id=eq.${id}`, atualizar, 'UPDATE', !!id);
  return consulta;
}
