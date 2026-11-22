/** Formatos pt-BR do CleanEats: moeda R$ 1.234,56, datas dd/mm/aaaa, fuso America/Recife. */
export const FUSO = 'America/Recife';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');

export function formatarMoeda(valor: number): string {
  // Intl usa espaço não separável; normalizamos para espaço comum (R$ 24,90)
  return moeda.format(valor).replace(/ /g, ' ');
}

/** Separa reais e centavos para o padrão visual "R$ 24<small>,90</small>". */
export function partesPreco(valor: number): { reais: string; centavos: string } {
  const [reais, centavos] = formatarMoeda(valor).replace('R$ ', '').split(',');
  return { reais, centavos: centavos ?? '00' };
}

export function formatarNumero(valor: number): string {
  return numero.format(valor);
}

export function formatarData(data: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(typeof data === 'string' ? new Date(data) : data);
}

export function formatarHora(data: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
    .format(typeof data === 'string' ? new Date(data) : data);
}

export function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}
