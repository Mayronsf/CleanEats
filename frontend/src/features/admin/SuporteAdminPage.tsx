import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Inbox, Mail, RotateCcw } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../design-system';
import { formatarData, formatarHora } from '../../lib/formato';
import { buscarContatos, marcarContato, type Contato } from '../../services/admin';
import s from './Admin.module.css';

/** /admin/suporte — Fila do "Fale conosco": responder por e-mail e marcar como respondido. */
export default function SuporteAdminPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useSearchParams();
  const abertos = busca.get('aba') !== 'respondidos';
  const contatos = useQuery({ queryKey: ['admin', 'contatos', abertos], queryFn: () => buscarContatos(abertos), refetchInterval: 30_000 });
  const marcar = useMutation({
    mutationFn: ({ c, respondido }: { c: Contato; respondido: boolean }) => marcarContato(c.id, respondido),
    onSuccess: (_, v) => { toast(v.respondido ? 'Marcado como respondido.' : 'Contato reaberto.', 'sucesso'); void qc.invalidateQueries({ queryKey: ['admin', 'contatos'] }); },
    onError: () => toast('Não foi possível atualizar o contato.', 'erro'),
  });

  return (
    <div className={s.pagina}>
      <header className={s.topo}><div><h1 className={s.titulo}>Suporte</h1><p className={s.sub}>Mensagens enviadas pelo "Fale conosco" de clientes, nutricionistas e restaurantes</p></div></header>
      <div className={s.abas} role="tablist" aria-label="Situação do contato">
        <button type="button" role="tab" aria-selected={abertos} className={abertos ? s.abaAtiva : undefined} onClick={() => setBusca({}, { replace: true })}>Abertos</button>
        <button type="button" role="tab" aria-selected={!abertos} className={!abertos ? s.abaAtiva : undefined} onClick={() => setBusca({ aba: 'respondidos' }, { replace: true })}>Respondidos</button>
      </div>
      {contatos.isError ? <ErroCarregamento onTentarNovamente={() => contatos.refetch()} /> : !contatos.data ? <Skeleton altura={260} raio={20} /> :
        contatos.data.length === 0 ? <EmptyState icone={<Inbox size={28} aria-hidden />} titulo={abertos ? 'Caixa zerada' : 'Nenhum contato respondido ainda'} descricao={abertos ? 'Nenhuma mensagem esperando resposta.' : undefined} /> : (
          <div className={s.lista}>
            {contatos.data.map((c) => (
              <article key={c.id} className={s.item}>
                <span className={s.miniatura}><Mail size={20} aria-hidden /></span>
                <div className={s.itemCorpo}>
                  <h2>{c.assunto} <small>· {c.nome} ({c.email})</small></h2>
                  <p className={s.meta}>{formatarData(c.criadoEm)} às {formatarHora(c.criadoEm)}{c.respondidoEm ? ` · respondido em ${formatarData(c.respondidoEm)}` : ''}</p>
                  <p className={s.texto}>{c.mensagem}</p>
                </div>
                <div className={s.acoes}>
                  <a className={s.botaoClaro} href={`mailto:${c.email}?subject=${encodeURIComponent(`Re: ${c.assunto} · CleanEats`)}`}><Mail size={14} aria-hidden /> Responder</a>
                  {abertos
                    ? <button type="button" className={s.botaoPrimario} onClick={() => marcar.mutate({ c, respondido: true })} disabled={marcar.isPending}><Check size={14} aria-hidden /> Respondido</button>
                    : <button type="button" className={s.botaoClaro} onClick={() => marcar.mutate({ c, respondido: false })} disabled={marcar.isPending}><RotateCcw size={14} aria-hidden /> Reabrir</button>}
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
