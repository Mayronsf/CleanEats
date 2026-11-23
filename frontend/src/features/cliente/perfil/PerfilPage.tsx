import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowRight, BarChart3, Bell, Camera, ChevronRight, CircleHelp, CreditCard, Crown, Dumbbell, Flame, HeartPulse, Leaf,
  LogOut, MapPin, MessageCircle, Package, Pencil, Settings, ShieldCheck, Sprout, Star, Target, Trophy, User, UserCheck, Wheat, X, Zap, BadgeCheck,
} from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarNumero, iniciais } from '../../../lib/formato';
import { useAuth } from '../../../hooks/useAuth';
import { ErroApi } from '../../../services/api';
import { buscarTiers } from '../../../services/planos';
import {
  buscarAssinatura, buscarEstatisticasPerfil, buscarPerfil, enviarAvatar, enviarCapa, ROTULO_OBJETIVO, salvarPreferenciasNotificacao,
  type Conquista, type PerfilCliente,
} from '../../../services/cliente';
import { FaleConosco } from '../../suporte/FaleConosco';
import s from './PerfilPage.module.css';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const NOME_TIER = { FREE: 'Free', BASIC: 'Basic', PRO: 'Pro', PREMIUM: 'Premium' } as const;
const ICONE_CONQUISTA: Record<string, typeof Sprout> = { sprout: Sprout, zap: Zap, activity: Activity, star: Star, 'heart-pulse': HeartPulse, dumbbell: Dumbbell, target: Target, crown: Crown };
const ICONE_NUTRIENTE = [Flame, Activity, Wheat, Leaf];
const COR_NUTRIENTE = ['var(--kcal)', 'var(--prot)', 'var(--carb)', 'var(--fiber)'];
const UNIDADE = ['kcal', 'g', 'g', 'g'];
const PREFS: { chave: string; titulo: string; detalhe: string }[] = [
  { chave: 'pedido', titulo: 'Status dos pedidos', detalhe: 'Aceito, saiu para entrega, entregue' },
  { chave: 'cardapio', titulo: 'Novos cardápios', detalhe: 'Pratos novos dos seus restaurantes' },
  { chave: 'nutricionista', titulo: 'Recomendações da nutri', detalhe: 'Plano novo e mensagens' },
  { chave: 'assinatura', titulo: 'Assinatura e cobranças', detalhe: 'Pagamentos e renovação' },
  { chave: 'email', titulo: 'Também por e-mail', detalhe: 'Cópia dos avisos importantes' },
];
const um = (v: number | null | undefined) => formatarNumero(Math.round(Number(v ?? 0)));

