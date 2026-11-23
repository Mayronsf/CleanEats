import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin, Star, Store, X } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import { buscarResumoRestaurantes, listarRestaurantes, type Restaurante } from '../../../services/cliente';
import s from './RestaurantesPage.module.css';

/** Tela 13 — Restaurantes parceiros. Só aprovados com prato aprovado (CE-5); filtros por cozinha e ordenação. Mapa = placeholder. */
export default function RestaurantesPage() {
  const [params, setParams] = useSearchParams();
  const cozinha = params.get('cozinha') ?? '';
  const ordenar = params.get('ordenar') ?? '';
  const pagina = Number(params.get('pagina') ?? 0);
  const [mapa, setMapa] = useState(false);
  const mapaRef = useRef<HTMLDialogElement>(null);
  const mudar = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'pagina') n.delete('pagina'); setParams(n, { replace: true }); };

  const resumo = useQuery({ queryKey: ['restaurantes', 'resumo'], queryFn: buscarResumoRestaurantes });
  const lista = useQuery({ queryKey: ['restaurantes', cozinha, ordenar, pagina], queryFn: () => listarRestaurantes({ cozinha, ordenar, pagina, tamanho: 6 }), placeholderData: keepPreviousData });
  const destaques = useQuery({ queryKey: ['restaurantes', 'heroi'], queryFn: () => listarRestaurantes({ ordenar: 'nota', tamanho: 3 }) });
  const r = resumo.data;

  function abrirMapa() { setMapa(true); mapaRef.current?.showModal?.(); }
  function fecharMapa() { setMapa(false); mapaRef.current?.close(); }

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="rest-titulo">
        <div>
          <p className={s.rotulo}>Restaurantes parceiros</p>
          <h1 id="rest-titulo" className={s.titulo}>Explore restaurantes <span className="script">saudáveis</span><br />perto de você</h1>
          <p className={s.sub}>Cada parceiro do CleanEats é avaliado por nutricionistas e tem ficha técnica nutricional em todos os pratos. Coma bem com confiança.</p>
          <dl className={s.numeros}>
            <div><dt>Restaurantes</dt><dd>{r?.total ?? '—'}</dd></div>
            <div><dt>Tipos de cozinha</dt><dd>{r?.tiposCozinha ?? '—'}</dd></div>
            <div><dt>Nota média</dt><dd>{r?.notaMedia != null ? String(r.notaMedia).replace('.', ',') : '—'}</dd></div>
          </dl>
        </div>
        <div className={s.visual} aria-hidden>
          {destaques.data?.itens.map((x, i) => (
            <div key={x.id} className={`${s.cartaoHeroi} ${s[`c${i + 1}`]}`}>
              <span className={s.cartaoHeroiImg}>{x.capaUrl && <img src={x.capaUrl} alt="" />}</span>
              <span><span className={s.cartaoHeroiNome}>{x.nome}</span><span className={s.cartaoHeroiMeta}>{x.cozinhas[0]} · {x.bairro}</span>
                <span className={s.cartaoHeroiNota}>★ {Number(x.nota).toFixed(1)} · {x.totalAvaliacoes} avaliações</span></span>
            </div>
          ))}
        </div>
      </section>

      <div className={s.filtros}>
        <div className={s.pilulas} role="group" aria-label="Tipo de cozinha">
          <button type="button" className={`${s.pilula} ${!cozinha ? s.ativa : ''}`} aria-pressed={!cozinha} onClick={() => mudar('cozinha', '')}>
            Todos <span className={s.contagem}>{r?.total ?? '…'}</span>
          </button>
          {r?.cozinhas.map((c) => (
            <button key={c.nome} type="button" className={`${s.pilula} ${cozinha === c.nome ? s.ativa : ''}`} aria-pressed={cozinha === c.nome} onClick={() => mudar('cozinha', c.nome)}>
              {c.nome} <span className={s.contagem}>{c.total}</span>
            </button>
          ))}
        </div>
        <label className={s.ordenar}>
          <span>Ordenar:</span>
          <select value={ordenar} onChange={(e) => mudar('ordenar', e.target.value)}>
            <option value="">Recomendados</option><option value="nota">Melhor avaliados</option><option value="rapidos">Mais rápidos</option><option value="taxa">Menor taxa de entrega</option>
          </select>
        </label>
      </div>

      <div className={s.resultadosCabeca}>
        <h2 className={s.resultadosTitulo}>Exibindo restaurantes <span>{cozinha ? `de ${cozinha.toLowerCase()}` : 'em Recife'}</span></h2>
        <p className={s.resultadosContagem} aria-live="polite">{lista.data ? `${lista.data.totalItens} ${lista.data.totalItens === 1 ? 'restaurante' : 'restaurantes'}` : '…'} · entrega em até {Math.max(45, ...(lista.data?.itens.map((x) => x.tempoEntregaMax) ?? [45]))}min</p>
      </div>

      {lista.isError && <ErroCarregamento onTentarNovamente={() => lista.refetch()} />}
      <div className={s.grade}>
        {lista.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} altura={420} raio={24} />)}
        {lista.data?.itens.map((x) => <CartaoRestaurante key={x.id} r={x} />)}
      </div>
      {lista.data?.totalItens === 0 && <EmptyState icone={<Store size={28} aria-hidden />} titulo="Nenhum restaurante nessa categoria" acao={{ rotulo: 'Ver todos', onClick: () => mudar('cozinha', '') }} />}

      {lista.data && lista.data.totalPaginas > 1 && (
        <nav className={s.paginacao} aria-label="Páginas">
          <button type="button" disabled={pagina === 0} onClick={() => mudar('pagina', String(pagina - 1))}><ChevronLeft size={16} aria-hidden /> Anterior</button>
          {Array.from({ length: lista.data.totalPaginas }, (_, i) => (
            <button key={i} type="button" className={i === pagina ? s.paginaAtiva : ''} aria-current={i === pagina ? 'page' : undefined} onClick={() => mudar('pagina', String(i))}>{i + 1}</button>
          ))}
          <button type="button" disabled={pagina >= lista.data.totalPaginas - 1} onClick={() => mudar('pagina', String(pagina + 1))}>Próxima <ChevronRight size={16} aria-hidden /></button>
        </nav>
      )}

      <section className={s.mapaCta} aria-labelledby="mapa-titulo">
        <div>
          <h2 id="mapa-titulo">Encontre restaurantes <span className="script">no mapa</span></h2>
          <p>Veja os parceiros por bairro, tempo de entrega e tipo de cozinha.</p>
          <button type="button" className={s.mapaBotao} onClick={abrirMapa}><MapPin size={16} aria-hidden /> Abrir visão em mapa</button>
        </div>
        <div className={s.mapaPrevia} aria-hidden>
          {[{ t: 30, l: 25 }, { t: 55, l: 60 }, { t: 25, l: 70 }, { t: 65, l: 30 }].map((p, i) => <span key={i} className={s.pino} style={{ top: `${p.t}%`, left: `${p.l}%` }} />)}
        </div>
      </section>

      <dialog ref={mapaRef} className={s.dialogo} aria-labelledby="mapa-dialogo" onClose={() => setMapa(false)}>
        <div className={s.dialogoCabeca}>
          <h2 id="mapa-dialogo">Parceiros por bairro</h2>
          <button type="button" onClick={fecharMapa} aria-label="Fechar"><X size={18} aria-hidden /></button>
        </div>
        <p className={s.dialogoAviso}>Visão ilustrativa — o mapa interativo com geolocalização fica para uma próxima versão.</p>
        {mapa && <MapaBairros />}
      </dialog>
    </div>
  );
}

