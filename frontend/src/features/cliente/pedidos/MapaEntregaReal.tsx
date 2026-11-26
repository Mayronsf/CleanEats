import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PedidoDetalhe } from '../../../services/cliente';
import s from './MapaEntregaReal.module.css';

type Coord = [number, number]; // [lat, lng]

/** Coordenadas realistas em Pernambuco para os restaurantes parceiros e cidades atendidas. */
const COORDS_RESTAURANTES: Record<string, Coord> = {
  'Sabor Natural': [-8.1185, -34.8995],
  'Verde Vida': [-8.0402, -34.9128],
  'FitFood': [-8.0468, -34.8955],
  'Mar & Terra': [-8.0912, -34.8842],
  'Açaí Club': [-8.0525, -34.9041],
  'Rota Proteica': [-8.1088, -34.8918],
  'Raízes Fit': [-8.0628, -34.8992],
};

function distanciaKmEntre(a: Coord, b: Coord): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function hashTexto(texto: string): number {
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Determina origem (restaurante) e destino (casa do cliente) na mesma cidade para uma rota verídica e limpa. */
function pontosDaEntrega(p: PedidoDetalhe): { origem: Coord; destino: Coord } {
  const cidade = (p.endereco?.cidade ?? 'Recife').toLowerCase();
  const hEnd = hashTexto(`${p.endereco?.logradouro ?? ''}-${p.endereco?.numero ?? ''}-${p.id}`);

  if (cidade.includes('vitória') || cidade.includes('vitoria')) {
    // Vitória de Santo Antão - PE (centro comercial -> bairro do cliente)
    const origem: Coord = [-8.1182, -35.2918];
    const destino: Coord = [-8.1268 + ((hEnd % 7) - 3) * 0.0012, -35.2804 + (((hEnd >> 3) % 7) - 3) * 0.0014];
    return { origem, destino };
  }

  // Recife - PE (usa a coordenada do restaurante cadastrado e um ponto realista a ~2,2 km)
  const origem: Coord = COORDS_RESTAURANTES[p.restaurante.nome] ?? [-8.1145, -34.8980];
  const dLat = ((hEnd % 2 === 0 ? 1 : -1) * (0.012 + ((hEnd % 9) * 0.0012)));
  const dLng = (((hEnd >> 2) % 2 === 0 ? 1 : -1) * (0.011 + (((hEnd >> 4) % 8) * 0.0011)));
  // Mantém no continente em Recife (lng <= -34.882)
  const destino: Coord = [origem[0] + dLat, Math.min(-34.885, origem[1] + dLng)];
  return { origem, destino };
}

/** Rota de fallback curva com vários pontos intermediários caso o OSRM demore ou esteja inacessível. */
function rotaCurvaFallback(a: Coord, b: Coord): Coord[] {
  const pontos: Coord[] = [];
  const meio: Coord = [(a[0] + b[0]) / 2 + 0.0045, (a[1] + b[1]) / 2 - 0.0035];
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

/** Calcula o progresso [0..1] do entregador na rota com base no status real e no relógio regressivo. */
function progressoEntrega(p: PedidoDetalhe, agora: number): number {
  if (p.status === 'ENTREGUE') return 1;
  if (p.status === 'PRONTO') return 0.03;
  if (p.status !== 'A_CAMINHO') return 0;

  const saidaIso = p.historico.find((h) => h.status === 'A_CAMINHO')?.em ?? p.criadoEm;
  const inicioMs = new Date(saidaIso).getTime();
  const fimMs = p.previsaoEntregaEm ? new Date(p.previsaoEntregaEm).getTime() : inicioMs + 90_000;
  const duracao = Math.max(15_000, fimMs - inicioMs);
  const bruto = (agora - inicioMs) / duracao;
  // Mantém a moto claramente em movimento entre 8% e 95% enquanto está a caminho
  return Math.max(0.08, Math.min(0.95, bruto));
}

function interpolarNaRota(pontos: Coord[], t: number): { pos: Coord; percorrido: Coord[] } {
  if (pontos.length < 2) return { pos: pontos[0] ?? [-8.1185, -34.8995], percorrido: pontos };
  const clamped = Math.max(0, Math.min(1, t));
  const idxFloat = clamped * (pontos.length - 1);
  const i = Math.min(pontos.length - 2, Math.floor(idxFloat));
  const frac = idxFloat - i;
  const p0 = pontos[i]!;
  const p1 = pontos[i + 1]!;
  const pos: Coord = [p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac];
  return { pos, percorrido: [...pontos.slice(0, i + 1), pos] };
}

function iconePino(tipo: 'rest' | 'casa' | 'moto', rotulo?: string) {
  const classeBolha = tipo === 'rest' ? s.bolhaRest : tipo === 'casa' ? s.bolhaCasa : s.bolhaMoto;
  const svg = tipo === 'rest'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>'
    : tipo === 'casa'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
      : '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';

  const escape = (txt: string) => txt.replace(/[<>&"]/g, '');
  return L.divIcon({
    className: '',
    html: `<div class="${s.pinoBase}"><span class="${s.bolha} ${classeBolha}">${svg}</span>${rotulo ? `<span class="${s.etiqueta}">${escape(rotulo)}</span>` : ''}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function MapaEntregaReal({ pedido, agora }: { pedido: PedidoDetalhe; agora: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const rotaBaseRef = useRef<L.Polyline | null>(null);
  const rotaAndadaRef = useRef<L.Polyline | null>(null);
  const motoRef = useRef<L.Marker | null>(null);

  const { origem, destino: destinoBase } = useMemo(() => pontosDaEntrega(pedido), [pedido.id, pedido.restaurante.nome, pedido.endereco?.cidade, pedido.endereco?.logradouro, pedido.endereco?.numero]);
  const [destino, setDestino] = useState<Coord>(destinoBase);
  const [rota, setRota] = useState<Coord[]>(() => rotaCurvaFallback(origem, destinoBase));
  const [distanciaKm, setDistanciaKm] = useState<string | null>(null);

  // Geocodifica o endereço real do cliente via Nominatim (OpenStreetMap) com fallback seguro
  useEffect(() => {
    setDestino(destinoBase);
    const end = pedido.endereco;
    if (!end?.logradouro || !end?.cidade) return;
    const ctrl = new AbortController();
    const q = encodeURIComponent(`${end.logradouro} ${end.numero ?? ''}, ${end.bairro ?? ''}, ${end.cidade}, ${end.uf ?? 'PE'}, Brasil`);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((lista) => {
        const hit = Array.isArray(lista) ? lista[0] : null;
        if (!hit?.lat || !hit?.lon) return;
        const candidato: Coord = [Number(hit.lat), Number(hit.lon)];
        const dist = distanciaKmEntre(origem, candidato);
        if (Number.isFinite(dist) && dist >= 0.25 && dist <= 35) {
          setDestino(candidato);
        }
      })
      .catch(() => { /* mantém coordenada de fallback da cidade */ });
    return () => ctrl.abort();
  }, [destinoBase, origem, pedido.endereco]);

  // Busca rota real pelas ruas via OSRM (gratuito, sem chave)
  useEffect(() => {
    const fallback = rotaCurvaFallback(origem, destino);
    setRota(fallback);
    const ctrl = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${origem[1]},${origem[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rotaApi = d?.routes?.[0];
        const coords = rotaApi?.geometry?.coordinates as [number, number][] | undefined;
        if (coords && coords.length >= 2) {
          setRota(coords.map(([lng, lat]) => [lat, lng] as Coord));
          if (typeof rotaApi.distance === 'number') {
            setDistanciaKm((rotaApi.distance / 1000).toFixed(1).replace('.', ','));
          }
        }
      })
      .catch(() => { /* mantém a rota curva de fallback */ });
    return () => ctrl.abort();
  }, [origem, destino]);

  // Inicializa o mapa Leaflet uma vez
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapaRef.current) return;

    const mapa = L.map(el, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapa);

    L.marker(origem, { icon: iconePino('rest', pedido.restaurante.nome), zIndexOffset: 200 }).addTo(mapa);
    L.marker(destino, { icon: iconePino('casa', 'Sua casa'), zIndexOffset: 200 }).addTo(mapa);

    rotaBaseRef.current = L.polyline(rota, { color: '#5BB033', weight: 5, opacity: 0.35, dashArray: '8 8' }).addTo(mapa);
    rotaAndadaRef.current = L.polyline([], { color: '#2D6A1F', weight: 5, opacity: 0.92 }).addTo(mapa);
    motoRef.current = L.marker(origem, { icon: iconePino('moto'), zIndexOffset: 500 });

    const bounds = L.latLngBounds([origem, destino]);
    mapa.fitBounds(bounds, { paddingTopLeft: [48, 108], paddingBottomRight: [48, 56], maxZoom: 15 });
    mapaRef.current = mapa;

    return () => {
      mapa.remove();
      mapaRef.current = null;
      rotaBaseRef.current = null;
      rotaAndadaRef.current = null;
      motoRef.current = null;
    };
  }, [origem, destino, pedido.restaurante.nome]);

  // Atualiza a polilinha quando a rota real do OSRM chega
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !rotaBaseRef.current) return;
    rotaBaseRef.current.setLatLngs(rota);
    const bounds = L.latLngBounds(rota);
    mapa.fitBounds(bounds, { paddingTopLeft: [48, 108], paddingBottomRight: [48, 56], maxZoom: 15 });
  }, [rota]);

  // Atualiza posição do entregador e trecho percorrido em tempo real
  const progresso = progressoEntrega(pedido, agora);
  const mostrarMoto = pedido.status === 'PRONTO' || pedido.status === 'A_CAMINHO' || pedido.status === 'ENTREGUE';

  useEffect(() => {
    const mapa = mapaRef.current;
    const moto = motoRef.current;
    const andada = rotaAndadaRef.current;
    if (!mapa || !moto || !andada) return;

    if (!mostrarMoto) {
      if (mapa.hasLayer(moto)) mapa.removeLayer(moto);
      andada.setLatLngs([]);
      return;
    }

    const { pos, percorrido } = interpolarNaRota(rota, progresso);
    moto.setLatLng(pos);
    if (!mapa.hasLayer(moto)) moto.addTo(mapa);
    andada.setLatLngs(percorrido);
  }, [rota, progresso, mostrarMoto]);

  const legendaRota = pedido.status === 'A_CAMINHO'
    ? `Em rota · ${Math.round(progresso * 100)}% do trajeto${distanciaKm ? ` (${distanciaKm} km)` : ''}`
    : pedido.status === 'ENTREGUE'
      ? `Trajeto concluído${distanciaKm ? ` · ${distanciaKm} km` : ''}`
      : `Rota prevista${distanciaKm ? ` · ${distanciaKm} km` : ''}`;

  return (
    <div className={s.wrap}>
      <div ref={containerRef} className={s.mapa} aria-label="Mapa interativo com a rota da entrega" />
      <div className={s.barraProgresso} aria-live="polite">
        <span className={s.barraPonto} aria-hidden />
        <span>{legendaRota}</span>
      </div>
    </div>
  );
}
