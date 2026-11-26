import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, FastForward, Headphones, MapPin, MessageCircle, Phone, Star, XCircle } from 'lucide-react';
import { Confirmacao, EmptyState, ErroCarregamento, Skeleton, TimelineStatusPedido, useToast } from '../../../design-system';
import { usePedidoAoVivo } from '../../../hooks/cliente/usePedidoAoVivo';
import { formatarData, formatarHora, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarRastreamentoPedido, cancelarPedido, simularAvancoPedido, type PedidoDetalhe } from '../../../services/cliente';
import { FaleConosco } from '../../suporte/FaleConosco';
import { hojeIso } from '../tempo';
import { MapaEntregaReal } from './MapaEntregaReal';
import { horaDe, minutosParaChegar, veiculoSimulado } from './tempoPedido';
import s from './AcompanhamentoPage.module.css';

/**
 * Tela 18 — Acompanhamento. Timeline REAL (Realtime em historico_status_pedido, CE-14)
 * com mapa interativo OpenStreetMap + rota real (OSRM) e entregador animado ao vivo.
 */
export default function AcompanhamentoPage() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const pedido = usePedidoAoVivo(id);
  const [suporte, setSuporte] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const statusAtual = pedido.data?.status;
  const ativo = statusAtual === 'NOVO' || statusAtual === 'ACEITO' || statusAtual === 'PREPARANDO' || statusAtual === 'PRONTO' || statusAtual === 'A_CAMINHO';

  // Consome a API real de telemetria /api/pedidos/{id}/rastreamento a cada 2s enquanto a entrega está ativa
  const rastreamento = useQuery({
    queryKey: ['pedido', id, 'rastreamento'],
    queryFn: () => buscarRastreamentoPedido(id),
    enabled: !!id && !!pedido.data,
    refetchInterval: ativo ? 2_000 : false,
  });

  const simularEtapa = useMutation({
    mutationFn: () => simularAvancoPedido(id),
    onSuccess: (r) => {
      qc.setQueryData(['pedido', id, 'rastreamento'], r);
      void qc.invalidateQueries({ queryKey: ['pedido', id] });
      toast(`Etapa avançada para: ${r.status.replace('_', ' ')}`, 'sucesso');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível avançar a etapa.', 'erro'),
  });

  useEffect(() => {
    const intervalo = statusAtual === 'A_CAMINHO' || statusAtual === 'PRONTO' ? 1_000 : 10_000;
    const t = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(t);
  }, [statusAtual]);

  const cancelar = useMutation({
    mutationFn: () => cancelarPedido(id),
    onSuccess: (p) => { qc.setQueryData(['pedido', id], p); void qc.invalidateQueries({ queryKey: ['cliente'] }); setCancelando(false); toast('Pedido cancelado. O estorno é automático.', 'sucesso'); },
    onError: (e) => { setCancelando(false); toast(e instanceof ErroApi ? e.message : 'Não foi possível cancelar.', 'erro'); },
  });

  if (pedido.isError) {
    return <div className={s.pagina}>{pedido.error instanceof ErroApi && pedido.error.status === 404
      ? <EmptyState titulo="Pedido não encontrado" descricao="Ele pode ser de outra conta." acao={{ rotulo: 'Ver meus pedidos', onClick: () => navegar('/app/pedidos') }} />
      : <ErroCarregamento onTentarNovamente={() => pedido.refetch()} />}</div>;
  }
  const p = pedido.data;
  if (!p) return <div className={s.pagina}><Skeleton altura={60} /><div className={s.grade}><Skeleton altura={520} raio={24} /><Skeleton altura={520} raio={24} /></div></div>;

  const confirmado = horaDe(p, 'NOVO') ?? formatarHora(p.criadoEm);
  const ehHoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife' }).format(new Date(p.criadoEm)) === hojeIso();
  const total = partesPreco(Number(p.total));
  const nomeEntregador = p.entregadorNome?.split(' ')[0];
  const v = veiculoSimulado(p.id);

  return (
    <div className={s.pagina}>
      <div className={s.cabeca}>
        <Link to="/app/pedidos" className={s.voltar} aria-label="Voltar para meus pedidos"><ArrowLeft size={18} aria-hidden /></Link>
        <div className={s.cabecaTexto}>
          <h1>Acompanhe seu <span className="script">pedido</span></h1>
          <p>{p.restaurante.nome} · Confirmado às {confirmado} {ehHoje ? 'de hoje' : `de ${formatarData(p.criadoEm)}`}</p>
        </div>
        <span className={s.codigo}>#{p.codigo}</span>
      </div>

      <div className={s.grade}>
        <div className={s.esquerda}>
          <section className={s.mapa} aria-label="Mapa da entrega em tempo real">
            <MapaEntregaReal pedido={p} rastreamento={rastreamento.data} agora={agora} />
            <div className={s.aoVivo} role="status" aria-live="polite">
              <span className={s.aoVivoPonto} aria-hidden />
              <p className={s.aoVivoTexto}><strong>{tituloAoVivo(p, nomeEntregador)}</strong>{subtituloAoVivo(p)}</p>
              {ativo && (
                <div className={s.eta}><p className={s.etaNum}>{rastreamento.data?.etaMinutos ?? minutosParaChegar(p, agora)}min</p><p className={s.etaRotulo}>para chegar</p></div>
              )}
            </div>
          </section>

          {ativo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--white)', border: '1.5px solid var(--line)', borderRadius: 16, marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: 'var(--gray-700)', fontWeight: 600 }}>
                API de rastreamento ativa {rastreamento.data ? `· ${rastreamento.data.fonteRota} · ${Number(rastreamento.data.distanciaRestanteKm).toFixed(1).replace('.', ',')} km restantes` : ''}
                {rastreamento.data?.posicaoAtual.velocidadeKmh ? ` · ${rastreamento.data.posicaoAtual.velocidadeKmh} km/h` : ''}
              </span>
              <button
                type="button"
                onClick={() => simularEtapa.mutate()}
                disabled={simularEtapa.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1.5px solid var(--green-primary)', background: 'var(--green-bg)', color: 'var(--green-dark)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                <FastForward size={14} aria-hidden />
                {simularEtapa.isPending ? 'Avançando...' : 'Simular próxima etapa'}
              </button>
            </div>
          )}

          <section className={s.entregador} aria-labelledby="entregador-titulo">
            <div className={s.entregadorLinha}>
              <span className={s.avatar} aria-hidden><Bike size={26} />{p.entregadorNome && <span className={s.online} />}</span>
              <div className={s.entregadorInfo}>
                <p id="entregador-titulo" className={s.rotulo}>Seu entregador</p>
                <p className={s.entregadorNome}>{p.entregadorNome ?? 'Aguardando atribuição'}</p>
                <p className={s.entregadorMeta}>
                  {p.entregadorNome
                    ? <><span><Star size={12} fill="currentColor" className={s.estrela} aria-hidden /> {v.nota} ({v.entregas.toLocaleString('pt-BR')} entregas)</span><span>Entregador parceiro · simulado</span></>
                    : <span>Assim que o pedido ficar pronto, um entregador é chamado.</span>}
                </p>
              </div>
              {p.entregadorNome && (
                <div className={s.entregadorAcoes}>
                  <button type="button" className={s.acaoRedonda} onClick={() => setSuporte(true)} aria-label="Mandar mensagem"><MessageCircle size={18} aria-hidden /></button>
                  <button type="button" className={s.acaoRedonda} onClick={() => toast('Ligação simulada: em produção, o número fica mascarado.', 'info')} aria-label="Ligar"><Phone size={18} aria-hidden /></button>
                </div>
              )}
            </div>
            {p.entregadorNome && <p className={s.veiculo}><span className={s.veiculoIcone} aria-hidden><Bike size={18} /></span><strong>{v.veiculo}</strong><span>·</span><span>Placa <strong>{v.placa}</strong></span></p>}
          </section>
        </div>

        <div className={s.direita}>
          <section className={s.card} aria-labelledby="status-titulo">
            <h2 id="status-titulo" className={s.cardTitulo}>Status do pedido</h2>
            <p className={s.cardSub}>Atualizado em tempo real</p>
            <TimelineStatusPedido statusAtual={p.status} historico={p.historico} />
            {p.status === 'A_CAMINHO' && <p className={s.previsao}>Previsão de chegada: <strong>~{formatarHora(new Date(Date.now() + minutosParaChegar(p) * 60_000))}</strong></p>}
          </section>

          <section className={s.card} aria-labelledby="itens-titulo">
            <h2 id="itens-titulo" className={s.cardTitulo}>Seu pedido</h2>
            <p className={s.cardSub}>{p.itens.reduce((t, i) => t + i.quantidade, 0)} itens · #{p.codigo}</p>
            <ul className={s.itens}>
              {p.itens.map((i) => (
                <li key={`${i.nome}-${i.observacao}`}>
                  <span className={s.itemImg}>{i.imagemUrl && <img src={i.imagemUrl} alt="" />}</span>
                  <div><p className={s.itemNome}>{i.nome}</p>{i.observacao && <p className={s.itemMeta}>{i.observacao}</p>}</div>
                  <span className={s.itemQtd}>{i.quantidade}x</span>
                </li>
              ))}
            </ul>
            <div className={s.total}><span>Total pago</span><p>R$ {total.reais}<small>,{total.centavos}</small></p></div>
          </section>

          {p.endereco && (
            <section className={s.card} aria-labelledby="end-titulo">
              <h2 id="end-titulo" className={s.cardTitulo}>Endereço de entrega</h2>
              <p className={s.endereco}><MapPin size={18} className={s.enderecoIcone} aria-hidden />
                <span><strong>{p.endereco.logradouro}, {p.endereco.numero}</strong><br />{p.endereco.bairro}, {p.endereco.cidade} · {p.endereco.uf}
                  {p.endereco.complemento && <><br />{p.endereco.complemento}</>}</span>
              </p>
            </section>
          )}

          <section className={s.card} aria-labelledby="ajuda-titulo">
            <h2 id="ajuda-titulo" className={s.cardTitulo}>Precisa de ajuda?</h2>
            <div className={s.ajuda}>
              <button type="button" className={s.ajudaBtn} onClick={() => setSuporte(true)}><Headphones size={22} aria-hidden /> Falar com suporte</button>
              <button type="button" className={`${s.ajudaBtn} ${s.perigo}`} onClick={() => setCancelando(true)} disabled={!p.podeCancelar}
                title={p.podeCancelar ? undefined : 'O pedido já saiu da cozinha ou foi encerrado'}>
                <XCircle size={22} aria-hidden /> Cancelar pedido
              </button>
            </div>
            {!p.podeCancelar && (p.status === 'PRONTO' || p.status === 'A_CAMINHO') && <p className={s.cardSub} style={{ marginTop: 12 }}>O pedido já saiu da cozinha. Para problemas, fale com o suporte.</p>}
          </section>
        </div>
      </div>

      <Confirmacao aberto={cancelando} titulo={`Cancelar o pedido #${p.codigo}?`} rotuloConfirmar="Cancelar pedido" rotuloCancelar="Manter pedido" perigo
        carregando={cancelar.isPending} onCancelar={() => setCancelando(false)} onConfirmar={() => cancelar.mutate()}>
        O {p.restaurante.nome} é avisado na hora, o valor é estornado (pagamento simulado) e os macros saem do seu consumo do dia.
      </Confirmacao>
      <FaleConosco aberto={suporte} onFechar={() => setSuporte(false)} assuntoInicial={`Pedido #${p.codigo}`} />
    </div>
  );
}

