import { chamarApi } from './api';

export interface PratoDestaque {
  id: string; nome: string; categoria: string; imagemUrl: string; restaurante: string; cidade: string;
  preco: number; calorias: number; proteinas: number; carboidratos: number; fibras: number | null; notaMedia: number;
}
export interface Vitrine {
  destaques: PratoDestaque[];
  numeros: { usuarios: number; restaurantes: number; nutricionistas: number; notaMedia: number | null; avaliacoes: number };
}

/** GET /api/vitrine — landing (tela 01). */
export const buscarVitrine = () => chamarApi<Vitrine>('/vitrine');
