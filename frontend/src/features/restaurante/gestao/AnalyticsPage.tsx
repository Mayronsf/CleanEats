import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, Repeat, Star } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarMoeda, formatarNumero } from '../../../lib/formato';
import { buscarAnalytics, type Comparado } from '../../../services/restaurante';
import s from './Gestao.module.css';

const PERIODOS = [{ v: 7, r: 'Últimos 7 dias', rot: 'semana' }, { v: 30, r: 'Últimos 30 dias', rot: '30 dias' }, { v: 90, r: 'Últimos 90 dias', rot: '90 dias' }];
const variacao = (c: Comparado, sufixo: string, pontos = false) => {
  if (c.atual == null || c.anterior == null) return null;
  const a = Number(c.atual), b = Number(c.anterior);
  if (pontos) { const d = Math.round((a - b) * 10) / 10; return { texto: `${d >= 0 ? '+' : ''}${d.toLocaleString('pt-BR')}${sufixo}`, sobe: d >= 0 }; }
  if (b === 0) return null;
  const p = Math.round(((a - b) / b) * 100);
  return { texto: `${p >= 0 ? '+' : ''}${p}%${sufixo}`, sobe: p >= 0 };
};

/** Tela 41 — Analytics: pedidos, faturamento, nota e recompra vs período anterior; pedidos por dia; top 5; distribuição de notas. */
export default function AnalyticsPage() {
  const [dias, setDias] = useState(7);
  const dados = useQuery({ queryKey: ['restaurante', 'analytics', dias], queryFn: () => buscarAnalytics(dias) });
  const periodo = PERIODOS.find((p) => p.v === dias)!;
  const d = dados.data;
  const maxSerie = Math.max(1, ...(d?.serie.map((x) => x.pedidos) ?? [1]));
  const maxNota = Math.max(1, ...Object.values(d?.distribuicao ?? { 1: 1 }));
  const anterior = dias === 7 ? ' vs semana anterior' : ' vs período anterior';

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div><h1 className={s.titulo}>Analytics</h1><p className={s.sub}>Métricas de desempenho e comportamento de vendas</p></div>
        <select className={s.seletor} value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Período">{PERIODOS.map((p) => <option key={p.v} value={p.v}>{p.r}</option>)}</select>
      </header>
      {dados.isError ? <ErroCarregamento onTentarNovamente={() => dados.refetch()} /> : !d ? <><Skeleton altura={150} raio={22} /><div style={{ height: 20 }} /><Skeleton altura={300} raio={22} /></> : <>
        <ul className={s.metricas}>
          <Metrica icone={<FileText size={20} />} tom="coral" valor={formatarNumero(Number(d.pedidos.atual))} rotulo={`Pedidos ${dias === 7 ? 'na semana' : `em ${periodo.rot}`}`} v={variacao(d.pedidos, anterior)} />
          <Metrica icone={<DollarSign size={20} />} tom="verde" valor={formatarMoeda(Number(d.faturamento.atual)).replace(/,\d\d$/, '')} rotulo={`Faturamento ${dias === 7 ? 'semanal' : `em ${periodo.rot}`}`} v={variacao(d.faturamento, '')} />
          <Metrica icone={<Star size={20} />} tom="azul" valor={d.nota.atual != null ? Number(d.nota.atual).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '—'} rotulo="Nota média" v={variacao(d.nota, '', true)} />
          <Metrica icone={<Repeat size={20} />} tom="laranja" valor={d.recompra.atual != null ? `${Number(d.recompra.atual)}%` : '—'} rotulo="Taxa de recompra" v={variacao(d.recompra, ' p.p.', true)} />
        </ul>
        <section className={s.cartao} aria-labelledby="por-dia">
          <h2 id="por-dia" className={s.cartaoTitulo}>Pedidos por {dias === 90 ? 'semana' : 'dia'}</h2><p className={s.cartaoSub}>{periodo.r}</p>
          <div className={`${s.barras} ${dias === 30 ? s.barrasDensas : ''}`} role="img" aria-label={`Pedidos por ${dias === 90 ? 'semana' : 'dia'}: ${d.serie.map((x) => `${x.rotulo} ${x.pedidos}`).join(', ')}`}>
            {d.serie.map((x) => (
              <div key={x.data} className={s.barra} title={`${x.rotulo}: ${x.pedidos} pedidos · ${formatarMoeda(Number(x.receita))}`}>
                <span className={s.barraValor}>{x.pedidos}</span>
                <span className={s.barraCorpo} style={{ height: `${Math.max(4, (x.pedidos / maxSerie) * 100)}%` }} />
                <span className={s.barraRotulo}>{x.rotulo}</span>
              </div>
            ))}
          </div>
        </section>
        <div className={s.duas}>
          <section className={s.cartao} aria-labelledby="top">
            <h2 id="top" className={s.cartaoTitulo}>Pratos mais vendidos</h2><p className={s.cartaoSub}>Top 5 {dias === 7 ? 'da semana' : `em ${periodo.rot}`}</p>
            {d.topPratos.length === 0 ? <EmptyState compacto titulo="Sem vendas no período" /> : (
              <table className={s.tabela}><thead><tr><th>#</th><th>Prato</th><th>Pedidos</th><th>Receita</th></tr></thead>
                <tbody>{d.topPratos.map((p, i) => <tr key={p.nome}><td><span className={`${s.posicao} ${i === 2 ? s.posicaoVerde : ''}`}>{i + 1}</span></td><td><b>{p.nome}</b></td><td>{formatarNumero(p.pedidos)}</td><td>{formatarMoeda(Number(p.receita))}</td></tr>)}</tbody></table>
            )}
          </section>
          <section className={s.cartao} aria-labelledby="notas">
            <h2 id="notas" className={s.cartaoTitulo}>Distribuição de avaliações</h2><p className={s.cartaoSub}>Baseado em {formatarNumero(d.totalAvaliacoes)} avaliações publicadas</p>
            <ul className={s.distribuicao}>{[5, 4, 3, 2, 1].map((n) => (
              <li key={n}><span>{n}</span><span className={s.trilho}><span style={{ width: `${((d.distribuicao[n] ?? 0) / maxNota) * 100}%` }} /></span><span className={s.qtd}>{d.distribuicao[n] ?? 0}</span></li>
            ))}</ul>
          </section>
        </div>
      </>}
    </div>
  );
}

function Metrica({ icone, tom, valor, rotulo, v }: { icone: React.ReactNode; tom: string; valor: string; rotulo: string; v: { texto: string; sobe: boolean } | null }) {
  return (
    <li className={s.metrica}>
      <span className={`${s.icone} ${s[tom]}`} aria-hidden>{icone}</span>
      <strong>{valor}</strong><span className={s.rotuloMetrica}>{rotulo}</span>
      {v && <span className={`${s.variacao} ${v.sobe ? s.sobe : s.desce}`}>{v.texto}</span>}
    </li>
  );
}
