import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bike, Check, ChefHat, CreditCard, Flame, Home, MapPin, PartyPopper, Plus, Store, Truck } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { useAuth } from '../../../hooks/useAuth';
import { usePedidoAoVivo } from '../../../hooks/cliente/usePedidoAoVivo';
import { formatarHora, formatarMoeda, formatarNumero, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarConsumo, FORMA_PAGAMENTO, listarMarmitas, type PedidoDetalhe, type StatusPedido } from '../../../services/cliente';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import { hojeIso } from '../tempo';
import { emAndamento, horaDe, janelaChegada, passou } from './tempoPedido';
import s from './PedidoConfirmadoPage.module.css';

const um = (v: number) => formatarNumero(Math.round(Number(v)));

/** Tela 17 — Pedido confirmado. Status em tempo real; mostra quanto o pedido somou no dia (CE-9). */
export default function PedidoConfirmadoPage() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const pedido = usePedidoAoVivo(id);
  const consumo = useQuery({ queryKey: ['cliente', 'consumo', hojeIso()], queryFn: () => buscarConsumo() });
  const sugestoes = useQuery({ queryKey: ['marmitas', 'sugestoes-pos-pedido'], queryFn: () => listarMarmitas({ tamanho: 8 }) });
  const { adicionar, dialogo } = useAdicionarAoCarrinho();

  if (pedido.isError) {
    return <div className={s.pagina}>{pedido.error instanceof ErroApi && pedido.error.status === 404
      ? <EmptyState titulo="Pedido não encontrado" descricao="Confira seus pedidos no histórico." />
      : <ErroCarregamento onTentarNovamente={() => pedido.refetch()} />}</div>;
  }
  const p = pedido.data;
  if (!p) return <div className={s.pagina}><Skeleton altura={420} raio={32} /><div style={{ height: 24 }} /><Skeleton altura={220} raio={28} /></div>;

  const janela = janelaChegada(p);
  const total = partesPreco(Number(p.total));
  const capa = p.itens.find((i) => i.imagemUrl)?.imagemUrl;
  const c = consumo.data;
  const idsPedido = new Set(p.itens.map((i) => i.idMarmita));
  const sugeridos = (sugestoes.data?.itens ?? []).filter((x) => !idsPedido.has(x.id)).slice(0, 4);
  const primeiroNome = usuario?.nome.split(' ')[0];
  const titulo = p.status === 'CANCELADO' ? 'foi cancelado' : p.status === 'RECUSADO' ? 'foi recusado' : p.status === 'ENTREGUE' ? 'foi entregue!' : p.status === 'A_CAMINHO' ? 'está a caminho!' : p.agendadoPara ? 'está agendado!' : 'foi confirmado!';
  const [verbo, ...resto] = titulo.split(' ');

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="conf-titulo">
        <div className={s.heroiTexto}>
          <p className={s.selo}><span className={s.seloPonto} aria-hidden /> Pedido {p.status === 'CANCELADO' ? 'cancelado' : 'confirmado'}</p>
          <h1 id="conf-titulo" className={s.titulo}>Seu pedido<br />{verbo} <span className="script">{resto.join(' ')}</span></h1>
          <p className={s.sub}>
            {p.status === 'CANCELADO' || p.status === 'RECUSADO'
              ? `${p.motivoRecusa ?? 'O pedido foi encerrado.'} O valor pago é estornado automaticamente (pagamento simulado).`
              : `Obrigado pela compra${primeiroNome ? `, ${primeiroNome}` : ''}! O ${p.restaurante.nome} já recebeu seu pedido e está preparando tudo com carinho. Você pode acompanhar a entrega em tempo real.`}
          </p>
          <dl className={s.meta}>
            <div><dt>Pedido</dt><dd className={s.codigo}>#{p.codigo}</dd></div>
            <div><dt>Total</dt><dd>{formatarMoeda(Number(p.total))}</dd></div>
            <div><dt>Pagamento</dt><dd>{FORMA_PAGAMENTO[p.formaPagamento]} · {p.formaPagamento === 'DINHEIRO' ? 'Na entrega' : 'Aprovado'}</dd></div>
          </dl>
          <div className={s.ctas}>
            {emAndamento(p.status) && <Link to={`/app/pedidos/${p.id}`} className={s.btnPrimario}>Acompanhar entrega <ArrowRight size={16} aria-hidden /></Link>}
            <Link to="/app" className={s.btnSecundario}><Home size={16} aria-hidden /> Voltar para a Home</Link>
          </div>
        </div>
        <div className={s.visual} aria-hidden>
          <div className={s.tigela}>
            <span className={s.anel} />
            <span className={s.tigelaImg}>{capa ? <img src={capa} alt="" /> : <PartyPopper size={64} />}</span>
            <span className={s.check}><Check size={30} strokeWidth={3} /></span>
            <span className={`${s.mini} ${s.mini1}`}><span className={s.miniIcone} style={{ background: 'var(--prot)' }}>P</span>{um(p.proteinas)}g</span>
            <span className={`${s.mini} ${s.mini2}`}><span className={s.miniIcone} style={{ background: 'var(--kcal)' }}><Flame size={12} /></span>{um(p.calorias)} kcal</span>
          </div>
        </div>
      </section>

      <section className={s.secao} aria-labelledby="status-titulo">
        <div className={s.secaoCabeca}>
          <div><h2 id="status-titulo" className={s.secaoTitulo}>Status do <span className="script">pedido</span></h2><p className={s.secaoSub}>Acompanhe cada etapa em tempo real</p></div>
          {emAndamento(p.status) && <Link to={`/app/pedidos/${p.id}`} className={s.secaoAcao}>Ver detalhes <ArrowRight size={14} aria-hidden /></Link>}
        </div>
        <EtapasHorizontais p={p} />
      </section>

      <div className={s.duas}>
        <section className={s.card} aria-labelledby="entrega-titulo">
          <h2 id="entrega-titulo" className={s.cardTitulo}>Entrega</h2>
          <p className={s.secaoSub}>Tempo estimado de chegada</p>
          <div className={s.eta}>
            <p className={s.etaRotulo}>{p.agendadoPara ? 'Agendado' : 'Estimativa'}</p>
            <p className={s.etaTempo}>{p.agendadoPara ? formatarHora(p.agendadoPara) : <>{p.restaurante.tempoEntregaMin}<small>-{p.restaurante.tempoEntregaMax}min</small></>}</p>
            <p className={s.etaChega}>Chegará entre {formatarHora(janela.de)} e {formatarHora(janela.ate)}</p>
          </div>
          <ul className={s.infos}>
            {p.endereco && (
              <li><span className={s.infoIcone} aria-hidden><MapPin size={18} /></span><div><p className={s.infoRotulo}>Endereço</p>
                <p className={s.infoValor}>{p.endereco.logradouro}, {p.endereco.numero}{p.endereco.complemento ? ` · ${p.endereco.complemento}` : ''}</p>
                <p className={s.infoMeta}>{p.endereco.bairro}, {p.endereco.cidade} · {p.endereco.uf}</p></div></li>
            )}
            <li><span className={s.infoIcone} aria-hidden><Store size={18} /></span><div><p className={s.infoRotulo}>Restaurante</p>
              <p className={s.infoValor}>{p.restaurante.nome}</p>{p.restaurante.telefone && <p className={s.infoMeta}>{p.restaurante.telefone}</p>}</div></li>
            <li><span className={s.infoIcone} aria-hidden><Bike size={18} /></span><div><p className={s.infoRotulo}>Entregador</p>
              <p className={s.infoValor}>{p.entregadorNome ?? 'Aguardando atribuição'}</p><p className={s.infoMeta}>{p.entregadorNome ? 'A caminho do seu endereço' : 'Será notificado quando sair'}</p></div></li>
          </ul>
        </section>

        <section className={s.card} aria-labelledby="resumo-titulo">
          <h2 id="resumo-titulo" className={s.cardTitulo}>Resumo</h2>
          <p className={s.secaoSub}>{p.itens.reduce((t, i) => t + i.quantidade, 0)} itens · #{p.codigo}</p>
          <ul className={s.itens}>
            {p.itens.map((i) => (
              <li key={`${i.nome}-${i.observacao}`} className={s.item}>
                <span className={s.itemImg}>{i.imagemUrl && <img src={i.imagemUrl} alt="" />}</span>
                <div><p className={s.itemNome}>{i.nome}</p><p className={s.itemMeta}>{i.observacao ?? `${i.calorias} kcal · ${um(i.proteinas)}g prot`}</p></div>
                <span className={s.itemQtd}>{i.quantidade}x</span>
              </li>
            ))}
          </ul>
          <dl className={s.totais}>
            <div><dt>Subtotal</dt><dd>{formatarMoeda(Number(p.subtotal))}</dd></div>
            <div><dt>Taxa de entrega</dt><dd>{Number(p.taxaEntrega) === 0 ? 'Grátis' : formatarMoeda(Number(p.taxaEntrega))}</dd></div>
            {Number(p.desconto) > 0 && <div className={s.desconto}><dt>{p.cupom ? `Cupom ${p.cupom} + plano` : 'Desconto do plano'}</dt><dd>− {formatarMoeda(Number(p.desconto))}</dd></div>}
          </dl>
          <div className={s.totalFinal}><span>Total pago</span><p>R$ {total.reais}<small>,{total.centavos}</small></p></div>
        </section>
      </div>

      {c && p.status !== 'CANCELADO' && p.status !== 'RECUSADO' && (
        <section className={s.plano}>
          <div>
            <h2 className={s.planoTitulo}>Seu dia foi <span className="script">atualizado</span></h2>
            <p className={s.planoTexto}>
              {p.itens.reduce((t, i) => t + i.quantidade, 0) === 1 ? 'O item deste pedido foi registrado' : `Os ${p.itens.reduce((t, i) => t + i.quantidade, 0)} itens deste pedido foram registrados`} no seu diário alimentar.
              Você está em <strong>{Math.min(999, Math.round((c.consumo.calorias / Math.max(c.metas.calorias, 1)) * 100))}% da sua meta diária</strong>{c.consumo.calorias > c.metas.calorias ? ' — atenção ao restante do dia.' : '!'}
            </p>
            <div className={s.planoStats}>
              <span><strong>+{um(p.calorias)}</strong> kcal · meta {um(c.metas.calorias)}</span>
              <span><strong>+{um(p.proteinas)}g</strong> proteína · meta {um(c.metas.proteinas)}g</span>
              <span><strong>+{um(p.carboidratos)}g</strong> carbs · meta {um(c.metas.carboidratos)}g</span>
            </div>
          </div>
          <Link to="/app/meu-plano" className={s.planoLink}>Ver plano completo <ArrowRight size={14} aria-hidden /></Link>
        </section>
      )}

      {sugeridos.length > 0 && (
        <section aria-labelledby="sug-titulo">
          <div className={s.secaoCabeca}>
            <div><h2 id="sug-titulo" className={s.secaoTitulo}>Que tal pedir <span className="script">também?</span></h2><p className={s.secaoSub}>Pratos que combinam com seu objetivo</p></div>
            <Link to="/app/marketplace" className={s.secaoAcao}>Ver tudo <ArrowRight size={14} aria-hidden /></Link>
          </div>
          <div className={s.sugestoes}>
            {sugeridos.map((x) => {
              const pr = partesPreco(Number(x.preco));
              return (
                <article key={x.id} className={s.sug}>
                  <div className={s.sugImg}>{x.imagemUrl && <img src={x.imagemUrl} alt="" loading="lazy" />}</div>
                  <p className={s.sugRest}>{x.restaurante.nome}</p>
                  <h3 className={s.sugNome}><Link to={`/app/marmitas/${x.id}`}>{x.nome}</Link></h3>
                  <div className={s.sugRodape}>
                    <p className={s.sugPreco}>R$ {pr.reais}<small>,{pr.centavos}</small></p>
                    <button type="button" className={s.sugAdd} onClick={() => adicionar(x)} aria-label={`Adicionar ${x.nome} ao carrinho`}><Plus size={16} aria-hidden /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {dialogo}
    </div>
  );
}

function EtapasHorizontais({ p }: { p: PedidoDetalhe }) {
  if (p.status === 'CANCELADO' || p.status === 'RECUSADO') {
    return <p className={s.encerrado} role="status">Pedido {p.status === 'CANCELADO' ? 'cancelado' : 'recusado pelo restaurante'}{p.motivoRecusa ? `: ${p.motivoRecusa}` : '.'}</p>;
  }
  const janela = janelaChegada(p);
  const etapas: { nome: string; status: StatusPedido; icone: typeof Check; hora: string | null; prevista?: string }[] = [
    { nome: 'Confirmado', status: 'NOVO', icone: Check, hora: horaDe(p, 'NOVO') },
    { nome: p.formaPagamento === 'DINHEIRO' ? 'Aceito' : 'Pago', status: 'ACEITO', icone: CreditCard, hora: p.formaPagamento === 'DINHEIRO' ? horaDe(p, 'ACEITO') : horaDe(p, 'NOVO') },
    { nome: 'Preparando', status: 'PREPARANDO', icone: ChefHat, hora: horaDe(p, 'PREPARANDO') },
    { nome: 'A caminho', status: 'A_CAMINHO', icone: Truck, hora: horaDe(p, 'A_CAMINHO'), prevista: formatarHora(janela.de) },
    { nome: 'Entregue', status: 'ENTREGUE', icone: Home, hora: horaDe(p, 'ENTREGUE'), prevista: formatarHora(janela.ate) },
  ];
  // "Pago" conta como feito na hora (pagamento simulado aprovado); o resto segue o status real
  const feita = (i: number) => (i === 1 && p.formaPagamento !== 'DINHEIRO') || passou(p.status, etapas[i]!.status);
  const atual = etapas.findIndex((_, i) => !feita(i));
  const progresso = atual === -1 ? 100 : (Math.max(atual - 0.5, 0) / (etapas.length - 1)) * 100;
  return (
    <ol className={s.etapas} style={{ ['--progresso' as string]: `${progresso}%` }}>
      {etapas.map((e, i) => {
        const estado = feita(i) ? 'feito' : i === atual ? 'atual' : 'pendente';
        const Icone = e.icone;
        return (
          <li key={e.nome} className={`${s.etapa} ${s[estado]}`} aria-current={estado === 'atual' ? 'step' : undefined}>
            <span className={s.etapaCirculo} aria-hidden>{estado === 'feito' ? <Check size={18} strokeWidth={3} /> : <Icone size={20} />}</span>
            <p className={s.etapaNome}>{e.nome}</p>
            <p className={s.etapaHora}>{e.hora ?? (estado === 'atual' ? 'Agora' : e.prevista ? `~${e.prevista}` : '—')}</p>
          </li>
        );
      })}
    </ol>
  );
}