function MapaBairros() {
  const todos = useQuery({ queryKey: ['restaurantes', 'todos'], queryFn: () => listarRestaurantes({ tamanho: 24 }) });
  const porBairro = new Map<string, Restaurante[]>();
  todos.data?.itens.forEach((x) => { const b = x.bairro ?? 'Recife'; porBairro.set(b, [...(porBairro.get(b) ?? []), x]); });
  return (
    <ul className={s.bairros}>
      {[...porBairro.entries()].map(([bairro, lista]) => (
        <li key={bairro}><p className={s.bairroNome}><MapPin size={14} aria-hidden /> {bairro}</p>
          <ul>{lista.map((x) => <li key={x.id}><Link to={`/app/restaurantes/${x.id}`}>{x.nome}</Link> <span>· {x.tempoEntregaMin}-{x.tempoEntregaMax}min</span></li>)}</ul>
        </li>
      ))}
    </ul>
  );
}

function CartaoRestaurante({ r }: { r: Restaurante }) {
  return (
    <article className={s.cartao}>
      <div className={s.capa}>
        {r.capaUrl && <img src={r.capaUrl} alt="" loading="lazy" />}
        <div className={s.tags}>
          {r.destaque && <span className={`${s.tag} ${s.tagDestaque}`}>Destaque</span>}
          {r.cozinhas.slice(0, 2).map((c) => <span key={c} className={s.tag}>{c}</span>)}
        </div>
        <span className={`${s.status} ${r.aberto ? '' : s.fechado}`}><span className={s.statusPonto} aria-hidden />{r.aberto ? 'Aberto' : r.abreAs ? `Fechado · abre ${r.abreAs}` : 'Fechado agora'}</span>
      </div>
      <div className={s.corpo}>
        <div className={s.nomeLinha}>
          <span className={s.logo} aria-hidden>{r.logoUrl ? <img src={r.logoUrl} alt="" /> : r.sigla}</span>
          <h3 className={s.nome}><Link to={`/app/restaurantes/${r.id}`}>{r.nome}</Link></h3>
          {r.totalAvaliacoes > 0 && <span className={s.nota}><Star size={12} fill="currentColor" className={s.estrela} aria-hidden /> {Number(r.nota).toFixed(1)}</span>}
        </div>
        <p className={s.meta}>
          {r.bairro && <span><MapPin size={12} aria-hidden /> {r.bairro}</span>}
          <span><Clock size={12} aria-hidden /> {r.tempoEntregaMin}-{r.tempoEntregaMax}min</span>
          <span>{Number(r.taxaEntrega) === 0 ? 'Entrega grátis' : `${formatarMoeda(Number(r.taxaEntrega))} entrega`}</span>
        </p>
        <div className={s.cozinhas}>{r.cozinhas.map((c) => <span key={c}>{c}</span>)}</div>
        <div className={s.rodape}>
          <p><strong>{r.pratos} {r.pratos === 1 ? 'prato' : 'pratos'}</strong> disponíveis</p>
          <Link to={`/app/restaurantes/${r.id}`} className={s.cta} tabIndex={-1} aria-hidden>Ver cardápio <ArrowRight size={12} /></Link>
        </div>
      </div>
    </article>
  );
}
