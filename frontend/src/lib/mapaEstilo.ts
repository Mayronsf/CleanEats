export type CoordLatLng = [number, number]; // [lat, lng]

/** Camada limpa estilo Apple Maps / iFood (ArcGIS World Street Map — gratuita, sem API key, sem marca d'água). */
export const TILE_MAPA_LIMPO =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

/** Camada Satélite real (Esri World Imagery — gratuita, sem API key). */
export const TILE_SATELITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Rótulos de ruas e locais sobre a camada satélite. */
export const TILE_SATELITE_ROTULOS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/** Coordenadas reais dos restaurantes parceiros em Vitória de Santo Antão - PE. */
export const COORDS_VITORIA_RESTAURANTES: Record<string, CoordLatLng> = {
  'Sabor Natural': [-8.116169, -35.270785],  // Vitória Park Shopping · Redenção
  'Verde Vida': [-8.116282, -35.292347],     // Praça da Matriz · Matriz
  'Mar & Terra': [-8.120137, -35.295750],    // Av. Mariana Amália · Centro
  'FitFood': [-8.118306, -35.290311],        // Rua do Estudante (UNIFACOL) · Universitário
  'Açaí Club': [-8.114345, -35.281293],      // Av. Henrique de Holanda · Redenção
  'Rota Proteica': [-8.118237, -35.312249],  // Rua Eurico Valois · Maués
  'Raízes Fit': [-8.113530, -35.292649],     // Av. Silva Jardim · Matriz
};

/** Endereços reais de referência em Vitória de Santo Antão - PE para exibição no mapa. */
export const ENDERECOS_VITORIA_RESTAURANTES: Record<string, string> = {
  'Sabor Natural': 'Av. Henrique de Holanda, 3000 · Redenção, Vitória de Santo Antão',
  'Verde Vida': 'Praça da Matriz, 140 · Matriz, Vitória de Santo Antão',
  'Mar & Terra': 'Av. Mariana Amália, 315 · Centro, Vitória de Santo Antão',
  'FitFood': 'Rua do Estudante, 85 · Universitário (UNIFACOL), Vitória de Santo Antão',
  'Açaí Club': 'Av. Henrique de Holanda, 1240 · Redenção, Vitória de Santo Antão',
  'Rota Proteica': 'Rua Eurico Valois, 210 · Maués, Vitória de Santo Antão',
  'Raízes Fit': 'Av. Silva Jardim, 420 · Matriz, Vitória de Santo Antão',
};

export const DESTINOS_VITORIA: CoordLatLng[] = [
  [-8.116215, -35.294658], // Rua Melo Verçosa · Centro
  [-8.111612, -35.291116], // Rua Queiroz Pedroso · Bela Vista
  [-8.118306, -35.290311], // Rua do Estudante · Universitário
  [-8.123500, -35.297200], // Livramento
  [-8.114950, -35.283800], // Redenção
  [-8.117900, -35.308500], // Maués
];

export const CENTRO_VITORIA_LAT_LNG: CoordLatLng = [-8.1165, -35.2895];

/** SVG minimalista de capacete de entregador estilo iFood na paleta CleanEats. */
export const SVG_CAPACETE_ENTREGADOR = `
<svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M8 23.5C8 15.8 13.2 10 20.2 10C25.9 10 29.8 13.7 29.8 18.8C29.8 22.8 27.6 25.5 23.2 26.2L12.5 26.2C9.7 26.2 8 25.2 8 23.5Z" fill="#3D8B24"/>
  <path d="M18.6 14.2H27.7C28.8 15.6 29.2 17.4 28.9 19.3H18.4C17.1 19.3 16.2 18.3 16.2 16.8C16.2 15.3 17.2 14.2 18.6 14.2Z" fill="#FFFFFF"/>
  <path d="M8.5 24.4C12.2 23.2 17.6 23.2 24.8 25.4L23.2 27.4H12.4C10 27.4 8.7 26.2 8.5 24.4Z" fill="#1A2E1A"/>
  <circle cx="13.5" cy="17.2" r="1.4" fill="#A6E26E"/>
</svg>`;

/** SVG minimalista de lojinha/restaurante estilo iFood. */
export const SVG_LOJA_IFOOD = `
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="m3 8 1.5-4h15L21 8"/>
  <path d="M3 8a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 3 0"/>
  <path d="M5 10.5V20h14v-9.5"/>
  <path d="M9.5 20v-5.5h5V20"/>
</svg>`;

/** SVG minimalista de casa do cliente. */
export const SVG_CASA = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
</svg>`;
