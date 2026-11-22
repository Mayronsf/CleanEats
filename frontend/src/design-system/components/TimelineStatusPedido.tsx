import { Check } from 'lucide-react';
import { formatarHora } from '../../lib/formato';
import s from './TimelineStatusPedido.module.css';

export type StatusPedido = 'NOVO' | 'ACEITO' | 'RECUSADO' | 'PREPARANDO' | 'PRONTO' | 'A_CAMINHO' | 'ENTREGUE' | 'CANCELADO';

const ETAPAS: { status: StatusPedido; nome: string; descricao: string; atual: string }[] = [
  { status: 'NOVO', nome: 'Pedido recebido', descricao: 'Enviamos seu pedido ao restaurante', atual: 'Aguardando o restaurante aceitar' },
  { status: 'ACEITO', nome: 'Pedido aceito', descricao: 'O restaurante confirmou seu pedido', atual: 'O restaurante confirmou seu pedido' },
  { status: 'PREPARANDO', nome: 'Em preparo', descricao: 'Sua marmita está sendo preparada', atual: 'Preparando agora' },
  { status: 'PRONTO', nome: 'Pronto', descricao: 'Embalado e aguardando o entregador', atual: 'Aguardando o entregador' },
  { status: 'A_CAMINHO', nome: 'A caminho', descricao: 'Seu pedido saiu para entrega', atual: 'O entregador está a caminho' },
  { status: 'ENTREGUE', nome: 'Entregue', descricao: 'Bom apetite!', atual: 'Bom apetite!' },
];

export interface EventoStatus { status: StatusPedido; em: string }

/** Timeline do pedido (tela 18). `historico` vem da API e é atualizado via Supabase Realtime. */
export function TimelineStatusPedido({ statusAtual, historico }: { statusAtual: StatusPedido; historico: EventoStatus[] }) {
  if (statusAtual === 'CANCELADO' || statusAtual === 'RECUSADO') {
    return <p className={s.encerrado} role="status">Pedido {statusAtual === 'CANCELADO' ? 'cancelado' : 'recusado pelo restaurante'}.</p>;
  }
  const indiceAtual = ETAPAS.findIndex((e) => e.status === statusAtual);
  const horario = (st: StatusPedido) => historico.find((h) => h.status === st)?.em;

  return (
    <ol className={s.timeline} aria-live="polite">
      {ETAPAS.map((e, i) => {
        const estado = i < indiceAtual || statusAtual === 'ENTREGUE' ? 'feito' : i === indiceAtual ? 'atual' : 'pendente';
        const em = horario(e.status);
        return (
          <li key={e.status} className={`${s.etapa} ${s[estado]}`} aria-current={estado === 'atual' ? 'step' : undefined}>
            <span className={s.circulo} aria-hidden>{estado === 'feito' ? <Check size={14} /> : i + 1}</span>
            <div className={s.conteudo}>
              <p className={s.nome}>{e.nome}</p>
              <p className={s.descricao}>{estado === 'atual' ? e.atual : e.descricao}</p>
            </div>
            <span className={s.hora}>{em ? formatarHora(em) : estado === 'pendente' ? '—' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}
