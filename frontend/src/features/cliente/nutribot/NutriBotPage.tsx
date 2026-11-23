import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, BarChart3, Bot, Brain, Lightbulb, MessageCircle, MessagesSquare, Mic, MicOff, Pencil, Send, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { Confirmacao, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarHora, formatarNumero, iniciais } from '../../../lib/formato';
import { useAuth } from '../../../hooks/useAuth';
import {
  buscarConversaNutriBot, buscarNutriBot, excluirConversaNutriBot, perguntarNutriBot, ROTULO_OBJETIVO, type EstadoNutriBot, type MensagemNutriBot,
} from '../../../services/cliente';
import { ConversaNutriDialog } from '../componentes/ConversaNutriDialog';
import s from './NutriBotPage.module.css';

const ICONE_SUGESTAO = [Lightbulb, BarChart3, Zap, Activity, Sparkles];
const NOME_TIER = { FREE: 'Free', BASIC: 'Basic', PRO: 'Pro', PREMIUM: 'Premium' } as const;
const um = (v: number | null | undefined) => formatarNumero(Math.round(Number(v ?? 0)));
type Msg = { id: string; autor: 'USUARIO' | 'BOT'; texto: string; criadoEm: string; transmitindo?: boolean };

/** Agrupa as conversas como na tela: Hoje, Esta semana, Este mês, Antes. */
function grupo(iso: string) {
  const d = new Date(iso); const h = new Date();
  const dias = Math.floor((new Date(h.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoje';
  if (dias < 7) return 'Esta semana';
  if (dias < 45) return 'Este mês';
  return 'Antes';
}
function quando(iso: string) {
  const d = new Date(iso); const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 60) return min <= 1 ? 'agora' : `há ${min} minutos`;
  if (min < 60 * 24) return `há ${Math.floor(min / 60)} ${Math.floor(min / 60) === 1 ? 'hora' : 'horas'}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ${formatarHora(iso)}`;
}

/** Texto do bot: parágrafos, listas com "- " e **negrito** (sem HTML vindo da IA). */
function Formatado({ texto }: { texto: string }) {
  const negrito = (linha: string) => linha.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
  return <>{texto.split(/\n{2,}/).map((b, i) => {
    const linhas = b.split('\n');
    if (linhas.every((l) => /^\s*[-•*]\s+/.test(l))) return <ul key={i}>{linhas.map((l, j) => <li key={j}>{negrito(l.replace(/^\s*[-•*]\s+/, ''))}</li>)}</ul>;
    return <p key={i}>{linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{negrito(l)}</Fragment>)}</p>;
  })}</>;
}

type Reconhecimento = {
  lang: string; interimResults: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
};

/** Tela 25 — NutriBot (CE-8 / CE-21): IA com o contexto real do dia (plano, consumo, metas, pedidos). Não prescreve. */
export default function NutriBotPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const [busca, setBusca] = useSearchParams();
  const estado = useQuery({ queryKey: ['cliente', 'nutribot'], queryFn: buscarNutriBot });
  const [idConversa, setIdConversa] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(true);
  const [excluir, setExcluir] = useState(false);
  const [nutriAberto, setNutriAberto] = useState(busca.get('nutri') === '1');
  const [ouvindo, setOuvindo] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const cancelar = useRef<AbortController | null>(null);
  const janela = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  const SR = janela.SpeechRecognition ?? janela.webkitSpeechRecognition;

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [mensagens]);
  useEffect(() => () => { cancelar.current?.abort(); reconhecimento.current?.stop(); }, []);

  const abrirConversa = async (id: string) => {
    if (enviando) return;
    setIdConversa(id);
    try { setMensagens(await buscarConversaNutriBot(id)); } catch { toast('Não foi possível abrir a conversa.', 'erro'); }
  };
  const novaConversa = () => { if (enviando) return; setIdConversa(null); setMensagens([]); entrada.current?.focus(); };
  const apagar = useMutation({
    mutationFn: () => excluirConversaNutriBot(idConversa!),
    onSuccess: () => { setExcluir(false); novaConversa(); void qc.invalidateQueries({ queryKey: ['cliente', 'nutribot'] }); toast('Conversa apagada.', 'sucesso'); },
    onError: () => toast('Não foi possível apagar a conversa.', 'erro'),
  });

  async function enviar(pergunta: string) {
    const t = pergunta.trim();
    if (!t || enviando) return;
    setTexto(''); setEnviando(true);
    const idEu = `eu-${Date.now()}`; const idBot = `bot-${Date.now()}`;
    setMensagens((m) => [...m, { id: idEu, autor: 'USUARIO', texto: t, criadoEm: new Date().toISOString() },
      { id: idBot, autor: 'BOT', texto: '', criadoEm: new Date().toISOString(), transmitindo: true }]);
    cancelar.current = new AbortController();
    await perguntarNutriBot(t, idConversa, {
      aoTexto: (trecho) => setMensagens((m) => m.map((x) => (x.id === idBot ? { ...x, texto: x.texto + trecho } : x))),
      aoFim: (conversa, msg: MensagemNutriBot) => {
        setIdConversa(conversa);
        setMensagens((m) => m.map((x) => (x.id === idBot ? { ...msg, transmitindo: false } : x)));
      },
      aoErro: (erro) => {
        setMensagens((m) => m.filter((x) => x.id !== idBot && x.id !== idEu));
        setTexto(t);
        toast(erro, 'erro');
      },
    }, cancelar.current.signal);
    setEnviando(false);
    void qc.invalidateQueries({ queryKey: ['cliente', 'nutribot'] });
  }

  function alternarMic() {
    if (!SR) return;
    if (ouvindo) { reconhecimento.current?.stop(); return; }
    const r = new SR();
    r.lang = 'pt-BR'; r.interimResults = false;
    r.onresult = (ev) => { const fala = Array.from(ev.results).map((x) => x[0]?.transcript ?? '').join(' '); setTexto((t) => (t ? `${t} ${fala}` : fala)); };
    r.onend = () => setOuvindo(false);
    r.onerror = () => { setOuvindo(false); toast('Não consegui ouvir. Verifique a permissão do microfone.', 'erro'); };
    reconhecimento.current = r; setOuvindo(true); r.start();
  }

  if (estado.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => estado.refetch()} /></div>;
  if (!estado.data) return <div className={s.pagina}><div className={s.grade}><Skeleton altura={600} raio={24} /><Skeleton altura={600} raio={24} /><Skeleton altura={600} raio={24} /></div></div>;

  const e: EstadoNutriBot = estado.data;
  const c = e.contexto;
  const primeiro = c.nome.split(' ')[0];
  const bloqueado = !e.limite.disponivel;
  const grupos = e.conversas.reduce<Record<string, typeof e.conversas>>((acc, conv) => { (acc[grupo(conv.atualizadaEm)] ??= []).push(conv); return acc; }, {});
  const nutriCurta = c.nutricionista?.replace(/^(Dra?\.\s*\S+).*/, '$1');

  return (
    <div className={s.pagina}>
      <div className={s.grade}>
        <aside className={s.conversas} aria-label="Conversas">
          <h2 className={s.tituloLateral}><MessagesSquare size={20} aria-hidden /> Conversas</h2>
          <button type="button" className={s.nova} onClick={novaConversa}><Pencil size={16} aria-hidden /> Nova conversa</button>
          <div className={s.lista}>
            {e.conversas.length === 0 && <p className={s.semConversas}>Suas conversas com o NutriBot aparecem aqui.</p>}
            {Object.entries(grupos).map(([nome, lista]) => (
              <section key={nome}>
                <h3 className={s.grupo}>{nome}</h3>
                {lista.map((conv) => (
                  <button key={conv.id} type="button" className={`${s.conversa} ${conv.id === idConversa ? s.conversaAtiva : ''}`} onClick={() => abrirConversa(conv.id)}
                    aria-current={conv.id === idConversa ? 'true' : undefined}>
                    <strong>{conv.titulo}</strong>{conv.previa && <span>{conv.previa}</span>}<small>{quando(conv.atualizadaEm)}</small>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>

        <section className={s.chat} aria-label="Conversa com o NutriBot">
          <header className={s.chatTopo}>
            <span className={s.botAvatar} aria-hidden><Bot size={24} /><i /></span>
            <div className={s.botInfo}><h1>NutriBot <span className={s.seloIa}><Sparkles size={12} aria-hidden /> IA</span></h1><p><i aria-hidden /> Online · contextualizado pro seu plano</p></div>
            <button type="button" className={s.icone} onClick={() => setExcluir(true)} disabled={!idConversa || enviando} aria-label="Apagar esta conversa"><Trash2 size={18} aria-hidden /></button>
          </header>
          {aviso && (
            <div className={s.aviso} role="note">
              <AlertTriangle size={18} aria-hidden />
              <p><strong>NutriBot é um assistente de IA</strong> que apoia decisões alimentares, mas <strong>não substitui sua nutricionista</strong>. Para orientações específicas, prescrições e ajustes no plano, fale com {c.nutricionista
                ? <button type="button" className={s.linkNutri} onClick={() => setNutriAberto(true)}>{c.nutricionista}</button> : 'uma nutricionista (planos Pro e Premium)'}.</p>
              <button type="button" className={s.fecharAviso} onClick={() => setAviso(false)} aria-label="Fechar aviso"><X size={16} aria-hidden /></button>
            </div>
          )}

          <div className={s.mensagens} aria-live="polite">
            <p className={s.divisor}><span>{mensagens.length ? 'Conversa' : `Hoje · ${formatarHora(new Date())}`}</span></p>
            <Balao autor="BOT">
              <p>Oi, {primeiro}! Sou o <strong>NutriBot</strong>, seu assistente inteligente.</p>
              <p>Eu tenho acesso {c.refeicoesHoje.length ? <>ao seu plano alimentar{nutriCurta ? <> montado pela {nutriCurta}</> : null}, </> : null}aos seus pedidos do dia e às suas metas de macros. Pode me perguntar coisas como <em>"posso comer X agora?"</em> ou <em>"tô com fome, o que comer?"</em>.</p>
            </Balao>
            {mensagens.map((m) => (
              <Balao key={m.id} autor={m.autor} hora={m.transmitindo ? undefined : m.criadoEm} iniciais={iniciais(usuario?.nome ?? c.nome)}>
                {m.autor === 'BOT' && m.transmitindo && !m.texto ? <span className={s.analisando}><BarChart3 size={14} aria-hidden /> Analisando seu dia…</span>
                  : m.autor === 'BOT' ? <Formatado texto={m.texto} /> : <p>{m.texto}</p>}
                {m.autor === 'BOT' && m.transmitindo && m.texto && <span className={s.cursor} aria-hidden />}
              </Balao>
            ))}
            <div ref={fim} />
          </div>

          {bloqueado ? (
            <div className={s.bloqueio}>
              <Brain size={22} aria-hidden />
              <p>{e.limite.motivo}</p>
              <Link to="/app/assinatura" className={s.botaoBloqueio}>{c.tier === 'FREE' ? 'Assinar um plano' : 'Fazer upgrade'}</Link>
            </div>
          ) : <>
            <div className={s.chips} aria-label="Perguntas prontas">
              {e.sugestoes.map((sug, i) => {
                const Icone = ICONE_SUGESTAO[i % ICONE_SUGESTAO.length]!;
                return <button key={sug} type="button" onClick={() => enviar(sug)} disabled={enviando}><Icone size={14} aria-hidden /> {sug}</button>;
              })}
            </div>
            <form className={s.envio} onSubmit={(ev) => { ev.preventDefault(); void enviar(texto); }}>
              <label htmlFor="pergunta" className="sr-only">Pergunte ao NutriBot</label>
              <textarea id="pergunta" ref={entrada} rows={1} maxLength={1000} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Pergunte ao NutriBot sobre sua alimentação…"
                onKeyDown={(ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); void enviar(texto); } }} />
              {SR && <button type="button" className={`${s.mic} ${ouvindo ? s.micAtivo : ''}`} onClick={alternarMic} aria-pressed={ouvindo} aria-label={ouvindo ? 'Parar de ouvir' : 'Falar a pergunta'}>
                {ouvindo ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}</button>}
              <button type="submit" className={s.enviar} disabled={!texto.trim() || enviando} aria-label="Enviar pergunta"><Send size={18} aria-hidden /></button>
            </form>
            {e.limite.porDia > 0 && <p className={s.limite}>{e.limite.usadasHoje} de {e.limite.porDia} perguntas hoje no plano Basic</p>}
          </>}
        </section>

        <aside className={s.lateral}>
          <section className={s.cartao} aria-labelledby="ctx-titulo">
            <h2 id="ctx-titulo" className={s.tituloLateral}><Brain size={18} aria-hidden /> Contexto do bot</h2>
            <p className={s.subLateral}>O que o NutriBot sabe sobre você</p>
            <dl className={s.contexto}>
              <div><dt>Plano ativo</dt><dd>{NOME_TIER[c.tier]}</dd></div>
              <div><dt>Objetivo</dt><dd>{ROTULO_OBJETIVO[c.objetivo]}</dd></div>
              <div><dt>Meta diária</dt><dd>{um(c.metas.calorias)} kcal</dd></div>
              <div><dt>Proteína</dt><dd>{um(c.metas.proteinas)}g/dia</dd></div>
              <div className={s.separador}><dt>Consumido hoje</dt><dd>{um(c.consumo.calorias)} kcal</dd></div>
              <div><dt>Restam hoje</dt><dd>{um(c.caloriasRestantes)} kcal · {um(c.proteinaRestante)}g prot</dd></div>
              <div><dt>Restrições</dt><dd>{c.restricoes.length ? c.restricoes.join(', ') : 'Nenhuma'}</dd></div>
              <div><dt>Pedidos hoje</dt><dd>{c.pedidosHoje.length}</dd></div>
              <div><dt>Próxima refeição</dt><dd>{c.proximaRefeicao ? c.proximaRefeicao.split(' · ')[0] : '—'}</dd></div>
            </dl>
          </section>
          <section className={s.humano} aria-labelledby="humano-titulo">
            <span className={s.humanoAvatar} aria-hidden>{c.nutricionista ? iniciais(c.nutricionista.replace(/^Dra?\.\s*/, '')) : <MessageCircle size={22} />}</span>
            <h2 id="humano-titulo">Precisa de orientação humana?</h2>
            {c.nutricionista ? <>
              <p className={s.humanoNome}>{c.nutricionista}</p>
              <p>Pra ajustar metas, mudar dietas ou tirar dúvidas clínicas, fale direto com sua nutri.</p>
              <button type="button" className={s.humanoBotao} onClick={() => setNutriAberto(true)}><MessageCircle size={16} aria-hidden /> Conversar com a nutri</button>
            </> : <>
              <p>No Pro e no Premium uma nutricionista acompanha você e monta seu plano da semana.</p>
              <Link to="/app/assinatura" className={s.humanoBotao}>Conhecer o plano Pro</Link>
            </>}
          </section>
        </aside>
      </div>

      <Confirmacao aberto={excluir} perigo titulo="Apagar esta conversa?" rotuloConfirmar="Apagar" carregando={apagar.isPending}
        onCancelar={() => setExcluir(false)} onConfirmar={() => apagar.mutate()}>
        As mensagens desta conversa com o NutriBot serão apagadas. Seu plano e seus pedidos não mudam.
      </Confirmacao>
      <ConversaNutriDialog aberto={nutriAberto} onFechar={() => { setNutriAberto(false); if (busca.get('nutri')) setBusca({}, { replace: true }); }} />
    </div>
  );
}

function Balao({ autor, hora, iniciais: ini, children }: { autor: 'USUARIO' | 'BOT'; hora?: string; iniciais?: string; children: ReactNode }) {
  return (
    <div className={`${s.linha} ${autor === 'USUARIO' ? s.linhaEu : ''}`}>
      {autor === 'BOT' && <span className={s.miniBot} aria-hidden><Bot size={18} /></span>}
      <div className={s.blocoMsg}>
        <div className={`${s.balao} ${autor === 'USUARIO' ? s.balaoEu : s.balaoBot}`}>{children}</div>
        {hora && <small className={s.hora}>{formatarHora(hora)}</small>}
      </div>
      {autor === 'USUARIO' && <span className={s.miniEu} aria-hidden>{ini}</span>}
    </div>
  );
}
