import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Download, Flame, Receipt, RotateCcw, ShoppingBag, Star, Wallet } from 'lucide-react';
import { Confirmacao, EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { useCarrinho } from '../../../hooks/cliente/useCarrinho';
import { formatarHora, formatarMoeda, formatarNumero, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarResumoHistorico, listarHistorico, pedirNovamente, type PedidoResumo } from '../../../services/cliente';
import { emAndamento } from './tempoPedido';
import s from './HistoricoPage.module.css';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ABAS = [
  { valor: '', rotulo: 'Todos', chave: 'total' },
  { valor: 'andamento', rotulo: 'Em andamento', chave: 'andamento' },
  { valor: 'entregues', rotulo: 'Entregues', chave: 'entregues' },
  { valor: 'cancelados', rotulo: 'Cancelados', chave: 'cancelados' },
] as const;
const um = (v: number) => formatarNumero(Math.round(Number(v)));

/** Partes da data em Recife (dia, mês, ano). */
function partesData(iso: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { dia: p.day!, mes: Number(p.month) - 1, ano: p.year!, chave: `${p.year}-${p.month}` };
}

/** Tela 19 — Histórico de pedidos (CE-7): abas por status, período, ordenação, "Carregar mais", pedir novamente, avaliar. */
export default function HistoricoPage() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const carrinho = useCarrinho();
  const [motivo, setMotivo] = useState<PedidoResumo | null>(null);
  const status = params.get('status') ?? '';
  const periodo = params.get('periodo') ?? '';
  const ordenar = params.get('ordenar') ?? '';
  const mudar = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };

  const resumo = useQuery({ queryKey: ['cliente', 'historico-resumo'], queryFn: buscarResumoHistorico });
  const lista = useInfiniteQuery({
    queryKey: ['cliente', 'historico', status, periodo, ordenar],
    queryFn: ({ pageParam }) => listarHistorico({ status, periodo, ordenar, pagina: pageParam, tamanho: 8 }),
    initialPageParam: 0,
    getNextPageParam: (ultima) => (ultima.pagina + 1 < ultima.totalPaginas ? ultima.pagina + 1 : undefined),
  });

  const repetir = useMutation({
    mutationFn: (id: string) => pedirNovamente(id),
    onSuccess: (r) => {
      if (r.itens.length === 0) { toast('Os pratos deste pedido não estão mais disponíveis.', 'erro'); return; }
      r.itens.forEach((i, k) => carrinho.adicionarPrato(i.prato, i.quantidade, { substituir: k === 0, observacao: i.observacao ?? undefined }));
      if (r.indisponiveis.length) toast(`Fora do cardápio: ${r.indisponiveis.join(', ')}`, 'info');
      navegar('/app/carrinho');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível repetir o pedido.', 'erro'),
  });

  const exportar = useMutation({
    mutationFn: async () => {
      const linhas: PedidoResumo[] = [];
      for (let pagina = 0; pagina < 20; pagina++) {
        const r = await listarHistorico({ pagina, tamanho: 30 });
        linhas.push(...r.itens);
        if (pagina + 1 >= r.totalPaginas) break;
      }
      const csv = ['Data;Pedido;Status;Restaurante;Itens;Kcal;Proteínas (g);Total (R$)',
        ...linhas.map((p) => [new Date(p.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Recife' }), p.codigo, p.status, p.restaurante,
          `"${p.itens.replace(/"/g, '""')}"`, p.calorias, um(p.proteinas), String(Number(p.total).toFixed(2)).replace('.', ',')].join(';'))].join('\n');
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'cleaneats-historico-pedidos.csv'; a.click();
      URL.revokeObjectURL(url);
      return linhas.length;
    },
    onSuccess: (n) => toast(`${n} pedidos exportados`, 'sucesso'),
    onError: () => toast('Não foi possível exportar agora.', 'erro'),
  });

  const r = resumo.data;
  const pedidos = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const grupos: { chave: string; pedidos: PedidoResumo[] }[] = [];
  for (const p of pedidos) {
    const { chave } = partesData(p.criadoEm);
    const g = grupos[grupos.length - 1];
    if (g && g.chave === chave) g.pedidos.push(p); else grupos.push({ chave, pedidos: [p] });
  }
  const mesInfo = (chave: string) => r?.meses.find((m) => m.mes === chave);

  return (
    <div className={s.pagina}>
      <div className={s.cabeca}>
        <div>
          <h1>Seus <span className="script">pedidos</span></h1>
          <p>Histórico completo de tudo que você já pediu no CleanEats</p>
        </div>
        <button type="button" className={s.exportar} onClick={() => exportar.mutate()} disabled={exportar.isPending || !r?.total}>
          <Download size={16} aria-hidden /> {exportar.isPending ? 'Exportando…' : 'Exportar histórico'}
        </button>
      </div>

      <div className={s.stats}>
        {!r && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={150} raio={20} />)}
        {r && [
          { icone: Receipt, cor: 'var(--green-primary)', fundo: 'var(--green-bg)', valor: <>{r.total}</>, rotulo: 'Pedidos no total', tendencia: `+${r.esteMes} este mês` },
          { icone: Wallet, cor: 'var(--kcal)', fundo: '#FEF3E5', valor: (() => { const pr = partesPreco(Number(r.gastoTotal)); return <>R$ {pr.reais}<small>,{pr.centavos}</small></>; })(), rotulo: 'Gasto total', tendencia: `${formatarMoeda(Number(r.gastoMes))} este mês` },
          { icone: Flame, cor: 'var(--prot)', fundo: '#FDE2DC', valor: <>{um(r.kcalTotal)} <small>kcal</small></>, rotulo: 'Total consumido', tendencia: 'Pedidos entregues' },
          { icone: Star, cor: 'var(--orange)', fundo: '#FEF7E0', valor: r.notaMedia != null ? <>{String(r.notaMedia).replace('.', ',')}<small>/5</small></> : <>—</>, rotulo: 'Sua avaliação média', tendencia: `${r.avaliacoesDadas} ${r.avaliacoesDadas === 1 ? 'avaliação dada' : 'avaliações dadas'}` },
        ].map(({ icone: Icone, ...x }) => (
          <div key={x.rotulo} className={s.stat}>
            <span className={s.statFundo} aria-hidden><Icone size={72} /></span>
            <span className={s.statIcone} style={{ background: x.fundo, color: x.cor }} aria-hidden><Icone size={20} /></span>
            <p className={s.statValor}>{x.valor}</p>
            <p className={s.statRotulo}>{x.rotulo}</p>
            <span className={s.tendencia}>{x.tendencia}</span>
          </div>
        ))}
      </div>

      <div className={s.filtros}>
        <div className={s.abas} role="tablist" aria-label="Filtrar por status">
          {ABAS.map((a) => (
            <button key={a.valor} type="button" role="tab" aria-selected={status === a.valor} className={`${s.aba} ${status === a.valor ? s.abaAtiva : ''}`} onClick={() => mudar('status', a.valor)}>
              {a.rotulo} <span className={s.contagem}>{r ? r[a.chave] : '…'}</span>
            </button>
          ))}
        </div>
        <div className={s.filtrosDireita}>
          <select className={s.select} value={periodo} onChange={(e) => mudar('periodo', e.target.value)} aria-label="Período">
            <option value="">Todo o período</option><option value="30d">Últimos 30 dias</option><option value="7d">Últimos 7 dias</option>
            <option value="mes">Este mês</option><option value="ano">Este ano</option>
          </select>
          <select className={s.select} value={ordenar} onChange={(e) => mudar('ordenar', e.target.value)} aria-label="Ordenar">
            <option value="">Mais recentes</option><option value="antigos">Mais antigos</option><option value="maior">Maior valor</option><option value="menor">Menor valor</option>
          </select>
        </div>
      </div>

      {lista.isError && <ErroCarregamento onTentarNovamente={() => lista.refetch()} />}
      {lista.isLoading && <div className={s.lista}>{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} altura={150} raio={24} />)}</div>}
      {lista.data && pedidos.length === 0 && (
        <EmptyState icone={<ShoppingBag size={28} aria-hidden />} titulo={status || periodo ? 'Nenhum pedido com esses filtros' : 'Você ainda não fez pedidos'}
          descricao={status || periodo ? 'Tente outro período ou status.' : 'Escolha um prato no marketplace — seus pedidos aparecem aqui.'}
          acao={status || periodo ? { rotulo: 'Ver todos', onClick: () => setParams({}, { replace: true }) } : { rotulo: 'Ir ao marketplace', onClick: () => navegar('/app/marketplace') }} />
      )}

      <div className={s.lista}>
        {grupos.map((g) => {
          const [ano, mes] = g.chave.split('-');
          const info = ordenar ? null : mesInfo(g.chave);
          return (
            <section key={g.chave + g.pedidos[0]!.id} className={s.mes} aria-label={`${MESES[Number(mes) - 1]} ${ano}`}>
              <div className={s.mesCabeca}>
                <h2>{MESES[Number(mes) - 1]} {ano}</h2>
                <span className={s.mesLinha} aria-hidden />
                {info && <span className={s.mesContagem}>{info.pedidos} {info.pedidos === 1 ? 'pedido' : 'pedidos'} · {formatarMoeda(Number(info.total))}</span>}
              </div>
              {g.pedidos.map((p) => <CartaoPedido key={p.id} p={p} onRepetir={() => repetir.mutate(p.id)} repetindo={repetir.isPending && repetir.variables === p.id} onMotivo={() => setMotivo(p)} />)}
            </section>
          );
        })}
      </div>

      {lista.hasNextPage && (
        <div className={s.carregarMais}>
          <button type="button" onClick={() => lista.fetchNextPage()} disabled={lista.isFetchingNextPage}>
            {lista.isFetchingNextPage ? 'Carregando…' : <>Carregar mais pedidos <ChevronDown size={16} aria-hidden /></>}
          </button>
        </div>
      )}

      <Confirmacao aberto={motivo !== null} titulo={`Pedido #${motivo?.codigo ?? ''} ${motivo?.status === 'RECUSADO' ? 'recusado' : 'cancelado'}`}
        rotuloConfirmar="Entendi" rotuloCancelar="Fechar" onCancelar={() => setMotivo(null)} onConfirmar={() => setMotivo(null)}>
        <strong>Motivo:</strong> {motivo?.motivo ?? 'Não informado'}.<br />O valor foi estornado para a forma de pagamento original (pagamento simulado).
      </Confirmacao>
    </div>
  );
}

