import { chamarApi, type UsuarioAtual } from './api';

export type ObjetivoNutricional = 'EMAGRECIMENTO' | 'GANHO_MASSA' | 'EQUILIBRIO';
export type NivelAtividadeCadastro = 'SEDENTARIO' | 'LEVE' | 'MODERADO' | 'INTENSO' | 'ATLETA';

export interface MetasIniciais { calorias: number; proteinas: number; carboidratos: number; gorduras: number; fibras: number }
export interface CalculoMetabolico extends MetasIniciais {
  tmb: number;
  get: number;
  ajusteKcal: number;
  protocolo: string;
  descricaoProtocolo: string;
  aguaMl: number;
}
export interface Restricao { slug: string; nome: string }

export interface CadastroClienteDados {
  nome: string;
  telefone?: string;
  objetivo: ObjetivoNutricional;
  restricoes: string[];
  pesoKg: number;
  alturaCm: number;
  idade: number;
  sexo?: 'F' | 'M' | 'O' | null;
  nivelAtividade?: NivelAtividadeCadastro;
  aceiteTermosEm: string;
}

export const buscarRestricoes = () => chamarApi<Restricao[]>('/restricoes');
export const buscarMetasIniciais = () => chamarApi<Record<ObjetivoNutricional, MetasIniciais>>('/cadastro/metas-iniciais');
export const cadastrarCliente = (dados: CadastroClienteDados) =>
  chamarApi<UsuarioAtual>('/cadastro/cliente', { method: 'POST', body: JSON.stringify(dados) });

const FATOR_ATIVIDADE: Record<NivelAtividadeCadastro, number> = {
  SEDENTARIO: 1.2,
  LEVE: 1.375,
  MODERADO: 1.55,
  INTENSO: 1.725,
  ATLETA: 1.9,
};

/**
 * Cálculo metabólico basal ao vivo (Mifflin-St Jeor, espelhado 1:1 no backend MetasIniciais.calcular):
 * - EMAGRECIMENTO -> Cutting (Déficit calórico ~20%, limitado a -300..-550 kcal, piso seguro)
 * - GANHO_MASSA   -> Bulking (Superávit calórico ~12%, limitado a +250..+450 kcal)
 * - EQUILIBRIO    -> Manutenção (Normocalórica = 100% do GET)
 */
export function calcularMetabolismoBasal(params: {
  objetivo: ObjetivoNutricional;
  pesoKg?: number | null;
  alturaCm?: number | null;
  idade?: number | null;
  sexo?: 'F' | 'M' | 'O' | null;
  nivelAtividade?: NivelAtividadeCadastro | null;
}): CalculoMetabolico | null {
  const { objetivo, pesoKg, alturaCm, idade, sexo, nivelAtividade } = params;
  if (!pesoKg || !alturaCm || !idade || pesoKg < 20 || alturaCm < 80 || idade < 13) return null;

  const nivel: NivelAtividadeCadastro = nivelAtividade ?? 'MODERADO';
  const constanteSexo = sexo === 'M' ? 5 : sexo === 'F' ? -161 : -78;
  const tmb = Math.round(10 * pesoKg + 6.25 * alturaCm - 5 * idade + constanteSexo);
  const get = Math.round(tmb * FATOR_ATIVIDADE[nivel]);
  const pisoSeguro = sexo === 'M' ? 1500 : sexo === 'F' ? 1200 : 1350;
  const arred10 = (v: number) => Math.round(v / 10) * 10;

  let calorias: number;
  let protocolo: string;
  let descricaoProtocolo: string;

  if (objetivo === 'EMAGRECIMENTO') {
    const deficit = Math.round(Math.max(300, Math.min(550, get * 0.2)));
    calorias = Math.max(pisoSeguro, arred10(get - deficit));
    protocolo = 'Cutting (Déficit calórico)';
    descricaoProtocolo = 'Déficit calórico controlado (~20% abaixo do GET) com 2,0 g/kg de proteína para preservar massa magra.';
  } else if (objetivo === 'GANHO_MASSA') {
    const superavit = Math.round(Math.max(250, Math.min(450, get * 0.12)));
    calorias = arred10(get + superavit);
    protocolo = 'Bulking (Superávit calórico)';
    descricaoProtocolo = 'Superávit calórico limpo (~12% acima do GET) com 1,8 g/kg de proteína e carboidratos altos para hipertrofia.';
  } else {
    calorias = arred10(get);
    protocolo = 'Manutenção (Normocalórica)';
    descricaoProtocolo = 'Ingestão normocalórica igual ao seu gasto energético total (GET) para manter peso e equilíbrio metabólico.';
  }

  const ajusteKcal = calorias - get;
  const protPorKg = objetivo === 'EMAGRECIMENTO' ? 2.0 : objetivo === 'GANHO_MASSA' ? 1.8 : 1.5;
  const gordPorKg = objetivo === 'EMAGRECIMENTO' ? 0.8 : 0.9;

  const proteinas = Math.max(
    Math.round((calorias * 0.15) / 4),
    Math.min(Math.round((calorias * 0.40) / 4), Math.round(pesoKg * protPorKg)),
  );
  const gorduras = Math.max(
    Math.round((calorias * 0.20) / 9),
    Math.min(Math.round((calorias * 0.32) / 9), Math.round(pesoKg * gordPorKg)),
  );
  const carboidratos = Math.max(70, Math.round((calorias - proteinas * 4 - gorduras * 9) / 4));
  const fibras = Math.max(objetivo === 'GANHO_MASSA' ? 28 : 25, Math.round((calorias / 1000) * 14));
  const mlPorKg = objetivo === 'GANHO_MASSA' || nivel === 'INTENSO' || nivel === 'ATLETA' ? 40 : 35;
  const aguaMl = Math.round((pesoKg * mlPorKg) / 50) * 50;

  return { tmb, get, ajusteKcal, protocolo, descricaoProtocolo, calorias, proteinas, carboidratos, gorduras, fibras, aguaMl };
}

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
