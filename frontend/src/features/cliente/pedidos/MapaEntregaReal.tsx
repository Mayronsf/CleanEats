import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Layers, Navigation } from 'lucide-react';
import type { PedidoDetalhe, RastreamentoPedido } from '../../../services/cliente';
import {
  COORDS_VITORIA_RESTAURANTES,
  DESTINOS_VITORIA,
  SVG_CAPACETE_ENTREGADOR,
  SVG_CASA,
  SVG_LOJA_IFOOD,
  TILE_MAPA_LIMPO,
  TILE_SATELITE,
  TILE_SATELITE_ROTULOS,
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

function iconeGota(tipo: 'rest' | 'casa' | 'moto', rotulo?: string) {
  const classeTipo = tipo === 'moto' ? s.gotaMoto : tipo === 'casa' ? s.gotaCasa : s.gotaRest;
  const svg = tipo === 'moto' ? SVG_CAPACETE_ENTREGADOR : tipo === 'casa' ? SVG_CASA : SVG_LOJA_IFOOD;
  const selo = tipo === 'rest' ? `<span class="${s.seloLoja}">C</span>` : '';
  const escape = (txt: string) => txt.replace(/[<>&"]/g, '');
  const tag = rotulo ? `<span class="${s.etiqueta}">${escape(rotulo)}</span>` : '';

  return L.divIcon({
    className: '',
    html: `<div class="${s.marcadorWrap}"><div class="${s.gota} ${classeTipo}"><div class="${s.gotaCorpo}">${svg}${selo}</div><span class="${s.gotaPonta}"></span></div>${tag}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function MapaEntregaReal({ pedido, rastreamento, agora }: { pedido: PedidoDetalhe; rastreamento?: RastreamentoPedido; agora: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaMapaRef = useRef<L.TileLayer | null>(null);
  const camadaSatRef = useRef<L.LayerGroup | null>(null);
  const rotaBordaRef = useRef<L.Polyline | null>(null);
  const rotaBaseRef = useRef<L.Polyline | null>(null);
  const rotaAndadaHaloRef = useRef<L.Polyline | null>(null);
  const rotaAndadaRef = useRef<L.Polyline | null>(null);
  const motoRef = useRef<L.Marker | null>(null);
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
  const distanciaKm = rastreamento
    ? Number(rastreamento.distanciaRestanteKm > 0 ? rastreamento.distanciaRestanteKm : rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')
    : null;

  useEffect(() => {
    if (!rotaApi) setRotaFallback(rotaCurvaFallback(origem, destino));
  }, [origem, destino, rotaApi]);

  const enquadrar = useCallback((pontos: CoordLatLng[]) => {
    const mapa = mapaRef.current;
    if (!mapa || pontos.length < 2) return;
    mapa.fitBounds(L.latLngBounds(pontos), {
      paddingTopLeft: [56, 118],
      paddingBottomRight: [56, 68],
      maxZoom: 16,
      animate: true,
    });
  }, []);

  // Inicializa o mapa Leaflet (puro DOM/SVG, 100% compatível em qualquer navegador)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapaRef.current) return;

    const mapa = L.map(el, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    const camadaLimpa = L.tileLayer(TILE_MAPA_LIMPO, {
      attribution: '&copy; Esri &copy; OpenStreetMap',
      maxZoom: 19,
    });
    const camadaSat = L.layerGroup([
      L.tileLayer(TILE_SATELITE, { attribution: '&copy; Esri Satélite', maxZoom: 19 }),
      L.tileLayer(TILE_SATELITE_ROTULOS, { maxZoom: 19, opacity: 0.92 }),
    ]);

    camadaMapaRef.current = camadaLimpa;
    camadaSatRef.current = camadaSat;
    camadaLimpa.addTo(mapa);

    // Rota limpa estilo iFood (halo branco + tracejado suave do restante + verde vibrante no percorrido)
    rotaBordaRef.current = L.polyline(rota, { color: '#FFFFFF', weight: 9, opacity: 0.92, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
    rotaBaseRef.current = L.polyline(rota, { color: '#64748B', weight: 4.5, opacity: 0.72, dashArray: '8 8', lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
    rotaAndadaHaloRef.current = L.polyline([], { color: '#FFFFFF', weight: 9.5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
    rotaAndadaRef.current = L.polyline([], { color: '#3D8B24', weight: 5.5, opacity: 1, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);

    L.marker(origem, { icon: iconeGota('rest', pedido.restaurante.nome), zIndexOffset: 220 }).addTo(mapa);
    L.marker(destino, { icon: iconeGota('casa', 'Sua casa'), zIndexOffset: 220 }).addTo(mapa);
    motoRef.current = L.marker(origem, { icon: iconeGota('moto'), zIndexOffset: 600 });

    mapaRef.current = mapa;
    mapa.fitBounds(L.latLngBounds([origem, destino]), { paddingTopLeft: [56, 118], paddingBottomRight: [56, 68], maxZoom: 16 });
    const t = setTimeout(() => mapa.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      mapa.remove();
      mapaRef.current = null;
      camadaMapaRef.current = null;
      camadaSatRef.current = null;
      rotaBordaRef.current = null;
      rotaBaseRef.current = null;
      rotaAndadaHaloRef.current = null;
      rotaAndadaRef.current = null;
      motoRef.current = null;
    };
  }, [origem[0], origem[1], destino[0], destino[1], pedido.restaurante.nome]);

  // Alterna camada limpa / satélite
  useEffect(() => {
    const mapa = mapaRef.current;
    const limpa = camadaMapaRef.current;
    const sat = camadaSatRef.current;
    if (!mapa || !limpa || !sat) return;
    if (estilo === 'satelite') {
      if (mapa.hasLayer(limpa)) mapa.removeLayer(limpa);
      if (!mapa.hasLayer(sat)) sat.addTo(mapa);
    } else {
      if (mapa.hasLayer(sat)) mapa.removeLayer(sat);
      if (!mapa.hasLayer(limpa)) limpa.addTo(mapa);
    }
  }, [estilo]);

  // Atualiza geometria quando a rota real OSRM chega da API
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !rotaBordaRef.current || !rotaBaseRef.current) return;
    rotaBordaRef.current.setLatLngs(rota);
    rotaBaseRef.current.setLatLngs(rota);
    enquadrar(rota);
  }, [rota, enquadrar]);

  // Atualiza posição do entregador (capacete CleanEats) e trecho verde percorrido
  const progresso = rastreamento ? rastreamento.posicaoAtual.progresso : progressoEntrega(pedido, agora);
  const mostrarMoto = pedido.status === 'PRONTO' || pedido.status === 'A_CAMINHO' || pedido.status === 'ENTREGUE';

  useEffect(() => {
    const mapa = mapaRef.current;
    const moto = motoRef.current;
    const andada = rotaAndadaRef.current;
    const andadaHalo = rotaAndadaHaloRef.current;
    if (!mapa || !moto || !andada || !andadaHalo) return;

    if (!mostrarMoto) {
      if (mapa.hasLayer(moto)) mapa.removeLayer(moto);
      andada.setLatLngs([]);
      andadaHalo.setLatLngs([]);
      return;
    }

    const { pos, percorrido } = interpolarNaRota(rota, progresso);
    const posFinal: CoordLatLng = rastreamento ? [rastreamento.posicaoAtual.lat, rastreamento.posicaoAtual.lng] : pos;
    moto.setLatLng(posFinal);
    if (!mapa.hasLayer(moto)) moto.addTo(mapa);
    andadaHalo.setLatLngs(percorrido);
    andada.setLatLngs(percorrido);
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
      <div
        ref={containerRef}
        className={`${s.mapa} ${estilo === 'mapa' ? s.mapaEstiloIfood : ''}`}
        aria-label="Mapa interativo personalizado da entrega em Vitória de Santo Antão"
      />

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
