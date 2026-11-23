import { chamarApi } from './api';

export interface FichaTecnica {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  imagemUrl: string | null;
  restaurante: string;
  cidade: string;
  porcaoG: number | null;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number | null;
  sodioMg: number | null;
  aprovadoPorNutri: boolean;
  notaMedia: number;
  totalAvaliacoes: number;
  ingredientes: { nome: string; quantidade: string | null; preparo: string | null }[];
  compativelCom: string[];
}

export const buscarFichaTecnica = (id: string) => chamarApi<FichaTecnica>(`/fichas-tecnicas/${id}`);

/** URL pública da ficha — conteúdo do QR Code da tela 12 (frente A). */
export const urlFichaTecnica = (idPrato: string) => `${window.location.origin}/ficha/${idPrato}`;
