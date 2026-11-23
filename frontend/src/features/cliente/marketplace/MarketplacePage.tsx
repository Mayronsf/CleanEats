import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Beef, Check, ChevronLeft, ChevronRight, Fish, LayoutGrid, List, MilkOff, Search, SlidersHorizontal, Sparkles,
  Star, Vegan, WheatOff, X, Zap,
} from 'lucide-react';
import { EmptyState, ErroCarregamento, SkeletonCardPrato } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import { buscarFacetas, listarMarmitas, type FiltrosMarketplace, type Ordenacao, type Selo } from '../../../services/cliente';
import { CardPrato } from '../componentes/CardPrato';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import s from './MarketplacePage.module.css';

const SELOS: { valor: Selo | null; rotulo: string; icone: typeof Beef }[] = [
  { valor: null, rotulo: 'Todos', icone: Sparkles },
  { valor: 'alta-proteina', rotulo: 'Alta Proteína', icone: Beef },
  { valor: 'vegano', rotulo: 'Vegano', icone: Vegan },
  { valor: 'sem-gluten', rotulo: 'Sem Glúten', icone: WheatOff },
  { valor: 'low-carb', rotulo: 'Low Carb', icone: Zap },
  { valor: 'sem-lactose', rotulo: 'Sem Lactose', icone: MilkOff },
  { valor: 'pescetariano', rotulo: 'Pescetariano', icone: Fish },
];

const ORDENACOES: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'relevancia', rotulo: 'Mais relevantes' },
  { valor: 'nota', rotulo: 'Melhor avaliados' },
  { valor: 'proteina', rotulo: 'Mais proteína' },
  { valor: 'calorias', rotulo: 'Menos calorias' },
  { valor: 'preco_asc', rotulo: 'Menor preço' },
  { valor: 'preco_desc', rotulo: 'Maior preço' },
];

const ROTULO_FAIXA: Record<string, string> = { '250-400': '250-400', '400-550': '400-550', '550-': '550+', '15-25': '15g - 25g', '25-40': '25g - 40g', '40-': '40g+' };
const POR_PAGINA = 12;

/** Lê/grava os filtros na URL (dá para compartilhar o link e voltar sem perder o filtro). */
function useFiltrosNaUrl() {
  const [params, setParams] = useSearchParams();
  const filtros: FiltrosMarketplace = {
    busca: params.get('busca') ?? undefined,
    selo: (params.get('selo') as Selo) ?? undefined,
    proteina: params.getAll('proteina'),
    calorias: params.getAll('calorias'),
    restaurante: params.getAll('restaurante'),
    precoMin: params.get('precoMin') ? Number(params.get('precoMin')) : undefined,
    precoMax: params.get('precoMax') ? Number(params.get('precoMax')) : undefined,
    notaMin: params.get('notaMin') ? Number(params.get('notaMin')) : undefined,
    ordenar: (params.get('ordenar') as Ordenacao) ?? undefined,
    favoritos: params.get('favoritos') === '1',
    pagina: Number(params.get('pagina') ?? 0),
  };
  function alterar(mudancas: Partial<Record<string, string | string[] | number | null | undefined>>, manterPagina = false) {
    const novo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      novo.delete(k);
      if (Array.isArray(v)) v.forEach((x) => novo.append(k, x));
      else if (v !== null && v !== undefined && v !== '') novo.set(k, String(v));
    }
    if (!manterPagina) novo.delete('pagina');
    setParams(novo, { replace: true });
  }
  return { filtros, alterar, temLateral: ['proteina', 'calorias', 'restaurante', 'precoMin', 'precoMax', 'notaMin'].some((k) => params.has(k)) };
}

