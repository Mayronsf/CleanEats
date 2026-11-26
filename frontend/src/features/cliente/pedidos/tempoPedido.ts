import type { PedidoDetalhe, StatusPedido } from '../../../services/cliente';
import { formatarHora } from '../../../lib/formato';

const ORDEM: StatusPedido[] = ['NOVO', 'ACEITO', 'PREPARANDO', 'PRONTO', 'A_CAMINHO', 'ENTREGUE'];

export const passou = (atual: StatusPedido, etapa: StatusPedido) => ORDEM.indexOf(atual) >= ORDEM.indexOf(etapa);
export const horaDe = (p: PedidoDetalhe, st: StatusPedido) => {
  const e = p.historico.find((h) => h.status === st);
  return e ? formatarHora(e.em) : null;
};

/** Início da contagem da entrega: agendamento, ou o momento da confirmação. */
const inicio = (p: PedidoDetalhe) => new Date(p.agendadoPara ?? p.criadoEm);

/** Janela de chegada: previsão do entregador (simulado) ou tempo do restaurante. */
export function janelaChegada(p: PedidoDetalhe) {
  if (p.previsaoEntregaEm) {
    const fim = new Date(p.previsaoEntregaEm);
    return { de: new Date(fim.getTime() - 5 * 60_000), ate: fim };
  }
  const base = p.agendadoPara ? inicio(p).getTime() - p.restaurante.tempoEntregaMax * 60_000 : inicio(p).getTime();
  return { de: new Date(base + p.restaurante.tempoEntregaMin * 60_000), ate: new Date(base + p.restaurante.tempoEntregaMax * 60_000) };
}

/** Minutos que faltam (mínimo 1) até a previsão. */
export function minutosParaChegar(p: PedidoDetalhe, agora = Date.now()) {
  return Math.max(1, Math.round((janelaChegada(p).ate.getTime() - agora) / 60_000));
}

export const emAndamento = (s: StatusPedido) => !['ENTREGUE', 'CANCELADO', 'RECUSADO'].includes(s);

/** Dados do entregador (SIMULADO — tela 18): derivados do pedido, sempre no padrão Mercosul (LLLNLNN). */
export function veiculoSimulado(idPedido: string) {
  const motos = ['Honda Biz 125 · Vermelha', 'Honda CG 160 Fan · Preta', 'Yamaha Factor 150 · Azul', 'Honda Pop 110i · Branca'];
  const prefixos = ['PE', 'PF', 'PG', 'QY', 'RZ'];
  const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  let h = 2166136261;
  for (const c of idPedido) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const pref = prefixos[h % prefixos.length]!;
  const l3 = letras[(h >>> 4) % letras.length]!;
  const n1 = (h >>> 9) % 10;
  const l4 = letras[(h >>> 13) % letras.length]!;
  const n2 = (h >>> 18) % 10;
  const n3 = (h >>> 22) % 10;
  const placa = `${pref}${l3}${n1}${l4}${n2}${n3}`;
  return { veiculo: motos[h % motos.length]!, placa, nota: (4.6 + (h % 4) / 10).toFixed(1), entregas: 300 + (h % 1500) };
}
