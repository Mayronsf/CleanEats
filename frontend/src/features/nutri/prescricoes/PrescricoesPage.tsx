import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, FilePlus2, FileText } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { baixarPrescricao, listarPrescricoes } from '../../../services/nutri/prescricoes';
import s from './Prescricoes.module.css';

export default function PrescricoesPage() {
  const [pagina,setPagina]=useState(0); const navegar=useNavigate(); const toast=useToast();
  const historico=useQuery({queryKey:['nutri','prescricoes','historico',pagina],queryFn:()=>listarPrescricoes(pagina,10)});
  const baixar=async(id:string)=>{try{await baixarPrescricao(id);}catch(e){toast(e instanceof ErroApi?e.message:'Não foi possível baixar o PDF.','erro');}};
  const data=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'America/Recife'}).format(new Date(iso));
  return <main className={s.pagina}>
    <header className={s.topo}><div><h1 className={s.titulo}>Histórico de prescrições</h1><p className={s.sub}>Documentos emitidos para seus clientes</p></div><Link className={s.botao} to="/nutri/prescricoes/nova"><FilePlus2 size={16} aria-hidden/> Nova prescrição</Link></header>
    <section className={s.painel}><h2>Prescrições emitidas</h2><p className={s.nota}>{historico.data ? `${historico.data.totalItens} documento(s) no histórico` : 'Consulte e baixe os documentos emitidos.'}</p>
      {historico.isError?<ErroCarregamento mensagem={historico.error instanceof ErroApi?historico.error.message:undefined} onTentarNovamente={()=>void historico.refetch()}/>:!historico.data?<Skeleton altura={210} raio={14}/>:historico.data.itens.length===0?<EmptyState icone={<FileText size={26} aria-hidden/>} titulo="Nenhuma prescrição emitida" descricao="As prescrições dos seus clientes aparecerão aqui." acao={{ rotulo: 'Criar prescrição', onClick: () => navegar('/nutri/prescricoes/nova') }}/>:<>
        <div className={s.tabelaWrap}><table className={s.tabela}><thead><tr><th>Cliente</th><th>Plano</th><th>Emitida em</th><th>E-mail</th><th>Hash SHA-256</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{historico.data.itens.map(p=><tr key={p.id}><td><b>{p.nomeCliente}</b></td><td><span className={`${s.tier} ${p.tier==='PREMIUM'?s.premium:''}`}>{p.tier}</span></td><td>{data(p.emitidaEm)}</td><td>{p.enviadaEmail?'Enviada':'Não configurado'}</td><td><span className={s.hash} title={p.hashDocumento}>{p.hashDocumento.slice(0,16)}…</span></td><td><button className={s.secundario} type="button" onClick={()=>void baixar(p.id)}><Download size={14} aria-hidden/> Baixar PDF</button></td></tr>)}</tbody></table></div>
        <div className={s.paginacao}><span>Página {pagina+1} de {Math.max(1,historico.data.totalPaginas)}</span><div className={s.acoes}><button className={s.secundario} type="button" disabled={pagina===0} onClick={()=>setPagina(p=>p-1)}>Anterior</button><button className={s.secundario} type="button" disabled={pagina+1>=historico.data!.totalPaginas} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></div>
      </>}</section>
  </main>;
}
