import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ExternalLink, Layers, Navigation } from 'lucide-react';
import type { PedidoDetalhe, RastreamentoPedido } from '../../../services/cliente';
import {
  alternarSatelite,
  aplicarTemaCleanEats,
  COORDS_VITORIA_RESTAURANTES,
  DESTINOS_VITORIA,
  ESTILO_MAPA_VETORIAL,
  SVG_CAPACETE_ENTREGADOR,
  SVG_CASA,
  SVG_LOJA_IFOOD,
  type CoordLatLng,
} from '../../../lib/mapaEstilo';
import s from './MapaEntregaReal.module.css';

type EstiloMapa = 'mapa' | 'satelite';

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (const ch of texto) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function pontosDaEntrega(p: PedidoDetalhe): { origem: CoordLatLng; destino: CoordLatLng } {
  const origem: CoordLatLng = COORDS_VITORIA_RESTAURANTES[p.restaurante.nome] ?? [-8.116282, -35.292347];
  const hEnd = hashTexto(`${p.endereco?.logradouro ?? ''}-${p.endereco?.numero ?? ''}-${p.id}`);
  for (let i = 0; i < DESTINOS_VITORIA.length; i++) {
    const cand = DESTINOS_VITORIA[(hEnd + i) % DESTINOS_VITORIA.length]!;
    const dist = Math.hypot(origem[0] - cand[0], origem[1] - cand[1]);
    if (dist > 0.004) return { origem, destino: cand };
  }
  return { origem, destino: [origem[0] - 0.006, origem[1] - 0.008] };
}

function rotaCurvaFallback(a: CoordLatLng, b: CoordLatLng): CoordLatLng[] {
  const pontos: CoordLatLng[] = [];
  const meio: CoordLatLng = [(a[0] + b[0]) / 2 + 0.003, (a[1] + b[1]) / 2 - 0.0025];
  const passos = 36;
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const u = 1 - t;
    pontos.push([
      u * u * a[0] + 2 * u * t * meio[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * meio[1] + t * t * b[1],
    ]);
  }
  return pontos;
}

function progressoEntrega(p: PedidoDetalhe, agora: number): number {
  if (p.status === 'ENTREGUE') return 1;
  if (p.status === 'PRONTO') return 0.03;
  if (p.status !== 'A_CAMINHO') return 0;

  const saidaIso = p.historico.find((h) => h.status === 'A_CAMINHO')?.em ?? p.criadoEm;
  const inicioMs = new Date(saidaIso).getTime();
  const fimMs = p.previsaoEntregaEm ? new Date(p.previsaoEntregaEm).getTime() : inicioMs + 90_000;
  const duracao = Math.max(15_000, fimMs - inicioMs);
  const bruto = (agora - inicioMs) / duracao;
  return Math.max(0.08, Math.min(0.95, bruto));
}

function interpolarNaRota(pontos: CoordLatLng[], t: number): { pos: CoordLatLng; percorrido: CoordLatLng[] } {
  if (pontos.length < 2) return { pos: pontos[0] ?? [-8.116282, -35.292347], percorrido: pontos };
  const clamped = Math.max(0, Math.min(1, t));
  const idxFloat = clamped * (pontos.length - 1);
  const i = Math.min(pontos.length - 2, Math.floor(idxFloat));
  const frac = idxFloat - i;
  const p0 = pontos[i]!;
  const p1 = pontos[i + 1]!;
  const pos: CoordLatLng = [p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac];
  return { pos, percorrido: [...pontos.slice(0, i + 1), pos] };
}

function paraGeoJsonLinha(pontos: CoordLatLng[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: pontos.map(([lat, lng]) => [lng, lat]),
    },
  };
}

function criarMarcadorGota(tipo: 'rest' | 'casa' | 'moto', rotulo?: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = s.marcadorWrap;

  const gota = document.createElement('div');
  gota.className = tipo === 'moto' ? `${s.gota} ${s.gotaMoto}` : tipo === 'casa' ? `${s.gota} ${s.gotaCasa}` : `${s.gota} ${s.gotaRest}`;

  const corpo = document.createElement('div');
  corpo.className = s.gotaCorpo;
  corpo.innerHTML = tipo === 'moto' ? SVG_CAPACETE_ENTREGADOR : tipo === 'casa' ? SVG_CASA : SVG_LOJA_IFOOD;

  if (tipo === 'rest') {
    const selo = document.createElement('span');
    selo.className = s.seloLoja;
    selo.textContent = 'C';
    corpo.appendChild(selo);
  }

  const ponta = document.createElement('span');
  ponta.className = s.gotaPonta;

  gota.appendChild(corpo);
  gota.appendChild(ponta);
  wrap.appendChild(gota);

  if (rotulo) {
    const tag = document.createElement('span');
    tag.className = s.etiqueta;
    tag.textContent = rotulo;
    wrap.appendChild(tag);
  }
  return wrap;
}

