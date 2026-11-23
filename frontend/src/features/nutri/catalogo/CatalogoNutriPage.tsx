import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Grid2X2, List, Plus, Search, X } from 'lucide-react';
import { Botao, EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarMoeda, formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarRestricoes } from '../../../services/cadastro';
import { listarCatalogoNutri, listarClientesNutri, type FiltrosCatalogoNutri, type PratoCatalogoNutri } from '../../../services/nutri/plano';
import s from './CatalogoNutriPage.module.css';

const ERRO = 'Não foi possível carregar o catálogo. Tente novamente.';

export default function CatalogoNutriPage() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [restaurante, setRestaurante] = useState('');
  const [categoria, setCategoria] = useState('');
  const [proteinaAlta, setProteinaAlta] = useState(false);
  const [restricao, setRestricao] = useState('');
  const [pagina, setPagina] = useState(0);
  const [visualizacao, setVisualizacao] = useState<'grade' | 'lista'>('grade');
  const [pratoEscolhido, setPratoEscolhido] = useState<PratoCatalogoNutri | null>(null);
  const [clienteId, setClienteId] = useState('');
  const restricoes = useQuery({ queryKey: ['restricoes'], queryFn: buscarRestricoes, staleTime: Infinity });
  const filtros: FiltrosCatalogoNutri = { busca: busca.trim() || undefined, restaurante: restaurante || undefined, categoria: categoria || undefined,
    proteina: proteinaAlta ? ['30-'] : undefined, restricao: restricao || undefined, pagina };
  const lista = useQuery({ queryKey: ['nutri', 'catalogo', filtros], queryFn: () => listarCatalogoNutri(filtros), placeholderData: (anterior) => anterior });
  const clientes = useQuery({ queryKey: ['nutri', 'clientes', 'catalogo'], queryFn: listarClientesNutri, enabled: !!pratoEscolhido });
  const opcoes = useMemo(() => {
    const itens = lista.data?.itens ?? [];
    return {
      restaurantes: [...new Map(itens.map((p) => [p.restaurante.id, p.restaurante])).values()],
      categorias: [...new Set(itens.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      restricoes: restricoes.data ?? [],
    };
  }, [lista.data?.itens, restricoes.data]);

  function abrirEditor() {
    if (!clienteId || !pratoEscolhido) return;
    navegar(`/nutri/clientes/${clienteId}/plano?prato=${encodeURIComponent(pratoEscolhido.id)}&nome=${encodeURIComponent(pratoEscolhido.nome)}`);
  }

  function abrirEscolha(prato: PratoCatalogoNutri) {
    setPratoEscolhido(prato);
    setClienteId('');
  }

  return (
    <div className={s.pagina}>
      <header className={s.cabecalho}>
        <div><p className={s.sobretitulo}>CATÁLOGO NUTRICIONAL</p><h1>Catálogo de pratos</h1><p>Explore os pratos disponíveis dos restaurantes parceiros</p></div>
      </header>

      <section className={s.filtros} aria-label="Filtros do catálogo">
        <label className={s.busca}><Search size={18} aria-hidden="true" /><span className={s.srOnly}>Buscar prato, ingrediente ou restaurante</span>
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0); }} placeholder="Buscar prato, ingrediente, restaurante..." />
          {busca && <button type="button" aria-label="Limpar busca" onClick={() => setBusca('')}><X size={16} aria-hidden="true" /></button>}
        </label>
        <div className={s.selectores}>
          <label><span className={s.srOnly}>Restaurante</span><select value={restaurante} onChange={(e) => { setRestaurante(e.target.value); setPagina(0); }}>
            <option value="">Todos os restaurantes</option>{opcoes.restaurantes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select></label>
          <label><span className={s.srOnly}>Categoria</span><select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPagina(0); }}>
            <option value="">Categoria</option>{opcoes.categorias.map((c) => <option key={c}>{c}</option>)}
          </select></label>
          <label><span className={s.srOnly}>Faixa de proteína</span><select value={proteinaAlta ? 'alta' : ''} onChange={(e) => { setProteinaAlta(e.target.value === 'alta'); setPagina(0); }}>
            <option value="">Proteína: qualquer</option><option value="alta">Alta proteína</option>
          </select></label>
          <label><span className={s.srOnly}>Compatibilidade ou restrição alimentar</span><select value={restricao} onChange={(e) => { setRestricao(e.target.value); setPagina(0); }}>
            <option value="">Restrições</option>{opcoes.restricoes.map((r) => <option key={r.slug} value={r.slug}>{r.nome}</option>)}
          </select></label>
        </div>
        <div className={s.rodapeFiltros}>
          <p className={s.contagem}>{lista.data ? `${lista.data.totalItens} pratos aprovados disponíveis` : 'Pratos aprovados disponíveis'}</p>
          <div className={s.visualizacao} role="group" aria-label="Modo de visualização">
            <button type="button" aria-label="Grade" aria-pressed={visualizacao === 'grade'} className={visualizacao === 'grade' ? s.ativa : ''} onClick={() => setVisualizacao('grade')}><Grid2X2 size={17} aria-hidden="true" /></button>
            <button type="button" aria-label="Lista" aria-pressed={visualizacao === 'lista'} className={visualizacao === 'lista' ? s.ativa : ''} onClick={() => setVisualizacao('lista')}><List size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      {lista.isError ? <ErroCarregamento mensagem={lista.error instanceof ErroApi ? lista.error.message : ERRO} onTentarNovamente={() => lista.refetch()} />
        : lista.isLoading ? <div className={s.grade}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} altura={350} raio={20} />)}</div>
          : lista.data?.itens.length ? <div className={`${s.grade} ${visualizacao === 'lista' ? s.lista : ''}`} aria-busy={lista.isFetching}>
            {lista.data.itens.map((prato) => <CartaoPrato key={prato.id} prato={prato} aoAdicionar={() => abrirEscolha(prato)} />)}
          </div> : <EmptyState titulo="Nenhum prato encontrado" descricao="Ajuste os filtros para ver os pratos aprovados disponíveis." />}

      {!!lista.data?.totalPaginas && lista.data.totalPaginas > 1 && <nav className={s.paginacao} aria-label="Paginação do catálogo">
        <button type="button" aria-label="Página anterior" disabled={pagina === 0 || lista.isFetching} onClick={() => setPagina((p) => p - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        {Array.from({ length: lista.data.totalPaginas }, (_, i) => i).slice(Math.max(0, pagina - 2), Math.min(lista.data.totalPaginas, pagina + 3)).map((n) =>
          <button key={n} type="button" aria-current={pagina === n ? 'page' : undefined} className={pagina === n ? s.paginaAtiva : ''} disabled={lista.isFetching} onClick={() => setPagina(n)}>{n + 1}</button>)}
        <button type="button" aria-label="Próxima página" disabled={pagina >= lista.data.totalPaginas - 1 || lista.isFetching} onClick={() => setPagina((p) => p + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </nav>}

      {pratoEscolhido && <div className={s.sobreposicao} onMouseDown={(e) => { if (e.target === e.currentTarget) setPratoEscolhido(null); }}>
        <section className={s.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
          <button type="button" className={s.fechar} aria-label="Fechar" onClick={() => setPratoEscolhido(null)}><X size={20} aria-hidden="true" /></button>
          <p className={s.sobretitulo}>ADICIONAR AO PLANO</p><h2 id="titulo-modal">Escolha o cliente</h2>
          <p className={s.modalPrato}>{pratoEscolhido.nome}</p>
          {clientes.isLoading ? <Skeleton altura={44} /> : clientes.isError ? <ErroCarregamento mensagem={clientes.error instanceof ErroApi ? clientes.error.message : 'Não foi possível carregar seus clientes.'} onTentarNovamente={() => clientes.refetch()} />
            : <label className={s.clienteSelect}>Cliente
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}><option value="">Selecione um cliente</option>{clientes.data?.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select>
            </label>}
          <div className={s.acoesModal}><Botao variante="secundario" onClick={() => setPratoEscolhido(null)}>Cancelar</Botao>
            <Botao onClick={abrirEditor} disabled={!clienteId || clientes.isLoading}>Abrir editor</Botao></div>
        </section>
      </div>}
    </div>
  );
}

function CartaoPrato({ prato, aoAdicionar }: { prato: PratoCatalogoNutri; aoAdicionar: () => void }) {
  return <article className={s.cartao}>
    <div className={s.imagem}>{prato.imagemUrl ? <img src={prato.imagemUrl} alt={prato.nome} loading="lazy" /> : <span aria-hidden="true">{prato.nome.slice(0, 1)}</span>}
      <span className={s.aprovado}><Check size={12} aria-hidden="true" /> Aprovado</span></div>
    <div className={s.corpo}>
      <p className={s.restaurante}><span>{prato.restaurante.sigla}</span>{prato.restaurante.nome}</p>
      <h2>{prato.nome}</h2><p className={s.categoria}>{prato.categoria}</p>
      <div className={s.macros} aria-label="Informações nutricionais">
        <Macro rotulo="kcal" valor={prato.macros?.calorias ?? prato.calorias ?? 0} classe={s.kcal} /><Macro rotulo="prot" valor={prato.macros?.proteinas ?? prato.proteinas ?? 0} classe={s.proteina} />
        <Macro rotulo="carb" valor={prato.macros?.carboidratos ?? prato.carboidratos ?? 0} classe={s.carbo} /><Macro rotulo="gord" valor={prato.macros?.gorduras ?? prato.gorduras ?? 0} classe={s.gordura} />
      </div>
      <div className={s.rodapeCartao}><strong>{formatarMoeda(prato.preco)}</strong><Botao tamanho="sm" onClick={aoAdicionar} iconeEsquerda={<Plus size={16} aria-hidden="true" />}>Adicionar ao plano</Botao></div>
    </div>
  </article>;
}

function Macro({ rotulo, valor, classe }: { rotulo: string; valor: number; classe: string }) {
  return <div className={s.macro}><strong className={classe}>{formatarNumero(Number(valor ?? 0))}</strong><span>{rotulo}</span></div>;
}
