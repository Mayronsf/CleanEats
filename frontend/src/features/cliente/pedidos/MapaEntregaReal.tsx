import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Layers } from 'lucide-react';
import type { PedidoDetalhe, RastreamentoPedido } from '../../../services/cliente';
import s from './MapaEntregaReal.module.css';

type Coord = [number, number]; // [lat, lng]
type EstiloMapa = 'mapa' | 'satelite';

/** Coordenadas reais em Vitória de Santo Antão - PE para os restaurantes parceiros. */
const COORDS_RESTAURANTES: Record<string, Coord> = {
  'Sabor Natural': [-8.116169, -35.270785],  // Vitória Park Shopping · Redenção
  'Verde Vida': [-8.116282, -35.292347],     // Praça da Matriz · Matriz
  'Mar & Terra': [-8.120137, -35.295750],    // Av. Mariana Amália · Centro
  'FitFood': [-8.118306, -35.290311],        // Rua do Estudante (UNIFACOL) · Universitário
  'Açaí Club': [-8.114345, -35.281293],      // Av. Henrique de Holanda · Redenção
  'Rota Proteica': [-8.118237, -35.312249],  // Rua Eurico Valois · Maués
  'Raízes Fit': [-8.113530, -35.292649],     // Av. Silva Jardim · Matriz
};

const DESTINOS_VITORIA: Coord[] = [
  [-8.116215, -35.294658], // Rua Melo Verçosa · Centro
  [-8.111612, -35.291116], // Rua Queiroz Pedroso · Bela Vista
  [-8.118306, -35.290311], // Rua do Estudante · Universitário
  [-8.123500, -35.297200], // Livramento
  [-8.114950, -35.283800], // Redenção
  [-8.117900, -35.308500], // Maués
];

const GOOGLE_MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';

let promessaGoogleMaps: Promise<typeof google> | null = null;
function carregarGoogleMaps(chave: string): Promise<typeof google> {
  const g = (window as unknown as { google?: typeof google }).google;
  if (g?.maps) return Promise.resolve(g);
  if (promessaGoogleMaps) return promessaGoogleMaps;
  promessaGoogleMaps = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(chave)}&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const carregado = (window as unknown as { google?: typeof google }).google;
      if (carregado?.maps) resolve(carregado);
      else reject(new Error('Google Maps não inicializou'));
    };
    script.onerror = () => reject(new Error('Falha ao carregar Google Maps JS API'));
    document.head.appendChild(script);
  });
  return promessaGoogleMaps;
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(el: HTMLElement, opts: Record<string, unknown>);
      fitBounds(bounds: LatLngBounds, padding?: Record<string, number> | number): void;
      setMapTypeId(id: string): void;
    }
    class LatLngBounds {
      extend(pt: { lat: number; lng: number }): void;
    }
    class Polyline {
      constructor(opts: Record<string, unknown>);
      setPath(path: Array<{ lat: number; lng: number }>): void;
      setMap(map: Map | null): void;
    }
    class Marker {
      constructor(opts: Record<string, unknown>);
      setPosition(pt: { lat: number; lng: number }): void;
      setMap(map: Map | null): void;
    }
  }
}

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (const ch of texto) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function pontosDaEntrega(p: PedidoDetalhe): { origem: Coord; destino: Coord } {
  const origem: Coord = COORDS_RESTAURANTES[p.restaurante.nome] ?? [-8.116282, -35.292347];
  const hEnd = hashTexto(`${p.endereco?.logradouro ?? ''}-${p.endereco?.numero ?? ''}-${p.id}`);
  for (let i = 0; i < DESTINOS_VITORIA.length; i++) {
    const cand = DESTINOS_VITORIA[(hEnd + i) % DESTINOS_VITORIA.length]!;
    const dist = Math.hypot(origem[0] - cand[0], origem[1] - cand[1]);
    if (dist > 0.004) return { origem, destino: cand };
  }
  return { origem, destino: [origem[0] - 0.006, origem[1] - 0.008] };
}

