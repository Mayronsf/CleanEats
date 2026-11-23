import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Coffee, Flame, Moon, Plus, Search, Sun, Sunrise, Trash2, X } from 'lucide-react';
import { Botao, EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarPlanoNutri, listarCatalogoNutri, listarClientesNutri, salvarPlanoNutri, type MacrosNutri, type PratoCatalogoNutri, type RefeicaoPlanoNutri, type TipoRefeicaoNutri } from '../../../services/nutri/plano';
import s from './EditorPlanoPage.module.css';

const TIPOS: { id: TipoRefeicaoNutri; rotulo: string; curto: string; hora: string; icone: typeof Coffee }[] = [
  { id: 'CAFE_DA_MANHA', rotulo: 'Café da manhã', curto: 'Café', hora: '07:00', icone: Sunrise },
  { id: 'LANCHE_MANHA', rotulo: 'Lanche da manhã', curto: 'Lanche manhã', hora: '10:00', icone: Coffee },
  { id: 'ALMOCO', rotulo: 'Almoço', curto: 'Almoço', hora: '12:30', icone: Sun },
  { id: 'LANCHE_TARDE', rotulo: 'Lanche da tarde', curto: 'Lanche tarde', hora: '15:30', icone: Coffee },
  { id: 'JANTAR', rotulo: 'Jantar', curto: 'Jantar', hora: '19:30', icone: Moon },
  { id: 'CEIA', rotulo: 'Ceia', curto: 'Ceia', hora: '21:30', icone: Moon },
];
const DIA_CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const OBJETIVOS: Record<string, string> = { EMAGRECIMENTO: 'Emagrecimento', GANHO_MASSA: 'Ganho de massa', EQUILIBRIO: 'Equilíbrio' };
const zerarMacros = (): MacrosNutri => ({ calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 });
const n = (valor: number | null | undefined) => formatarNumero(Math.round(Number(valor ?? 0)));

