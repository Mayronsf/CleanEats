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

/** Dados do entregador (SIMULADO — tela 18): derivados do pedido, sempre os mesmos para o mesmo pedido. */
export function veiculoSimulado(idPedido: string) {
  const motos = ['Honda Biz 110 · Vermelha', 'Honda CG 160 · Preta', 'Yamaha Factor · Azul', 'Honda Pop 110 · Branca'];
  let h = 0;
  for (const c of idPedido) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const placa = `P${letras[h % 23]}${letras[(h >> 5) % 23]}-${(h % 10)}${letras[(h >> 9) % 23]}${(h >> 3) % 10}${(h >> 7) % 10}`;
  return { veiculo: motos[h % motos.length]!, placa, nota: (4.6 + (h % 4) / 10).toFixed(1), entregas: 300 + (h % 1500) };
}
