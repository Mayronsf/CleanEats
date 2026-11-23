import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Info, Pencil, Send, UtensilsCrossed } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarData, formatarMoeda, formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarCardapio, reenviarPrato, type PratoLinha } from '../../../services/restaurante';
import s from './AprovacaoPage.module.css';

type Aba = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';
const ABAS: { valor: Aba; rotulo: string; status: string[] }[] = [
  { valor: 'TODOS', rotulo: 'Todos', status: ['EM_ANALISE', 'APROVADO', 'PAUSADO', 'REJEITADO'] },
  { valor: 'PENDENTE', rotulo: 'Pendente', status: ['EM_ANALISE'] },
  { valor: 'APROVADO', rotulo: 'Aprovado', status: ['APROVADO', 'PAUSADO'] },
  { valor: 'REJEITADO', rotulo: 'Rejeitado', status: ['REJEITADO'] },
];

/** Tela 40 — Aprovação/curadoria: status de cada prato na análise nutricional; rejeitados mostram o motivo e podem ser corrigidos e reenviados. */
export default function AprovacaoPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useSearchParams();
  const aba = (busca.get('aba') as Aba) ?? 'TODOS';
  const cardapio = useQuery({ queryKey: ['restaurante', 'cardapio'], queryFn: buscarCardapio });
  const reenviar = useMutation({
    mutationFn: (p: PratoLinha) => reenviarPrato(p.id),
    onSuccess: (r) => { toast(r.mensagem, 'sucesso'); void qc.invalidateQueries({ queryKey: ['restaurante'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível reenviar.', 'erro'),
  });
  const pratos = cardapio.data?.pratos ?? [];
  const daAba = (a: Aba) => pratos.filter((p) => ABAS.find((x) => x.valor === a)!.status.includes(p.status));
  const lista = daAba(aba).sort((a, b) => (b.enviadoEm ?? '').localeCompare(a.enviadoEm ?? ''));

  return (
    <div className={s.pagina}>
      <header><h1 className={s.titulo}>Aprovação / Curadoria</h1><p className={s.sub}>Acompanhe o status de aprovação dos seus pratos pela equipe CleanEats</p></header>
      <p className={s.info}><Info size={18} aria-hidden /> Todos os pratos passam por curadoria nutricional antes de serem publicados no marketplace. O prazo médio de análise é de 24 a 48 horas.</p>
      <div className={s.abas} role="tablist" aria-label="Filtrar por status de aprovação">
        {ABAS.map((a) => (
          <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor} className={aba === a.valor ? s.abaAtiva : undefined}
            onClick={() => setBusca(a.valor === 'TODOS' ? {} : { aba: a.valor }, { replace: true })}>{a.rotulo} <span>{cardapio.data ? daAba(a.valor).length : '·'}</span></button>
        ))}
      </div>
      {cardapio.isError ? <ErroCarregamento onTentarNovamente={() => cardapio.refetch()} /> : !cardapio.data ? <div className={s.grade}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} altura={300} raio={22} />)}</div> :
        lista.length === 0 ? <EmptyState icone={<UtensilsCrossed size={28} aria-hidden />} titulo="Nenhum prato aqui" descricao="Pratos enviados à curadoria aparecem nesta tela." /> : (
          <div className={s.grade}>
            {lista.map((p) => (
              <article key={p.id} className={s.cartao}>
                <div className={s.foto}>{p.imagemUrl ? <img src={p.imagemUrl} alt="" loading="lazy" /> : <UtensilsCrossed size={32} aria-hidden />}</div>
                <div className={s.corpo}>
                  <h2>{p.nome}</h2>
                  <p className={s.meta}>{[p.categoria, ...p.tags.slice(0, 1), p.calorias != null ? `${formatarNumero(p.calorias)} kcal` : null].filter(Boolean).join(' · ')}</p>
                  <p className={s.detalhes}>{p.tempoPreparoMin != null && <span><Clock size={12} aria-hidden /> {p.tempoPreparoMin} min</span>}<span>{formatarMoeda(Number(p.preco))}</span></p>
                  <span className={`${s.status} ${s[`st${p.status}`] ?? ''}`}>{p.status === 'EM_ANALISE' ? 'Em análise' : p.status === 'REJEITADO' ? 'Rejeitado' : p.status === 'PAUSADO' ? 'Aprovado · pausado' : 'Aprovado'}</span>
                  <p className={s.data}>{p.status === 'REJEITADO' ? <>Motivo: {p.motivoRejeicao ?? 'não informado'}</>
                    : p.status === 'EM_ANALISE' ? (p.enviadoEm ? `Enviado em ${formatarData(p.enviadoEm)}` : 'Aguardando análise')
                      : p.avaliadoEm ? `Aprovado em ${formatarData(p.avaliadoEm)}` : 'Aprovado'}</p>
                  {p.status === 'REJEITADO' && (
                    <div className={s.acoes}>
                      <Link to={`/restaurante/cardapio/${p.id}/editar`} className={s.corrigir}><Pencil size={14} aria-hidden /> Corrigir</Link>
                      {p.calorias != null && <button type="button" className={s.reenviar} onClick={() => reenviar.mutate(p)} disabled={reenviar.isPending}><Send size={14} aria-hidden /> Reenviar</button>}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