function rotaCurvaFallback(a: Coord, b: Coord): Coord[] {
  const pontos: Coord[] = [];
  const meio: Coord = [(a[0] + b[0]) / 2 + 0.003, (a[1] + b[1]) / 2 - 0.0025];
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

function interpolarNaRota(pontos: Coord[], t: number): { pos: Coord; percorrido: Coord[] } {
  if (pontos.length < 2) return { pos: pontos[0] ?? [-8.116282, -35.292347], percorrido: pontos };
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

export function MapaEntregaReal({ pedido, rastreamento, agora }: { pedido: PedidoDetalhe; rastreamento?: RastreamentoPedido; agora: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaMapaRef = useRef<L.TileLayer | null>(null);
  const camadaSateliteRef = useRef<L.LayerGroup | null>(null);
  const rotaContornoRef = useRef<L.Polyline | null>(null);
  const rotaBaseRef = useRef<L.Polyline | null>(null);
  const rotaAndadaRef = useRef<L.Polyline | null>(null);
  const motoRef = useRef<L.Marker | null>(null);

  // Referências opcionais quando VITE_GOOGLE_MAPS_API_KEY estiver configurada
  const gMapaRef = useRef<google.maps.Map | null>(null);
  const gRotaRef = useRef<google.maps.Polyline | null>(null);
  const gAndadaRef = useRef<google.maps.Polyline | null>(null);
  const gMotoRef = useRef<google.maps.Marker | null>(null);

  const [estilo, setEstilo] = useState<EstiloMapa>('mapa');
  const [usandoGoogle, setUsandoGoogle] = useState(false);

  const { origem: origemFallback, destino: destinoBase } = useMemo(
    () => pontosDaEntrega(pedido),
    [pedido.id, pedido.restaurante.nome, pedido.endereco?.cidade, pedido.endereco?.logradouro, pedido.endereco?.numero],
  );
  const origem: Coord = useMemo(
    () => (rastreamento ? [rastreamento.origem.lat, rastreamento.origem.lng] : origemFallback),
    [rastreamento?.origem.lat, rastreamento?.origem.lng, origemFallback],
  );
  const destino: Coord = useMemo(
    () => (rastreamento ? [rastreamento.destino.lat, rastreamento.destino.lng] : destinoBase),
    [rastreamento?.destino.lat, rastreamento?.destino.lng, destinoBase],
  );

  const rotaApi = useMemo<Coord[] | null>(
    () => (rastreamento && rastreamento.rota.length >= 2 ? rastreamento.rota.map((pt) => [pt.lat, pt.lng] as Coord) : null),
    [rastreamento?.rota],
  );
  const [rotaFallback, setRotaFallback] = useState<Coord[]>(() => rotaCurvaFallback(origem, destino));
  const rota = rotaApi ?? rotaFallback;
  const distanciaKm = rastreamento
    ? Number(rastreamento.distanciaRestanteKm > 0 ? rastreamento.distanciaRestanteKm : rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')
    : null;

  useEffect(() => {
    if (!rotaApi) setRotaFallback(rotaCurvaFallback(origem, destino));
  }, [origem, destino, rotaApi]);

  // Inicializa Google Maps oficial (se VITE_GOOGLE_MAPS_API_KEY estiver configurada) ou Leaflet estilo Google Maps (OSM + Satélite)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelado = false;

    const inicializarLeaflet = () => {
      if (cancelado || mapaRef.current) return;
      const mapa = L.map(el, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(mapa);

      const camadaRuas = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });
      const camadaSat = L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri Satélite',
          maxZoom: 19,
        }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          opacity: 0.85,
        }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          opacity: 0.9,
        }),
      ]);

      camadaMapaRef.current = camadaRuas;
      camadaSateliteRef.current = camadaSat;
      (estilo === 'satelite' ? camadaSat : camadaRuas).addTo(mapa);

      L.marker(origem, { icon: iconePino('rest', pedido.restaurante.nome), zIndexOffset: 200 }).addTo(mapa);
      L.marker(destino, { icon: iconePino('casa', 'Sua casa'), zIndexOffset: 200 }).addTo(mapa);

      // Rota azul estilo navegação Google Maps (borda azul escuro + miolo azul vivo)
      rotaContornoRef.current = L.polyline(rota, { color: '#1557B0', weight: 8, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
      rotaBaseRef.current = L.polyline(rota, { color: '#4285F4', weight: 5, opacity: 0.96, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
      rotaAndadaRef.current = L.polyline([], { color: '#2D6A1F', weight: 5.5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(mapa);
      motoRef.current = L.marker(origem, { icon: iconePino('moto'), zIndexOffset: 500 });

      const bounds = L.latLngBounds([origem, destino]);
      mapa.fitBounds(bounds, { paddingTopLeft: [48, 108], paddingBottomRight: [48, 58], maxZoom: 16 });
      mapaRef.current = mapa;
    };

    if (GOOGLE_MAPS_KEY) {
      carregarGoogleMaps(GOOGLE_MAPS_KEY)
        .then((g) => {
          if (cancelado) return;
          const mapa = new g.maps.Map(el, {
            center: { lat: origem[0], lng: origem[1] },
            zoom: 15,
            mapTypeId: estilo === 'satelite' ? 'hybrid' : 'roadmap',
            disableDefaultUI: true,
            zoomControl: true,
          });
          new g.maps.Marker({ position: { lat: origem[0], lng: origem[1] }, map: mapa, title: pedido.restaurante.nome });
          new g.maps.Marker({ position: { lat: destino[0], lng: destino[1] }, map: mapa, title: 'Sua casa' });
          const path = rota.map(([lat, lng]) => ({ lat, lng }));
          gRotaRef.current = new g.maps.Polyline({ path, map: mapa, strokeColor: '#1A73E8', strokeOpacity: 0.95, strokeWeight: 6 });
          gAndadaRef.current = new g.maps.Polyline({ path: [], map: mapa, strokeColor: '#2D6A1F', strokeOpacity: 0.95, strokeWeight: 6 });
          gMotoRef.current = new g.maps.Marker({ position: { lat: origem[0], lng: origem[1] }, title: 'Entregador' });
          const b = new g.maps.LatLngBounds();
          path.forEach((pt) => b.extend(pt));
          mapa.fitBounds(b, { top: 108, right: 48, bottom: 58, left: 48 });
          gMapaRef.current = mapa;
          setUsandoGoogle(true);
        })
        .catch(() => {
          setUsandoGoogle(false);
          inicializarLeaflet();
        });
    } else {
      inicializarLeaflet();
    }

    return () => {
      cancelado = true;
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
      camadaMapaRef.current = null;
      camadaSateliteRef.current = null;
      rotaContornoRef.current = null;
      rotaBaseRef.current = null;
      rotaAndadaRef.current = null;
      motoRef.current = null;
      gMapaRef.current = null;
      gRotaRef.current = null;
      gAndadaRef.current = null;
      gMotoRef.current = null;
    };
  }, [origem[0], origem[1], destino[0], destino[1], pedido.restaurante.nome]);

  // Alterna camada Mapa / Satélite
  useEffect(() => {
    if (usandoGoogle && gMapaRef.current) {
      gMapaRef.current.setMapTypeId(estilo === 'satelite' ? 'hybrid' : 'roadmap');
      return;
    }
    const mapa = mapaRef.current;
    const ruas = camadaMapaRef.current;
    const sat = camadaSateliteRef.current;
    if (!mapa || !ruas || !sat) return;
    if (estilo === 'satelite') {
      if (mapa.hasLayer(ruas)) mapa.removeLayer(ruas);
      if (!mapa.hasLayer(sat)) sat.addTo(mapa);
    } else {
      if (mapa.hasLayer(sat)) mapa.removeLayer(sat);
      if (!mapa.hasLayer(ruas)) ruas.addTo(mapa);
    }
  }, [estilo, usandoGoogle]);

  // Atualiza a polilinha quando a rota real da API chega
  useEffect(() => {
    if (usandoGoogle && gMapaRef.current && gRotaRef.current) {
      const path = rota.map(([lat, lng]) => ({ lat, lng }));
      gRotaRef.current.setPath(path);
      return;
    }
    const mapa = mapaRef.current;
    if (!mapa || !rotaBaseRef.current || !rotaContornoRef.current) return;
    rotaContornoRef.current.setLatLngs(rota);
    rotaBaseRef.current.setLatLngs(rota);
    const bounds = L.latLngBounds(rota);
    mapa.fitBounds(bounds, { paddingTopLeft: [48, 108], paddingBottomRight: [48, 58], maxZoom: 16 });
  }, [rota, usandoGoogle]);

  const progresso = rastreamento ? rastreamento.posicaoAtual.progresso : progressoEntrega(pedido, agora);
  const mostrarMoto = pedido.status === 'PRONTO' || pedido.status === 'A_CAMINHO' || pedido.status === 'ENTREGUE';

  useEffect(() => {
    const { pos, percorrido } = interpolarNaRota(rota, progresso);
    const posFinal: Coord = rastreamento ? [rastreamento.posicaoAtual.lat, rastreamento.posicaoAtual.lng] : pos;

    if (usandoGoogle && gMapaRef.current && gMotoRef.current && gAndadaRef.current) {
      if (!mostrarMoto) {
        gMotoRef.current.setMap(null);
        gAndadaRef.current.setPath([]);
        return;
      }
      gMotoRef.current.setPosition({ lat: posFinal[0], lng: posFinal[1] });
      gMotoRef.current.setMap(gMapaRef.current);
      gAndadaRef.current.setPath(percorrido.map(([lat, lng]) => ({ lat, lng })));
      return;
    }

    const mapa = mapaRef.current;
    const moto = motoRef.current;
    const andada = rotaAndadaRef.current;
    if (!mapa || !moto || !andada) return;

    if (!mostrarMoto) {
      if (mapa.hasLayer(moto)) mapa.removeLayer(moto);
      andada.setLatLngs([]);
      return;
    }

    moto.setLatLng(posFinal);
    if (!mapa.hasLayer(moto)) moto.addTo(mapa);
    andada.setLatLngs(percorrido);
  }, [rota, progresso, mostrarMoto, usandoGoogle, rastreamento?.posicaoAtual.lat, rastreamento?.posicaoAtual.lng]);

  const vel = rastreamento?.posicaoAtual.velocidadeKmh;
  const legendaRota = pedido.status === 'A_CAMINHO'
    ? `Em rota · ${Math.round(progresso * 100)}%${distanciaKm ? ` · faltam ${distanciaKm} km` : ''}${vel ? ` · ${vel} km/h` : ''}`
    : pedido.status === 'ENTREGUE'
      ? `Trajeto concluído${rastreamento ? ` · ${Number(rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')} km` : ''}`
      : `Rota prevista${rastreamento ? ` · ${Number(rastreamento.distanciaTotalKm).toFixed(1).replace('.', ',')} km` : ''}`;

  const urlGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${origem[0].toFixed(6)},${origem[1].toFixed(6)}&destination=${destino[0].toFixed(6)},${destino[1].toFixed(6)}&travelmode=driving`;

  return (
    <div className={s.wrap}>
      <div ref={containerRef} className={s.mapa} aria-label="Mapa interativo com a rota da entrega em Vitória de Santo Antão" />

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
