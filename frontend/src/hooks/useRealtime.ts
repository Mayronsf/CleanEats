import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

type Evento = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Escuta mudanças de uma tabela via Supabase Realtime (RLS garante que só chegam linhas do usuário).
 * COMPARTILHADO — tabelas publicadas: pedido, historico_status_pedido, mensagem, notificacao.
 *
 * Uso típico com TanStack Query:
 *   useRealtime('historico_status_pedido', `id_pedido=eq.${id}`, () => queryClient.invalidateQueries({ queryKey: ['pedido', id] }));
 */
export function useRealtime<T extends Record<string, unknown>>(
  tabela: 'pedido' | 'historico_status_pedido' | 'mensagem' | 'notificacao',
  filtro: string | undefined,
  aoMudar: (linha: T, evento: Evento) => void,
  evento: Evento = '*',
  ativo = true,
) {
  const callback = useRef(aoMudar);
  callback.current = aoMudar;

  useEffect(() => {
    if (!ativo) return;
    const canal = supabase
      .channel(`rt-${tabela}-${filtro ?? 'todos'}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes' as never,
        { event: evento, schema: 'public', table: tabela, ...(filtro ? { filter: filtro } : {}) },
        (payload: { new: T; old: T; eventType: Evento }) =>
          callback.current((payload.eventType === 'DELETE' ? payload.old : payload.new) as T, payload.eventType),
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [tabela, filtro, evento, ativo]);
}
