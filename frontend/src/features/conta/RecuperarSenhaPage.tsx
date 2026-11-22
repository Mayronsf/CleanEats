import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Bell, CircleCheck, Clock, KeyRound, Lightbulb, LifeBuoy, Lock, MailCheck, MailQuestion, Send, ShieldCheck,
  ShieldX, type LucideIcon,
} from 'lucide-react';
import { Botao, Campo, CampoSenha, useToast } from '../../design-system';
import { ErroApi } from '../../services/api';
import { definirNovaSenha, enviarCodigoRecuperacao, forcaSenha, validarCodigoRecuperacao } from '../../services/conta';
import { supabase, supabaseConfigurado } from '../../services/supabase';
import { FolhasDecorativas, LayoutAutenticacao, TituloAutenticacao } from './componentes/LayoutAutenticacao';
import { MedidorSenha } from './componentes/MedidorSenha';
import s from './RecuperarSenhaPage.module.css';

type Estado = 1 | 2 | 3;
const ESPERA_REENVIO = 60;

/** Tela 08 — Recuperar senha em 3 estados: e-mail → código de 6 dígitos (15 min) → nova senha. */
export default function RecuperarSenhaPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const emailInicial = (useLocation().state as { email?: string } | null)?.email ?? '';
  const [estado, setEstado] = useState<Estado>(1);
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState<string[]>(Array(6).fill(''));
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string>();
  const [carregando, setCarregando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErro('Informe o e-mail cadastrado.'); return; }
    setErro(undefined);
    setCarregando(true);
    try {
      await enviarCodigoRecuperacao(email.trim());
      setCodigo(Array(6).fill(''));
      setEspera(ESPERA_REENVIO);
      setEstado(2);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar o código.');
    } finally { setCarregando(false); }
  }

  async function verificar(e: FormEvent) {
    e.preventDefault();
    const token = codigo.join('');
    if (token.length !== 6) { setErro('Digite os 6 dígitos do código.'); return; }
    setErro(undefined);
    setCarregando(true);
    try { await validarCodigoRecuperacao(email.trim(), token); setEstado(3); }
    catch (err) { setErro(err instanceof ErroApi ? err.message : 'Código inválido.'); }
    finally { setCarregando(false); }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (forcaSenha(senha) < 4) { setErro('A nova senha precisa atender aos 4 requisitos.'); return; }
    if (senha !== confirmacao) { setErro('As senhas não conferem.'); return; }
    setErro(undefined);
    setCarregando(true);
    try {
      await definirNovaSenha(senha);
      await supabase.auth.signOut();
      toast('Senha alterada. Entre com a nova senha.');
      navegar('/login', { replace: true, state: { email } });
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível salvar a nova senha.');
    } finally { setCarregando(false); }
  }

  const voltar = estado === 1 ? { para: '/login', rotulo: 'Voltar ao login' }
    : estado === 2 ? { aoClicar: () => { setEstado(1); setErro(undefined); }, rotulo: 'Trocar email' }
    : { aoClicar: () => { setEstado(2); setErro(undefined); }, rotulo: 'Voltar' };

  return (
    <LayoutAutenticacao voltar={voltar} visual={<Visual estado={estado} />}
      antesDoConteudo={
        <div className={s.etapas} role="progressbar" aria-label="Etapa da recuperação" aria-valuemin={1} aria-valuemax={3} aria-valuenow={estado}>
          {[1, 2, 3].map((n) => <span key={n} className={n <= estado ? s.etapaFeita : undefined} />)}
        </div>
      }>
      {estado === 1 && (
        <form onSubmit={enviar} noValidate key="e1">
          <p className={s.selo}><span>1</span> Recuperar acesso</p>
          <TituloAutenticacao antes="Esqueceu sua" destaque="senha?" subtitulo="Sem estresse. Informe o email cadastrado e vamos enviar um código de 6 dígitos para você redefinir." />
          <Campo rotulo="Email cadastrado *" type="email" autoComplete="email" placeholder="seu@email.com" autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} dica="Vamos enviar um código de 6 dígitos pra esse email." />
          <Botao type="submit" tamanho="lg" larguraTotal carregando={carregando} disabled={!supabaseConfigurado} iconeDireita={<ArrowRight size={18} aria-hidden />}>Enviar código</Botao>
          <Link to="/login" className={s.secundario}>Já lembrei, voltar ao login</Link>
          <p className={s.rodapeForm}>Não tem conta ainda? <Link to="/cadastro">Criar conta grátis</Link></p>
        </form>
      )}

      {estado === 2 && (
        <form onSubmit={verificar} noValidate key="e2">
          <p className={s.selo}><span>2</span> Confirmar código</p>
          <TituloAutenticacao antes="Digite o" destaque="código" subtitulo={<>Enviamos um código de 6 dígitos para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.</>} />
          <div className={s.enviado} role="status">
            <span className={s.enviadoIcone} aria-hidden><MailCheck size={22} /></span>
            <p><strong>Email enviado com sucesso</strong>O código pode levar até 1 minuto para chegar. Se não receber, verifique o spam ou peça um novo código abaixo.</p>
          </div>
          <CodigoSeisDigitos valor={codigo} onChange={setCodigo} erro={erro} />
          <p className={s.reenvio}>
            Não recebeu o código?{' '}
            {espera > 0
              ? <span className={s.timer}>Reenviar em 00:{String(espera).padStart(2, '0')}</span>
              : <button type="button" className={s.reenviar} onClick={() => enviar()} disabled={carregando}>Reenviar código</button>}
          </p>
          <Botao type="submit" tamanho="lg" larguraTotal carregando={carregando} iconeDireita={<ArrowRight size={18} aria-hidden />}>Verificar código</Botao>
          <button type="button" className={s.secundario} onClick={() => { setEstado(1); setErro(undefined); }}>Trocar de email</button>
        </form>
      )}

      {estado === 3 && (
        <form onSubmit={salvar} noValidate key="e3">
          <p className={s.selo}><span>3</span> Nova senha</p>
          <TituloAutenticacao antes="Crie sua" destaque="nova" depois=" senha" subtitulo="Sua identidade foi confirmada. Agora escolha uma nova senha segura para acessar sua conta." />
          <MedidorSenha rotulo="Nova senha *" valor={senha} onChange={setSenha} mostrarRequisitos />
          <CampoSenha rotulo="Confirmar nova senha *" autoComplete="new-password" placeholder="Digite novamente"
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}
            dica={confirmacao && confirmacao === senha ? <span className={s.confere}><CircleCheck size={14} aria-hidden /> As senhas conferem</span> : undefined}
            erro={confirmacao && confirmacao !== senha ? 'As senhas não conferem.' : undefined} />
          {erro && <p className={s.erroGeral} role="alert">{erro}</p>}
          <Botao type="submit" tamanho="lg" larguraTotal carregando={carregando} iconeDireita={<ArrowRight size={18} aria-hidden />}>Salvar nova senha</Botao>
          <p className={s.rodapeForm}>Ao salvar, você será redirecionado para o login.</p>
        </form>
      )}
    </LayoutAutenticacao>
  );
}

