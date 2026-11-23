import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, ClipboardList, X } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarHora } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarFilaPedidos, mudarStatusPedido, ROTULO_STATUS, type AbaPedidos, type AcaoPedido, type PedidoPainel } from '../../../services/restaurante';
import s from './PedidosPage.module.css';

const ABAS: { valor: AbaPedidos; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' }, { valor: 'NOVOS', rotulo: 'Novos' }, { valor: 'PREPARANDO', rotulo: 'Preparando' },
  { valor: 'PRONTOS', rotulo: 'Pronto' }, { valor: 'ENTREGUES', rotulo: 'Entregue' }, { valor: 'ENCERRADOS', rotulo: 'Recusados' },
];
const MOTIVOS = ['Ingrediente em falta', 'Cozinha lotada no momento', 'Fora do horário de preparo', 'Endereço fora da área de entrega'];

export function haQuanto(iso: string, agora: number) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `há ${h}h${min % 60 ? ` ${min % 60}min` : ''}` : new Date(iso).toLocaleDateString('pt-BR');
}

/** Tela 37 — Pedidos do restaurante (CE-14): abas por status, aceitar/recusar/pronto/retirada; tempo real. */
export default function PedidosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useSearchParams();
  const aba = (busca.get('aba') as AbaPedidos) ?? 'TODOS';
  const fila = useQuery({ queryKey: ['restaurante', 'pedidos', aba], queryFn: () => buscarFilaPedidos(aba), refetchInterval: 30_000 });
  const [recusar, setRecusar] = useState<PedidoPainel | null>(null);
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30_000); return () => clearInterval(t); }, []);

  const acao = useMutation({
    mutationFn: ({ p, a, motivo }: { p: PedidoPainel; a: AcaoPedido; motivo?: string }) => mudarStatusPedido(p.id, a, motivo),
    onSuccess: (p, v) => {
      void qc.invalidateQueries({ queryKey: ['restaurante'] });
      setRecusar(null);
      toast({ ACEITAR: `${p.codigo} aceito: em preparo.`, RECUSAR: `${p.codigo} recusado. O cliente foi avisado.`, PRONTO: `${p.codigo} pronto para retirada.`,
        RETIRADA: `${p.codigo} saiu para entrega com ${p.entregador ?? 'o entregador'}.` }[v.a], 'sucesso');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível atualizar o pedido.', 'erro'),
  });

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div><h1 className={s.titulo}>Pedidos</h1><p className={s.sub}>Gerencie pedidos em tempo real</p></div>
        <span className={s.aoVivo}><i aria-hidden /> Tempo real</span>
      </header>

      <div className={s.abas} role="tablist" aria-label="Filtrar pedidos por status">
        {ABAS.map((a) => (
          <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor} className={aba === a.valor ? s.abaAtiva : undefined}
            onClick={() => setBusca(a.valor === 'TODOS' ? {} : { aba: a.valor }, { replace: true })}>
            {a.rotulo} <span>{fila.data?.contagens[a.valor] ?? '·'}</span>
          </button>
        ))}
      </div>

      {fila.isError ? <ErroCarregamento mensagem={fila.error instanceof ErroApi ? fila.error.message : undefined} onTentarNovamente={() => fila.refetch()} />
        : !fila.data ? <div className={s.grade}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} altura={240} raio={22} />)}</div>
          : fila.data.pedidos.length === 0 ? <EmptyState icone={<ClipboardList size={28} aria-hidden />} titulo="Nenhum pedido aqui" descricao="Quando um cliente fizer um pedido, ele aparece nesta tela na hora." />
            : (
              <div className={s.grade}>
                {fila.data.pedidos.map((p) => (
                  <CartaoPedido key={p.id} p={p} agora={agora} ocupado={acao.isPending && acao.variables?.p.id === p.id}
                    onAcao={(a) => (a === 'RECUSAR' ? setRecusar(p) : acao.mutate({ p, a }))} />
                ))}
              </div>
            )}

      <DialogoRecusa pedido={recusar} carregando={acao.isPending} onFechar={() => setRecusar(null)} onConfirmar={(motivo) => recusar && acao.mutate({ p: recusar, a: 'RECUSAR', motivo })} />
    </div>
  );
}