const alternar = (lista: string[] = [], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

/** Tela 11 — Marketplace. Filtros atualizam sozinhos (CE-4); objetivo prioriza e restrições escondem (CE-6, CE-10). */
export default function MarketplacePage() {
  const { filtros, alterar, temLateral } = useFiltrosNaUrl();
  const [layout, setLayout] = useState<'grade' | 'lista'>('grade');
  const [busca, setBusca] = useState(filtros.busca ?? '');
  const [lateralAberta, setLateralAberta] = useState(false);
  const { adicionar, dialogo } = useAdicionarAoCarrinho();

  useEffect(() => { setBusca(filtros.busca ?? ''); }, [filtros.busca]);

  const pratos = useQuery({
    queryKey: ['marmitas', 'lista', filtros],
    queryFn: () => listarMarmitas({ ...filtros, tamanho: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });
  const facetas = useQuery({
    queryKey: ['marmitas', 'facetas', filtros.busca, filtros.selo, filtros.favoritos],
    queryFn: () => buscarFacetas({ busca: filtros.busca, selo: filtros.selo, favoritos: filtros.favoritos }),
    placeholderData: keepPreviousData,
  });
  const f = facetas.data;
  const pagina = pratos.data?.pagina ?? 0;
  const totalPaginas = pratos.data?.totalPaginas ?? 0;

  function enviarBusca(e: FormEvent) {
    e.preventDefault();
    alterar({ busca: busca.trim() || null });
  }

  const lateral = (
    <>
      <p className={s.lateralTitulo}><SlidersHorizontal size={18} aria-hidden /> Filtros avançados</p>
      <fieldset className={s.secao}>
        <legend>Faixa de preço</legend>
        {f?.precoMin != null && f.precoMax != null && (
          <FaixaPreco min={Math.floor(f.precoMin)} max={Math.ceil(f.precoMax)}
            valorMin={filtros.precoMin ?? Math.floor(f.precoMin)} valorMax={filtros.precoMax ?? Math.ceil(f.precoMax)}
            onChange={(a, b) => alterar({ precoMin: a > Math.floor(f.precoMin!) ? a : null, precoMax: b < Math.ceil(f.precoMax!) ? b : null })} />
        )}
      </fieldset>
      <fieldset className={s.secao}>
        <legend>Calorias</legend>
        <div className={s.faixas}>
          {f?.calorias.map((c) => {
            const ativo = filtros.calorias?.includes(c.faixa);
            const maior = Math.max(...f.calorias.map((x) => x.total), 1);
            return (
              <button key={c.faixa} type="button" className={`${s.faixa} ${ativo ? s.faixaAtiva : ''}`} aria-pressed={ativo}
                onClick={() => alterar({ calorias: alternar(filtros.calorias, c.faixa) })}>
                <span>{ROTULO_FAIXA[c.faixa]}</span>
                <span className={s.faixaBarra} aria-hidden><span style={{ transform: `scaleX(${c.total / maior})` }} /></span>
                <span className={s.contagem}>{c.total}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={s.secao}>
        <legend>Proteínas (gramas)</legend>
        {f?.proteinas.map((p) => (
          <Caixa key={p.faixa} marcado={!!filtros.proteina?.includes(p.faixa)} rotulo={ROTULO_FAIXA[p.faixa]!} contagem={p.total}
            onChange={() => alterar({ proteina: alternar(filtros.proteina, p.faixa) })} />
        ))}
      </fieldset>
      <fieldset className={s.secao}>
        <legend>Restaurantes</legend>
        {f?.restaurantes.map((r) => (
          <Caixa key={r.id} marcado={!!filtros.restaurante?.includes(r.id)} rotulo={r.nome} contagem={r.total}
            onChange={() => alterar({ restaurante: alternar(filtros.restaurante, r.id) })} />
        ))}
      </fieldset>
      <fieldset className={s.secao}>
        <legend>Avaliação</legend>
        {f && [{ v: 4.5, n: f.nota45 }, { v: 4, n: f.nota40 }].map(({ v, n }) => (
          <Caixa key={v} marcado={filtros.notaMin === v} contagem={n}
            rotulo={<>{v.toFixed(1)}+ <Star size={13} fill="currentColor" className={s.estrela} aria-hidden /></>}
            onChange={() => alterar({ notaMin: filtros.notaMin === v ? null : v })} />
        ))}
      </fieldset>
      {temLateral && (
        <button type="button" className={s.limpar} onClick={() => alterar({ proteina: [], calorias: [], restaurante: [], precoMin: null, precoMax: null, notaMin: null })}>
          Limpar filtros
        </button>
      )}
    </>
  );

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="mkt-titulo">
        <div>
          <p className={s.rotulo}>Marketplace · {f ? `${f.restaurantes.length} restaurantes ativos` : 'restaurantes ativos'}</p>
          <h1 id="mkt-titulo" className={s.titulo}>Encontre o prato <span className="script">perfeito</span><br />pra sua meta</h1>
          <p className={s.sub}>Filtre por objetivo, restrição, calorias ou restaurante. Todos os pratos têm macros transparentes e aprovação nutricional.</p>
          <form className={s.busca} role="search" onSubmit={enviarBusca}>
            <Search size={18} className={s.buscaIcone} aria-hidden />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Frango grelhado, bowl vegano, salmão..." aria-label="Buscar pratos" />
            <button type="submit">Buscar <ArrowRight size={16} aria-hidden /></button>
          </form>
        </div>
        <div className={s.visual} aria-hidden>
          <span className={s.mini1}><img src="/img/pratos/bowl-vegano-power.jpg" alt="" /></span>
          <span className={s.circulo}><img src="/img/pratos/frango-grelhado-fitness.jpg" alt="" /></span>
          <span className={s.mini2}><img src="/img/pratos/salmao-com-quinoa.jpg" alt="" /></span>
        </div>
      </section>

      <section className={s.filtros} aria-label="Categorias e ordenação">
        <div className={s.pilulas}>
          <span className={s.pilulasRotulo}>Categorias:</span>
          {SELOS.map(({ valor, rotulo, icone: Icone }) => {
            const ativo = (filtros.selo ?? null) === valor;
            return (
              <button key={rotulo} type="button" className={`${s.pilula} ${ativo ? s.pilulaAtiva : ''}`} aria-pressed={ativo}
                onClick={() => alterar({ selo: valor })}>
                <Icone size={16} aria-hidden /> {rotulo}
              </button>
            );
          })}
          <button type="button" className={`${s.pilula} ${filtros.favoritos ? s.pilulaAtiva : ''}`} aria-pressed={filtros.favoritos}
            onClick={() => alterar({ favoritos: filtros.favoritos ? null : '1' })}>
            ♥ Favoritos
          </button>
        </div>
        <div className={s.divisor} />
        <div className={s.controles}>
          <p className={s.resultado} aria-live="polite">
            <strong>{pratos.data ? `${pratos.data.totalItens} ${pratos.data.totalItens === 1 ? 'prato' : 'pratos'}` : '…'}</strong> encontrados em Recife
            {filtros.busca && <> para “{filtros.busca}” <button type="button" className={s.tirarBusca} onClick={() => alterar({ busca: null })} aria-label="Limpar busca"><X size={12} aria-hidden /></button></>}
          </p>
          <div className={s.controlesDireita}>
            <button type="button" className={`${s.ordenar} ${s.soCelular}`} onClick={() => setLateralAberta(true)}><SlidersHorizontal size={14} aria-hidden /> Filtros</button>
            <label className={s.ordenar}>
              <span>⇅ Ordenar:</span>
              <select value={filtros.ordenar ?? 'relevancia'} onChange={(e) => alterar({ ordenar: e.target.value === 'relevancia' ? null : e.target.value })}>
                {ORDENACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            </label>
            <button type="button" className={s.ordenar} onClick={() => setLayout((l) => (l === 'grade' ? 'lista' : 'grade'))}
              aria-label={layout === 'grade' ? 'Mostrar em lista' : 'Mostrar em grade'}>
              {layout === 'grade' ? <><LayoutGrid size={14} aria-hidden /> Grade</> : <><List size={14} aria-hidden /> Lista</>}
            </button>
          </div>
        </div>
      </section>

      <div className={s.grade}>
        <aside className={`${s.lateral} ${lateralAberta ? s.lateralAberta : ''}`} aria-label="Filtros avançados">
          <button type="button" className={s.fecharLateral} onClick={() => setLateralAberta(false)} aria-label="Fechar filtros"><X size={18} aria-hidden /></button>
          {lateral}
          <button type="button" className={s.verResultados} onClick={() => setLateralAberta(false)}>
            Ver {pratos.data?.totalItens ?? ''} pratos
          </button>
        </aside>
        <div>
          {pratos.isError && <ErroCarregamento onTentarNovamente={() => pratos.refetch()} />}
          <div className={`${s.pratos} ${layout === 'lista' ? s.pratosLista : ''}`} aria-busy={pratos.isFetching}>
            {pratos.isLoading && Array.from({ length: 6 }, (_, i) => <SkeletonCardPrato key={i} />)}
            {pratos.data?.itens.map((p) => <CardPrato key={p.id} prato={p} layout={layout} onPedir={() => adicionar(p)} />)}
          </div>
          {pratos.data && pratos.data.totalItens === 0 && (
            <EmptyState titulo="Nenhum prato com esses filtros"
              descricao="Tente tirar algum filtro ou buscar outro termo. Pratos incompatíveis com suas restrições ficam escondidos."
              acao={{ rotulo: 'Limpar tudo', onClick: () => alterar({ busca: null, selo: null, favoritos: null, proteina: [], calorias: [], restaurante: [], precoMin: null, precoMax: null, notaMin: null }) }} />
          )}
          {totalPaginas > 1 && (
            <nav className={s.paginacao} aria-label="Páginas">
              <button type="button" className={s.paginaBtn} disabled={pagina === 0} onClick={() => alterar({ pagina: pagina - 1 }, true)} aria-label="Página anterior"><ChevronLeft size={16} aria-hidden /></button>
              {paginasVisiveis(pagina, totalPaginas).map((n, i) => n === null
                ? <span key={`r${i}`} className={s.reticencias}>…</span>
                : <button key={n} type="button" className={`${s.paginaBtn} ${n === pagina ? s.paginaAtiva : ''}`} aria-current={n === pagina ? 'page' : undefined}
                    onClick={() => { alterar({ pagina: n }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{n + 1}</button>)}
              <button type="button" className={s.paginaBtn} disabled={pagina >= totalPaginas - 1} onClick={() => alterar({ pagina: pagina + 1 }, true)} aria-label="Próxima página"><ChevronRight size={16} aria-hidden /></button>
            </nav>
          )}
        </div>
      </div>
      {dialogo}
    </div>
  );
}

function paginasVisiveis(atual: number, total: number): (number | null)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, atual - 1, atual, atual + 1].filter((n) => n >= 0 && n < total));
  const ordenadas = [...set].sort((a, b) => a - b);
  const r: (number | null)[] = [];
  ordenadas.forEach((n, i) => { if (i > 0 && n - ordenadas[i - 1]! > 1) r.push(null); r.push(n); });
  return r;
}

function Caixa({ marcado, rotulo, contagem, onChange }: { marcado: boolean; rotulo: React.ReactNode; contagem: number; onChange: () => void }) {
  return (
    <label className={s.caixa}>
      <input type="checkbox" checked={marcado} onChange={onChange} className="sr-only" />
      <span className={`${s.quadrado} ${marcado ? s.quadradoMarcado : ''}`} aria-hidden>{marcado && <Check size={12} strokeWidth={3} />}</span>
      <span className={s.caixaRotulo}>{rotulo}</span>
      <span className={s.contagem}>{contagem}</span>
    </label>
  );
}

/** Dois controles deslizantes sobrepostos; aplica ao soltar (não refaz a busca a cada pixel). */
function FaixaPreco({ min, max, valorMin, valorMax, onChange }: { min: number; max: number; valorMin: number; valorMax: number; onChange: (a: number, b: number) => void }) {
  const [a, setA] = useState(valorMin);
  const [b, setB] = useState(valorMax);
  useEffect(() => { setA(valorMin); setB(valorMax); }, [valorMin, valorMax]);
  const pos = (v: number) => ((v - min) / Math.max(max - min, 1)) * 100;
  const aplicar = () => onChange(Math.min(a, b), Math.max(a, b));
  return (
    <div>
      <div className={s.trilho}>
        <span className={s.trilhoAtivo} style={{ left: `${pos(Math.min(a, b))}%`, right: `${100 - pos(Math.max(a, b))}%` }} />
        <input type="range" min={min} max={max} step={1} value={a} aria-label="Preço mínimo" aria-valuetext={formatarMoeda(a)}
          onChange={(e) => setA(Number(e.target.value))} onPointerUp={aplicar} onKeyUp={aplicar} />
        <input type="range" min={min} max={max} step={1} value={b} aria-label="Preço máximo" aria-valuetext={formatarMoeda(b)}
          onChange={(e) => setB(Number(e.target.value))} onPointerUp={aplicar} onKeyUp={aplicar} />
      </div>
      <p className={s.faixaPrecoValores}><span>{formatarMoeda(Math.min(a, b))}</span><span>{formatarMoeda(Math.max(a, b))}</span></p>
    </div>
  );
}