/** Tela 21 — Meu perfil: identidade, estatísticas, metas da semana, conquistas, plano, nutri e ajustes da conta (CE-12/13/15). */
export default function PerfilPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { sair } = useAuth();
  const perfil = useQuery({ queryKey: ['cliente', 'perfil'], queryFn: buscarPerfil });
  const stats = useQuery({ queryKey: ['cliente', 'perfil', 'estatisticas'], queryFn: buscarEstatisticasPerfil });
  const assinatura = useQuery({ queryKey: ['cliente', 'assinatura'], queryFn: buscarAssinatura });
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: buscarTiers, staleTime: 5 * 60_000 });
  const [todasConquistas, setTodasConquistas] = useState(false);
  const [prefsAberto, setPrefsAberto] = useState(false);
  const [suporte, setSuporte] = useState(false);
  const entradaAvatar = useRef<HTMLInputElement>(null);
  const entradaCapa = useRef<HTMLInputElement>(null);

  const foto = useMutation({
    mutationFn: ({ arquivo, capa }: { arquivo: File; capa: boolean }) => (capa ? enviarCapa(arquivo) : enviarAvatar(arquivo)),
    onSuccess: (p, v) => {
      qc.setQueryData(['cliente', 'perfil'], p);
      void qc.invalidateQueries({ queryKey: ['usuario-atual'] });
      toast(v.capa ? 'Capa atualizada.' : 'Foto atualizada.', 'sucesso');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a imagem.', 'erro'),
  });
  const aoEscolher = (capa: boolean) => (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (arquivo) foto.mutate({ arquivo, capa });
  };

  if (perfil.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => perfil.refetch()} /></div>;
  if (!perfil.data) return <div className={s.pagina}><Skeleton altura={420} raio={32} /><div style={{ height: 24 }} /><Skeleton altura={520} raio={24} /></div>;

  const p = perfil.data;
  const desde = new Date(p.membroDesde);
  const a = assinatura.data;
  const tier = tiers.data?.find((t) => t.codigo === p.tier);
  const conquistas = stats.data?.conquistas ?? [];
  const obtidas = conquistas.filter((c) => c.obtida).length;
  const linhaFisica = [p.idade != null && `${p.idade} anos`, p.pesoKg != null && `${um(p.pesoKg)}kg`,
    p.alturaCm != null && `${(Number(p.alturaCm) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}m`].filter(Boolean).join(' · ');

  return (
    <div className={s.pagina}>
      <section className={s.capa} style={p.capaUrl ? { backgroundImage: `url(${p.capaUrl})` } : undefined} aria-label="Capa do perfil">
        <button type="button" className={s.alterarCapa} onClick={() => entradaCapa.current?.click()} disabled={foto.isPending}>
          <Camera size={16} aria-hidden /> {foto.isPending && foto.variables?.capa ? 'Enviando…' : 'Alterar capa'}
        </button>
        <input ref={entradaCapa} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={aoEscolher(true)} />
      </section>

      <section className={s.cartaoPerfil} aria-labelledby="perfil-nome">
        <div className={s.avatarCaixa}>
          {p.tier !== 'FREE' && <span className={s.seloTier}><Crown size={12} aria-hidden /> {NOME_TIER[p.tier]}</span>}
          <span className={s.avatar}>{p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : iniciais(p.nome)}</span>
          <button type="button" className={s.trocarFoto} onClick={() => entradaAvatar.current?.click()} disabled={foto.isPending} aria-label="Trocar foto de perfil">
            <Camera size={16} aria-hidden />
          </button>
          <input ref={entradaAvatar} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={aoEscolher(false)} />
        </div>
        <div className={s.identidade}>
          <h1 id="perfil-nome" className={s.nome}>{p.nome} <BadgeCheck size={22} className={s.verificado} aria-label="Conta verificada" /></h1>
          <p className={s.handle}>{p.username && <strong>@{p.username}</strong>}{p.username && ' · '}Membro desde {MESES[desde.getMonth()]}/{desde.getFullYear()}</p>
          <ul className={s.chips}>
            <li className={s.chipObjetivo}><Activity size={14} aria-hidden /> {ROTULO_OBJETIVO[p.objetivo]}</li>
            {p.cidade && <li className={s.chipLocal}><MapPin size={14} aria-hidden /> {p.cidade}</li>}
            {p.restricoes.slice(0, 2).map((r) => <li key={r.id} className={s.chipRestricao}><ShieldCheck size={14} aria-hidden /> {r.nome}</li>)}
          </ul>
          <p className={s.bio}>{linhaFisica}{linhaFisica && p.bio ? ' · ' : ''}{p.bio ?? (linhaFisica ? '' : 'Conte um pouco sobre você em Editar perfil.')}</p>
        </div>
        <div className={s.acoesPerfil}>
          <Link to="/app/perfil/editar" className={s.editar}><Pencil size={16} aria-hidden /> Editar perfil</Link>
          <button type="button" className={s.config} onClick={() => setPrefsAberto(true)}><Settings size={16} aria-hidden /> Configurações</button>
        </div>
      </section>

      <div className={s.grade}>
        <div className={s.coluna}>
          <section className={s.cartao} aria-labelledby="stats-titulo">
            <div className={s.cabeca}>
              <h2 id="stats-titulo" className={s.titulo}><BarChart3 size={18} aria-hidden /> Suas estatísticas</h2>
              <Link to="/app/pedidos" className={s.link}>Ver histórico <ArrowRight size={14} aria-hidden /></Link>
            </div>
            {stats.isError ? <ErroCarregamento onTentarNovamente={() => stats.refetch()} /> : !stats.data ? <Skeleton altura={124} raio={16} /> : (
              <ul className={s.stats}>
                <li><span className={`${s.statIcone} ${s.verde}`}><Package size={18} aria-hidden /></span><strong>{um(stats.data.pedidos)}</strong><small>Pedidos</small></li>
                <li><span className={`${s.statIcone} ${s.laranja}`}><Zap size={18} aria-hidden /></span><strong>{um(stats.data.calorias)}<em>kcal</em></strong><small>Consumido</small></li>
                <li><span className={`${s.statIcone} ${s.coral}`}><Activity size={18} aria-hidden /></span><strong>{um(stats.data.proteinas)}<em>g</em></strong><small>Proteína total</small></li>
                <li><span className={`${s.statIcone} ${s.azul}`}><Star size={18} aria-hidden /></span><strong>{um(stats.data.avaliacoes)}</strong><small>Avaliações dadas</small></li>
              </ul>
            )}
          </section>

          <section className={s.cartao} aria-labelledby="metas-titulo">
            <div className={s.cabeca}>
              <h2 id="metas-titulo" className={s.titulo}><Target size={18} aria-hidden /> Metas desta semana</h2>
              {stats.data && <span className={s.semana}>Semana de {Number(stats.data.semanaInicio.slice(8))} {MESES_CURTOS[Number(stats.data.semanaInicio.slice(5, 7)) - 1]}</span>}
            </div>
            {!stats.data ? <Skeleton altura={260} raio={16} /> : (
              <ul className={s.metas}>
                {stats.data.semana.map((n, i) => {
                  const Icone = ICONE_NUTRIENTE[i]!;
                  const pct = n.meta ? Math.min(100, Math.round((Number(n.consumido) / Number(n.meta)) * 100)) : 0;
                  const falta = n.meta ? Math.max(0, Number(n.meta) - Number(n.consumido)) : 0;
                  return (
                    <li key={n.nome}>
                      <span className={s.metaIcone} style={{ color: COR_NUTRIENTE[i] }} aria-hidden><Icone size={18} /></span>
                      <div className={s.metaInfo}>
                        <p><span>{n.nome}</span><span>{um(n.consumido)} / {n.meta ? um(n.meta) : '—'} {UNIDADE[i]}</span></p>
                        <span className={s.barra} role="progressbar" aria-label={n.nome} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <span style={{ width: `${pct}%`, background: COR_NUTRIENTE[i] }} />
                        </span>
                        <small>{Number(n.previstoRestante) > 0
                          ? <><strong>+{um(n.previstoRestante)}{UNIDADE[i] === 'g' ? 'g' : ' kcal'}</strong> previstos no plano nos próximos {stats.data!.diasRestantes} dias</>
                          : falta > 0 ? `Faltam ${um(falta)}${UNIDADE[i] === 'g' ? 'g' : ' kcal'} para a meta da semana` : 'Meta da semana batida'}</small>
                      </div>
                      <span className={s.metaPct}>{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={s.cartao} aria-labelledby="conquistas-titulo">
            <div className={s.cabeca}>
              <h2 id="conquistas-titulo" className={s.titulo}><Trophy size={18} aria-hidden /> Conquistas <span className={s.contagem}>{obtidas}/{conquistas.length}</span></h2>
              {conquistas.length > 0 && <button type="button" className={s.link} onClick={() => setTodasConquistas(!todasConquistas)} aria-expanded={todasConquistas}>
                {todasConquistas ? 'Ver menos' : `Ver progresso (${conquistas.length})`} <ArrowRight size={14} aria-hidden /></button>}
            </div>
            {!stats.data ? <Skeleton altura={260} raio={16} /> : (
              <ul className={s.conquistas}>{conquistas.map((c) => <CartaoConquista key={c.codigo} c={c} detalhe={todasConquistas} />)}</ul>
            )}
          </section>
        </div>

        <div className={s.coluna}>
          <section className={s.plano} aria-labelledby="plano-titulo">
            <span className={s.seloPlano}><Crown size={12} aria-hidden /> Seu plano atual</span>
            <h2 id="plano-titulo" className={s.planoNome}>Plano <span className="script">{NOME_TIER[p.tier]}</span></h2>
            <p className={s.planoPreco}>{a && a.tier !== 'FREE'
              ? `${formatarMoeda(a.ciclo === 'ANUAL' ? a.valor / 12 : a.valor)}/mês · ${a.status === 'CANCELADA' ? 'encerra' : 'renova'} em ${Math.max(0, Math.ceil((new Date(a.encerraEm ?? a.renovacaoEm ?? Date.now()).getTime() - Date.now()) / 86_400_000))} dias`
              : 'Gratuito · faça upgrade quando quiser'}</p>
            {tier && (
              <ul className={s.planoBeneficios}>
                {tier.nutricionistaDedicado && <li><UserCheck size={16} aria-hidden /> Nutricionista dedicado</li>}
                {tier.nutricionistaDedicado && <li><Leaf size={16} aria-hidden /> Plano alimentar semanal</li>}
                {tier.limiteNutribotDia !== 0 && <li><MessageCircle size={16} aria-hidden /> NutriBot {tier.limiteNutribotDia === -1 ? 'ilimitado' : `${tier.limiteNutribotDia}/dia`}</li>}
                {Number(tier.descontoPedido) > 0 && <li><Zap size={16} aria-hidden /> {Number(tier.descontoPedido)}% desconto em pedidos</li>}
                {tier.codigo === 'FREE' && <li><Package size={16} aria-hidden /> Marketplace completo</li>}
              </ul>
            )}
            <div className={s.planoAcoes}>
              <Link to="/app/assinatura" className={s.gerenciar}>Gerenciar</Link>
              {p.tier !== 'PREMIUM' && <Link to="/app/assinatura" className={s.upgrade}>Fazer upgrade</Link>}
            </div>
          </section>

          <section className={s.cartao} aria-labelledby="nutri-titulo">
            <h2 id="nutri-titulo" className={s.titulo}><UserCheck size={18} aria-hidden /> Sua nutri</h2>
            {p.nutricionista ? <>
              <div className={s.nutri}>
                <span className={s.nutriAvatar}>{p.nutricionista.avatarUrl ? <img src={p.nutricionista.avatarUrl} alt="" /> : iniciais(p.nutricionista.nome.replace(/^Dra?\.\s*/, ''))}<span className={s.online} /></span>
                <div><p className={s.nutriRotulo}>Nutricionista</p><p className={s.nutriNome}>{p.nutricionista.nome}</p><p className={s.nutriCrn}>{p.nutricionista.crn}</p></div>
              </div>
              <Link to="/app/nutribot" className={s.conversar}><MessageCircle size={16} aria-hidden /> Conversar com a nutri</Link>
            </> : <>
              <p className={s.semNutri}>No Pro e no Premium, uma nutricionista com CRN validado acompanha você e monta seu plano da semana.</p>
              <Link to="/app/assinatura" className={s.conversar}>Conhecer o plano Pro</Link>
            </>}
          </section>

          <section className={s.cartao} aria-labelledby="ajustes-titulo">
            <h2 id="ajustes-titulo" className={s.titulo}><Settings size={18} aria-hidden /> Conta e ajustes</h2>
            <ul className={s.ajustes}>
              <Ajuste icone={<User size={18} />} titulo="Dados pessoais" detalhe="Nome, contato, foto" para="/app/perfil/editar" />
              <Ajuste icone={<MapPin size={18} />} titulo="Endereços salvos" detalhe={`${p.totalEnderecos} ${p.totalEnderecos === 1 ? 'endereço cadastrado' : 'endereços cadastrados'}`} para="/app/perfil/editar#enderecos" />
              <Ajuste icone={<CreditCard size={18} />} titulo="Métodos de pagamento" detalhe={a?.formaPagamento === 'PIX' ? 'PIX na assinatura' : a?.formaPagamento === 'CARTAO' ? 'Cartão na assinatura' : 'PIX ou cartão (simulado)'} para="/app/assinatura" />
              <Ajuste icone={<Bell size={18} />} titulo="Notificações" detalhe="No app e por e-mail" onClick={() => setPrefsAberto(true)} />
              <Ajuste icone={<ShieldCheck size={18} />} titulo="Segurança e privacidade" detalhe="Senha, sessões, dados" para="/app/perfil/editar#seguranca" />
              <Ajuste icone={<CircleHelp size={18} />} titulo="Ajuda e suporte" detalhe="Fale com a equipe CleanEats" onClick={() => setSuporte(true)} />
              <Ajuste icone={<LogOut size={18} />} titulo="Sair da conta" detalhe="Você precisará entrar de novo" perigo
                onClick={async () => { await sair(); qc.clear(); navegar('/login'); }} />
            </ul>
          </section>
        </div>
      </div>

      <PreferenciasDialogo aberto={prefsAberto} perfil={p} onFechar={() => setPrefsAberto(false)}
        onSalvo={(prefs) => { qc.setQueryData<PerfilCliente>(['cliente', 'perfil'], (x) => (x ? { ...x, preferencias: prefs } : x)); toast('Preferências salvas.', 'sucesso'); setPrefsAberto(false); }} />
      <FaleConosco aberto={suporte} onFechar={() => setSuporte(false)} />
    </div>
  );
}

function CartaoConquista({ c, detalhe }: { c: Conquista; detalhe: boolean }) {
  const Icone = ICONE_CONQUISTA[c.icone] ?? Trophy;
  const pct = Math.round((c.progresso / c.alvo) * 100);
  return (
    <li className={`${s.conquista} ${c.obtida ? s.obtida : ''}`} title={c.obtida ? `Conquistada${c.obtidaEm ? ` em ${new Date(c.obtidaEm).toLocaleDateString('pt-BR')}` : ''}` : `${c.progresso} de ${c.alvo}`}>
      <span className={s.conquistaIcone} aria-hidden><Icone size={22} /></span>
      <p>{c.nome}</p>
      <small>{c.descricao}</small>
      {detalhe && !c.obtida && (
        <span className={s.conquistaBarra} role="progressbar" aria-label={`Progresso: ${c.nome}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></span>
      )}
      {detalhe && <small className={s.conquistaStatus}>{c.obtida ? `Conquistada${c.obtidaEm ? ` em ${new Date(c.obtidaEm).toLocaleDateString('pt-BR')}` : ''}` : `${formatarNumero(c.progresso)} de ${formatarNumero(c.alvo)}`}</small>}
      <span className="sr-only">{c.obtida ? 'Conquistada' : 'Bloqueada'}</span>
    </li>
  );
}

function Ajuste({ icone, titulo, detalhe, para, onClick, perigo }: { icone: React.ReactNode; titulo: string; detalhe: string; para?: string; onClick?: () => void; perigo?: boolean }) {
  const conteudo = <>
    <span className={s.ajusteIcone} aria-hidden>{icone}</span>
    <span className={s.ajusteTexto}><strong>{titulo}</strong><small>{detalhe}</small></span>
    <ChevronRight size={16} className={s.ajusteSeta} aria-hidden />
  </>;
  return <li className={perigo ? s.perigo : undefined}>{para ? <Link to={para} className={s.ajuste}>{conteudo}</Link> : <button type="button" className={s.ajuste} onClick={onClick}>{conteudo}</button>}</li>;
}

function PreferenciasDialogo({ aberto, perfil, onFechar, onSalvo }: { aberto: boolean; perfil: PerfilCliente; onFechar: () => void; onSalvo: (p: Record<string, boolean>) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (aberto) { setPrefs(Object.fromEntries(PREFS.map((x) => [x.chave, perfil.preferencias[x.chave] ?? true]))); ref.current?.showModal?.(); }
    else ref.current?.close?.();
  }, [aberto, perfil.preferencias]);
  const salvar = useMutation({
    mutationFn: () => salvarPreferenciasNotificacao(prefs), onSuccess: onSalvo,
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível salvar.', 'erro'),
  });
  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="prefs-titulo" onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <div className={s.dialogoTopo}>
        <h2 id="prefs-titulo">Notificações</h2>
        <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
      </div>
      <p className={s.dialogoSub}>Escolha o que chega no sino do app. Avisos de segurança da conta sempre chegam.</p>
      <ul className={s.prefs}>
        {PREFS.map((x) => (
          <li key={x.chave}>
            <label>
              <span><strong>{x.titulo}</strong><small>{x.detalhe}</small></span>
              <input type="checkbox" role="switch" className={s.switch} checked={prefs[x.chave] ?? true} onChange={(e) => setPrefs({ ...prefs, [x.chave]: e.target.checked })} />
            </label>
          </li>
        ))}
      </ul>
      <div className={s.dialogoAcoes}>
        <button type="button" className={s.config} onClick={onFechar}>Cancelar</button>
        <button type="button" className={s.editar} onClick={() => salvar.mutate()} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar preferências'}</button>
      </div>
    </dialog>
  );
}
