import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Wallet } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarData, formatarMoeda } from '../../../lib/formato';
import { baixarFinanceiroNutri, buscarFinanceiroNutri } from '../../../services/nutri/painel';
import s from './FinanceiroNutriPage.module.css';

export default function FinanceiroNutriPage(){
 const toast=useToast();const q=useQuery({queryKey:['nutri','financeiro'],queryFn:buscarFinanceiroNutri});
 const exportar=useMutation({mutationFn:baixarFinanceiroNutri,onSuccess:()=>toast('Relatório financeiro baixado em PDF.','sucesso'),onError:()=>toast('Não foi possível exportar o relatório em PDF.','erro')});
 if(q.isError)return <div className={s.pagina}><ErroCarregamento onTentarNovamente={()=>q.refetch()}/></div>;
 if(!q.data)return <div className={s.pagina}><Skeleton altura={80}/><div className={s.grade}>{[1,2,3,4].map(x=><Skeleton key={x} altura={130} raio={18}/>)}</div><Skeleton altura={300} raio={20}/></div>;
 const f=q.data;const max=Math.max(...f.meses.map(x=>x.bruto),1);
 return <main className={s.pagina}><header className={s.topo}><div><h1>Financeiro</h1><p>Resumo de receitas e repasses</p></div><button type="button" className={s.exportar} disabled={exportar.isPending} onClick={()=>exportar.mutate()}><Download size={17}/>{exportar.isPending?'Gerando PDF…':'Exportar PDF'}</button></header>
 <section className={s.grade} aria-label="Resumo financeiro"><article><span>Receita bruta mensal</span><strong>{formatarMoeda(f.bruto)}</strong><small>Assinaturas vigentes PRO e PREMIUM</small></article><article><span>Receita líquida</span><strong>{formatarMoeda(f.liquido)}</strong><small>Repasse de 60%</small></article><article><span>Clientes pagantes</span><strong>{f.clientesPagantes}</strong><small>Com assinatura ativa</small></article><article><span>Ticket médio</span><strong>{formatarMoeda(f.ticketMedio)}</strong><small>Por cliente pagante</small></article></section>
 <section className={s.card}><header><div><h2>Receita mensal</h2><p>Últimos 6 meses</p></div><Wallet size={20}/></header><div className={s.grafico} role="img" aria-label="Receita bruta e líquida dos últimos seis meses">{f.meses.map(m=><div className={s.coluna} key={m.mes}><strong>{formatarMoeda(m.bruto)}</strong><div className={s.barra} style={{height:`${Math.max(5,m.bruto/max*100)}%`}} title={`Bruta ${formatarMoeda(m.bruto)}; líquida ${formatarMoeda(m.liquido)}`}><span style={{height:`${m.bruto?m.liquido/m.bruto*100:0}%`}}/></div><small>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m.mes}-02T12:00:00`))}</small></div>)}</div><div className={s.legenda}><span><i/> Receita bruta</span><span><i/> Repasse líquido</span></div></section>
 <section className={s.card}><header><div><h2>Assinantes</h2><p>Mensalidades vigentes vinculadas a você</p></div><Link to="/nutri/clientes" className={s.verTodas}>Ver todas</Link></header>{f.assinantes.length===0?<EmptyState titulo="Nenhum assinante ativo" descricao="Clientes PRO e PREMIUM aparecerão aqui."/>:<div className={s.tabelaWrap}><table><thead><tr><th>Cliente</th><th>Plano</th><th>Mensalidade</th><th>Seu repasse</th><th>Desde</th><th>Status</th></tr></thead><tbody>{f.assinantes.map(a=><tr key={a.id}><td>{a.nome}</td><td>{a.tier}</td><td>{formatarMoeda(a.mensalidade)}</td><td>{formatarMoeda(a.repasse)}</td><td>{formatarData(a.inicioEm)}</td><td><span className={s.status}>Ativa</span></td></tr>)}</tbody></table></div>}</section>
 </main>;
}