/** 6 campos de 1 dígito com colar, setas e backspace. */
function CodigoSeisDigitos({ valor, onChange, erro }: { valor: string[]; onChange: (v: string[]) => void; erro?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const definir = (i: number, d: string) => { const n = [...valor]; n[i] = d; onChange(n); };
  const aoDigitar = (i: number, texto: string) => {
    const d = texto.replace(/\D/g, '').slice(-1);
    definir(i, d);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const aoTecla = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !valor[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const aoColar = (e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!d) return;
    e.preventDefault();
    onChange(Array.from({ length: 6 }, (_, i) => d[i] ?? ''));
    refs.current[Math.min(d.length, 5)]?.focus();
  };
  return (
    <fieldset className={s.codigo}>
      <legend className={s.codigoRotulo}>Código de verificação <span aria-hidden>*</span></legend>
      <div className={s.digitos}>
        {valor.map((d, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el; }} className={`${s.digito} ${d ? s.preenchido : ''} ${erro ? s.digitoErro : ''}`}
            inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} value={d}
            aria-label={`Dígito ${i + 1} de 6`} onChange={(e) => aoDigitar(i, e.target.value)} onKeyDown={(e) => aoTecla(i, e)} onPaste={aoColar} />
        ))}
      </div>
      {erro && <p className={s.erroCampo} role="alert">{erro}</p>}
    </fieldset>
  );
}

