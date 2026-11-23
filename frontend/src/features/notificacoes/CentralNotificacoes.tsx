import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CreditCard, Info, ShoppingBag, Stethoscope, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { formatarData, formatarHora } from '../../lib/formato';
import {
  contarNaoLidas, listarNotificacoes, marcarComoLida, marcarTodasComoLidas, type Notificacao, type TipoNotificacao,
} from '../../services/notificacoes';
import s from './CentralNotificacoes.module.css';

const ICONE: Record<TipoNotificacao, LucideIcon> = {
  PEDIDO: ShoppingBag, CARDAPIO: UtensilsCrossed, NUTRICIONISTA: Stethoscope, ASSINATURA: CreditCard, SISTEMA: Info,
};

function quando(iso: string) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`;
  return `${formatarData(d)} · ${formatarHora(d)}`;
}

/**
 * CE-13 — sino com painel de notificações. COMPARTILHADO: usado na navbar do cliente e na sidebar dos painéis.
 * Novas notificações chegam por Supabase Realtime (tabela notificacao, filtrada pelo próprio usuário).
 */
export function CentralNotificacoes({ variante = 'navbar' }: { variante?: 'navbar' | 'painel' }) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idPainel = useId();

  const naoLidas = useQuery({ queryKey: ['notificacoes', 'nao-lidas'], queryFn: contarNaoLidas, enabled: !!usuario, refetchInterval: 60_000 });
  const lista = useInfiniteQuery({
    queryKey: ['notificacoes', 'lista'],
    queryFn: ({ pageParam }) => listarNotificacoes(pageParam, 8),
    initialPageParam: 0,
    getNextPageParam: (ultima) => (ultima.pagina + 1 < ultima.totalPaginas ? ultima.pagina + 1 : undefined),
    enabled: !!usuario && aberto,
  });
  const atualizar = () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] });

  useRealtime<{ titulo: string }>('notificacao', usuario ? `id_usuario=eq.${usuario.id}` : undefined, (linha) => {
    atualizar();
    if (linha?.titulo) toast(linha.titulo, 'info');
  }, 'INSERT', !!usuario);

  const lerUma = useMutation({ mutationFn: marcarComoLida, onSuccess: atualizar });
  const lerTodas = useMutation({ mutationFn: marcarTodasComoLidas, onSuccess: atualizar });

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', fechar); };
  }, [aberto]);

  if (!usuario) return null;
  const total = naoLidas.data?.total ?? 0;
  const itens = lista.data?.pages.flatMap((p) => p.itens) ?? [];

  function abrir(n: Notificacao) {
    if (!n.lida) lerUma.mutate(n.id);
    if (n.link) { setAberto(false); navegar(n.link); }
  }

  return (
    <div className={`${s.raiz} ${s[variante]}`} ref={raiz}>
      <button type="button" className={s.sino} onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto} aria-controls={idPainel}
        aria-label={total > 0 ? `Notificações, ${total} não ${total === 1 ? 'lida' : 'lidas'}` : 'Notificações'}>
        <Bell size={18} aria-hidden />
        {total > 0 && <span className={s.contador} aria-hidden>{total > 9 ? '9+' : total}</span>}
      </button>

      {aberto && (
        <section id={idPainel} className={s.janela} aria-label="Notificações">
          <header className={s.cabeca}>
            <h2>Notificações</h2>
            {total > 0 && (
              <button type="button" className={s.lerTodas} onClick={() => lerTodas.mutate()} disabled={lerTodas.isPending}>
                Marcar todas como lidas
              </button>
            )}
          </header>
          <div className={s.lista}>
            {lista.isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className={s.esqueleto}><Skeleton altura={36} largura={36} raio={10} /><div><Skeleton altura={12} largura="70%" /><Skeleton altura={10} largura="90%" /></div></div>)}
            {lista.isError && <ErroCarregamento onTentarNovamente={() => lista.refetch()} />}
            {lista.isSuccess && itens.length === 0 && (
              <div className={s.vazio}><BellOff size={22} aria-hidden /><p>Nenhuma notificação por enquanto.</p></div>
            )}
            {itens.map((n) => {
              const Icone = ICONE[n.tipo];
              return (
                <button key={n.id} type="button" className={`${s.item} ${n.lida ? '' : s.naoLida}`} onClick={() => abrir(n)}>
                  <span className={`${s.icone} ${s[`tipo-${n.tipo}`]}`} aria-hidden><Icone size={16} /></span>
                  <span className={s.texto}>
                    <span className={s.titulo}>{n.titulo}{!n.lida && <span className="sr-only"> (não lida)</span>}</span>
                    {n.corpo && <span className={s.corpo}>{n.corpo}</span>}
                    <span className={s.quando}>{quando(n.criadoEm)}</span>
                  </span>
                  {!n.lida && <span className={s.ponto} aria-hidden />}
                </button>
              );
            })}
          </div>
          {lista.hasNextPage && (
            <button type="button" className={s.mais} onClick={() => lista.fetchNextPage()} disabled={lista.isFetchingNextPage}>
              {lista.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
