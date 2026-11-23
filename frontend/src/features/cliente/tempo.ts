import type { RefeicaoPlano } from '../../services/cliente';

/** Datas e horários do cliente sempre no fuso de Recife (o navegador pode estar em outro). */
const FUSO = 'America/Recife';

/** "Agora" com os campos de Recife (ano, mês, dia, hora, minuto), independente do fuso do navegador. */
export function agoraEmRecife(): Date {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
}

/** Data de hoje em Recife, "aaaa-mm-dd" (igual ao LocalDate do backend). */
export function hojeIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function saudacao(agora: Date): string {
  const h = agora.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "2026-11-25" → "Quarta, 25 de Novembro" (como na tela 10). */
export function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a!, m! - 1, d!);
  return `${DIAS[data.getDay()]}, ${d} de ${MESES[m! - 1]}`;
}

export type SituacaoRefeicao =
  | { tipo: 'consumida' } | { tipo: 'agora' } | { tipo: 'passou' } | { tipo: 'futura'; texto: string };

/**
 * Situação de uma refeição de HOJE: consumida (pedido feito), "agora" (de 90 min antes até 1 h depois do horário),
 * passou (sem pedido) ou futura ("Em 4h").
 */
export function situacaoRefeicao(r: RefeicaoPlano, agora: Date): SituacaoRefeicao {
  if (r.consumida) return { tipo: 'consumida' };
  if (!r.horario) return { tipo: 'agora' };
  const [h, m] = r.horario.split(':').map(Number);
  const alvo = new Date(agora);
  alvo.setHours(h!, m!, 0, 0);
  const minutos = Math.round((alvo.getTime() - agora.getTime()) / 60000);
  if (minutos <= 90 && minutos >= -60) return { tipo: 'agora' };
  if (minutos < -60) return { tipo: 'passou' };
  return { tipo: 'futura', texto: minutos < 60 ? `Em ${minutos} min` : `Em ${Math.round(minutos / 60)}h` };
}
