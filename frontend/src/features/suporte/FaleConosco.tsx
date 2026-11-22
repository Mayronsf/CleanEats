import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Botao, Campo, useToast } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { chamarApi, ErroApi } from '../../services/api';
import s from './FaleConosco.module.css';

/**
 * "Falar com suporte" / "Ajuda e suporte" (telas 04, 17, 18, 21). COMPARTILHADO — dono: sessão principal.
 * Grava em contato_suporte (POST /api/contatos-suporte); a fila aparece em /admin/suporte.
 */
export function FaleConosco({ aberto, onFechar, assuntoInicial = '' }: { aberto: boolean; onFechar: () => void; assuntoInicial?: string }) {
  const { usuario, sessao } = useAuth();
  const toast = useToast();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState(assuntoInicial);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) {
      setEmail(usuario?.email ?? sessao?.user.email ?? '');
      setAssunto(assuntoInicial);
      setMensagem('');
      setErro(undefined);
      d.showModal?.();
    }
    if (!aberto && d.open) d.close();
  }, [aberto, assuntoInicial, usuario, sessao]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !assunto.trim() || mensagem.trim().length < 5) {
      setErro('Preencha e-mail, assunto e uma mensagem com pelo menos 5 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      await chamarApi('/contatos-suporte', { method: 'POST', body: JSON.stringify({ email: email.trim(), assunto: assunto.trim(), mensagem: mensagem.trim() }) });
      toast('Mensagem enviada. Respondemos por e-mail em até 24h.');
      onFechar();
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <dialog ref={dialogo} className={s.dialogo} onClose={onFechar} aria-labelledby="fale-conosco-titulo">
      <form onSubmit={enviar} className={s.form} noValidate>
        <header className={s.cabeca}>
          <h2 id="fale-conosco-titulo">Fale com o <span className="script">suporte</span></h2>
          <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
        </header>
        {erro && <p className={s.erro} role="alert">{erro}</p>}
        <Campo rotulo="Seu e-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo rotulo="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: dúvida sobre meu pedido" />
        <label className={s.rotulo} htmlFor="fale-conosco-mensagem">Mensagem</label>
        <textarea id="fale-conosco-mensagem" className={s.texto} rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
          placeholder="Conte o que aconteceu. Se for sobre um pedido, informe o código (ex.: CE-4823)." maxLength={4000} />
        <div className={s.acoes}>
          <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" carregando={enviando}>Enviar mensagem</Botao>
        </div>
      </form>
    </dialog>
  );
}
