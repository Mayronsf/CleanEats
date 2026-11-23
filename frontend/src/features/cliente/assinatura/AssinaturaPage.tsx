import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock, ArrowLeft, ArrowRight, BarChart3, Bot, CalendarDays, CalendarCheck, Check, ChevronDown, ClipboardList, Crown,
  CreditCard, DollarSign, FileText, Hourglass, MessageCircle, QrCode, RefreshCw, Sprout, Star, Truck, UserCheck, Zap, Activity,
} from 'lucide-react';
import { Confirmacao, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarData, formatarMoeda, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarTiers, type Ciclo, type Tier } from '../../../services/planos';
import {
  buscarAssinatura, cancelarAssinatura, pausarAssinatura, reativarAssinatura, retomarAssinatura, trocarFormaPagamento,
  type FaturaAssinatura, type MinhaAssinatura,
} from '../../../services/cliente';
import { ConfirmarAssinatura } from '../../planos/ConfirmarAssinatura';
import s from './AssinaturaPage.module.css';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ORDEM = { FREE: 0, BASIC: 1, PRO: 2, PREMIUM: 3 } as const;
const NOME = { FREE: 'Free', BASIC: 'Basic', PRO: 'Pro', PREMIUM: 'Premium' } as const;
const ICONE_TIER = { FREE: Sprout, BASIC: Zap, PRO: Activity, PREMIUM: Crown } as const;
const STATUS_TEXTO = { FREE: 'Gratuito', TRIAL: 'Teste grátis', ATIVA: 'Ativo', PAUSADA: 'Pausado', CANCELADA: 'Cancelado', EXPIRADA: 'Expirado' } as const;

const dataLocal = (iso: string) => new Date(iso);
const diasAte = (iso: string) => Math.max(0, Math.ceil((dataLocal(iso).getTime() - Date.now()) / 86_400_000));
const mesAno = (iso: string) => { const d = dataLocal(iso); return `${MESES[d.getMonth()]}/${d.getFullYear()}`; };
const diaMesAno = (iso: string) => { const d = dataLocal(iso); return `${String(d.getDate()).padStart(2, '0')}/${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`; };
const porExtenso = (iso: string) => { const d = dataLocal(iso); return `${String(d.getDate()).padStart(2, '0')} de ${MESES_LONGOS[d.getMonth()]} de ${d.getFullYear()}`; };
const curto = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split('-'); return `${d} ${MESES[Number(m) - 1]} ${a}`; };
const porMes = (a: MinhaAssinatura) => (a.ciclo === 'ANUAL' ? a.valor / 12 : a.valor);

function Valor({ valor, grande }: { valor: number; grande?: boolean }) {
  const p = partesPreco(valor);
  return <span className={grande ? s.valorGrande : s.valor}>R$ {p.reais}<small>,{p.centavos}</small></span>;
}

