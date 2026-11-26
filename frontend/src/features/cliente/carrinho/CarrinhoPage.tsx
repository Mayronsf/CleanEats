import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Headphones, MapPin, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Tag, X } from 'lucide-react';
import { Confirmacao, EmptyState, Skeleton, useToast } from '../../../design-system';
import { useCarrinho } from '../../../hooks/cliente/useCarrinho';
import { formatarMoeda, formatarNumero, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import {
  buscarPlano, confirmarPedido, formatarCep, listarEnderecos, previaPedido, type Endereco, type PedidoReq,
} from '../../../services/cliente';
import { EnderecoDialog } from '../componentes/EnderecoDialog';
import { PagamentoCartaoDialog } from '../componentes/PagamentoCartaoDialog';
import { PagamentoPixDialog } from '../componentes/PagamentoPixDialog';
import { agoraEmRecife, hojeIso } from '../tempo';
import s from './CarrinhoPage.module.css';

type Forma = 'PIX' | 'CREDITO' | 'DINHEIRO';
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Próximos horários de agendamento (de 30 em 30 min, 11h–21h30, a partir de 1 h depois de agora). */
function horariosAgendamento() {
  const agora = agoraEmRecife();
  const lista: { valor: string; rotulo: string }[] = [];
  for (let d = 0; d < 2 && lista.length < 10; d++) {
    for (let min = 11 * 60; min <= 21 * 60 + 30 && lista.length < 10; min += 30) {
      const h = new Date(agora);
      h.setDate(agora.getDate() + d);
      h.setHours(Math.floor(min / 60), min % 60, 0, 0);
      if (h.getTime() - agora.getTime() < 60 * 60_000) continue;
      const iso = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}T${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}:00-03:00`;
      lista.push({ valor: iso, rotulo: `${d === 0 ? 'Hoje' : 'Amanhã'} ${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}` });
    }
  }
  return lista;
}

const um = (v: number) => formatarNumero(Math.round(Number(v)));

/** Tela 16 — Carrinho e checkout. Prévia calculada no servidor; confirmação antes de registrar (CE-9). Pagamento SIMULADO. */
export default function CarrinhoPage() {
  const carrinho = useCarrinho();
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [idEndereco, setIdEndereco] = useState<string | null>(null);
  const [quando, setQuando] = useState<'agora' | 'agendar'>('agora');
  const [horario, setHorario] = useState<string>('');
  const [forma, setForma] = useState<Forma>('PIX');
  const [troco, setTroco] = useState('');
  const [textoCupom, setTextoCupom] = useState('');
  const [cupom, setCupom] = useState<string | undefined>(undefined);
  const [dialogoEndereco, setDialogoEndereco] = useState<{ aberto: boolean; endereco: Endereco | null }>({ aberto: false, endereco: null });
  const [confirmando, setConfirmando] = useState(false);
  const [pixAberto, setPixAberto] = useState(false);
  const [cartaoAberto, setCartaoAberto] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const horarios = useMemo(horariosAgendamento, []);

  const enderecos = useQuery({ queryKey: ['cliente', 'enderecos'], queryFn: listarEnderecos });
  const plano = useQuery({ queryKey: ['cliente', 'plano'], queryFn: buscarPlano });
  const enderecoEscolhido = idEndereco ?? enderecos.data?.find((e) => e.principal)?.id ?? enderecos.data?.[0]?.id ?? null;

  const req: PedidoReq = {
    itens: carrinho.itens.map((i) => ({ idMarmita: i.idMarmita, quantidade: i.quantidade, observacao: i.observacao, personalizacao: i.personalizacao })),
    cupom,
  };
  const previa = useQuery({
    queryKey: ['pedido', 'previa', req],
    queryFn: () => previaPedido(req),
    enabled: carrinho.itens.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const pedir = useMutation({
    mutationFn: () => confirmarPedido({
      ...req,
      idEndereco: enderecoEscolhido ?? undefined,
      formaPagamento: forma,
      agendadoPara: quando === 'agendar' ? horario : undefined,
      observacao: forma === 'DINHEIRO' && troco.trim() ? `Troco para R$ ${troco.trim()}` : undefined,
    }),
    onSuccess: (r) => {
      setPixAberto(false);
      setCartaoAberto(false);
      setConfirmando(false);
      carrinho.limpar();
      void qc.invalidateQueries({ queryKey: ['cliente'] });
      navegar(`/app/pedidos/${r.id}/confirmado`, { replace: true });
    },
    onError: (e) => {
      setConfirmando(false);
      setPixAberto(false);
      setCartaoAberto(false);
      toast(e instanceof ErroApi ? e.message : 'Não foi possível confirmar o pedido. Tente de novo.', 'erro');
    },
  });

  if (carrinho.itens.length === 0) {
    return (
      <div className={s.pagina}>
        <EmptyState icone={<ShoppingBag size={28} aria-hidden />} titulo="Seu carrinho está vazio"
          descricao="Escolha pratos no marketplace ou peça direto do seu plano alimentar."
          acao={{ rotulo: 'Explorar marketplace', onClick: () => navegar('/app/marketplace') }} />
      </div>
    );
  }

  const p = previa.data;
  const idsHoje = new Set((plano.data?.refeicoes ?? []).filter((r) => r.data === hojeIso()).map((r) => r.prato.id));
  const doPlano = carrinho.itens.filter((i) => i.idMarmita && idsHoje.has(i.idMarmita)).reduce((t, i) => t + i.quantidade, 0);
  const problemas = [
    !enderecoEscolhido && 'Escolha um endereço de entrega',
    quando === 'agendar' && !horario && 'Escolha o horário do agendamento',
    p?.abaixoDoMinimo && `Pedido mínimo do ${p.restaurante}: ${formatarMoeda(Number(p.pedidoMinimo))}`,
  ].filter(Boolean) as string[];
  const total = p ? partesPreco(Number(p.total)) : null;
  const agora = agoraEmRecife();
  const chegada = p ? new Date(agora.getTime() + p.tempoEntregaMin * 60_000) : null;

  return (
    <div className={s.pagina}>
      <div className={s.cabeca}>
        <div>
          <h1>Finalize seu <span className="script">pedido</span></h1>
          <p>{carrinho.totalItens} {carrinho.totalItens === 1 ? 'item' : 'itens'}{p ? ` · entrega prevista em ${p.tempoEntregaMin}-${p.tempoEntregaMax} minutos` : ''}</p>
        </div>
        <Link to="/app/marketplace" className={s.continuar}><ArrowLeft size={14} aria-hidden /> Continuar comprando</Link>
      </div>

      <div className={s.grade}>
        <div className={s.esquerda}>
          <section className={s.secao} aria-labelledby="sec-itens">
            <div className={s.secaoCabeca}>
              <span className={s.numero} aria-hidden>1</span>
              <div className={s.secaoTexto}>
                <h2 id="sec-itens" className={s.secaoTitulo}>Seu pedido</h2>
                <p className={s.secaoSub}>{carrinho.totalItens} itens · {carrinho.restaurante?.nome}</p>
              </div>
              <button type="button" className={s.secaoAcao} onClick={() => setLimpando(true)}>Limpar tudo</button>
            </div>
            <ul className={s.itens}>
              {carrinho.itens.map((i) => {
                const pr = partesPreco(i.precoUnitario * i.quantidade);
                return (
                  <li key={i.chave} className={s.item}>
                    <span className={s.itemImg}>{i.imagemUrl && <img src={i.imagemUrl} alt="" />}</span>
                    <div className={s.itemInfo}>
                      <p className={s.itemRest}>{carrinho.restaurante?.nome}</p>
                      <p className={s.itemNome}>{i.idMarmita ? <Link to={`/app/marmitas/${i.idMarmita}`}>{i.nome}</Link> : i.nome}</p>
                      {i.observacao && <div className={s.mods}>{i.observacao.split(/\s*[+·]\s*/).filter(Boolean).map((m, k) => <span key={k} className={s.mod}>{k > 0 ? '+ ' : ''}{m}</span>)}</div>}
                      <div className={s.itemMacros}>
                        <span><span className={s.ponto} style={{ background: 'var(--kcal)' }} />{i.macros.calorias} kcal</span>
                        <span><span className={s.ponto} style={{ background: 'var(--prot)' }} />{um(i.macros.proteinas)}g</span>
                        <span><span className={s.ponto} style={{ background: 'var(--carb)' }} />{um(i.macros.carboidratos)}g</span>
                      </div>
                    </div>
                    <div className={s.itemDireita}>
                      <p className={s.itemPreco}>R$ {pr.reais}<small>,{pr.centavos}</small></p>
                      <div className={s.qtd} role="group" aria-label={`Quantidade de ${i.nome}`}>
                        <button type="button" onClick={() => carrinho.alterarQuantidade(i.chave, i.quantidade - 1)} disabled={i.quantidade <= 1} aria-label="Diminuir"><Minus size={12} aria-hidden /></button>
                        <span aria-live="polite">{i.quantidade}</span>
                        <button type="button" onClick={() => carrinho.alterarQuantidade(i.chave, i.quantidade + 1)} disabled={i.quantidade >= 20} aria-label="Aumentar"><Plus size={12} aria-hidden /></button>
                      </div>
                      <button type="button" className={s.remover} onClick={() => carrinho.remover(i.chave)}>Remover</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={s.secao} aria-labelledby="sec-endereco">
            <div className={s.secaoCabeca}>
              <span className={s.numero} aria-hidden>2</span>
              <div className={s.secaoTexto}><h2 id="sec-endereco" className={s.secaoTitulo}>Endereço de entrega</h2><p className={s.secaoSub}>Escolha onde quer receber</p></div>
            </div>
            {enderecos.isLoading && <Skeleton altura={88} raio={14} />}
            <div className={s.opcoes} role="radiogroup" aria-label="Endereço de entrega">
              {enderecos.data?.map((e) => {
                const ativo = e.id === enderecoEscolhido;
                return (
                  <div key={e.id} className={`${s.endereco} ${ativo ? s.selecionado : ''}`}>
                    <button type="button" role="radio" aria-checked={ativo} className={s.enderecoBotao} onClick={() => setIdEndereco(e.id)}>
                      <span className={s.radio} aria-hidden />
                      <span className={s.enderecoInfo}>
                        <span className={`${s.enderecoTag} ${e.apelido === 'Trabalho' ? s.tagTrabalho : ''}`}><MapPin size={11} aria-hidden /> {e.apelido}</span>
                        <span className={s.enderecoTexto}><strong>{e.logradouro}, {e.numero}</strong>{e.complemento ? ` · ${e.complemento}` : ''}<br />{e.bairro}, {e.cidade} · {e.uf} · {formatarCep(e.cep)}</span>
                        {p && <span className={s.enderecoEta}>Entrega em {p.tempoEntregaMin}-{p.tempoEntregaMax}min · {p.entregaGratis ? 'grátis' : formatarMoeda(Number(p.taxaEntrega))}</span>}
                      </span>
                    </button>
                    <button type="button" className={s.editar} onClick={() => setDialogoEndereco({ aberto: true, endereco: e })} aria-label={`Editar endereço ${e.apelido}`}>Editar</button>
                  </div>
                );
              })}
            </div>
            <button type="button" className={s.adicionar} onClick={() => setDialogoEndereco({ aberto: true, endereco: null })}><Plus size={14} aria-hidden /> Adicionar novo endereço</button>
          </section>

          <section className={s.secao} aria-labelledby="sec-quando">
            <div className={s.secaoCabeca}>
              <span className={s.numero} aria-hidden>3</span>
              <div className={s.secaoTexto}><h2 id="sec-quando" className={s.secaoTitulo}>Quando você quer receber?</h2><p className={s.secaoSub}>Pode escolher receber agora ou agendar</p></div>
            </div>
            <div className={s.horarios} role="radiogroup" aria-label="Quando receber">
              <button type="button" role="radio" aria-checked={quando === 'agora'} className={`${s.horario} ${quando === 'agora' ? s.selecionado : ''}`} onClick={() => setQuando('agora')}>
                <span className={s.check} aria-hidden>{quando === 'agora' && <Check size={12} strokeWidth={3} />}</span>
                <span className={s.horarioNome}>Entrega imediata</span>
                <span className={s.horarioEta}>{p ? `Chega em ${p.tempoEntregaMin}-${p.tempoEntregaMax}min` : 'Chega em instantes'}</span>
                <span className={s.horarioDesc}>{chegada ? `Por volta das ${String(chegada.getHours()).padStart(2, '0')}h${String(chegada.getMinutes()).padStart(2, '0')} de hoje` : ''}</span>
              </button>
              <div className={`${s.horario} ${quando === 'agendar' ? s.selecionado : ''}`}>
                <button type="button" role="radio" aria-checked={quando === 'agendar'} className={s.horarioCobre} onClick={() => setQuando('agendar')} aria-label="Agendar entrega" />
                <span className={s.check} aria-hidden>{quando === 'agendar' && <Check size={12} strokeWidth={3} />}</span>
                <span className={s.horarioNome}>Agendar</span>
                <span className={s.horarioEta}>Escolha o horário</span>
                <select className={s.selectHorario} value={horario} aria-label="Horário do agendamento"
                  onChange={(e) => { setHorario(e.target.value); setQuando('agendar'); }}>
                  <option value="">{horarios.slice(0, 2).map((h) => h.rotulo).join(' · ')} · ...</option>
                  {horarios.map((h) => <option key={h.valor} value={h.valor}>{h.rotulo}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className={s.secao} aria-labelledby="sec-pagamento">
            <div className={s.secaoCabeca}>
              <span className={s.numero} aria-hidden>4</span>
              <div className={s.secaoTexto}><h2 id="sec-pagamento" className={s.secaoTitulo}>Forma de pagamento</h2><p className={s.secaoSub}>Pagamento online ou na entrega · ambiente de demonstração (nenhuma cobrança real)</p></div>
            </div>
            <div className={s.opcoes} role="radiogroup" aria-label="Forma de pagamento">
              {([
                { v: 'PIX', icone: <span className={`${s.pagIcone} ${s.pix}`}>Pix</span>, nome: 'Pix', meta: 'Gera QR Code e Copia e Cola · via Mercado Pago', selo: '+ Rápido' },
                { v: 'CREDITO', icone: <span className={`${s.pagIcone} ${s.cartao}`}><CreditCard size={16} aria-hidden /></span>, nome: 'Cartão de crédito', meta: 'Mercado Pago · até 3× sem juros', selo: null },
                { v: 'DINHEIRO', icone: <span className={`${s.pagIcone} ${s.dinheiro}`}><Banknote size={16} aria-hidden /></span>, nome: 'Dinheiro na entrega', meta: 'Informe o valor para troco', selo: null },
              ] as const).map((o) => (
                <button key={o.v} type="button" role="radio" aria-checked={forma === o.v} className={`${s.pagamento} ${forma === o.v ? s.selecionado : ''}`} onClick={() => setForma(o.v)}>
                  <span className={s.radio} aria-hidden />
                  {o.icone}
                  <span><span className={s.pagNome}>{o.nome}</span><span className={s.pagMeta}>{o.meta}</span></span>
                  {o.selo ? <span className={s.pagSelo}>{o.selo}</span> : <span />}
                </button>
              ))}
            </div>
            {forma === 'DINHEIRO' && (
              <label className={s.troco}>Troco para quanto?
                <input value={troco} onChange={(e) => setTroco(e.target.value.replace(/[^\d,]/g, ''))} inputMode="decimal" placeholder="Ex.: 100,00" />
              </label>
            )}
            <p className={s.cupomRotulo}><Tag size={14} aria-hidden /> Cupom de desconto</p>
            {!cupom || p?.erroCupom ? (
              <form className={s.cupomLinha} onSubmit={(e) => { e.preventDefault(); setCupom(textoCupom.trim().toUpperCase() || undefined); }}>
                <input className={s.cupomEntrada} value={textoCupom} onChange={(e) => setTextoCupom(e.target.value)} placeholder="Digite o código" aria-label="Código do cupom"
                  aria-invalid={!!p?.erroCupom} aria-describedby={p?.erroCupom ? 'erro-cupom' : undefined} />
                <button type="submit" className={s.cupomAplicar} disabled={!textoCupom.trim()}>Aplicar</button>
              </form>
            ) : null}
            {p?.erroCupom && <p id="erro-cupom" className={s.cupomErro} role="alert">{p.erroCupom}</p>}
            {p?.cupom && (
              <div className={s.cupomAplicado}>
                <span>Cupom <span className={s.codigo}>{p.cupom.codigo}</span> aplicado</span>
                <span className={s.cupomValor}>−{formatarMoeda(Number(p.cupom.valor))}
                  <button type="button" onClick={() => { setCupom(undefined); setTextoCupom(''); }} aria-label="Remover cupom"><X size={14} aria-hidden /></button>
                </span>
              </div>
            )}
          </section>
        </div>

        <aside className={s.resumoCol} aria-label="Resumo do pedido">
          <div className={s.resumo}>
            <h2 className={s.resumoTitulo}>Resumo do pedido</h2>
            <p className={s.resumoSub}>{carrinho.totalItens} itens · {DIAS[agora.getDay()]}, {String(agora.getHours()).padStart(2, '0')}h{String(agora.getMinutes()).padStart(2, '0')}</p>
            {p ? (
              <>
                <div className={s.totalMacros}>
                  <p className={s.totalMacrosRotulo}>Total nutricional do pedido</p>
                  <div className={s.totalMacrosLinha}>
                    <p className={s.kcal}>{um(p.calorias)} <small>kcal</small></p>
                    {doPlano > 0 && <p className={s.doPlano}>{doPlano} {doPlano === 1 ? 'refeição' : 'refeições'}<br />do plano de hoje</p>}
                  </div>
                  <div className={s.totalMacrosBarra} aria-hidden>
                    {(() => { const t = Number(p.proteinas) + Number(p.carboidratos) + Number(p.gorduras) || 1; return <>
                      <span style={{ width: `${(Number(p.proteinas) / t) * 100}%`, background: 'var(--prot)' }} />
                      <span style={{ width: `${(Number(p.carboidratos) / t) * 100}%`, background: 'var(--carb)' }} />
                      <span style={{ width: `${(Number(p.gorduras) / t) * 100}%`, background: 'var(--fat)' }} />
                    </>; })()}
                  </div>
                  <div className={s.totalMacrosLista}>
                    <span><span className={s.ponto} style={{ background: 'var(--prot)' }} />{um(p.proteinas)}g prot</span>
                    <span><span className={s.ponto} style={{ background: 'var(--carb)' }} />{um(p.carboidratos)}g carb</span>
                    <span><span className={s.ponto} style={{ background: 'var(--fat)' }} />{um(p.gorduras)}g gord</span>
                  </div>
                </div>
                <dl className={s.precos}>
                  <div><dt>Subtotal ({p.quantidadeItens} {p.quantidadeItens === 1 ? 'item' : 'itens'})</dt><dd>{formatarMoeda(Number(p.subtotal))}</dd></div>
                  <div><dt>Taxa de entrega</dt><dd>{p.entregaGratis ? 'Grátis (Premium)' : formatarMoeda(Number(p.taxaEntrega))}</dd></div>
                  {p.cupom && <div className={s.desconto}><dt>Cupom {p.cupom.codigo}{p.cupom.percentual ? ` (−${Number(p.cupom.percentual)}%)` : ''}</dt><dd>− {formatarMoeda(Number(p.cupom.valor))}</dd></div>}
                  {Number(p.descontoTier) > 0 && <div className={s.desconto}><dt>Desconto {p.tier.charAt(0) + p.tier.slice(1).toLowerCase()} (−{p.percentualTier}%)</dt><dd>− {formatarMoeda(Number(p.descontoTier))}</dd></div>}
                </dl>
                <div className={s.total}><span>Total a pagar</span><p className={s.totalValor} aria-live="polite">R$ {total!.reais}<small>,{total!.centavos}</small></p></div>
              </>
            ) : previa.isError ? (
              <p className={s.cupomErro} role="alert">{previa.error instanceof ErroApi ? previa.error.message : 'Não foi possível calcular o pedido.'}</p>
            ) : <Skeleton altura={280} raio={18} />}
            {problemas.length > 0 && <ul className={s.problemas}>{problemas.map((x) => <li key={x}>{x}</li>)}</ul>}
            <button type="button" className={s.confirmar} disabled={!p || problemas.length > 0 || pedir.isPending}
              onClick={() => (forma === 'PIX' ? setPixAberto(true) : forma === 'CREDITO' ? setCartaoAberto(true) : setConfirmando(true))}>
              {forma === 'PIX' ? 'Pagar com Pix' : forma === 'CREDITO' ? 'Pagar com cartão' : 'Confirmar pedido'} <ArrowRight size={16} aria-hidden />
            </button>
            <p className={s.aviso}>Ao confirmar, você concorda com os <Link to="/termos">Termos de Uso</Link> e <Link to="/privacidade">Política de Privacidade</Link>. Gateway Pix e Cartão integrado ao Mercado Pago.</p>
          </div>
          <div className={s.confianca}>
            <p><span className={s.confiancaIcone} aria-hidden><ShieldCheck size={14} /></span><span><strong>Pagamento 100% seguro</strong> · Criptografia SSL e PCI DSS</span></p>
            <p><span className={s.confiancaIcone} aria-hidden><RotateCcw size={14} /></span><span><strong>Reembolso garantido</strong> · Em problemas com o pedido</span></p>
            <p><span className={s.confiancaIcone} aria-hidden><Headphones size={14} /></span><span><strong>Suporte 24/7</strong> · Em até 4h (Pro) ou 2h (Premium)</span></p>
          </div>
        </aside>
      </div>

      {p && (
        <>
          <PagamentoPixDialog
            aberto={pixAberto}
            valor={Number(p.total)}
            descricao={`Pedido · ${p.restaurante}`}
            detalhe={`${p.quantidadeItens} ${p.quantidadeItens === 1 ? 'item' : 'itens'} · ${quando === 'agora' ? 'entrega imediata' : 'entrega agendada'}`}
            referencia={`pedido-${p.idRestaurante}`}
            finalizando={pedir.isPending}
            onFechar={() => setPixAberto(false)}
            onAprovado={() => pedir.mutate()}
          />
          <PagamentoCartaoDialog
            aberto={cartaoAberto}
            valor={Number(p.total)}
            descricao={`Pedido · ${p.restaurante}`}
            detalhe={`${p.quantidadeItens} ${p.quantidadeItens === 1 ? 'item' : 'itens'} · ${quando === 'agora' ? 'entrega imediata' : 'entrega agendada'}`}
            referencia={`pedido-${p.idRestaurante}`}
            finalizando={pedir.isPending}
            onFechar={() => setCartaoAberto(false)}
            onAprovado={() => pedir.mutate()}
          />
        </>
      )}

      <Confirmacao aberto={confirmando} titulo="Confirmar pedido?" rotuloConfirmar={`Confirmar ${p ? formatarMoeda(Number(p.total)) : ''}`}
        carregando={pedir.isPending} onCancelar={() => setConfirmando(false)} onConfirmar={() => pedir.mutate()}>
        {p && <>
          <strong>{p.quantidadeItens} {p.quantidadeItens === 1 ? 'item' : 'itens'}</strong> do {p.restaurante}, {quando === 'agora' ? 'entrega imediata' : `agendado para ${horarios.find((h) => h.valor === horario)?.rotulo.toLowerCase()}`},
          pagamento via {forma === 'PIX' ? 'Pix' : forma === 'CREDITO' ? 'cartão de crédito' : 'dinheiro na entrega'}.
          O restaurante recebe o pedido na hora e os macros entram no seu consumo do dia.
        </>}
      </Confirmacao>
      <Confirmacao aberto={limpando} titulo="Esvaziar o carrinho?" rotuloConfirmar="Esvaziar" perigo onCancelar={() => setLimpando(false)}
        onConfirmar={() => { carrinho.limpar(); setLimpando(false); }}>
        Todos os itens saem do carrinho.
      </Confirmacao>
      <EnderecoDialog aberto={dialogoEndereco.aberto} endereco={dialogoEndereco.endereco} onFechar={() => setDialogoEndereco({ aberto: false, endereco: null })}
        onSalvo={(e) => { setDialogoEndereco({ aberto: false, endereco: null }); setIdEndereco(e.id); toast('Endereço salvo', 'sucesso'); void qc.invalidateQueries({ queryKey: ['cliente', 'enderecos'] }); }} />
    </div>
  );
}
