import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquareQuote, Star, X } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../design-system';
import { formatarData } from '../../lib/formato';
import { ErroApi } from '../../services/api';
import { buscarAvaliacoesAdmin, moderarAvaliacao, type AvaliacaoAdmin } from '../../services/admin';
import { DecisaoDialog } from './DecisaoDialog';
import s from './Admin.module.css';

const ABAS = [{ v: 'PENDENTE', r: 'Pendentes' }, { v: 'PUBLICADA', r: 'Publicadas' }, { v: 'REJEITADA', r: 'Rejeitadas' }];
const SUGESTOES = ['Linguagem ofensiva', 'Conteúdo que não fala do prato', 'Dados pessoais no comentário', 'Propaganda ou spam'];

/** /admin/avaliacoes — Moderação (CE-11): publicar (recalcula a nota do prato e do restaurante) ou rejeitar com motivo. */
export default function AvaliacoesAdminPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useSearchParams();
  const status = busca.get('status') ?? 'PENDENTE';
  const dados = useQuery({ queryKey: ['admin', 'avaliacoes', status], queryFn: () => buscarAvaliacoesAdmin(status), refetchInterval: 30_000 });
  const [rejeitar, setRejeitar] = useState<AvaliacaoAdmin | null>(null);
  const moderar = useMutation({
    mutationFn: ({ a, aprovado, motivo }: { a: AvaliacaoAdmin; aprovado: boolean; motivo?: string }) => moderarAvaliacao(a.id, aprovado, motivo),
    onSuccess: (_, v) => { setRejeitar(null); toast(v.aprovado ? 'Avaliação publicada: a nota do prato foi atualizada.' : 'Avaliação rejeitada. O cliente foi avisado.', 'sucesso'); void qc.invalidateQueries({ queryKey: ['admin', 'avaliacoes'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível moderar.', 'erro'),
  });

  return (
    <div className={s.pagina}>
      <header className={s.topo}><div><h1 className={s.titulo}>Avaliações</h1><p className={s.sub}>Toda avaliação passa por aqui antes de aparecer na página do prato</p></div></header>
      <div className={s.abas} role="tablist" aria-label="Status da moderação">
        {ABAS.map((a) => (
          <button key={a.v} type="button" role="tab" aria-selected={status === a.v} className={status === a.v ? s.abaAtiva : undefined} onClick={() => setBusca(a.v === 'PENDENTE' ? {} : { status: a.v }, { replace: true })}>
            {a.r} <span>{dados.data?.contagens[a.v] ?? 0}</span>
          </button>
        ))}
      </div>
      {dados.isError ? <ErroCarregamento onTentarNovamente={() => dados.refetch()} /> : !dados.data ? <Skeleton altura={300} raio={20} /> :
        dados.data.avaliacoes.length === 0 ? <EmptyState icone={<MessageSquareQuote size={28} aria-hidden />} titulo="Nada por aqui" descricao={status === 'PENDENTE' ? 'Nenhuma avaliação esperando moderação.' : 'Nenhuma avaliação neste status.'} /> : (
          <div className={s.lista}>
            {dados.data.avaliacoes.map((a) => (
              <article key={a.id} className={s.item}>
                <span className={s.nota} aria-label={`Nota ${a.nota} de 5`}><Star size={16} aria-hidden /> {a.nota}</span>
                <div className={s.itemCorpo}>
                  <h2>{a.prato ?? 'Prato removido'} <small>· {a.restaurante} · pedido {a.codigoPedido}</small></h2>
                  <p className={s.meta}>{a.cliente}{a.anonima ? ' (publica como anônimo)' : ''} · {formatarData(a.data)}
                    {[['Sabor', a.notaSabor], ['Porção', a.notaPorcao], ['Entrega', a.notaEntrega]].filter(([, n]) => n != null).map(([r, n]) => ` · ${r} ${n}/5`).join('')}</p>
                  {a.comentario ? <p className={s.texto}>“{a.comentario}”</p> : <p className={s.meta}>Sem comentário</p>}
                  {a.tags.length > 0 && <p className={s.tags}>{a.tags.map((t) => <span key={t}>{t}</span>)}</p>}
                  {a.fotos.length > 0 && <div className={s.fotos}>{a.fotos.map((f) => <a key={f} href={f} target="_blank" rel="noreferrer"><img src={f} alt="Foto enviada pelo cliente" /></a>)}</div>}
                </div>
                {a.status === 'PENDENTE' && (
                  <div className={s.acoes}>
                    <button type="button" className={s.botaoClaro} onClick={() => setRejeitar(a)} disabled={moderar.isPending}><X size={14} aria-hidden /> Rejeitar</button>
                    <button type="button" className={s.botaoPrimario} onClick={() => moderar.mutate({ a, aprovado: true })} disabled={moderar.isPending}><Check size={14} aria-hidden /> Publicar</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      <DecisaoDialog aberto={!!rejeitar} titulo="Rejeitar avaliação?" sugestoes={SUGESTOES} carregando={moderar.isPending}
        onFechar={() => setRejeitar(null)} onConfirmar={(motivo) => rejeitar && moderar.mutate({ a: rejeitar, aprovado: false, motivo })} />
    </div>
  );
}