/** Tela 23 — Minha assinatura: plano atual, uso, benefícios, cobranças, troca de plano, pausa e cancelamento (CE-15/16). */
export default function AssinaturaPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const assinatura = useQuery({ queryKey: ['cliente', 'assinatura'], queryFn: buscarAssinatura });
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: buscarTiers, staleTime: 5 * 60_000 });
  const [ciclo, setCiclo] = useState<Ciclo>('MENSAL');
  const [escolhido, setEscolhido] = useState<Tier | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [confirmarPausa, setConfirmarPausa] = useState(false);
  const [faturaAberta, setFaturaAberta] = useState<string | null>(null);
  const [todasFaturas, setTodasFaturas] = useState(false);

  const atualizar = (a: MinhaAssinatura) => {
    qc.setQueryData(['cliente', 'assinatura'], a);
    void qc.invalidateQueries({ queryKey: ['usuario-atual'] });
    void qc.invalidateQueries({ queryKey: ['cliente', 'resumo'] });
  };
  const acao = useMutation({
    mutationFn: (f: () => Promise<MinhaAssinatura>) => f(),
    onSuccess: atualizar,
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível atualizar a assinatura.', 'erro'),
  });
  const executar = (f: () => Promise<MinhaAssinatura>, sucesso: string, depois?: () => void) =>
    acao.mutate(f, { onSuccess: () => { toast(sucesso, 'sucesso'); depois?.(); } });

  if (assinatura.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => assinatura.refetch()} /></div>;
  if (assinatura.isLoading || !assinatura.data) {
    return <div className={s.pagina}><Skeleton altura={60} raio={16} /><div style={{ height: 24 }} /><Skeleton altura={300} raio={32} /><div style={{ height: 24 }} /><Skeleton altura={420} raio={24} /></div>;
  }

  const a = assinatura.data;
  const free = a.tier === 'FREE';
  const tierAtual = tiers.data?.find((t) => t.codigo === a.tier);
  const proximo = tiers.data?.find((t) => ORDEM[t.codigo] === ORDEM[a.tier] + 1);
  const cobrando = a.status === 'ATIVA' || a.status === 'TRIAL';
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  function escolher(t: Tier) {
    if (t.codigo === 'FREE') { if (!free && a.status !== 'CANCELADA') setConfirmarCancelar(true); return; }
    setEscolhido(t);
  }

  function baixarFaturas() {
    const linhas = [['Referência', 'Vencimento', 'Plano', 'Ciclo', 'Forma de pagamento', 'Status', 'Valor (R$)'],
      ...a.faturas.map((f) => [f.referencia, formatarData(f.vencimento), NOME[f.tier], f.ciclo === 'ANUAL' ? 'Anual' : 'Mensal',
        f.formaPagamento === 'PIX' ? 'PIX' : 'Cartão', f.status === 'PAGA' ? 'Paga' : f.status, f.valor.toFixed(2).replace('.', ',')])];
    const csv = '﻿' + linhas.map((l) => l.map((c) => `"${c}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'cleaneats-faturas.csv'; link.click();
    URL.revokeObjectURL(url);
  }

  const linhaHeroi = free ? 'Você está no plano gratuito · faça upgrade quando quiser'
    : a.status === 'CANCELADA' && a.encerraEm ? `${formatarMoeda(porMes(a))}/mês · benefícios até ${formatarData(a.encerraEm)}`
      : a.status === 'PAUSADA' && a.pausadaAte ? `${formatarMoeda(porMes(a))}/mês · pausado até ${formatarData(a.pausadaAte)}`
        : a.renovacaoEm ? <>{formatarMoeda(porMes(a))}/mês · próxima cobrança em <strong>{diasAte(a.renovacaoEm)} dias</strong></> : null;

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <button type="button" className={s.voltar} onClick={() => navegar(-1)} aria-label="Voltar"><ArrowLeft size={18} aria-hidden /></button>
        <div>
          <h1 className={s.titulo}>Minha <span className="script">assinatura</span></h1>
          <p className={s.sub}>Gerencie seu plano, cobranças e benefícios ativos</p>
        </div>
      </header>

      <section className={s.heroi} aria-label="Plano atual">
        <div className={s.heroiInfo}>
          <span className={s.selo}><Crown size={14} aria-hidden /> Seu plano atual · {STATUS_TEXTO[a.status]}</span>
          <h2 className={s.heroiNome}>Plano <span className="script">{NOME[a.tier]}</span></h2>
          {linhaHeroi && <p className={s.heroiPreco}>{linhaHeroi}</p>}
          <dl className={s.stats}>
            {a.membroDesde && <div><dt>Membro desde</dt><dd>{mesAno(a.membroDesde)}</dd></div>}
            <div><dt>Total economizado</dt><dd>{formatarMoeda(a.totalEconomizado)}</dd></div>
            {a.renovacaoEm && !free && <div><dt>{a.status === 'CANCELADA' ? 'Encerra em' : 'Renovação'}</dt><dd>{diaMesAno(a.encerraEm ?? a.renovacaoEm)}</dd></div>}
          </dl>
        </div>
        <div className={s.heroiAcoes}>
          {proximo
            ? <button type="button" className={s.upgrade} onClick={() => setEscolhido(proximo)}><Star size={18} aria-hidden /> {free ? `Assinar o ${proximo.nome}` : `Fazer upgrade pro ${proximo.nome}`} <ArrowRight size={16} aria-hidden /></button>
            : <span className={s.topo1}><Crown size={16} aria-hidden /> Você está no plano mais completo</span>}
          <button type="button" className={s.gerenciar} onClick={() => scroll('trocar-plano')}>Gerenciar assinatura</button>
        </div>
      </section>

      <div className={s.grade}>
        <div className={s.coluna}>
          <section className={s.cartao} aria-labelledby="uso-titulo">
            <div className={s.cabeca}>
              <div><h2 id="uso-titulo" className={s.cartaoTitulo}><BarChart3 size={18} aria-hidden /> Uso este mês</h2>
                <p className={s.cartaoSub}>{a.renovacaoEm && !free ? `Reseta no dia ${dataLocal(a.renovacaoEm).getDate()} de cada mês` : 'Contado desde o dia 1º'}</p></div>
              {a.renovacaoEm && cobrando && <span className={s.cabecaLink}>{diasAte(a.renovacaoEm)} dias restantes</span>}
            </div>
            <ul className={s.uso}>
              <Uso icone={<Bot size={18} />} tom="laranja" titulo="NutriBot contextualizado" detalhe={`${a.uso.nutribotMes} ${a.uso.nutribotMes === 1 ? 'pergunta' : 'perguntas'} este mês`}
                barra={a.uso.limiteNutribotDia === 0 ? 0 : Math.min(100, a.uso.nutribotMes * (a.uso.limiteNutribotDia > 0 ? 100 / (a.uso.limiteNutribotDia * 30) : 2))}
                valor={a.uso.limiteNutribotDia === -1 ? <span className={s.destaque}>Ilimitado<small>{NOME[a.tier]}</small></span> : a.uso.limiteNutribotDia === 0 ? <span className={s.indisponivel}>Indisponível</span> : <>{a.uso.limiteNutribotDia}<small>/dia</small></>} />
              <Uso icone={<MessageCircle size={18} />} tom="coral" titulo="Mensagens com nutri" detalhe={a.nutricionista ? `${a.uso.mensagensNutriSemana} enviadas esta semana para ${a.nutricionista.nome}` : 'Disponível nos planos Pro e Premium'}
                barra={a.nutricionista ? Math.min(100, a.uso.mensagensNutriSemana * 10) : 0} valor={a.nutricionista ? <>{a.uso.mensagensNutriSemana}<small>/sem</small></> : <span className={s.indisponivel}>—</span>} />
              <Uso icone={<DollarSign size={18} />} tom="verde" titulo={`Desconto ${NOME[a.tier]} em pedidos`} detalhe={a.uso.percentualDesconto ? `−${formatarMoeda(a.uso.descontoMes)} economizado este mês` : 'Pro tem 5% e Premium 15% em todos os pedidos'}
                barra={a.uso.percentualDesconto ? 100 : 0} valor={<span className={a.uso.percentualDesconto ? s.destaque : s.indisponivel}>{a.uso.percentualDesconto}%</span>} />
              <Uso icone={<CalendarDays size={18} />} tom="azul" titulo="Plano alimentar semanal" detalhe={a.uso.semanaPlano ? `Plano da semana de ${curto(a.uso.semanaPlano)} ativo` : a.nutricionista ? 'Sua nutricionista ainda não montou o plano' : 'Disponível nos planos Pro e Premium'}
                barra={a.uso.semanaPlano ? 100 : 0} valor={a.uso.semanaPlano ? <Check size={18} className={s.ok} aria-label="Ativo" /> : <span className={s.indisponivel}>—</span>} />
            </ul>
          </section>

          <section className={s.cartao} aria-labelledby="beneficios-titulo">
            <div className={s.cabeca}>
              <div><h2 id="beneficios-titulo" className={s.cartaoTitulo}><Star size={18} aria-hidden /> Benefícios ativos</h2>
                <p className={s.cartaoSub}>O que você tem com o plano {NOME[a.tier]}</p></div>
              <Link to="/planos" className={s.cabecaLink}>Comparar planos <ArrowRight size={14} aria-hidden /></Link>
            </div>
            {tierAtual ? <ul className={s.beneficios}>{beneficios(tierAtual).map((b) => (
              <li key={b.titulo}><span className={s.beneficioIcone} aria-hidden>{b.icone}</span><div><p>{b.titulo}</p><small>{b.detalhe}</small></div></li>
            ))}</ul> : <Skeleton altura={180} raio={16} />}
          </section>

          <section className={s.cartao} id="historico" aria-labelledby="historico-titulo">
            <div className={s.cabeca}>
              <div><h2 id="historico-titulo" className={s.cartaoTitulo}><FileText size={18} aria-hidden /> Histórico de cobranças</h2>
                <p className={s.cartaoSub}>{a.faturas.length ? `Últimas ${Math.min(5, a.faturas.length)} faturas · clique pra ver detalhes` : 'Nenhuma cobrança ainda'}</p></div>
              {a.faturas.length > 0 && <button type="button" className={s.cabecaLink} onClick={baixarFaturas}>Baixar todas <ArrowRight size={14} aria-hidden /></button>}
            </div>
            <ul className={s.faturas}>
              {cobrando && a.renovacaoEm && (
                <li className={s.fatura}>
                  <div className={s.faturaLinha}>
                    <span className={s.faturaIcone} aria-hidden><CalendarDays size={18} /></span>
                    <div className={s.faturaInfo}><p>{curto(a.renovacaoEm)}</p><small>Próxima cobrança · Plano {NOME[a.tier]} {a.ciclo === 'ANUAL' ? 'anual' : 'mensal'}</small></div>
                    <span className={`${s.status} ${s.statusProxima}`}><Hourglass size={12} aria-hidden /> Em {diasAte(a.renovacaoEm)} dias</span>
                    <Valor valor={a.valor} />
                  </div>
                </li>
              )}
              {(todasFaturas ? a.faturas : a.faturas.slice(0, 5)).map((f) => <LinhaFatura key={f.id} f={f} aberta={faturaAberta === f.id} onAlternar={() => setFaturaAberta(faturaAberta === f.id ? null : f.id)} />)}
            </ul>
            {a.faturas.length > 5 && <button type="button" className={s.verTodas} onClick={() => setTodasFaturas(!todasFaturas)} aria-expanded={todasFaturas}>{todasFaturas ? 'Mostrar menos' : `Ver todas as ${a.faturas.length} faturas`}</button>}
          </section>
        </div>

        <div className={s.coluna}>
          {!free && (
            <section className={s.cobranca} aria-labelledby="cobranca-titulo">
              <div className={s.cobrancaTopo}>
                <span className={s.cobrancaIcone} aria-hidden><AlarmClock size={22} /></span>
                <div>
                  <h2 id="cobranca-titulo" className={s.cobrancaTitulo}>{cobrando ? 'Próxima cobrança' : a.status === 'PAUSADA' ? 'Assinatura pausada' : 'Sem próximas cobranças'}</h2>
                  <p className={s.cobrancaData}>{cobrando && a.renovacaoEm ? `${porExtenso(a.renovacaoEm)} · em ${diasAte(a.renovacaoEm)} dias`
                    : a.status === 'PAUSADA' && a.pausadaAte ? `Volta a cobrar em ${porExtenso(a.pausadaAte)}`
                      : a.encerraEm ? `Benefícios até ${porExtenso(a.encerraEm)}` : ''}</p>
                </div>
              </div>
              <div className={s.cobrancaValor}><span>Valor a ser cobrado</span><Valor valor={cobrando ? a.valor : 0} grande /></div>
              <div className={s.forma}>
                <span className={s.formaIcone} aria-hidden>{a.formaPagamento === 'PIX' ? <QrCode size={18} /> : <CreditCard size={18} />}</span>
                <div className={s.formaInfo}><p>{a.formaPagamento === 'PIX' ? 'PIX' : 'Cartão de crédito'}</p><small>Pagamento simulado na demonstração</small></div>
                <button type="button" className={s.trocar} disabled={acao.isPending || a.status === 'CANCELADA'}
                  onClick={() => executar(() => trocarFormaPagamento(a.formaPagamento === 'PIX' ? 'CARTAO' : 'PIX'), 'Forma de pagamento atualizada.')}>
                  Trocar para {a.formaPagamento === 'PIX' ? 'cartão' : 'PIX'} <ArrowRight size={14} aria-hidden />
                </button>
              </div>
              <div className={s.cobrancaAcoes}>
                {a.status === 'PAUSADA'
                  ? <button type="button" className={s.botaoClaro} disabled={acao.isPending} onClick={() => executar(retomarAssinatura, 'Assinatura retomada. Benefícios ativos de novo.')}>Retomar plano</button>
                  : <button type="button" className={s.botaoClaro} disabled={acao.isPending || !cobrando} onClick={() => setConfirmarPausa(true)}>Pausar plano</button>}
                <button type="button" className={s.botaoClaro} onClick={() => scroll('historico')}>Ver detalhes</button>
              </div>
            </section>
          )}

          <section className={s.cartao} id="trocar-plano" aria-labelledby="trocar-titulo">
            <div className={s.cabeca}>
              <div><h2 id="trocar-titulo" className={s.cartaoTitulo}><RefreshCw size={18} aria-hidden /> Trocar de plano</h2>
                <p className={s.cartaoSub}>Faça upgrade ou downgrade quando quiser</p></div>
            </div>
            <div className={s.ciclo} role="radiogroup" aria-label="Ciclo de cobrança">
              {(['MENSAL', 'ANUAL'] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={ciclo === c} className={ciclo === c ? s.cicloAtivo : undefined} onClick={() => setCiclo(c)}>
                  {c === 'MENSAL' ? 'Mensal' : <>Anual <span className={s.desconto}>-20%</span></>}
                </button>
              ))}
            </div>
            {tiers.isError ? <ErroCarregamento onTentarNovamente={() => tiers.refetch()} /> : !tiers.data ? <Skeleton altura={300} raio={16} /> : (
              <ul className={s.tiers}>
                {tiers.data.map((t) => {
                  const Icone = ICONE_TIER[t.codigo];
                  const atual = t.codigo === a.tier && (free || a.ciclo === ciclo) && a.status !== 'CANCELADA';
                  const preco = ciclo === 'ANUAL' ? Number(t.precoAnual) / 12 : Number(t.precoMensal);
                  const sobe = ORDEM[t.codigo] > ORDEM[a.tier];
                  const rotulo = atual ? 'Atual' : t.codigo === a.tier ? (a.status === 'CANCELADA' ? 'Reassinar' : `Mudar para ${ciclo === 'ANUAL' ? 'anual' : 'mensal'}`) : sobe ? 'Upgrade' : 'Downgrade';
                  return (
                    <li key={t.codigo} className={`${s.tier} ${s[`tier${t.codigo}`] ?? ''} ${atual ? s.tierAtual : ''}`}>
                      <span className={s.tierIcone} aria-hidden><Icone size={18} /></span>
                      <div className={s.tierInfo}>
                        <p>{t.nome} {atual && <span className={s.seloAtual}>Atual</span>}</p>
                        <small>{formatarMoeda(preco)}/mês{ciclo === 'ANUAL' && preco > 0 ? ' · cobrado anualmente' : ''}</small>
                      </div>
                      <button type="button" disabled={atual || acao.isPending || (t.codigo === 'FREE' && (free || a.status === 'CANCELADA'))}
                        className={atual ? s.tierBotaoAtual : sobe ? s.tierBotaoUpgrade : s.tierBotao} onClick={() => escolher(t)}
                        aria-label={atual ? `${t.nome}: plano atual` : `${rotulo}: ${t.nome}`}>{rotulo}</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!free && (a.status === 'CANCELADA' ? (
            <section className={`${s.cancelar} ${s.reativar}`} aria-labelledby="reativar-titulo">
              <div><h2 id="reativar-titulo">Assinatura cancelada</h2>
                <p>Você mantém os benefícios {NOME[a.tier]} até {a.encerraEm ? formatarData(a.encerraEm) : 'o fim do período'}. Depois, sua conta volta pro plano Free sem perder histórico.</p></div>
              <button type="button" disabled={acao.isPending} onClick={() => executar(reativarAssinatura, 'Assinatura reativada.')}>Reativar plano</button>
            </section>
          ) : (
            <section className={s.cancelar} aria-labelledby="cancelar-titulo">
              <div><h2 id="cancelar-titulo">Cancelar assinatura</h2>
                <p>Você mantém os benefícios {NOME[a.tier]} até {a.renovacaoEm ? formatarData(a.renovacaoEm) : 'o fim do período pago'}. Depois, sua conta volta pro plano Free sem perder histórico.</p></div>
              <button type="button" disabled={acao.isPending} onClick={() => setConfirmarCancelar(true)}>Cancelar plano</button>
            </section>
          ))}
        </div>
      </div>

      {escolhido && (
        <ConfirmarAssinatura tier={escolhido} ciclo={ciclo} onFechar={() => setEscolhido(null)}
          onConcluido={async () => {
            setEscolhido(null);
            toast(`Plano ${escolhido.nome} ativo. Pagamento aprovado.`, 'sucesso');
            await qc.invalidateQueries({ queryKey: ['cliente', 'assinatura'] });
            void qc.invalidateQueries({ queryKey: ['usuario-atual'] });
            void qc.invalidateQueries({ queryKey: ['cliente'] });
          }} />
      )}
      <Confirmacao aberto={confirmarCancelar} perigo titulo="Cancelar a assinatura?" rotuloConfirmar="Cancelar plano" rotuloCancelar="Manter plano"
        carregando={acao.isPending} onCancelar={() => setConfirmarCancelar(false)}
        onConfirmar={() => executar(cancelarAssinatura, 'Assinatura cancelada.', () => setConfirmarCancelar(false))}>
        Você continua com os benefícios {NOME[a.tier]} até {a.renovacaoEm ? formatarData(a.renovacaoEm) : 'o fim do período pago'} e não haverá novas cobranças. Seu histórico de pedidos e planos é mantido.
      </Confirmacao>
      <Confirmacao aberto={confirmarPausa} titulo="Pausar por 30 dias?" rotuloConfirmar="Pausar plano" rotuloCancelar="Voltar"
        carregando={acao.isPending} onCancelar={() => setConfirmarPausa(false)}
        onConfirmar={() => executar(pausarAssinatura, 'Assinatura pausada por 30 dias.', () => setConfirmarPausa(false))}>
        Durante a pausa não há cobrança. A próxima cobrança é adiada pelos dias pausados, e você pode retomar quando quiser.
      </Confirmacao>
    </div>
  );
}

function Uso({ icone, tom, titulo, detalhe, barra, valor }: { icone: ReactNode; tom: 'laranja' | 'coral' | 'verde' | 'azul'; titulo: string; detalhe: string; barra: number; valor: ReactNode }) {
  return (
    <li className={`${s.usoItem} ${s[tom]}`}>
      <span className={s.usoIcone} aria-hidden>{icone}</span>
      <div className={s.usoInfo}>
        <p>{titulo}</p>
        <span className={s.usoBarra}><span style={{ width: `${barra}%` }} /></span>
        <small>{detalhe}</small>
      </div>
      <span className={s.usoValor}>{valor}</span>
    </li>
  );
}

function LinhaFatura({ f, aberta, onAlternar }: { f: FaturaAssinatura; aberta: boolean; onAlternar: () => void }) {
  const gratis = Number(f.valor) === 0;
  const plano = `Plano ${NOME[f.tier]} ${f.ciclo === 'ANUAL' ? 'anual' : 'mensal'}`;
  return (
    <li className={`${s.fatura} ${aberta ? s.faturaAberta : ''}`}>
      <button type="button" className={s.faturaLinha} onClick={onAlternar} aria-expanded={aberta}>
        <span className={s.faturaIcone} aria-hidden>{f.status === 'PAGA' ? <CalendarCheck size={18} /> : <CalendarDays size={18} />}</span>
        <span className={s.faturaInfo}><p>{curto(f.vencimento)}</p><small>{plano} · {f.formaPagamento === 'PIX' ? 'PIX' : 'Cartão'}</small></span>
        <span className={`${s.status} ${f.status === 'PAGA' ? s.statusPaga : f.status === 'FALHOU' ? s.statusFalhou : s.statusProxima}`}>
          {f.status === 'PAGA' && <Check size={12} aria-hidden />}{gratis ? 'Grátis' : f.status === 'PAGA' ? 'Pago' : f.status === 'FALHOU' ? 'Falhou' : f.status === 'ESTORNADA' ? 'Estornado' : 'Pendente'}
        </span>
        <Valor valor={Number(f.valor)} />
        <ChevronDown size={16} className={s.seta} aria-hidden />
      </button>
      {aberta && (
        <dl className={s.faturaDetalhe}>
          <div><dt>Referência</dt><dd>{f.referencia}</dd></div>
          <div><dt>Vencimento</dt><dd>{formatarData(f.vencimento)}</dd></div>
          <div><dt>Pago em</dt><dd>{f.pagaEm ? formatarData(f.pagaEm) : '—'}</dd></div>
          <div><dt>Plano</dt><dd>{plano}</dd></div>
        </dl>
      )}
    </li>
  );
}

function beneficios(t: Tier): { icone: ReactNode; titulo: string; detalhe: string }[] {
  const lista: { icone: ReactNode; titulo: string; detalhe: string }[] = [
    { icone: <ClipboardList size={18} />, titulo: 'Marketplace completo', detalhe: 'pratos com ficha nutricional' },
  ];
  if (t.nutricionistaDedicado) {
    lista.push({ icone: <UserCheck size={18} />, titulo: 'Nutricionista dedicado', detalhe: 'com CRN validado' });
    lista.push({ icone: <CalendarDays size={18} />, titulo: 'Plano semanal personalizado', detalhe: 'com pratos reais' });
  }
  if (t.limiteNutribotDia !== 0) lista.push({ icone: <Bot size={18} />, titulo: t.limiteNutribotDia === -1 ? 'NutriBot ilimitado' : `NutriBot ${t.limiteNutribotDia} perguntas/dia`, detalhe: 'contextualizado' });
  if (Number(t.descontoPedido) > 0) lista.push({ icone: <DollarSign size={18} />, titulo: `${Number(t.descontoPedido)}% desconto em pedidos`, detalhe: 'em todos os restaurantes' });
  if (t.nutricionistaDedicado) lista.push({ icone: <MessageCircle size={18} />, titulo: 'Mensagens com nutri', detalhe: 'chat direto no app' });
  if (t.prescricaoDigital) lista.push({ icone: <FileText size={18} />, titulo: 'Prescrição digital', detalhe: 'PDF assinado pela nutri' });
  if (t.entregaGratisAcima != null) lista.push({ icone: <Truck size={18} />, titulo: 'Entrega grátis', detalhe: `em pedidos acima de ${formatarMoeda(Number(t.entregaGratisAcima))}` });
  if (t.codigo === 'FREE') lista.push({ icone: <Zap size={18} />, titulo: 'Pedidos sem mensalidade', detalhe: 'pague só o que pedir' });
  return lista;
}