function segundaAtual() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const ano = Number(partes.find((p) => p.type === 'year')?.value);
  const mes = Number(partes.find((p) => p.type === 'month')?.value);
  const diaMes = Number(partes.find((p) => p.type === 'day')?.value);
  const agora = new Date(Date.UTC(ano, mes - 1, diaMes));
  const diaSemana = agora.getUTCDay() || 7;
  agora.setUTCDate(agora.getUTCDate() - diaSemana + 1);
  return agora.toISOString().slice(0, 10);
}
function dataDia(semana: string, dia: number) {
  const [ano, mes, data] = semana.split('-').map(Number);
  const d = new Date(Date.UTC(ano!, mes! - 1, data! + dia - 1));
  return { num: d.getUTCDate(), mes: new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', ''), iso: d.toISOString().slice(0, 10) };
}
function macrosPrato(prato: PratoCatalogoNutri | null | undefined): MacrosNutri {
  return prato ? { calorias: Number(prato.macros?.calorias ?? prato.calorias ?? 0), proteinas: Number(prato.macros?.proteinas ?? prato.proteinas ?? 0), carboidratos: Number(prato.macros?.carboidratos ?? prato.carboidratos ?? 0), gorduras: Number(prato.macros?.gorduras ?? prato.gorduras ?? 0), fibras: Number(prato.macros?.fibras ?? prato.fibras ?? 0) } : zerarMacros();
}
function nomeTipo(tipo: TipoRefeicaoNutri) { return TIPOS.find((item) => item.id === tipo)?.rotulo ?? tipo; }

export default function EditorPlanoPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [dia, setDia] = useState(1);
  const [refeicoes, setRefeicoes] = useState<RefeicaoPlanoNutri[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [slotAtivo, setSlotAtivo] = useState<{ diaSemana: number; tipo: TipoRefeicaoNutri } | null>(null);
  const [buscaPrato, setBuscaPrato] = useState('');
  const [paginaCatalogo, setPaginaCatalogo] = useState(0);
  const [tipoExtra, setTipoExtra] = useState<TipoRefeicaoNutri | ''>('');
  const [inicializou, setInicializou] = useState(false);
  const [planoSemana, setPlanoSemana] = useState(segundaAtual());
  const atalhoProcessado = useRef(false);
  const clienteLista = useQuery({ queryKey: ['nutri', 'clientes', 'editor'], queryFn: listarClientesNutri });
  const clientes = clienteLista.data ?? [];
  const cliente = clientes.find((c) => c.id === id);
  const plano = useQuery({ queryKey: ['nutri', 'plano', id], queryFn: () => buscarPlanoNutri(id), enabled: !!id });
  const catalogo = useQuery({ queryKey: ['nutri', 'catalogo', 'editor', buscaPrato, paginaCatalogo], queryFn: () => listarCatalogoNutri({ busca: buscaPrato.trim() || undefined, pagina: paginaCatalogo }), enabled: modalAberto, placeholderData: (anterior) => anterior });
  const salvar = useMutation({
    mutationFn: () => salvarPlanoNutri(id, { refeicoes: refeicoes.filter((r) => !!r.prato).map((r) => ({ diaSemana: r.diaSemana, tipo: r.tipo ?? r.tipoRefeicao!, idMarmita: r.prato!.id, observacao: r.observacao?.trim() || null })) }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['nutri', 'plano', id] }); toast('Plano salvo e enviado ao cliente.'); navegar(`/nutri/clientes/${id}`); },
    onError: (erro: unknown) => toast(erro instanceof ErroApi ? erro.message : 'Não foi possível salvar o plano.', 'erro'),
  });

  useEffect(() => {
    if (inicializou || plano.isLoading || clienteLista.isLoading) return;
    setRefeicoes((plano.data?.refeicoes ?? []).map((r) => ({ ...r, tipo: r.tipo ?? r.tipoRefeicao ?? 'ALMOCO', prato: r.prato ?? null })));
    if (plano.data?.semanaInicio) setPlanoSemana(plano.data.semanaInicio);
    setInicializou(true);
  }, [inicializou, plano.data, plano.isLoading, clienteLista.isLoading]);

  // O atalho do catálogo informa nome e ID do prato; a busca abre pronta para confirmá-lo no slot escolhido.
  useEffect(() => {
    const pratoId = params.get('prato');
    const nome = params.get('nome');
    if (!pratoId || !inicializou || modalAberto || atalhoProcessado.current) return;
    atalhoProcessado.current = true;
    setBuscaPrato(nome ?? '');
    const slotLivre = Array.from({ length: 7 }, (_, i) => i + 1).flatMap((diaSemana) => TIPOS.map((tipo) => ({ diaSemana, tipo: tipo.id })))
      .find((slot) => !refeicoes.some((r) => r.diaSemana === slot.diaSemana && (r.tipo ?? r.tipoRefeicao) === slot.tipo));
    if (slotLivre) { setDia(slotLivre.diaSemana); setSlotAtivo(slotLivre); }
    else { toast('Todos os horários desta semana já têm uma refeição. Escolha um horário para substituir ou remova uma refeição.', 'info'); return; }
    setModalAberto(true);
  }, [params, inicializou, modalAberto, refeicoes, toast]);

  const doDia = refeicoes.filter((r) => r.diaSemana === dia).sort((a, b) => TIPOS.findIndex((t) => t.id === (a.tipo ?? a.tipoRefeicao)) - TIPOS.findIndex((t) => t.id === (b.tipo ?? b.tipoRefeicao)));
  const totalDia = doDia.reduce((total, refeicao) => {
    const macros = macrosPrato(refeicao.prato);
    return { calorias: total.calorias + macros.calorias, proteinas: total.proteinas + macros.proteinas, carboidratos: total.carboidratos + macros.carboidratos, gorduras: total.gorduras + macros.gorduras, fibras: (total.fibras ?? 0) + (macros.fibras ?? 0) };
  }, zerarMacros());
  const metas = plano.data?.metas ?? cliente?.metas ?? zerarMacros();
  const slotsDisponiveis = TIPOS.filter((t) => !refeicoes.some((r) => r.diaSemana === dia && (r.tipo ?? r.tipoRefeicao) === t.id));

  function abrirBusca(diaSemana: number, tipo: TipoRefeicaoNutri) {
    setSlotAtivo({ diaSemana, tipo }); setBuscaPrato(''); setPaginaCatalogo(0); setModalAberto(true);
  }
  function escolherPrato(prato: PratoCatalogoNutri) {
    if (!slotAtivo) return;
    setRefeicoes((atuais) => {
      const semSlot = atuais.filter((r) => !(r.diaSemana === slotAtivo.diaSemana && (r.tipo ?? r.tipoRefeicao) === slotAtivo.tipo));
      return [...semSlot, { diaSemana: slotAtivo.diaSemana, tipo: slotAtivo.tipo, observacao: null, prato }];
    });
    setModalAberto(false);
  }
  function adicionarExtra() {
    if (!tipoExtra) return;
    abrirBusca(dia, tipoExtra);
    setTipoExtra('');
  }
  function remover(diaSemana: number, tipo: TipoRefeicaoNutri) {
    setRefeicoes((atuais) => atuais.filter((r) => !(r.diaSemana === diaSemana && (r.tipo ?? r.tipoRefeicao) === tipo)));
  }
  function atualizarObservacao(diaSemana: number, tipo: TipoRefeicaoNutri, observacao: string) {
    setRefeicoes((atuais) => atuais.map((r) => r.diaSemana === diaSemana && (r.tipo ?? r.tipoRefeicao) === tipo ? { ...r, observacao } : r));
  }

  if (!id) return <ErroCarregamento mensagem="Selecione um cliente para editar o plano." />;
  if (clienteLista.isError || plano.isError) return <ErroCarregamento mensagem={clienteLista.error instanceof ErroApi ? clienteLista.error.message : plano.error instanceof ErroApi ? plano.error.message : undefined} onTentarNovamente={() => { void clienteLista.refetch(); void plano.refetch(); }} />;
  if (clienteLista.isLoading || plano.isLoading || !inicializou) return <div className={s.pagina}><Skeleton altura={90} raio={20} /><Skeleton altura={390} raio={20} /></div>;
  if (!cliente) return <EmptyState titulo="Cliente não encontrado" descricao="Este cliente não está disponível na sua lista." acao={{ rotulo: 'Voltar para clientes', onClick: () => navegar('/nutri/clientes') }} />;
  const objetivo = cliente.objetivo ? OBJETIVOS[cliente.objetivo] ?? cliente.objetivo : 'Objetivo não informado';

  return <div className={s.pagina}>
    <div className={s.breadcrumb}><Link to={`/nutri/clientes/${id}`} aria-label="Voltar ao perfil do cliente"><ArrowLeft size={17} aria-hidden="true" /></Link><span><Link to="/nutri/clientes">Clientes</Link><span aria-hidden="true">/</span><Link to={`/nutri/clientes/${id}`}>{cliente.nome}</Link><span aria-hidden="true">/</span><strong>Editor de plano</strong></span></div>
    <header className={s.cabecalho}><div><p className={s.sobretitulo}>PLANO ALIMENTAR</p><h1>Editor de plano</h1><p>Cliente: <strong>{cliente.nome}</strong> · Semana de {dataDia(planoSemana, 1).num} a {dataDia(planoSemana, 7).num} de {dataDia(planoSemana, 7).mes} · objetivo: {objetivo.toLowerCase()}</p></div>
      <div className={s.acoes}><select className={s.trocarCliente} aria-label="Trocar cliente" value={id} onChange={(e) => navegar(`/nutri/clientes/${e.target.value}/plano`)}>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <Botao variante="secundario" onClick={() => navegar(`/nutri/clientes/${id}`)}>Descartar</Botao><Botao onClick={() => salvar.mutate()} disabled={salvar.isPending} carregando={salvar.isPending}>Salvar e enviar</Botao></div>
    </header>

    <div className={s.dias} role="tablist" aria-label="Dias do plano">
      {Array.from({ length: 7 }, (_, i) => i + 1).map((diaSemana) => {
        const data = dataDia(planoSemana, diaSemana); const quantas = refeicoes.filter((r) => r.diaSemana === diaSemana && r.prato).length;
        return <button type="button" role="tab" aria-selected={dia === diaSemana} className={dia === diaSemana ? s.diaAtivo : ''} key={diaSemana} onClick={() => setDia(diaSemana)}>
          <span>{DIA_CURTO[diaSemana - 1]}</span><strong>{data.num}</strong><small>{quantas ? `${quantas} refeiç${quantas === 1 ? 'ão' : 'ões'}` : 'livre'}</small>
        </button>;
      })}
    </div>

    <div className={s.conteudo}>
      <section className={s.refeicoes} aria-labelledby="titulo-dia">
        <div className={s.tituloDia}><div><h2 id="titulo-dia">{DIA_CURTO[dia - 1]} <span>· {dataDia(planoSemana, dia).num} de {dataDia(planoSemana, dia).mes}</span></h2><p>{doDia.length} {doDia.length === 1 ? 'refeição' : 'refeições'} planejadas</p></div></div>
        {doDia.length === 0 && <EmptyState compacto titulo="Dia livre" descricao="Adicione refeições para montar este dia do plano." />}
        {doDia.map((refeicao) => <Refeicao key={`${refeicao.diaSemana}-${refeicao.tipo ?? refeicao.tipoRefeicao}`} refeicao={refeicao} aoEditar={() => abrirBusca(dia, refeicao.tipo ?? refeicao.tipoRefeicao!)} aoRemover={() => remover(dia, refeicao.tipo ?? refeicao.tipoRefeicao!)} aoAnotar={(texto) => atualizarObservacao(dia, refeicao.tipo ?? refeicao.tipoRefeicao!, texto)} />)}
        <div className={s.adicionar}><label htmlFor="tipo-extra">Adicionar refeição extra</label><select id="tipo-extra" value={tipoExtra} onChange={(e) => setTipoExtra(e.target.value as TipoRefeicaoNutri | '')}><option value="">Escolha outro tipo de refeição</option>{slotsDisponiveis.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}</select>
          <Botao variante="secundario" onClick={adicionarExtra} disabled={!tipoExtra} iconeEsquerda={<Plus size={16} aria-hidden="true" />}>Adicionar</Botao></div>
      </section>

      <aside className={s.resumo} aria-labelledby="resumo-titulo">
        <div className={s.resumoCab}><h2 id="resumo-titulo">Resumo do dia</h2><p>{DIA_CURTO[dia - 1]} · {dataDia(planoSemana, dia).num} de {dataDia(planoSemana, dia).mes} · {doDia.length} refeições</p></div>
        <div className={s.cliente}><span className={s.avatar}>{cliente.avatarUrl ? <img src={cliente.avatarUrl} alt="" /> : cliente.nome.split(/\s+/).map((parte) => parte[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{cliente.nome}</strong><small>{cliente.tier ?? 'Cliente'} · {objetivo}</small></div></div>
        <div className={s.kcal}><Flame size={19} aria-hidden="true" /><div><strong>{n(totalDia.calorias)} <small>/ {n(metas.calorias)} kcal</small></strong><span>{metas.calorias ? `${Math.round(totalDia.calorias / metas.calorias * 100)}% da meta diária` : 'Meta diária não informada'}</span></div></div>
        <ul className={s.listaMacros}>{[
          { sigla: 'P', nome: 'Proteína', valor: totalDia.proteinas, meta: metas.proteinas, cor: 'var(--prot)' },
          { sigla: 'C', nome: 'Carbo', valor: totalDia.carboidratos, meta: metas.carboidratos, cor: 'var(--carb)' },
          { sigla: 'G', nome: 'Gordura', valor: totalDia.gorduras, meta: metas.gorduras, cor: 'var(--fat)' },
          { sigla: 'F', nome: 'Fibras', valor: totalDia.fibras ?? 0, meta: metas.fibras ?? 0, cor: 'var(--fiber)' },
        ].map((item) => { const pct = item.meta > 0 ? Math.min(100, Math.round(item.valor / item.meta * 100)) : 0; return <li key={item.sigla}>
          <span className={s.macroIcone} style={{ background: item.cor }}>{item.sigla}</span><div className={s.macroInfo}><span><strong>{item.nome}</strong><small>{n(item.valor)} / {n(item.meta)}g</small></span><div className={s.barra} role="progressbar" aria-label={`${item.nome} em relação à meta`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%`, background: item.cor }} /></div></div><b>{pct}%</b>
        </li>; })}</ul>
        <p className={s.notaMeta}>Os totais somam os pratos selecionados para este dia e são comparados às metas do cliente.</p>
      </aside>
    </div>

    {modalAberto && <div className={s.sobreposicao} onMouseDown={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}><section className={s.modal} role="dialog" aria-modal="true" aria-labelledby="catalogo-titulo">
      <button type="button" className={s.fechar} aria-label="Fechar busca de pratos" onClick={() => setModalAberto(false)}><X size={19} aria-hidden="true" /></button><p className={s.sobretitulo}>PRATOS APROVADOS</p><h2 id="catalogo-titulo">Escolha um prato</h2><p className={s.modalSub}>{slotAtivo ? `${nomeTipo(slotAtivo.tipo)} · ${DIA_CURTO[slotAtivo.diaSemana - 1]}` : ''}</p>
      <label className={s.busca}><Search size={17} aria-hidden="true" /><span className={s.srOnly}>Buscar prato</span><input autoFocus value={buscaPrato} onChange={(e) => { setBuscaPrato(e.target.value); setPaginaCatalogo(0); }} placeholder="Buscar prato ou restaurante..." /></label>
      {catalogo.isError ? <ErroCarregamento mensagem={catalogo.error instanceof ErroApi ? catalogo.error.message : undefined} onTentarNovamente={() => catalogo.refetch()} />
        : catalogo.isLoading ? <div className={s.catalogoCarregando}><Skeleton altura={74} /><Skeleton altura={74} /><Skeleton altura={74} /></div>
          : catalogo.data?.itens.length ? <div className={s.opcoesPrato}>{catalogo.data.itens.map((prato) => { const macros = macrosPrato(prato); return <button key={prato.id} type="button" onClick={() => escolherPrato(prato)}>
            <span className={s.miniImagem}>{prato.imagemUrl ? <img src={prato.imagemUrl} alt="" /> : prato.nome.slice(0, 1)}</span><span className={s.infoPrato}><strong>{prato.nome}</strong><small>{prato.restaurante.nome} · {n(macros.calorias)} kcal · {n(macros.proteinas)}g proteína</small></span><Check size={17} aria-hidden="true" />
          </button>; })}</div> : <EmptyState compacto titulo="Nenhum prato aprovado encontrado" descricao="Busque por outro nome ou restaurante." />}
      {!!catalogo.data?.totalPaginas && catalogo.data.totalPaginas > 1 && <div className={s.paginacao}><button type="button" disabled={!paginaCatalogo || catalogo.isFetching} onClick={() => setPaginaCatalogo((p) => p - 1)}>Anterior</button><span>Página {paginaCatalogo + 1} de {catalogo.data.totalPaginas}</span><button type="button" disabled={paginaCatalogo + 1 >= catalogo.data.totalPaginas || catalogo.isFetching} onClick={() => setPaginaCatalogo((p) => p + 1)}>Próxima</button></div>}
    </section></div>}
  </div>;
}

function Refeicao({ refeicao, aoEditar, aoRemover, aoAnotar }: { refeicao: RefeicaoPlanoNutri; aoEditar: () => void; aoRemover: () => void; aoAnotar: (texto: string) => void }) {
  const tipo = refeicao.tipo ?? refeicao.tipoRefeicao!;
  const meta = TIPOS.find((t) => t.id === tipo)!;
  const Icone = meta.icone;
  const prato = refeicao.prato;
  const macros = macrosPrato(prato);
  return <article className={s.refeicao}>
    <div className={s.cabecalhoRefeicao}><span className={s.iconeRefeicao}><Icone size={18} aria-hidden="true" /></span><div><h3>{meta.rotulo}</h3><small>~{meta.hora}</small></div>
      <div className={s.acoesRefeicao}><button type="button" aria-label={`Remover ${meta.rotulo}`} onClick={aoRemover}><Trash2 size={16} aria-hidden="true" /></button><button type="button" aria-label={`Escolher prato para ${meta.rotulo}`} onClick={aoEditar}><ChevronDown size={17} aria-hidden="true" /></button></div></div>
    {prato ? <><button type="button" className={s.pratoEscolhido} onClick={aoEditar}>
      <span className={s.imagemPrato}>{prato.imagemUrl ? <img src={prato.imagemUrl} alt="" /> : prato.nome.slice(0, 1)}</span><span className={s.infoEscolhido}><small>{prato.restaurante.nome}</small><strong>{prato.nome}</strong><span>{n(macros.calorias)} kcal · {n(macros.proteinas)}g proteína · {n(macros.carboidratos)}g carbo</span></span><span className={s.preco}>{formatarMoeda(prato.preco)}</span>
    </button><label className={s.observacao}>Observação para o cliente<textarea rows={2} value={refeicao.observacao ?? ''} onChange={(e) => aoAnotar(e.target.value)} placeholder="Ex.: sem molho" /></label></>
      : <button type="button" className={s.slotVazio} onClick={aoEditar}><Plus size={17} aria-hidden="true" /> Escolher prato aprovado</button>}
  </article>;
}
