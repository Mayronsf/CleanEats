import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { useQuery } from '@tanstack/react-query';
import { listarClientesNutri, type ClienteLinha, type FiltrosClientes } from '../../../services/nutri/clientes';
import s from './clientes.module.css';

export function ClientesCompartilhados({ acompanhamento = false }: { acompanhamento?: boolean }) {
  const [busca, setBusca] = useState(''); const [tier, setTier] = useState(''); const [objetivo, setObjetivo] = useState('');
  const [ordem, setOrdem] = useState<'nome'|'adesao'|'recentes'>(acompanhamento ? 'adesao' : 'nome');
  const [pagina, setPagina] = useState(0); const [visao, setVisao] = useState<'grade'|'lista'>('grade');
  const filtros: FiltrosClientes = { busca, tier, objetivo, ordem: acompanhamento ? 'adesao' : ordem, pagina, tamanho: 9 };
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['nutri-clientes', filtros], queryFn: () => listarClientesNutri(filtros), placeholderData: (prev) => prev });
  const aplicar = (fn: () => void) => { fn(); setPagina(0); };
  return <main className={s.pagina}>
    <header className={s.titulo}><div><p className={s.sobretitulo}>PAINEL DA NUTRICIONISTA</p><h1>{acompanhamento ? 'Acompanhamento' : 'Meus clientes'}</h1><p>Acompanhe a evolução e a adesão ao plano alimentar.</p></div><span className={s.contagem}>{data?.totalItens ?? '—'} clientes</span></header>
    <section className={s.ferramentas} aria-label="Buscar e filtrar clientes">
      <label className={s.busca}><Search size={18}/><input value={busca} onChange={e => aplicar(() => setBusca(e.target.value))} placeholder="Buscar por nome ou objetivo..." aria-label="Buscar por nome ou objetivo"/></label>
      <select value={tier} onChange={e => aplicar(() => setTier(e.target.value))} aria-label="Filtrar por plano"><option value="">Todos os tiers</option><option value="PREMIUM">Premium</option><option value="PRO">Pro</option><option value="BASIC">Basic</option><option value="FREE">Free</option></select>
      <select value={objetivo} onChange={e => aplicar(() => setObjetivo(e.target.value))} aria-label="Filtrar por objetivo"><option value="">Todos os objetivos</option><option value="GANHO_MASSA">Ganho de massa</option><option value="EMAGRECIMENTO">Emagrecimento</option><option value="EQUILIBRIO">Equilíbrio</option></select>
      {!acompanhamento && <select value={ordem} onChange={e => aplicar(() => setOrdem(e.target.value as typeof ordem))} aria-label="Ordenar clientes"><option value="nome">Nome</option><option value="adesao">Adesão</option><option value="recentes">Pedidos recentes</option></select>}
      <div className={s.visoes}><button aria-label="Visão em grade" aria-pressed={visao==='grade'} onClick={() => setVisao('grade')}><LayoutGrid size={18}/></button><button aria-label="Visão em lista" aria-pressed={visao==='lista'} onClick={() => setVisao('lista')}><List size={18}/></button></div>
    </section>
    {isLoading ? <div aria-busy="true" className={s.clientes}>{Array.from({length:6},(_,i)=><div className={s.esqueleto} key={i}><Skeleton altura={44} largura={44}/><Skeleton altura={18}/><Skeleton altura={12}/></div>)}</div> : isError ? <ErroCarregamento mensagem="Não foi possível carregar os clientes." onTentarNovamente={() => void refetch()}/> : !data?.itens.length ? <EmptyState titulo="Nenhum cliente encontrado" descricao="Ajuste a busca ou os filtros para ver outros clientes."/> : <>
      <section className={`${s.clientes} ${visao==='lista' ? s.lista : ''}`} aria-label="Lista de clientes">{data.itens.map(c => <ClienteCard key={c.id} cliente={c}/>)}</section>
      <nav className={s.paginacao} aria-label="Paginação"><span>{data.totalItens} clientes</span><button disabled={pagina===0} onClick={() => setPagina(p => Math.max(0,p-1))} aria-label="Página anterior"><ChevronLeft size={18}/></button><span>{pagina+1} / {Math.max(1,data.totalPaginas)}</span><button disabled={pagina+1>=data.totalPaginas} onClick={() => setPagina(p => p+1)} aria-label="Próxima página"><ChevronRight size={18}/></button></nav>
    </>}
  </main>;
}
function ClienteCard({ cliente: c }: { cliente: ClienteLinha }) {
  const label = c.adesao.percentual === null ? 'Sem plano' : `${c.adesao.percentual}%`;
  return <Link to={`/nutri/clientes/${c.id}`} className={s.cartao}>
    <div className={s.cartaoTopo}><span className={s.avatar}>{c.avatarUrl ? <img src={c.avatarUrl} alt=""/> : c.nome.split(/\s+/).map(x=>x[0]).slice(0,2).join('')}</span><span className={`${s.tier} ${s[c.tier.toLowerCase()]}`}>{c.tier}</span></div>
    <h2>{c.nome}</h2><p className={s.resumo}>{c.idade ?? '—'} anos{c.pesoKg ? ` · ${c.pesoKg} kg` : ''}{c.alturaCm ? ` · ${(c.alturaCm/100).toFixed(2).replace('.',',')} m` : ''}</p>
    <p className={s.objetivo}>{objetivoLabel(c.objetivo)}</p><div className={s.adesao}><span>Adesão semanal</span><strong>{label}</strong></div>{c.adesao.percentual !== null && <div className={s.barra}><i style={{width:`${Math.min(100,c.adesao.percentual)}%`}}/></div>}
    <div className={s.rodape}><span>Último pedido</span><strong>{c.ultimoPedido ? `${new Date(c.ultimoPedido).toLocaleDateString('pt-BR')} · ${statusPedido(c.statusUltimoPedido)}` : 'Nenhum pedido'}</strong></div>
  </Link>;
}
function objetivoLabel(valor: string) { return ({GANHO_MASSA:'Ganho de massa',EMAGRECIMENTO:'Emagrecimento',EQUILIBRIO:'Equilíbrio'} as Record<string,string>)[valor] ?? valor; }
function statusPedido(valor: string | null) { return valor ? ({ENTREGUE:'Entregue',NOVO:'Novo',ACEITO:'Em andamento',PREPARANDO:'Em andamento',PRONTO:'Em andamento',A_CAMINHO:'Em andamento',RECUSADO:'Recusado',CANCELADO:'Cancelado'} as Record<string,string>)[valor] ?? valor : ''; }
