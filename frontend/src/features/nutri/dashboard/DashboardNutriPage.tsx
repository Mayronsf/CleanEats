import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, MessageCircle, Users } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarData } from '../../../lib/formato';
import { buscarDashboardNutri, type LinhaDashboardNutri } from '../../../services/nutri/painel';
import s from './DashboardNutriPage.module.css';

export default function DashboardNutriPage() {
  const q=useQuery({queryKey:['nutri','dashboard'],queryFn:buscarDashboardNutri});
  if(q.isError)return <div className={s.pagina}><ErroCarregamento onTentarNovamente={()=>q.refetch()}/></div>;
  if(!q.data)return <div className={s.pagina}><Skeleton altura={90} raio={22}/><div className={s.kpis}>{[1,2,3,4].map(x=><Skeleton key={x} altura={130} raio={18}/>)}</div><Skeleton altura={340} raio={22}/></div>;
  const d=q.data;
  const lista=(titulo:string,items:LinhaDashboardNutri[],tipo:'triagem'|'mensagem'|'cliente')=><section className={s.card}><header className={s.cabecalho}><h2>{titulo}</h2><Link to={tipo==='triagem'?'/nutri/triagens':tipo==='mensagem'?'/nutri/mensagens':'/nutri/clientes'}>Ver todos <ArrowRight size={15}/></Link></header>{items.length===0?<EmptyState compacto titulo="Nada recente" descricao="Quando houver atualizações, elas aparecerão aqui."/>:<ul className={s.lista}>{items.map(x=><li key={x.id}><Link to={tipo==='triagem'?'/nutri/triagens':tipo==='mensagem'?'/nutri/mensagens':`/nutri/clientes/${x.id}`}><span className={s.avatar}>{x.avatarUrl?<img src={x.avatarUrl} alt=""/>:x.nome.split(' ').map(p=>p[0]).slice(0,2).join('')}</span><span className={s.texto}><strong>{x.nome}</strong><span>{x.resumo}</span></span><time>{x.data?formatarData(x.data):''}</time></Link></li>)}</ul>}</section>;
  return <main className={s.pagina}><header className={s.topo}><div><p className={s.saudacao}>Painel da nutricionista</p><h1>Bom dia, {d.nome.split(' ')[0]}!</h1><p>Seu resumo de atendimentos e clientes.</p></div><Link className={s.acao} to="/nutri/triagens">Atender triagens <ArrowRight size={16}/></Link></header>
    {d.statusAprovacao!=='APROVADO'&&<aside className={s.aviso} role="status"><strong>Perfil {d.statusAprovacao==='PENDENTE'?'em análise':'rejeitado'}</strong><span>{d.motivoRejeicao||'Seu cadastro profissional ainda não foi aprovado.'}</span><Link to="/nutri/perfil">Ver perfil</Link></aside>}
    <section className={s.kpis} aria-label="Indicadores do painel">{d.indicadores.map((x,i)=><article className={s.kpi} key={x.titulo}><span className={s.icone}>{i===0?<Users/>:i===1?<ClipboardList/>:<MessageCircle/>}</span><span>{x.titulo}</span><strong>{x.valor}</strong><small>{x.detalhe}</small></article>)}</section>
    <div className={s.colunas}>{lista('Triagens recentes',d.triagens,'triagem')}{lista('Mensagens recentes',d.mensagens,'mensagem')}{lista('Meus clientes',d.clientes,'cliente')}</div>
  </main>;
}
