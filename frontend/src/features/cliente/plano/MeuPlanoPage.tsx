import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Coffee, Moon, Sun, Sunrise, ClipboardList, Droplets, Flame, MessageCircle, Minus, Plus, Sparkles, Target, Utensils } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarConsumo, buscarPlano, buscarResumo, registrarAgua, ROTULO_OBJETIVO, ROTULO_REFEICAO, type RefeicaoPlano } from '../../../services/cliente';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import { agoraEmRecife, hojeIso, situacaoRefeicao } from '../tempo';
import s from './MeuPlanoPage.module.css';

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const um = (v: number) => formatarNumero(Math.round(Number(v)));
const pct = (v: number, m: number) => (m > 0 ? Math.min(100, Math.round((v / m) * 100)) : 0);

/** Semana ISO (como "Semana 19") a partir de "aaaa-mm-dd". */
function semanaDoAno(iso: string) {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(a!, m! - 1, d!));
  const dia = data.getUTCDay() || 7;
  data.setUTCDate(data.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  return Math.ceil(((data.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7);
}
const partes = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return { a: a!, m: m! - 1, d: d!, dia: new Date(a!, m! - 1, d!).getDay() }; };
const somarDias = (iso: string, n: number) => { const p = partes(iso); const x = new Date(p.a, p.m, p.d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

/** Tela 24 — Meu plano: a semana montada pela nutricionista com pratos reais; "Pedir" com 1 clique (CE-19). */
export default function MeuPlanoPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { adicionar, dialogo } = useAdicionarAoCarrinho();
  const hoje = hojeIso();
  const plano = useQuery({ queryKey: ['cliente', 'plano'], queryFn: buscarPlano });
  const resumo = useQuery({ queryKey: ['cliente', 'resumo'], queryFn: buscarResumo });
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const p = plano.data;
  const dias = p ? Array.from({ length: 7 }, (_, i) => somarDias(p.semanaInicio, i)) : [];
  const dia = diaEscolhido ?? (dias.includes(hoje) ? hoje : dias[0] ?? hoje);
  const consumo = useQuery({ queryKey: ['cliente', 'consumo', dia], queryFn: () => buscarConsumo(dia), enabled: !!p });
  const agua = useMutation({
    mutationFn: (ml: number) => registrarAgua(ml),
    onSuccess: (c) => { qc.setQueryData(['cliente', 'consumo', hoje], c); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível registrar a água.', 'erro'),
  });

  if (plano.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => plano.refetch()} /></div>;
  if (plano.isLoading) return <div className={s.pagina}><Skeleton altura={260} raio={28} /><div style={{ height: 24 }} /><Skeleton altura={420} raio={24} /></div>;
  if (!p) {
    const semNutri = resumo.data && (resumo.data.tier === 'FREE' || resumo.data.tier === 'BASIC');
    return (
      <div className={s.pagina}>
        <EmptyState icone={<ClipboardList size={28} aria-hidden />}
          titulo={semNutri ? 'O plano alimentar vem com o plano Pro' : 'Sua nutricionista ainda não montou o plano'}
          descricao={semNutri ? 'No Pro e no Premium, você escolhe um nutricionista com CRN para montar sua semana com pratos reais dos restaurantes parceiros.' : 'Assim que a triagem for concluída e a semana estiver pronta, você recebe uma notificação e os pratos aparecem aqui.'}
          acao={semNutri ? { rotulo: 'Ver nutricionistas disponíveis', onClick: () => navegar('/app/nutricionistas') } : { rotulo: 'Ver / trocar nutricionista', onClick: () => navegar('/app/nutricionistas') }} />
      </div>
    );
  }

  const porDia = (d: string) => p.refeicoes.filter((r) => r.data === d);
  const refeicoesDia = porDia(dia);
  const ehHoje = dia === hoje;
  const passado = dia < hoje;
  const agora = agoraEmRecife();
  const c = consumo.data;
  const metas = p.metas;
  const kcalPrevistas = refeicoesDia.reduce((t, r) => t + r.prato.macros.calorias, 0);
  const atualizado = Math.max(0, Math.round((Date.now() - new Date(p.atualizadoEm).getTime()) / 86_400_000));
  const pi = partes(p.semanaInicio), pf = partes(p.semanaFim), pd = partes(dia);
  const nutriNome = p.nutricionista.nome.replace(/^(Dra?\.)\s*/, '$1 ').split(' ').slice(0, 2).join(' ');
  let marcouAgora = false;

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="plano-titulo">
        <div className={s.heroiTexto}>
          <p className={s.selo}><Sparkles size={12} aria-hidden /> Plano alimentar personalizado</p>
          <h1 id="plano-titulo" className={s.titulo}>Seu plano da <span className="script">semana</span><br />está pronto</h1>
          <p className={s.sub}>{p.observacoes ?? `Plano montado por ${nutriNome} com base no seu objetivo${resumo.data?.objetivo ? ` de ${ROTULO_OBJETIVO[resumo.data.objetivo].toLowerCase()}` : ''}. Peça cada refeição com 1 clique.`}</p>
          <div className={s.metas}>
            <span><Flame size={16} aria-hidden /> <span>{um(metas.calorias)} kcal/dia<small>Meta diária</small></span></span>
            <span><Target size={16} aria-hidden /> <span>{um(metas.proteinas)}g proteína<small>Por dia</small></span></span>
            <span><Utensils size={16} aria-hidden /> <span>{Math.max(...dias.map((d) => porDia(d).length))} refeições<small>Por dia</small></span></span>
          </div>
        </div>
        <div className={s.nutri}>
          <div className={s.nutriLinha}>
            <span className={s.nutriAvatar} aria-hidden>{p.nutricionista.avatarUrl ? <img src={p.nutricionista.avatarUrl} alt="" /> : p.nutricionista.nome.replace(/^Dra?\.\s*/, '')[0]}<span className={s.nutriOnline} /></span>
            <div><p className={s.nutriRotulo}>Plano elaborado por</p><p className={s.nutriNome}>{p.nutricionista.nome}</p><p className={s.nutriCrn}>{p.nutricionista.crn}</p></div>
          </div>
          <Link to="/app/nutribot" className={s.nutriCta}><MessageCircle size={14} aria-hidden /> Tirar dúvidas do plano</Link>
          <Link to="/app/nutricionistas" style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, textDecoration: 'underline' }}>Trocar nutricionista</Link>
        </div>
      </section>

      <div className={s.semana}>
        <div className={s.semanaInfo}>
          <span className={s.semanaIcone} aria-hidden><CalendarDays size={22} /></span>
          <div>
            <p className={s.semanaRotulo}>Semana {semanaDoAno(p.semanaInicio)} · {hoje >= p.semanaInicio && hoje <= p.semanaFim ? 'Atual' : 'Plano ativo'}</p>
            <p className={s.semanaTitulo}>{pi.d}{pi.m !== pf.m ? ` de ${MESES_LONGOS[pi.m]}` : ''} a {pf.d} de {MESES_LONGOS[pf.m]}</p>
            <p className={s.semanaData}>Atualizado por {nutriNome} {atualizado === 0 ? 'hoje' : atualizado === 1 ? 'ontem' : `há ${atualizado} dias`}</p>
          </div>
        </div>
        <div className={s.navSemana}>
          <button type="button" className={s.seta} aria-label="Dia anterior" disabled={dias.indexOf(dia) <= 0} onClick={() => setDiaEscolhido(dias[dias.indexOf(dia) - 1]!)}><ArrowLeft size={16} aria-hidden /></button>
          <button type="button" className={s.hoje} onClick={() => setDiaEscolhido(null)} disabled={!dias.includes(hoje)}>Hoje</button>
          <button type="button" className={s.seta} aria-label="Próximo dia" disabled={dias.indexOf(dia) >= dias.length - 1} onClick={() => setDiaEscolhido(dias[dias.indexOf(dia) + 1]!)}><ArrowRight size={16} aria-hidden /></button>
        </div>
      </div>

      <div className={s.dias} role="tablist" aria-label="Dias da semana">
        {dias.map((d) => {
          const lista = porDia(d);
          const feitas = lista.filter((r) => r.consumida).length;
          const pdia = partes(d);
          const estado = lista.length === 0 ? { cls: s.vazio, txt: 'Livre' }
            : d === hoje ? { cls: s.andamento, txt: 'Hoje' }
              : d < hoje ? (feitas === lista.length ? { cls: s.concluido, txt: 'Concluído' } : { cls: s.andamento, txt: `${feitas}/${lista.length}` })
                : { cls: s.vazio, txt: 'Planejado' };
          return (
            <button key={d} type="button" role="tab" aria-selected={d === dia} className={`${s.dia} ${d === dia ? s.diaAtivo : ''} ${d === hoje ? s.diaHoje : ''}`} onClick={() => setDiaEscolhido(d)}>
              <span className={s.diaNome}>{DIAS_CURTOS[pdia.dia]}</span>
              <span className={s.diaNum}>{pdia.d}</span>
              <span className={`${s.diaStatus} ${estado.cls}`}>{estado.txt === 'Concluído' && <Check size={9} strokeWidth={3} aria-hidden />}{estado.txt}</span>
            </button>
          );
        })}
      </div>

      <div className={s.gradeDia}>
        <section className={s.refeicoes} aria-labelledby="dia-titulo">
          <div className={s.secaoCabeca}>
            <div>
              <h2 id="dia-titulo" className={s.secaoTitulo}>{DIAS[pd.dia]} · <span className="script">{pd.d} {MESES[pd.m]}</span></h2>
              <p className={s.secaoSub}>{refeicoesDia.length ? `${refeicoesDia.length} refeições · ~${um(kcalPrevistas)} kcal previstas` : 'Dia livre no plano'}</p>
            </div>
            {refeicoesDia.length > 0 && <p className={s.secaoSub}>{refeicoesDia.filter((r) => r.consumida).length} de {refeicoesDia.length} concluídas</p>}
          </div>
          {refeicoesDia.length === 0 && <EmptyState compacto titulo="Dia livre" descricao="Sua nutricionista deixou este dia sem refeições planejadas. Aproveite com equilíbrio." />}
          {refeicoesDia.map((r, i) => {
            let sit = ehHoje ? situacaoRefeicao(r, agora) : r.consumida ? { tipo: 'consumida' as const } : passado ? { tipo: 'passou' as const } : { tipo: 'futura' as const, texto: '' };
            if (sit.tipo === 'agora') { if (marcouAgora) sit = { tipo: 'futura', texto: 'Em seguida' }; marcouAgora = true; }
            return (
              <div key={r.id} className={s.item}>
                {i > 0 && <span className={s.conector} aria-hidden />}
                <Refeicao r={r} situacao={sit.tipo} onPedir={() => adicionar(r.prato, { irParaCarrinho: true, observacao: r.observacao ?? undefined })} />
              </div>
            );
          })}
        </section>

        <aside className={s.lateral}>
          <section className={s.macros} aria-labelledby="macros-titulo">
            <h2 id="macros-titulo" className={s.macrosTitulo}>Macros {ehHoje ? 'de hoje' : `de ${DIAS[pd.dia].toLowerCase()}`}</h2>
            <p className={s.macrosSub}>Somados a cada pedido</p>
            {c ? <>
              <div className={s.kcal}>
                <p className={s.kcalNum}>{um(c.consumo.calorias)} <small>/ {um(metas.calorias)} kcal</small></p>
                <p className={s.kcalDe}>{pct(c.consumo.calorias, metas.calorias)}% da meta · {refeicoesDia.filter((r) => r.consumida).length} {refeicoesDia.filter((r) => r.consumida).length === 1 ? 'refeição consumida' : 'refeições consumidas'}</p>
              </div>
              <ul className={s.macrosLista}>
                {[
                  { l: 'P', n: 'Proteína', v: c.consumo.proteinas, m: metas.proteinas, cor: 'var(--prot)' },
                  { l: 'C', n: 'Carbo', v: c.consumo.carboidratos, m: metas.carboidratos, cor: 'var(--carb)', escuro: true },
                  { l: 'G', n: 'Gordura', v: c.consumo.gorduras, m: metas.gorduras, cor: 'var(--fat)' },
                  { l: 'F', n: 'Fibras', v: c.consumo.fibras, m: metas.fibras, cor: 'var(--fiber)' },
                ].map((x) => (
                  <li key={x.l}>
                    <span className={s.macroIcone} style={{ background: x.cor, color: x.escuro ? 'var(--ink)' : 'var(--white)' }} aria-hidden>{x.l}</span>
                    <div><p className={s.macroTopo}><span>{x.n}</span><span>{um(x.v)} / {um(x.m)}g</span></p>
                      <div className={s.macroBarra} role="progressbar" aria-label={x.n} aria-valuenow={pct(x.v, x.m)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct(x.v, x.m)}%`, background: x.cor }} /></div></div>
                    <span className={s.macroPct}>{pct(x.v, x.m)}%</span>
                  </li>
                ))}
              </ul>
            </> : <Skeleton altura={260} raio={16} />}
          </section>

          <section className={s.agua} aria-labelledby="agua-titulo">
            <span className={s.aguaIcone} aria-hidden><Droplets size={28} /></span>
            <div className={s.aguaInfo}>
              <p id="agua-titulo" className={s.aguaRotulo}>Hidratação</p>
              <p className={s.aguaValor}>{c ? (c.consumo.aguaMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'} <small>/ {(metas.aguaMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</small></p>
              <div className={s.aguaBarra}><div style={{ width: `${c ? pct(c.consumo.aguaMl, metas.aguaMl) : 0}%` }} /></div>
              {ehHoje && (
                <div className={s.aguaAcoes}>
                  <button type="button" onClick={() => agua.mutate(-250)} disabled={agua.isPending || !c || c.consumo.aguaMl < 250} aria-label="Tirar um copo (250 ml)"><Minus size={14} aria-hidden /></button>
                  <button type="button" onClick={() => agua.mutate(250)} disabled={agua.isPending} className={s.aguaMais}><Plus size={14} aria-hidden /> 1 copo (250 ml)</button>
                </div>
              )}
            </div>
          </section>

          <section className={s.progresso} aria-labelledby="prog-titulo">
            <h2 id="prog-titulo" className={s.progressoTitulo}>Progresso da semana</h2>
            <p className={s.macrosSubClaro}>Adesão ao plano por dia</p>
            <ul className={s.adesao}>
              {dias.map((d) => {
                const lista = porDia(d);
                const pd2 = partes(d);
                const valor = lista.length === 0 ? null : d > hoje ? undefined : Math.round((lista.filter((r) => r.consumida).length / lista.length) * 100);
                return (
                  <li key={d}>
                    <span className={s.adesaoDia}>{DIAS_CURTOS[pd2.dia]} {pd2.d}</span>
                    <span className={s.adesaoBarra}><span style={{ width: `${valor ?? 0}%` }} /></span>
                    <span className={s.adesaoValor}>{valor === null ? 'livre' : valor === undefined ? '—' : `${valor}%`}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
      {dialogo}
    </div>
  );
}

function Refeicao({ r, situacao, onPedir }: { r: RefeicaoPlano; situacao: 'consumida' | 'agora' | 'passou' | 'futura'; onPedir: () => void }) {
  const m = r.prato.macros;
  return (
    <article className={`${s.refeicao} ${situacao === 'consumida' ? s.consumida : situacao === 'agora' ? s.atual : ''}`}>
      <div className={s.hora}>
        <IconeRefeicao tipo={r.tipo} />
        <p className={s.horaNum}>{r.horario?.slice(0, 5) ?? '—'}</p>
        <p className={s.horaRotulo}>{ROTULO_REFEICAO[r.tipo]}{situacao === 'agora' ? ' · agora' : ''}</p>
      </div>
      <div className={s.conteudo}>
        <p className={s.rest}><span className={s.restLogo} aria-hidden>{r.prato.restaurante.sigla}</span>{r.prato.restaurante.nome}</p>
        <h3 className={s.nome}><Link to={`/app/marmitas/${r.prato.id}`}>{r.prato.nome}</Link></h3>
        {r.observacao && <p className={s.nota}><strong>Anotação:</strong> {r.observacao}</p>}
        <p className={s.macrosPrato}>
          <span><span className={s.ponto} style={{ background: 'var(--kcal)' }} />{m.calorias} kcal</span>
          <span><span className={s.ponto} style={{ background: 'var(--prot)' }} />{um(m.proteinas)}g prot</span>
          <span><span className={s.ponto} style={{ background: 'var(--carb)' }} />{um(m.carboidratos)}g carb</span>
          <span><span className={s.ponto} style={{ background: 'var(--fat)' }} />{um(m.gorduras)}g gord</span>
        </p>
      </div>
      <div className={s.direita}>
        <span className={s.img}>{r.prato.imagemUrl && <img src={r.prato.imagemUrl} alt="" loading="lazy" />}</span>
        {situacao === 'consumida'
          ? <span className={`${s.acao} ${s.acaoConsumida}`}><Check size={12} aria-hidden /> Consumido</span>
          : <button type="button" className={`${s.acao} ${situacao === 'agora' ? s.acaoAgora : ''}`} onClick={onPedir}>{situacao === 'agora' ? 'Pedir agora' : 'Pedir'} <ArrowRight size={12} aria-hidden /></button>}
      </div>
    </article>
  );
}

function IconeRefeicao({ tipo }: { tipo: RefeicaoPlano['tipo'] }) {
  const Icone = tipo === 'CAFE_DA_MANHA' ? Sunrise : tipo === 'ALMOCO' ? Sun : tipo === 'JANTAR' ? Moon : Coffee;
  return <Icone size={18} className={s.horaIcone} aria-hidden />;
}
