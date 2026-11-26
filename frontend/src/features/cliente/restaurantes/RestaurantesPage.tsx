import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin, Navigation, Star, Store, X } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import {
  CENTRO_VITORIA_LAT_LNG,
  COORDS_VITORIA_RESTAURANTES,
  ENDERECOS_VITORIA_RESTAURANTES,
  SVG_LOJA_IFOOD,
  TILE_MAPA_LIMPO,
} from '../../../lib/mapaEstilo';
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
        <h2 className={s.resultadosTitulo}>Exibindo restaurantes <span>{cozinha ? `de ${cozinha.toLowerCase()}` : 'em Vitória de Santo Antão'}</span></h2>
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

      <dialog ref={mapaRef} className={s.dialogoMapa} aria-labelledby="mapa-dialogo" onClose={() => setMapa(false)}>
        {mapa && <MapaBairros onFechar={fecharMapa} />}
      </dialog>
    </div>
  );
}

type FiltroMapa = 'todos' | 'abertos' | 'gratis' | 'fitness' | 'bowls';

function MapaBairros({ onFechar }: { onFechar: () => void }) {
  const todos = useQuery({ queryKey: ['restaurantes', 'todos'], queryFn: () => listarRestaurantes({ tamanho: 24 }) });
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const camadaPinosRef = useRef<L.LayerGroup | null>(null);
  const [filtro, setFiltro] = useState<FiltroMapa>('todos');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const lista = todos.data?.itens ?? [];
    switch (filtro) {
      case 'abertos': return lista.filter((x) => x.aberto);
      case 'gratis': return lista.filter((x) => Number(x.taxaEntrega) === 0);
      case 'fitness': return lista.filter((x) => x.cozinhas.some((c) => c.toLowerCase().includes('fitness') || c.toLowerCase().includes('low')));
      case 'bowls': return lista.filter((x) => x.cozinhas.some((c) => c.toLowerCase().includes('bowl') || c.toLowerCase().includes('vegan')));
      default: return lista;
    }
  }, [todos.data?.itens, filtro]);

  const coordDe = useCallback((x: Restaurante, idx: number): [number, number] => {
    const c = COORDS_VITORIA_RESTAURANTES[x.nome];
    if (c) return c;
    return [-8.1162 + (idx % 3) * 0.0028, -35.2920 + Math.floor(idx / 3) * 0.0035];
  }, []);

  const centralizarTodos = useCallback(() => {
    const map = mapRef.current;
    if (!map || !filtrados.length) return;
    if (filtrados.length === 1) {
      map.flyTo(coordDe(filtrados[0]!, 0), 16, { duration: 0.5 });
      return;
    }
    const pontos = filtrados.map((x, idx) => coordDe(x, idx));
    map.fitBounds(L.latLngBounds(pontos), { paddingTopLeft: [48, 86], paddingBottomRight: [48, 48], maxZoom: 15, animate: true });
  }, [filtrados, coordDe]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(CENTRO_VITORIA_LAT_LNG, 14);

    L.tileLayer(TILE_MAPA_LIMPO, {
      attribution: '&copy; Esri &copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    camadaPinosRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 160);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      camadaPinosRef.current = null;
    };
  }, []);

  // Atualiza pinos em gota branca estilo iFood conforme o filtro / seleção
  useEffect(() => {
    const map = mapRef.current;
    const grupo = camadaPinosRef.current;
    if (!map || !grupo) return;

    grupo.clearLayers();
    const pontos: [number, number][] = [];
    filtrados.forEach((x, idx) => {
      const coord = coordDe(x, idx);
      pontos.push(coord);

      const ativo = selecionadoId === x.id;
      const icone = L.divIcon({
        className: '',
        html: `<div class="${s.pinoGotaWrap}"><span class="${s.pinoGota} ${ativo ? s.pinoGotaAtivo : ''}"><span class="${s.pinoGotaCorpo}">${SVG_LOJA_IFOOD}<span class="${s.pinoGotaSelo}">${x.sigla.slice(0, 1)}</span></span><span class="${s.pinoGotaPonta}"></span></span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker(coord, { icon: icone, zIndexOffset: ativo ? 500 : 200 })
        .on('click', () => {
          setSelecionadoId(x.id);
          map.flyTo(coord, 16, { duration: 0.45 });
        })
        .addTo(grupo);
    });

    if (pontos.length > 1 && !selecionadoId) {
      map.fitBounds(L.latLngBounds(pontos), { paddingTopLeft: [48, 86], paddingBottomRight: [48, 48], maxZoom: 15 });
    }
  }, [filtrados, selecionadoId, coordDe]);

  function focarRestaurante(x: Restaurante, idx: number) {
    setSelecionadoId(x.id);
    mapRef.current?.flyTo(coordDe(x, idx), 16, { duration: 0.45 });
  }

  return (
    <div className={s.mapaModalWrap}>
      <div className={s.mapaTopoArea}>
        <div ref={containerRef} className={s.mapaCanvas} aria-label="Mapa personalizado dos restaurantes em Vitória de Santo Antão" />

        <div className={s.mapaBarraSuperior}>
          <button type="button" className={s.mapaBotaoVoltar} onClick={onFechar} aria-label="Fechar mapa">
            <X size={18} aria-hidden />
          </button>
          <h2 id="mapa-dialogo" className={s.mapaTituloFlutuante}>Vitória de Santo Antão</h2>
          <button type="button" className={s.mapaBotaoVoltar} onClick={centralizarTodos} aria-label="Centralizar restaurantes" title="Centralizar mapa">
            <Navigation size={16} aria-hidden />
          </button>
        </div>

        <div className={s.mapaPilulasFlutuantes} role="group" aria-label="Filtrar restaurantes no mapa">
          {([
            ['todos', 'Todos'],
            ['abertos', 'Abertos agora'],
            ['gratis', 'Entrega grátis'],
            ['fitness', 'Fitness'],
            ['bowls', 'Bowls'],
          ] as [FiltroMapa, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${s.mapaPilula} ${filtro === id ? s.mapaPilulaAtiva : ''}`}
              aria-pressed={filtro === id}
              onClick={() => { setFiltro(id); setSelecionadoId(null); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.mapaSheet}>
        <span className={s.mapaSheetAlca} aria-hidden />
        {filtrados.length === 0 ? (
          <p className={s.mapaVazio}>Nenhum restaurante encontrado com este filtro.</p>
        ) : (
          <ul className={s.mapaLista}>
            {filtrados.map((x, idx) => {
              const ativo = selecionadoId === x.id;
              const end = ENDERECOS_VITORIA_RESTAURANTES[x.nome] ?? `${x.bairro ?? 'Centro'}, Vitória de Santo Antão`;
              return (
                <li key={x.id} className={`${s.mapaItem} ${ativo ? s.mapaItemAtivo : ''}`}>
                  <button type="button" className={s.mapaItemFoco} onClick={() => focarRestaurante(x, idx)}>
                    <span className={s.mapaItemNome}>{x.nome}</span>
                    <span className={s.mapaItemEnd}>{end}</span>
                    <span className={s.mapaItemBadges}>
                      <span className={x.aberto ? s.badgeAberto : s.badgeFechado}>
                        {x.aberto ? `Aberto · ${x.tempoEntregaMin}-${x.tempoEntregaMax} min` : x.abreAs ? `Abre às ${x.abreAs}` : 'Fechado agora'}
                      </span>
                      <span className={s.badgeNota}>★ {Number(x.nota).toFixed(1)}</span>
                    </span>
                  </button>
                  <Link to={`/app/restaurantes/${x.id}`} className={s.mapaItemIr} onClick={onFechar} aria-label={`Abrir cardápio de ${x.nome}`}>
                    <ChevronRight size={18} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
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