function tituloAoVivo(p: PedidoDetalhe, entregador?: string) {
  switch (p.status) {
    case 'NOVO': return 'Aguardando o restaurante aceitar';
    case 'ACEITO': return `${p.restaurante.nome} aceitou seu pedido`;
    case 'PREPARANDO': return 'Sua marmita está sendo preparada';
    case 'PRONTO': return 'Pronto! Chamando o entregador';
    case 'A_CAMINHO': return `${entregador ?? 'O entregador'} está a caminho`;
    case 'ENTREGUE': return 'Pedido entregue. Bom apetite!';
    case 'CANCELADO': return 'Pedido cancelado';
    case 'RECUSADO': return 'Pedido recusado pelo restaurante';
  }
}

function subtituloAoVivo(p: PedidoDetalhe) {
  if (p.status === 'A_CAMINHO') { const h = horaDe(p, 'A_CAMINHO'); return h ? `Saiu do restaurante às ${h}` : ''; }
  if (p.status === 'ENTREGUE') { const h = horaDe(p, 'ENTREGUE'); return h ? `Entregue às ${h}` : ''; }
  if (p.status === 'CANCELADO' || p.status === 'RECUSADO') return p.motivoRecusa ?? '';
  return 'Você recebe uma notificação a cada etapa';
}
