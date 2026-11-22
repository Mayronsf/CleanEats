import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, MessageCircle, PieChart, ShoppingBag, Star, Utensils } from 'lucide-react';
import { Botao, Campo, Stepper, useToast } from '../../design-system';
import { supabase, supabaseConfigurado } from '../../services/supabase';
import { entrarComGoogle } from '../../services/conta';
import { FolhasDecorativas, LayoutAutenticacao, TituloAutenticacao } from './componentes/LayoutAutenticacao';
import { BotoesSociais } from './componentes/BotoesSociais';
import { MedidorSenha } from './componentes/MedidorSenha';
import { ETAPAS_CADASTRO, lerRascunho, salvarRascunho } from './rascunhoCadastro';
import { forcaSenha } from '../../services/conta';
import s from './CadastroContaPage.module.css';

type Erros = Partial<Record<'nome' | 'sobrenome' | 'email' | 'senha' | 'termos' | 'geral', string>>;

/** Tela 03 — Cadastro, etapa 1: conta (CE-2). */
export default function CadastroContaPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const rascunho = lerRascunho();
  const [nome, setNome] = useState(rascunho.nome ?? '');
  const [sobrenome, setSobrenome] = useState(rascunho.sobrenome ?? '');
  const [email, setEmail] = useState(rascunho.email ?? '');
  const [senha, setSenha] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  async function aoContinuar(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (nome.trim().length < 2) novos.nome = 'Informe seu nome.';
    if (sobrenome.trim().length < 2) novos.sobrenome = 'Informe seu sobrenome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) novos.email = 'Informe um e-mail válido.';
    if (forcaSenha(senha) < 3) novos.senha = 'Use ao menos 8 caracteres com letra maiúscula, número ou símbolo.';
    if (!aceite) novos.termos = 'Para continuar, aceite os termos de uso e a política de privacidade.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setEnviando(true);
    try {
      const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: { nome: nomeCompleto }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErros({ geral: /registered|exists/i.test(error.message)
          ? 'Já existe uma conta com este e-mail. Faça login ou recupere a senha.'
          : 'Não foi possível criar a conta. Tente de novo.' });
        return;
      }
      salvarRascunho({ nome: nome.trim(), sobrenome: sobrenome.trim(), email: email.trim(), aceiteTermosEm: new Date().toISOString() });
      if (!data.session) { setConfirmarEmail(true); return; }   // projeto com confirmação de e-mail ligada
      navegar('/cadastro/perfil');
    } finally {
      setEnviando(false);
    }
  }

  async function aoGoogle() {
    if (!aceite) { setErros({ termos: 'Para continuar com o Google, aceite antes os termos e a política de privacidade.' }); return; }
    salvarRascunho({ aceiteTermosEm: new Date().toISOString() });
    try { await entrarComGoogle(); } catch (err) { toast((err as Error).message, 'erro'); }
  }

  return (
    <LayoutAutenticacao visual={<VisualCadastro />}>
      <Stepper etapas={ETAPAS_CADASTRO} atual={0} />
      <TituloAutenticacao rotulo="Etapa 1 de 3" antes="Crie sua" destaque="conta"
        subtitulo="Comece sua jornada por uma alimentação mais saudável. Leva menos de 2 minutos." />

      {confirmarEmail ? (
        <div className={s.confirmar} role="status">
          <p className={s.confirmarTitulo}>Confirme seu e-mail</p>
          <p>Enviamos um link para <strong>{email}</strong>. Abra o link para ativar a conta e seguir para a escolha do perfil.</p>
        </div>
      ) : (
        <>
          <BotoesSociais aoGoogle={aoGoogle} verbo="Cadastrar" />
          <p className={s.divisor}>ou continue com email</p>
          <form onSubmit={aoContinuar} noValidate>
            {erros.geral && <p className={s.erroGeral} role="alert">{erros.geral}{erros.geral.includes('login') && <> <Link to="/login">Ir para o login</Link></>}</p>}
            <div className={s.linha}>
              <Campo rotulo="Nome *" autoComplete="given-name" placeholder="Seu primeiro nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
              <Campo rotulo="Sobrenome *" autoComplete="family-name" placeholder="Seu sobrenome" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} erro={erros.sobrenome} />
            </div>
            <Campo rotulo="Email *" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
            <MedidorSenha rotulo="Senha *" valor={senha} onChange={setSenha} erro={erros.senha} />

            <label className={s.termos}>
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} aria-describedby={erros.termos ? 'erro-termos' : undefined} />
              <span>
                Aceito os <Link to="/termos" target="_blank">termos de uso</Link> e a <Link to="/privacidade" target="_blank">política de privacidade</Link> do CleanEats. Concordo em receber comunicações sobre meu plano e novidades.
              </span>
            </label>
            {erros.termos && <p id="erro-termos" className={s.erroCampo} role="alert">{erros.termos}</p>}

            <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando} disabled={!supabaseConfigurado}
              iconeDireita={<ArrowRight size={18} aria-hidden />}>
              Continuar
            </Botao>
          </form>
        </>
      )}
      <p className={s.entrar}>Já tem conta? <Link to="/login">Fazer login</Link></p>
    </LayoutAutenticacao>
  );
}

const BENEFICIOS = [
  { icone: Utensils, fundo: '#FEF3E5', cor: '#A8571C', titulo: 'Cardápio personalizado', texto: 'Plano alimentar montado por nutricionista de acordo com seu objetivo.' },
  { icone: PieChart, fundo: '#E0F2DD', cor: 'var(--green-dark)', titulo: 'Pratos reais, macros transparentes', texto: 'Cada refeição com calorias, proteínas, carbs e fibras na palma da mão.' },
  { icone: MessageCircle, fundo: '#FDE2DC', cor: '#B5402A', titulo: 'NutriBot 24/7', texto: 'Assistente que conhece seu plano e ajuda em qualquer dúvida do dia.' },
  { icone: ShoppingBag, fundo: '#E0F2FE', cor: 'var(--blue-dark)', titulo: 'Pedido com 1 clique', texto: 'Cada refeição do plano vira pedido instantâneo. Sem complicação.' },
];

function VisualCadastro() {
  return (
    <>
      <FolhasDecorativas />
      <div className={s.visual}>
        <div className={s.chamada}>
          <h2>Bem-vindo ao<br /><span className="script">CleanEats</span></h2>
          <p>Junte-se a mais de 500 pessoas que transformaram sua rotina alimentar em um só lugar.</p>
        </div>
        <ul className={s.beneficios}>
          {BENEFICIOS.map(({ icone: Icone, fundo, cor, titulo, texto }) => (
            <li key={titulo} className={s.beneficio}>
              <span className={s.beneficioIcone} style={{ background: fundo, color: cor }} aria-hidden><Icone size={22} /></span>
              <span className={s.beneficioTexto}><strong>{titulo}</strong><span>{texto}</span></span>
              <span className={s.beneficioCheck} aria-hidden><Check size={14} /></span>
            </li>
          ))}
        </ul>
        <div className={s.confianca}>
          <div className={s.avatares} aria-hidden>
            {[1, 2, 3, 4].map((n) => <img key={n} src={`/img/pessoas/comunidade-${n}.jpg`} alt="" />)}
          </div>
          <div>
            <p><strong>+500 pessoas</strong> escolheram CleanEats</p>
            <p className={s.estrelas}><Star size={14} fill="currentColor" aria-hidden /> 4.9/5</p>
          </div>
        </div>
      </div>
    </>
  );
}