function CartaoPedido({ p, onRepetir, repetindo, onMotivo }: { p: PedidoResumo; onRepetir: () => void; repetindo: boolean; onMotivo: () => void }) {
  const d = partesData(p.criadoEm);
  const andamento = emAndamento(p.status);
  const cancelado = p.status === 'CANCELADO' || p.status === 'RECUSADO';
  const pr = partesPreco(Number(p.total));
  const link = andamento ? `/app/pedidos/${p.id}` : `/app/pedidos/${p.id}`;
  return (
    <article className={`${s.pedido} ${andamento ? s.pedidoAtivo : ''}`}>
      <div className={s.data} aria-hidden>
        <p className={s.dataDia}>{d.dia}</p><p className={s.dataMes}>{MES_CURTO[d.mes]}</p><p className={s.dataHora}>{formatarHora(p.criadoEm)}</p>
      </div>
      <div className={s.info}>
        <div className={s.topo}>
          <span className={`${s.status} ${andamento ? s.statusAndamento : cancelado ? s.statusCancelado : s.statusEntregue}`}>
            {andamento && <span className={s.statusPonto} aria-hidden />}
            {andamento ? 'Em andamento' : cancelado ? (p.status === 'RECUSADO' ? 'Recusado' : 'Cancelado') : 'Entregue'}
          </span>
          <span className={s.codigo}>#{p.codigo}</span>
          <span className="sr-only">em {d.dia}/{d.mes + 1}/{d.ano} às {formatarHora(p.criadoEm)}</span>
        </div>
        <h3 className={s.rest}><Link to={link}>{p.restaurante}</Link></h3>
        <div className={s.previa}>
          {p.imagens.length > 0 && (
            <span className={s.miniaturas} aria-hidden>
              {p.imagens.slice(0, 3).map((img, i) => <img key={i} src={img} alt="" className={s.miniatura} />)}
              {p.imagens.length > 3 && <span className={`${s.miniatura} ${s.mais}`}>+{p.imagens.length - 3}</span>}
            </span>
          )}
          <p className={s.itensTexto}>{p.itens}{cancelado && p.motivo ? <> · <strong>{p.motivo}</strong></> : null}</p>
        </div>
        {!cancelado && (
          <div className={s.macros}>
            <span><span className={s.ponto} style={{ background: 'var(--kcal)' }} />{um(p.calorias)} kcal</span>
            <span><span className={s.ponto} style={{ background: 'var(--prot)' }} />{um(p.proteinas)}g prot</span>
            <span><span className={s.ponto} style={{ background: 'var(--carb)' }} />{um(p.carboidratos)}g carb</span>
          </div>
        )}
      </div>
      <div className={s.direita}>
        <p className={s.preco}>R$ {pr.reais}<small>,{pr.centavos}</small></p>
        <p className={s.avaliacao}>
          {andamento ? <span className={s.rotulo}>{p.status === 'A_CAMINHO' ? 'a caminho' : 'em preparo'}</span>
            : cancelado ? <span className={s.rotulo}><RotateCcw size={12} aria-hidden /> Reembolsado</span>
              : p.avaliado ? <><span className={s.estrelas} aria-label={`Você deu nota ${p.notaDada ?? 5}`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} fill={i <= (p.notaDada ?? 5) ? "currentColor" : "none"} aria-hidden />)}</span> <span className={s.rotulo}>avaliado</span></>
                : <span className={s.rotulo}>não avaliado</span>}
        </p>
        <div className={s.acoes}>
          {andamento && <Link to={`/app/pedidos/${p.id}`} className={`${s.acao} ${s.acaoAviso}`}>Acompanhar <ArrowRight size={12} aria-hidden /></Link>}
          {p.status === 'ENTREGUE' && !p.avaliado && <Link to={`/app/pedidos/${p.id}/avaliar`} className={`${s.acao} ${s.acaoPrimaria}`}>Avaliar <Star size={12} aria-hidden /></Link>}
          {p.status === 'ENTREGUE' && p.avaliado && <Link to={`/app/pedidos/${p.id}`} className={s.acao}>Detalhes</Link>}
          {cancelado && <button type="button" className={s.acao} onClick={onMotivo}>Ver motivo</button>}
          {!andamento && <button type="button" className={s.acao} onClick={onRepetir} disabled={repetindo}>{repetindo ? 'Adicionando…' : p.avaliado || cancelado ? 'Pedir novamente' : 'Pedir de novo'}</button>}
        </div>
      </div>
    </article>
  );
}
