import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Botao, Campo, CampoSenha, useToast } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { ErroApi } from '../../services/api';
import { destinoAposLogin, definirLembrarDeMim, entrarComGoogle } from '../../services/conta';
import { supabaseConfigurado } from '../../services/supabase';
import { FolhasDecorativas, LayoutAutenticacao, TituloAutenticacao } from './componentes/LayoutAutenticacao';
import { BotoesSociais } from './componentes/BotoesSociais';
import s from './LoginPage.module.css';

/** Tela 02 — Login (CE-1). */
export default function LoginPage() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const toast = useToast();
  const voltarPara = (local.state as { voltarPara?: string } | null)?.voltarPara;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [erros, setErros] = useState<{ email?: string; senha?: string; geral?: string }>({});
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar(e: FormEvent) {
    e.preventDefault();
    const novos: typeof erros = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) novos.email = 'Informe um e-mail válido.';
    if (!senha) novos.senha = 'Informe sua senha.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setEnviando(true);
    try {
      definirLembrarDeMim(lembrar);
      await entrar(email.trim(), senha);
      navegar(await destinoAposLogin(voltarPara), { replace: true });
    } catch (err) {
      setErros({ geral: err instanceof ErroApi ? err.message : 'Não foi possível entrar. Tente de novo.' });
    } finally {
      setEnviando(false);
    }
  }

  async function aoEntrarComGoogle() {
    try { await entrarComGoogle(); } catch (err) { toast((err as Error).message, 'erro'); }
  }

  return (
    <LayoutAutenticacao visual={<VisualLogin />}>
      <TituloAutenticacao
        rotulo="Bem-vindo de volta"
        antes="Entrar na sua"
        destaque="conta"
        subtitulo="Acesse seu cardápio personalizado, acompanhe seus pedidos e converse com seu nutricionista."
      />

      <BotoesSociais aoGoogle={aoEntrarComGoogle} verbo="Entrar" />
      <p className={s.divisor}>ou continue com email</p>

      <form onSubmit={aoEntrar} noValidate>
        {erros.geral && <p className={s.erroGeral} role="alert">{erros.geral}</p>}
        <Campo rotulo="Email" type="email" autoComplete="email" placeholder="seu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
        <CampoSenha rotulo="Senha" autoComplete="current-password" placeholder="••••••••"
          value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />

        <div className={s.opcoes}>
          <label className={s.lembrar}>
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            Lembrar de mim
          </label>
          <Link to="/recuperar-senha" state={{ email }} className={s.esqueci}>Esqueci a senha</Link>
        </div>

        <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando} disabled={!supabaseConfigurado}
          iconeDireita={<ArrowRight size={18} aria-hidden />}>
          Entrar
        </Botao>
        {!supabaseConfigurado && <p className={s.aviso}>Login indisponível: o Supabase ainda não foi configurado neste ambiente.</p>}
      </form>

      <p className={s.cadastro}>Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link></p>
    </LayoutAutenticacao>
  );
}

function VisualLogin() {
  return (
    <>
      <FolhasDecorativas />
      <div className={s.visual}>
        <div className={s.prato}>
          <div className={s.pratoFundo} />
          <div className={s.pratoAnel} />
          <img className={s.pratoImg} src="/img/pratos/bowl-vegano-power.jpg" alt="Bowl saudável com grão-de-bico e legumes" />
          <div className={`${s.callout} ${s.calloutKcal}`}><span className={s.ponto} style={{ background: 'var(--kcal)' }} /><div><p className={s.calloutValor}>380 kcal</p><p className={s.calloutRotulo}>Calorias</p></div></div>
          <div className={`${s.callout} ${s.calloutFibra}`}><span className={s.ponto} style={{ background: 'var(--fiber)' }} /><div><p className={s.calloutValor}>12g</p><p className={s.calloutRotulo}>Fibras</p></div></div>
          <div className={`${s.callout} ${s.calloutProt}`}><span className={s.ponto} style={{ background: 'var(--prot)' }} /><div><p className={s.calloutValor}>18g</p><p className={s.calloutRotulo}>Proteína</p></div></div>
        </div>
        <div className={s.chamada}>
          <h2>Sua alimentação<br /><span className="script">personalizada</span> te espera.</h2>
          <p>Mais de 500 pessoas já transformaram a rotina alimentar com CleanEats.</p>
        </div>
        <figure className={s.depoimento}>
          <img src="/img/pessoas/depoimento-login.jpg" alt="" className={s.depoimentoFoto} />
          <div>
            <blockquote className={s.depoimentoTexto}>"Depois do CleanEats parei de pensar 'o que comer'. O plano da minha nutri já vem pronto na plataforma."</blockquote>
            <figcaption className={s.depoimentoAutor}>Camila R. <span>· Cliente desde 2026</span></figcaption>
          </div>
        </figure>
      </div>
    </>
  );
}