export function CartaoPedido({ p, agora, onAcao, ocupado }: { p: PedidoPainel; agora: number; onAcao: (a: AcaoPedido) => void; ocupado: boolean }) {
  const encerrado = ['ENTREGUE', 'RECUSADO', 'CANCELADO'].includes(p.status);
  return (
    <article className={`${s.cartao} ${encerrado ? s.encerrado : ''}`} aria-label={`Pedido ${p.codigo}`}>
      <div className={s.cartaoTopo}><span className={s.codigo}>#{p.codigo.replace(/^CE-/, '')}</span><span className={s.tempo}>{haQuanto(p.criadoEm, agora)}</span></div>
      <p className={s.cliente}>{p.cliente}</p>
      <ul className={s.itens}>
        {p.itens.map((i, k) => <li key={k}>{i.quantidade}x {i.nome}{i.observacao ? <em> · {i.observacao}</em> : null}</li>)}
        {p.observacao && <li className={s.obs}>{p.observacao}</li>}
        {p.agendadoPara && <li className={s.obs}>Agendado para {formatarHora(p.agendadoPara)}</li>}
      </ul>
      <div className={s.rodape}>
        <strong className={s.total}>{formatarMoeda(Number(p.total))}</strong>
        <span className={`${s.status} ${s[`st${p.status}`] ?? ''}`}>{ROTULO_STATUS[p.status]}</span>
      </div>
      {p.status === 'NOVO' && (
        <div className={s.duas}>
          <button type="button" className={s.secundario} onClick={() => onAcao('RECUSAR')} disabled={ocupado}>Recusar</button>
          <button type="button" className={s.primario} onClick={() => onAcao('ACEITAR')} disabled={ocupado}>{ocupado ? 'Aceitando…' : 'Aceitar'}</button>
        </div>
      )}
      {(p.status === 'ACEITO' || p.status === 'PREPARANDO') && <button type="button" className={s.primario} onClick={() => onAcao('PRONTO')} disabled={ocupado}>Marcar pronto</button>}
      {p.status === 'PRONTO' && <button type="button" className={s.primario} onClick={() => onAcao('RETIRADA')} disabled={ocupado}>Confirmar retirada</button>}
      {p.status === 'A_CAMINHO' && <p className={s.entrega}><Bike size={14} aria-hidden /> {p.entregador}{p.previsaoEntregaEm ? ` · chega ~${formatarHora(p.previsaoEntregaEm)}` : ''}</p>}
      {(p.status === 'RECUSADO' || p.status === 'CANCELADO') && p.motivoRecusa && <p className={s.motivo}>{p.motivoRecusa}</p>}
    </article>
  );
}

function DialogoRecusa({ pedido, carregando, onFechar, onConfirmar }: { pedido: PedidoPainel | null; carregando: boolean; onFechar: () => void; onConfirmar: (m: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState('');
  useEffect(() => { if (pedido) { setMotivo(''); ref.current?.showModal?.(); } else ref.current?.close?.(); }, [pedido]);
  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="recusa-titulo" onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <div className={s.dialogoTopo}><h2 id="recusa-titulo">Recusar pedido {pedido?.codigo}?</h2><button type="button" onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button></div>
      <p className={s.dialogoSub}>O cliente recebe o motivo na hora e nada é cobrado.</p>
      <div className={s.motivos}>{MOTIVOS.map((m) => <button key={m} type="button" className={motivo === m ? s.motivoAtivo : undefined} onClick={() => setMotivo(m)}>{m}</button>)}</div>
      <label htmlFor="motivo-recusa" className={s.rotulo}>Motivo</label>
      <textarea id="motivo-recusa" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explique ao cliente por que o pedido não pode ser feito" />
      <div className={s.dialogoAcoes}>
        <button type="button" className={s.secundario} onClick={onFechar}>Voltar</button>
        <button type="button" className={s.perigo} disabled={motivo.trim().length < 5 || carregando} onClick={() => onConfirmar(motivo.trim())}>{carregando ? 'Recusando…' : 'Recusar pedido'}</button>
      </div>
    </dialog>
  );
}