export function MapaEntregaReal({ pedido, rastreamento, agora }: { pedido: PedidoDetalhe; rastreamento?: RastreamentoPedido; agora: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const prontoRef = useRef(false);
  const motoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const rotaRef = useRef<CoordLatLng[]>([]);
  const [estilo, setEstilo] = useState<EstiloMapa>('mapa');

  const { origem: origemFallback, destino: destinoBase } = useMemo(
    () => pontosDaEntrega(pedido),
    [pedido.id, pedido.restaurante.nome, pedido.endereco?.cidade, pedido.endereco?.logradouro, pedido.endereco?.numero],
  );
  const origem: CoordLatLng = useMemo(
    () => (rastreamento ? [rastreamento.origem.lat, rastreamento.origem.lng] : origemFallback),
    [rastreamento?.origem.lat, rastreamento?.origem.lng, origemFallback],
  );
  const destino: CoordLatLng = useMemo(
    () => (rastreamento ? [rastreamento.destino.lat, rastreamento.destino.lng] : destinoBase),
    [rastreamento?.destino.lat, rastreamento?.destino.lng, destinoBase],
  );

  const rotaApi = useMemo<CoordLatLng[] | null>(
    () => (rastreamento && rastreamento.rota.length >= 2 ? rastreamento.rota.map((pt) => [pt.lat, pt.lng] as CoordLatLng) : null),
    [rastreamento?.rota],
  );
  const [rotaFallback, setRotaFallback] = useState<CoordLatLng[]>(() => rotaCurvaFallback(origem, destino));
  const rota = rotaApi ?? rotaFallback;
  rotaRef.current = rota;

  const distanciaKm = rastreamento
    ? Number(rastreamento.distanciaRestanteKm > 0 ? rastreamento.distanciaRestanteKm : rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')
    : null;

  useEffect(() => {
    if (!rotaApi) setRotaFallback(rotaCurvaFallback(origem, destino));
  }, [origem, destino, rotaApi]);

  const enquadrar = useCallback((pontos: CoordLatLng[]) => {
    const map = mapRef.current;
    if (!map || pontos.length < 2) return;
    const bounds = new maplibregl.LngLatBounds();
    pontos.forEach(([lat, lng]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding: { top: 112, bottom: 72, left: 56, right: 56 }, maxZoom: 16, duration: 550 });
  }, []);

  // Inicializa o mapa vetorial estilo iFood / Apple Maps
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = new maplibregl.Map({
      container: el,
      style: ESTILO_MAPA_VETORIAL,
      center: [origem[1], origem[0]],
      zoom: 15,
      attributionControl: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('style.load', () => {
      aplicarTemaCleanEats(map);
      prontoRef.current = true;

      if (!map.getSource('rota-base')) {
        map.addSource('rota-base', { type: 'geojson', data: paraGeoJsonLinha(rotaRef.current) });
        map.addLayer({
          id: 'rota-base-borda',
          type: 'line',
          source: 'rota-base',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 9, 'line-opacity': 0.92 },
        });
        map.addLayer({
          id: 'rota-base-linha',
          type: 'line',
          source: 'rota-base',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#94A3B8', 'line-width': 5, 'line-dasharray': [1.8, 1.4], 'line-opacity': 0.8 },
        });
      }

      if (!map.getSource('rota-andada')) {
        map.addSource('rota-andada', { type: 'geojson', data: paraGeoJsonLinha([]) });
        map.addLayer({
          id: 'rota-andada-halo',
          type: 'line',
          source: 'rota-andada',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 9.5, 'line-opacity': 0.95 },
        });
        map.addLayer({
          id: 'rota-andada-linha',
          type: 'line',
          source: 'rota-andada',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3D8B24', 'line-width': 5.5, 'line-opacity': 1 },
        });
      }

      enquadrar(rotaRef.current.length >= 2 ? rotaRef.current : [origem, destino]);
    });

    new maplibregl.Marker({ element: criarMarcadorGota('rest', pedido.restaurante.nome), anchor: 'bottom' })
      .setLngLat([origem[1], origem[0]])
      .addTo(map);

    new maplibregl.Marker({ element: criarMarcadorGota('casa', 'Sua casa'), anchor: 'bottom' })
      .setLngLat([destino[1], destino[0]])
      .addTo(map);

    motoMarkerRef.current = new maplibregl.Marker({ element: criarMarcadorGota('moto'), anchor: 'bottom' })
      .setLngLat([origem[1], origem[0]]);

    mapRef.current = map;

    return () => {
      prontoRef.current = false;
      motoMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [origem[0], origem[1], destino[0], destino[1], pedido.restaurante.nome, enquadrar]);

  // Alterna camada limpa / satélite
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !prontoRef.current) return;
    alternarSatelite(map, estilo === 'satelite');
  }, [estilo]);

  // Atualiza geometria da rota quando a rota real OSRM chega da API
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !prontoRef.current) return;
    const src = map.getSource('rota-base') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(paraGeoJsonLinha(rota));
    enquadrar(rota);
  }, [rota, enquadrar]);

  // Atualiza posição do entregador (capacete CleanEats) e trecho verde percorrido
  const progresso = rastreamento ? rastreamento.posicaoAtual.progresso : progressoEntrega(pedido, agora);
  const mostrarMoto = pedido.status === 'PRONTO' || pedido.status === 'A_CAMINHO' || pedido.status === 'ENTREGUE';

  useEffect(() => {
    const map = mapRef.current;
    const moto = motoMarkerRef.current;
    if (!map || !moto) return;

    const srcAndada = prontoRef.current ? (map.getSource('rota-andada') as maplibregl.GeoJSONSource | undefined) : undefined;
    if (!mostrarMoto) {
      moto.remove();
      srcAndada?.setData(paraGeoJsonLinha([]));
      return;
    }

    const { pos, percorrido } = interpolarNaRota(rota, progresso);
    const posFinal: CoordLatLng = rastreamento ? [rastreamento.posicaoAtual.lat, rastreamento.posicaoAtual.lng] : pos;
    moto.setLngLat([posFinal[1], posFinal[0]]).addTo(map);
    srcAndada?.setData(paraGeoJsonLinha(percorrido));
  }, [rota, progresso, mostrarMoto, rastreamento?.posicaoAtual.lat, rastreamento?.posicaoAtual.lng]);

  const vel = rastreamento?.posicaoAtual.velocidadeKmh;
  const legendaRota = pedido.status === 'A_CAMINHO'
    ? `Em rota · ${Math.round(progresso * 100)}%${distanciaKm ? ` · faltam ${distanciaKm} km` : ''}${vel ? ` · ${vel} km/h` : ''}`
    : pedido.status === 'ENTREGUE'
      ? `Trajeto concluído${rastreamento ? ` · ${Number(rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')} km` : ''}`
      : `Rota prevista${rastreamento ? ` · ${Number(rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')} km` : ''}`;

  const urlGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${origem[0].toFixed(6)},${origem[1].toFixed(6)}&destination=${destino[0].toFixed(6)},${destino[1].toFixed(6)}&travelmode=driving`;

  return (
    <div className={s.wrap}>
      <div ref={containerRef} className={s.mapa} aria-label="Mapa interativo personalizado da entrega em Vitória de Santo Antão" />

      <div className={s.controlesTopo} role="group" aria-label="Modo de exibição do mapa">
        <button
          type="button"
          className={`${s.botaoModo} ${estilo === 'mapa' ? s.botaoModoAtivo : ''}`}
          aria-pressed={estilo === 'mapa'}
          onClick={() => setEstilo('mapa')}
        >
          <Layers size={13} aria-hidden /> Mapa
        </button>
        <button
          type="button"
          className={`${s.botaoModo} ${estilo === 'satelite' ? s.botaoModoAtivo : ''}`}
          aria-pressed={estilo === 'satelite'}
          onClick={() => setEstilo('satelite')}
        >
          Satélite
        </button>
      </div>

      <button
        type="button"
        className={s.botaoCentralizar}
        onClick={() => enquadrar(rota)}
        aria-label="Centralizar rota no mapa"
        title="Centralizar rota"
      >
        <Navigation size={18} aria-hidden />
      </button>

      <div className={s.barraInferior}>
        <div className={s.barraProgresso} aria-live="polite">
          <span className={s.barraPonto} aria-hidden />
          <span>{legendaRota}</span>
        </div>
        <a
          href={urlGoogleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className={s.linkGoogleMaps}
          title="Abrir esta rota no Google Maps"
        >
          Google Maps <ExternalLink size={12} aria-hidden />
        </a>
      </div>
    </div>
  );
}