const VISUAIS: Record<Estado, {
  icone: LucideIcon; mini: [{ icone: LucideIcon; titulo: string; sub: string }, { icone: LucideIcon; titulo: string; sub: string }];
  antes: string; destaque: string; depois: string; texto: string; itens: { icone: LucideIcon; titulo: string; texto: string }[];
}> = {
  1: { icone: Lock, mini: [{ icone: Send, titulo: 'Código enviado', sub: 'Em segundos' }, { icone: ShieldCheck, titulo: 'Conta segura', sub: '100% protegida' }],
    antes: 'Sua conta está ', destaque: 'segura', depois: '', texto: 'A gente leva segurança a sério. Seu acesso é protegido por código de verificação e criptografia de ponta a ponta.',
    itens: [{ icone: Clock, titulo: 'Código com expiração', texto: 'Cada código vale por apenas 15 minutos.' },
      { icone: ShieldCheck, titulo: 'Conformidade LGPD', texto: 'Seus dados pessoais são protegidos.' },
      { icone: Bell, titulo: 'Notificação imediata', texto: 'Avisamos por email se alguém tentar acessar.' }] },
  2: { icone: MailQuestion, mini: [{ icone: Clock, titulo: 'Válido por 15min', sub: 'Após geração' }, { icone: KeyRound, titulo: 'Código único', sub: '6 dígitos' }],
    antes: 'Verificamos seu ', destaque: 'acesso', depois: '', texto: 'O código foi gerado e enviado. Ele é válido apenas pra esta tentativa e expira em 15 minutos por segurança.',
    itens: [{ icone: MailQuestion, titulo: 'Não chegou?', texto: 'Verifique sua pasta de spam ou aguarde 1 minuto.' },
      { icone: LifeBuoy, titulo: 'Precisa de ajuda?', texto: 'Nosso suporte está disponível 24/7.' }] },
  3: { icone: KeyRound, mini: [{ icone: BadgeCheck, titulo: 'Identidade ok', sub: 'Verificada' }, { icone: Lock, titulo: 'Criptografia', sub: 'AES-256' }],
    antes: 'Quase lá! ', destaque: 'Última', depois: ' etapa.', texto: 'Escolha uma senha forte e única. Recomendamos usar um gerenciador de senhas para guardá-la com segurança.',
    itens: [{ icone: Lightbulb, titulo: 'Dica de segurança', texto: 'Use combinações que só você lembre — frases inteiras ou pares de palavras.' },
      { icone: ShieldX, titulo: 'Evite', texto: 'Datas de aniversário, nomes próprios, sequências óbvias (123456).' }] },
};

function Visual({ estado }: { estado: Estado }) {
  const v = VISUAIS[estado];
  const [m1, m2] = v.mini;
  const Icone = v.icone;
  return (
    <>
      <FolhasDecorativas />
      <div className={s.visual}>
        <div className={s.cadeado} aria-hidden>
          <span className={s.anel1} /><span className={s.anel2} />
          <span className={s.cadeadoIcone}><Icone size={72} strokeWidth={1.6} /></span>
          <span className={`${s.mini} ${s.mini1}`}><span className={s.miniIcone}><m1.icone size={16} /></span><span className={s.miniTexto}>{m1.titulo}<small>{m1.sub}</small></span></span>
          <span className={`${s.mini} ${s.mini2}`}><span className={s.miniIcone}><m2.icone size={16} /></span><span className={s.miniTexto}>{m2.titulo}<small>{m2.sub}</small></span></span>
        </div>
        <div className={s.chamada}>
          <h2>{v.antes}<span className="script">{v.destaque}</span>{v.depois}</h2>
          <p>{v.texto}</p>
        </div>
        <ul className={s.seguranca}>
          {v.itens.map(({ icone: I, titulo, texto }) => (
            <li key={titulo}><span className={s.segIcone} aria-hidden><I size={18} /></span><span><strong>{titulo}</strong>{texto}</span></li>
          ))}
        </ul>
      </div>
    </>
  );
}
