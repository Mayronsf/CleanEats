import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Leaf, Send, ShieldAlert, X } from 'lucide-react';
import { formatarHora, iniciais } from '../../lib/formato';
import s from './Chat.module.css';

export interface Mensagem {
  id: string;
  autor: 'usuario' | 'outro';
  texto: string;
  em: string;
  contexto?: string;
}

/** Lista de mensagens (NutriBot e chat nutri ↔ cliente). */
export function ChatThread({ mensagens, nomeUsuario, avatarOutro, digitando = false }: {
  mensagens: Mensagem[]; nomeUsuario: string; avatarOutro?: ReactNode; digitando?: boolean;
}) {
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView?.({ block: 'end' }); }, [mensagens.length, digitando]);
  return (
    <div className={s.thread} role="log" aria-live="polite" aria-label="Mensagens">
      {mensagens.map((m) => (
        <div key={m.id} className={`${s.msg} ${m.autor === 'usuario' ? s.doUsuario : ''}`}>
          <span className={s.avatar} aria-hidden>{m.autor === 'usuario' ? iniciais(nomeUsuario) : (avatarOutro ?? <Leaf size={18} />)}</span>
          <div>
            <div className={s.balao}>
              {m.contexto && <span className={s.contexto}>{m.contexto}</span>}
              {m.texto.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <p className={s.hora}>{formatarHora(m.em)}</p>
          </div>
        </div>
      ))}
      {digitando && (
        <div className={s.msg}>
          <span className={s.avatar} aria-hidden>{avatarOutro ?? <Leaf size={18} />}</span>
          <div className={`${s.balao} ${s.digitando}`} aria-label="Digitando"><span /><span /><span /></div>
        </div>
      )}
      <div ref={fim} />
    </div>
  );
}

/** Painel completo do NutriBot: cabeçalho, aviso legal obrigatório, conversa e campo de envio. */
export function ChatbotPanel({ mensagens, nomeUsuario, onEnviar, enviando = false, limiteRestante, bloqueado }: {
  mensagens: Mensagem[]; nomeUsuario: string; onEnviar: (texto: string) => void; enviando?: boolean;
  limiteRestante?: number | null; bloqueado?: string;
}) {
  const [texto, setTexto] = useState('');
  const [avisoAberto, setAvisoAberto] = useState(true);
  const enviar = () => {
    const t = texto.trim();
    if (!t || enviando || bloqueado) return;
    onEnviar(t);
    setTexto('');
  };
  return (
    <section className={s.painel} aria-label="NutriBot">
      <header className={s.cabeca}>
        <span className={s.bot} aria-hidden><Leaf size={24} /><span className={s.botPonto} /></span>
        <div className={s.cabecaInfo}>
          <h2 className={s.cabecaNome}>NutriBot <span className={s.ia}>IA</span></h2>
          <p className={s.cabecaStatus}>Online · conhece seu plano e seu dia</p>
        </div>
        {limiteRestante !== undefined && limiteRestante !== null && (
          <span className={s.limite}>{limiteRestante} {limiteRestante === 1 ? 'dúvida restante' : 'dúvidas restantes'} hoje</span>
        )}
      </header>
      {avisoAberto && (
        <div className={s.aviso} role="note">
          <span className={s.avisoIcone} aria-hidden><ShieldAlert size={14} /></span>
          <p className={s.avisoTexto}>
            <strong>O NutriBot não substitui sua nutricionista.</strong> Ele orienta com base no seu plano, mas não prescreve nem monta dietas. Ajustes oficiais são feitos pela sua nutri.
          </p>
          <button type="button" className={s.avisoFechar} onClick={() => setAvisoAberto(false)} aria-label="Fechar aviso"><X size={16} aria-hidden /></button>
        </div>
      )}
      <ChatThread mensagens={mensagens} nomeUsuario={nomeUsuario} digitando={enviando} />
      <form className={s.entrada} onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        {bloqueado && <p className={s.bloqueado} role="status">{bloqueado}</p>}
        <div className={s.entradaLinha}>
          <label htmlFor="nutribot-msg" className="sr-only">Mensagem para o NutriBot</label>
          <textarea
            id="nutribot-msg"
            rows={1}
            value={texto}
            placeholder="Pergunte sobre seu plano, macros ou um prato..."
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            disabled={!!bloqueado}
          />
          <button type="submit" className={s.enviar} disabled={!texto.trim() || enviando || !!bloqueado} aria-label="Enviar mensagem">
            <Send size={18} aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
