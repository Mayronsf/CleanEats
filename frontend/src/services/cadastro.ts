import { chamarApi, type UsuarioAtual } from './api';

export type ObjetivoNutricional = 'EMAGRECIMENTO' | 'GANHO_MASSA' | 'EQUILIBRIO';

export interface MetasIniciais { calorias: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number }
export interface Restricao { slug: string; nome: string }

export interface CadastroClienteDados {
  nome: string;
  telefone?: string;
  objetivo: ObjetivoNutricional;
  restricoes: string[];
  pesoKg: number;
  alturaCm: number;
  idade: number;
  aceiteTermosEm: string;
}

export const buscarRestricoes = () => chamarApi<Restricao[]>('/restricoes');
export const buscarMetasIniciais = () => chamarApi<Record<ObjetivoNutricional, MetasIniciais>>('/cadastro/metas-iniciais');
export const cadastrarCliente = (dados: CadastroClienteDados) =>
  chamarApi<UsuarioAtual>('/cadastro/cliente', { method: 'POST', body: JSON.stringify(dados) });

/** IMC e faixa (OMS) — mostrados ao vivo na tela 05; o backend recalcula ao salvar. */
export function calcularImc(pesoKg?: number, alturaCm?: number) {
  if (!pesoKg || !alturaCm || alturaCm < 50) return null;
  const imc = Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;
  const faixa = imc < 18.5 ? { classe: 'abaixo do peso', status: 'Abaixo da faixa', tom: 'atencao' as const }
    : imc < 25 ? { classe: 'peso normal', status: 'Faixa saudável', tom: 'ok' as const }
    : imc < 30 ? { classe: 'sobrepeso', status: 'Acima da faixa', tom: 'atencao' as const }
    : { classe: 'obesidade', status: 'Acompanhamento recomendado', tom: 'alerta' as const };
  return { imc, ...faixa };
}
