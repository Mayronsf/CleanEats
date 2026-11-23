import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, MessageCircle, Paperclip, Phone, Search, Send } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { useAuth } from '../../../hooks/useAuth';
import { useRealtime } from '../../../hooks/useRealtime';
import { formatarHora, iniciais } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import {
  abrirConversaNutri, buscarMensagensNutri, enviarMensagemNutri, listarConversasNutri,
  type ConversaNutriAberta, type ConversaNutriLinha,
} from '../../../services/nutri/mensagens';
import s from './MensagensPage.module.css';

const rotuloTier = { FREE: 'Free', BASIC: 'Basic', PRO: 'Pro', PREMIUM: 'Premium' } as const;

function horarioLista(iso: string | null) {
  if (!iso) return '';
  const data = new Date(iso);
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString()) return formatarHora(iso);
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Tela 33: conversas diretas entre a nutricionista e os clientes vinculados. */
export default function MensagensPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const idClienteParam = params.get('cliente');
  const [busca, setBusca] = useState('');
  const [idAtiva, setIdAtiva] = useState<string | null>(null);
  const [conversaAberta, setConversaAberta] = useState<ConversaNutriAberta | null>(null);
  const [texto, setTexto] = useState('');
  const fim = useRef<HTMLDivElement>(null);
  const processado = useRef<string | null>(null);

  // Realtime acelera a atualização; o polling de 5 s cobre sessões em que a RLS impede SELECT no canal.
  const lista = useQuery({
    queryKey: ['nutri', 'mensagens', 'conversas', busca],
    queryFn: () => listarConversasNutri(busca),
    refetchInterval: 5000,
  });

  const abrir = useMutation({
    mutationFn: abrirConversaNutri,
    onSuccess: (conversa) => {
      setConversaAberta(conversa);
      setIdAtiva(conversa.idConversa);
      void qc.invalidateQueries({ queryKey: ['nutri', 'mensagens', 'conversas'] });
    },
    onError: (erro) => {
      toast(erro instanceof ErroApi ? erro.message : 'Não foi possível abrir a conversa.', 'erro');
      processado.current = null;
    },
  });

  useEffect(() => {
    if (idClienteParam && idClienteParam !== processado.current) {
      processado.current = idClienteParam;
      abrir.mutate(idClienteParam);
    }
  }, [idClienteParam]);

  const selecionadaNaLista = lista.data?.find((c) => c.idConversa === idAtiva);
  const selecionada = useMemo<ConversaNutriLinha | ConversaNutriAberta | null>(() => {
    if (selecionadaNaLista) return selecionadaNaLista;
    return conversaAberta?.idConversa === idAtiva ? conversaAberta : null;
  }, [selecionadaNaLista, conversaAberta, idAtiva]);

  const mensagens = useQuery({
    queryKey: ['nutri', 'mensagens', 'conversa', idAtiva],
    queryFn: () => buscarMensagensNutri(idAtiva!),
    enabled: Boolean(idAtiva),
    refetchInterval: idAtiva ? 5000 : false,
  });

  useRealtime('mensagem', idAtiva ? `id_conversa=eq.${idAtiva}` : undefined, () => {
    if (!idAtiva) return;
    void qc.invalidateQueries({ queryKey: ['nutri', 'mensagens', 'conversa', idAtiva] });
    void qc.invalidateQueries({ queryKey: ['nutri', 'mensagens', 'conversas'] });
  }, '*', Boolean(idAtiva));

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [mensagens.data?.length]);

  const enviar = useMutation({
    mutationFn: () => enviarMensagemNutri(idAtiva!, texto),
    onSuccess: (mensagem) => {
      qc.setQueryData(['nutri', 'mensagens', 'conversa', idAtiva], (atuais: typeof mensagens.data = []) => [...atuais, mensagem]);
      setTexto('');
      void qc.invalidateQueries({ queryKey: ['nutri', 'mensagens', 'conversas'] });
    },
    onError: (erro) => toast(erro instanceof ErroApi ? erro.message : 'Não foi possível enviar a mensagem.', 'erro'),
  });

  const abrirDaLista = (conversa: ConversaNutriLinha) => {
    setIdAtiva(conversa.idConversa);
    setConversaAberta(null);
    setTexto('');
  };

  if (lista.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => lista.refetch()} /></div>;

  return (
    <div className={s.pagina}>
      <header className={s.topoPagina}>
        <div><h1>Mensagens</h1><p>Converse com seus clientes em tempo real</p></div>
      </header>

      <section className={s.chat} aria-label="Mensagens com clientes">
        <aside className={s.listaConversas} aria-label="Conversas">
          <label className={s.busca}>
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar clientes</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar clientes..." />
          </label>
          <div className={s.itens}>
            {!lista.data ? <div className={s.skeletonLista}><Skeleton altura={72} /><Skeleton altura={72} /><Skeleton altura={72} /></div>
              : lista.data.length === 0 ? <EmptyState titulo="Nenhuma conversa encontrada" descricao={busca ? 'Tente buscar por outro nome.' : 'As conversas dos seus clientes aparecerão aqui.'} compacto />
                : lista.data.map((conversa) => (
                  <button key={conversa.idConversa} type="button" className={`${s.itemConversa} ${idAtiva === conversa.idConversa ? s.ativa : ''}`}
                    onClick={() => abrirDaLista(conversa)} aria-current={idAtiva === conversa.idConversa ? 'true' : undefined}>
                    <span className={s.avatarLista} aria-hidden="true">{conversa.avatarUrl ? <img src={conversa.avatarUrl} alt="" /> : iniciais(conversa.nome)}</span>
                    <span className={s.conteudoItem}>
                      <span className={s.cabecalhoItem}><strong>{conversa.nome}</strong><time>{horarioLista(conversa.ultimaMensagemEm)}</time></span>
                      <span className={s.previa}>{conversa.ultimaMensagem ?? 'Conversa iniciada'}</span>
                    </span>
                    {conversa.naoLidas > 0 && <span className={s.naoLidas} aria-label={`${conversa.naoLidas} mensagens não lidas`} />}
                  </button>
                ))}
          </div>
        </aside>

        <section className={s.areaChat} aria-label={selecionada ? `Conversa com ${selecionada.nome}` : 'Conversa'}>
          {selecionada ? <>
            <header className={s.cabecalhoChat}>
              <span className={s.avatarCliente} aria-hidden="true">{selecionada.avatarUrl ? <img src={selecionada.avatarUrl} alt="" /> : iniciais(selecionada.nome)}</span>
              <div className={s.dadosCliente}><h2>{selecionada.nome}</h2><p>Plano {rotuloTier[selecionada.tier]}</p></div>
              <div className={s.acoesChat}>
                <button type="button" className={s.acao} aria-label="Informações sobre o plano" title="Informações sobre o plano"
                  onClick={() => toast(`Cliente no plano ${rotuloTier[selecionada.tier]}. O limite semanal se aplica às mensagens enviadas pelo cliente.`, 'info')}><Info size={18} /></button>
                <button type="button" className={s.acao} aria-label="Chamadas indisponíveis" title="Chamadas indisponíveis" disabled><Phone size={18} /></button>
              </div>
            </header>
            <div className={s.mensagens} aria-live="polite" aria-busy={mensagens.isFetching && !mensagens.data}>
              {mensagens.isError ? <ErroCarregamento onTentarNovamente={() => mensagens.refetch()} />
                : !mensagens.data ? <div className={s.skeletonMensagens}><Skeleton altura={48} largura="65%" /><Skeleton altura={70} largura="65%" /><Skeleton altura={52} largura="65%" /></div>
                  : mensagens.data.length === 0 ? <EmptyState titulo="Comece a conversa" descricao="Envie uma mensagem para este cliente." icone={<MessageCircle size={24} />} />
                    : mensagens.data.map((mensagem) => {
                      const minha = mensagem.idAutor === usuario?.id;
                      return <article key={mensagem.id} className={`${s.linhaMensagem} ${minha ? s.minha : ''}`}>
                        <span className={s.avatarMensagem} aria-hidden="true">{minha ? iniciais(usuario?.nome ?? '') : iniciais(selecionada.nome)}</span>
                        <div className={s.blocoMensagem}><p className={s.balao}>{mensagem.texto}</p><time>{formatarHora(mensagem.criadoEm)}</time></div>
                      </article>;
                    })}
              <div ref={fim} />
            </div>
            <form className={s.envio} onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !enviar.isPending) enviar.mutate(); }}>
              <div className={s.campoEnvio}>
                <button type="button" className={s.anexo} title="Anexos indisponíveis" aria-label="Anexos indisponíveis" disabled><Paperclip size={19} /></button>
                <label className="sr-only" htmlFor="mensagem-nutri">Escreva sua mensagem</label>
                <textarea id="mensagem-nutri" rows={1} maxLength={4000} value={texto} placeholder="Escreva sua mensagem..."
                  onChange={(e) => setTexto(e.target.value)} disabled={enviar.isPending}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim() && !enviar.isPending) enviar.mutate(); } }} />
              </div>
              <button type="submit" className={s.enviar} aria-label="Enviar mensagem" disabled={!texto.trim() || enviar.isPending}><Send size={19} aria-hidden="true" /></button>
            </form>
          </> : idClienteParam && abrir.isPending ? <div className={s.carregandoAbertura}><Skeleton altura={60} /><Skeleton altura={320} /><Skeleton altura={62} /></div>
            : <EmptyState titulo="Selecione uma conversa" descricao="Escolha um cliente na lista para ver as mensagens." icone={<MessageCircle size={26} />} />}
        </section>
      </section>
    </div>
  );
}
