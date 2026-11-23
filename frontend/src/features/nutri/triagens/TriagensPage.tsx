import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Clock3, HeartPulse } from 'lucide-react';
import { Botao, EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { buscarTriagens, concluirTriagem, iniciarTriagem, type MetasTriagem, type OrdenacaoTriagem, type StatusTriagem, type Triagem } from '../../../services/nutri/triagens';
import s from './TriagensPage.module.css';

const ABAS: { status: StatusTriagem; titulo: string }[] = [
  { status: 'AGUARDANDO', titulo: 'Pendentes' }, { status: 'EM_ANDAMENTO', titulo: 'Em andamento' }, { status: 'CONCLUIDA', titulo: 'Concluídas' },
];
const OBJETIVOS: Record<string, string> = { EMAGRECIMENTO: 'Emagrecimento', GANHO_MASSA: 'Ganho de massa', EQUILIBRIO: 'Equilíbrio' };

export default function TriagensPage() {
  const [status, setStatus] = useState<StatusTriagem>('AGUARDANDO');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTriagem>('ANTIGAS');
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<string | null>(null);
  const consulta = useQuery({ queryKey: ['nutri-triagens', status, ordenacao, pagina], queryFn: () => buscarTriagens(status, ordenacao, pagina) });
  const cliente = useQueryClient();
  const toast = useToast();
  const iniciar = useMutation({
    mutationFn: iniciarTriagem,
    onSuccess: async (_, id) => { await cliente.invalidateQueries({ queryKey: ['nutri-triagens'] }); setStatus('EM_ANDAMENTO'); setPagina(0); setEditando(id); toast('Triagem iniciada. Defina as metas do cliente.'); },
    onError: (e) => toast((e as Error).message, 'erro'),
  });
  const concluir = useMutation({
    mutationFn: ({ id, metas }: { id: string; metas: MetasTriagem }) => concluirTriagem(id, metas),
    onSuccess: async () => { await cliente.invalidateQueries({ queryKey: ['nutri-triagens'] }); setEditando(null); toast('Triagem concluída. O cliente foi notificado.'); },
    onError: (e) => toast((e as Error).message, 'erro'),
  });
  const dados = consulta.data;
  const itens = dados?.pagina.itens ?? [];

  return <section className={s.pagina}>
    <header className={s.cabecalho}>
      <div><span className={s.eyebrow}>ACOMPANHAMENTO NUTRICIONAL</span><h1>Suas <span className="script">triagens</span></h1><p>Clientes novos aguardando primeira avaliação</p></div>
      <span className={s.iconeCabecalho} aria-hidden><ClipboardList size={22} /></span>
    </header>

    <div className={s.filtros}>
      <div className={s.abas} role="tablist" aria-label="Filtrar triagens">
        {ABAS.map((aba) => <button key={aba.status} type="button" role="tab" aria-selected={status === aba.status}
          className={`${s.aba} ${status === aba.status ? s.abaAtiva : ''}`} onClick={() => { setStatus(aba.status); setPagina(0); setEditando(null); }}>
          {aba.titulo}<span className={s.contagem}>{dados?.contagens[aba.status] ?? (consulta.isLoading ? '…' : 0)}</span>
        </button>)}
      </div>
      <label className={s.ordenacao}>Ordenar
        <select value={ordenacao} onChange={(e) => { setOrdenacao(e.target.value as OrdenacaoTriagem); setPagina(0); }}>
          <option value="ANTIGAS">Mais antigas primeiro</option><option value="RECENTES">Mais recentes primeiro</option><option value="TIER">Por tier (Premium antes de Pro)</option>
        </select>
      </label>
    </div>

    {consulta.isError ? <ErroCarregamento mensagem={(consulta.error as Error).message} onTentarNovamente={() => consulta.refetch()} /> : consulta.isLoading ?
      <div className={s.lista} aria-label="Carregando triagens">{[1, 2, 3].map((i) => <div className={s.esqueleto} key={i}><Skeleton largura={58} altura={58} raio={29} /><div><Skeleton largura={180} altura={18} /><Skeleton largura={300} altura={12} /><Skeleton largura={240} altura={12} /></div></div>)}</div> : itens.length === 0 ?
      <EmptyState icone={<ClipboardList size={26} />} titulo={status === 'AGUARDANDO' ? 'Tudo em dia por aqui' : 'Nenhuma triagem nesta aba'} descricao="As triagens dos seus clientes aparecerão aqui." /> :
      <div className={s.lista}>{itens.map((triagem) => <CartaoTriagem key={triagem.id} triagem={triagem} editando={editando === triagem.id}
        iniciando={iniciar.isPending && iniciar.variables === triagem.id} salvando={concluir.isPending && concluir.variables?.id === triagem.id}
        aoIniciar={() => iniciar.mutate(triagem.id)} aoEditar={() => setEditando(editando === triagem.id ? null : triagem.id)}
        aoConcluir={(metas) => concluir.mutate({ id: triagem.id, metas })} />)}</div>}

    {dados && dados.pagina.totalPaginas > 1 && <nav className={s.paginacao} aria-label="Paginação das triagens">
      <button type="button" className={s.paginaBtn} disabled={pagina === 0} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior"><ArrowLeft size={16} /></button>
      <span>{pagina + 1} <span aria-hidden>/</span> {dados.pagina.totalPaginas}</span>
      <button type="button" className={s.paginaBtn} disabled={pagina + 1 >= dados.pagina.totalPaginas} onClick={() => setPagina(pagina + 1)} aria-label="Próxima página"><ArrowRight size={16} /></button>
    </nav>}
  </section>;
}

function CartaoTriagem({ triagem, editando, iniciando, salvando, aoIniciar, aoEditar, aoConcluir }: {
  triagem: Triagem; editando: boolean; iniciando: boolean; salvando: boolean; aoIniciar: () => void; aoEditar: () => void; aoConcluir: (metas: MetasTriagem) => void;
}) {
  const aguarda = Math.max(0, Math.floor((Date.now() - new Date(triagem.criadoEm).getTime()) / 3600000));
  return <article className={`${s.cartao} ${triagem.status === 'AGUARDANDO' && aguarda >= 12 ? s.urgente : ''}`}>
    <div className={s.avatar} aria-hidden>{triagem.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div>
    <div className={s.detalhes}>
      <div className={s.nomeLinha}><Link className={s.nome} to={`/nutri/clientes/${triagem.idCliente}`}>{triagem.nome}</Link><span className={`${s.tier} ${triagem.tier === 'PREMIUM' ? s.premium : ''}`}>{rotuloTier(triagem.tier)}</span></div>
      <p className={s.dados}>{triagem.idade != null ? `${triagem.idade} anos` : 'Idade não informada'} <b>·</b> {triagem.pesoKg != null ? `${formatar(triagem.pesoKg)} kg` : 'Peso não informado'} <b>·</b> {triagem.alturaCm != null ? `${formatar(triagem.alturaCm / 100, 2)} m` : 'Altura não informada'}</p>
      <div className={s.tags}><span className={`${s.tag} ${s.objetivo}`}>{OBJETIVOS[triagem.objetivo] ?? triagem.objetivo}</span>
        {triagem.restricoes.map((r) => <span key={r} className={`${s.tag} ${s.restricao}`}>{r}</span>)}
        {triagem.rotina && <span className={s.tag}><HeartPulse size={13} aria-hidden />{triagem.rotina}</span>}
        {triagem.condicoesSaude.map((c) => <span key={c} className={s.tag}><HeartPulse size={13} aria-hidden />{c}</span>)}
      </div>
      {triagem.observacoes && <p className={s.observacoes}>Observações: {triagem.observacoes}</p>}
    </div>
    <div className={s.acao}>
      <p className={s.tempo}><Clock3 size={14} aria-hidden /><strong>{triagem.status === 'CONCLUIDA' ? 'Concluída' : `Aguarda há ${aguarda}h`}</strong></p>
      {triagem.status === 'AGUARDANDO' ? <Botao tamanho="sm" carregando={iniciando} onClick={aoIniciar}>Iniciar triagem <ArrowRight size={15} aria-hidden /></Botao> :
        triagem.status === 'EM_ANDAMENTO' ? <Botao tamanho="sm" variante="secundario" onClick={aoEditar}>{editando ? 'Fechar metas' : 'Definir metas'}</Botao> : <Link className={s.verCliente} to={`/nutri/clientes/${triagem.idCliente}`}>Ver cliente <ArrowRight size={14} /></Link>}
    </div>
    {editando && <FormMetas key={triagem.id} inicial={triagem} salvando={salvando} aoConcluir={aoConcluir} />}
  </article>;
}

function FormMetas({ inicial, salvando, aoConcluir }: { inicial: Triagem; salvando: boolean; aoConcluir: (metas: MetasTriagem) => void }) {
  const [valores, setValores] = useState({ kcal: '', proteinas: '', carboidratos: '', gorduras: '', fibras: '', aguaMl: '' });
  const [observacoes, setObservacoes] = useState(inicial.observacoes ?? '');
  function enviar(e: FormEvent) {
    e.preventDefault();
    aoConcluir({ kcal: Number(valores.kcal), proteinas: Number(valores.proteinas), carboidratos: Number(valores.carboidratos),
      gorduras: Number(valores.gorduras), fibras: Number(valores.fibras), aguaMl: Number(valores.aguaMl), observacoes });
  }
  return <form className={s.formMetas} onSubmit={enviar}>
    <h3>Metas diárias de {inicial.nome.split(' ')[0]}</h3>
    <div className={s.camposMetas}>{([['kcal', 'Calorias', 'kcal'], ['proteinas', 'Proteínas', 'g'], ['carboidratos', 'Carboidratos', 'g'], ['gorduras', 'Gorduras', 'g'], ['fibras', 'Fibras', 'g'], ['aguaMl', 'Água', 'ml']] as const).map(([chave, rotulo, unidade]) =>
      <label key={chave}>{rotulo} <span>({unidade})</span><input type="number" min={chave === 'kcal' ? 800 : chave === 'aguaMl' ? 500 : 0} max={chave === 'kcal' || chave === 'aguaMl' ? 6000 : undefined} required value={valores[chave]} onChange={(e) => setValores({ ...valores, [chave]: e.target.value })} /></label>)}</div>
    <label className={s.campoObs}>Observações da triagem<textarea rows={3} maxLength={2000} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></label>
    <div className={s.botoesForm}><Botao type="submit" carregando={salvando} iconeDireita={<Check size={16} aria-hidden />}>Salvar metas e concluir</Botao></div>
  </form>;
}

function rotuloTier(tier: string) { return tier.charAt(0) + tier.slice(1).toLowerCase(); }
function formatar(valor: number, casas = 1) { return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas }); }
