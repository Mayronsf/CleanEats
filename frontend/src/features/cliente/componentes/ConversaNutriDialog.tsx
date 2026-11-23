import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, X } from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarHora, iniciais } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarConversaNutri, enviarMensagemNutri } from '../../../services/cliente';
import s from './ConversaNutriDialog.module.css';

/** Chat do cliente com a nutricionista vinculada ("Conversar com a nutri"). A nutri responde pela tela 33. */
export function ConversaNutriDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const conversa = useQuery({ queryKey: ['cliente', 'conversa-nutri'], queryFn: buscarConversaNutri, enabled: aberto, retry: false, refetchInterval: aberto ? 10_000 : false });
  const enviar = useMutation({
    mutationFn: () => enviarMensagemNutri(texto),
    onSuccess: (c) => { qc.setQueryData(['cliente', 'conversa-nutri'], c); setTexto(''); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a mensagem.', 'erro'),
  });

  useEffect(() => { if (aberto) ref.current?.showModal?.(); else ref.current?.close?.(); }, [aberto]);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [conversa.data?.mensagens.length]);

  const semNutri = conversa.error instanceof ErroApi && conversa.error.status === 422;
  const n = conversa.data?.nutricionista;

  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="nutri-chat-titulo" onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <header className={s.topo}>
        <span className={s.avatar} aria-hidden>{n?.avatarUrl ? <img src={n.avatarUrl} alt="" /> : n ? iniciais(n.nome.replace(/^Dra?\.\s*/, '')) : '…'}</span>
        <div className={s.titulo}><h2 id="nutri-chat-titulo">{n?.nome ?? 'Sua nutricionista'}</h2>{n && <p>{n.crn} · responde em até 1 dia útil</p>}</div>
        <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
      </header>
      <div className={s.corpo}>
        {semNutri ? (
          <div className={s.vazio}><p>{(conversa.error as ErroApi).message}</p><Link to="/app/assinatura" className={s.cta} onClick={onFechar}>Conhecer o plano Pro</Link></div>
        ) : conversa.isError ? <ErroCarregamento onTentarNovamente={() => conversa.refetch()} />
          : !conversa.data ? <Skeleton altura={200} raio={16} />
            : conversa.data.mensagens.length === 0 ? <p className={s.vazio}>Mande sua dúvida: ajustes no plano, metas, sintomas ou o que precisar. A nutri responde por aqui e você recebe uma notificação.</p>
              : conversa.data.mensagens.map((m) => (
                <div key={m.id} className={`${s.msg} ${m.minha ? s.minha : ''}`}>
                  <p>{m.texto}</p><small>{formatarHora(m.criadoEm)}{m.minha && m.lidaEm ? ' · lida' : ''}</small>
                </div>
              ))}
        <div ref={fim} />
      </div>
      {!semNutri && (
        <form className={s.envio} onSubmit={(e) => { e.preventDefault(); if (texto.trim()) enviar.mutate(); }}>
          <label htmlFor="msg-nutri" className="sr-only">Mensagem para a nutricionista</label>
          <textarea id="msg-nutri" rows={2} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva para sua nutri…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) enviar.mutate(); } }} />
          <button type="submit" disabled={!texto.trim() || enviar.isPending} aria-label="Enviar mensagem"><Send size={18} aria-hidden /></button>
        </form>
      )}
    </dialog>
  );
}
