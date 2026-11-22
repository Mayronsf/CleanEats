import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { Botao, Campo, CampoSenha, Logo, Badge } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { verificarSaudeApi, HOME_DO_PERFIL, ErroApi } from '../../services/api';
import { supabaseConfigurado } from '../../services/supabase';
import s from './ConexaoPage.module.css';

/**
 * Fase 0 — "hello" ponta a ponta: React → Supabase Auth (login) → Spring Boot valida o JWT
 * → lê a tabela usuario → devolve o perfil. Não é uma tela do produto.
 */
export default function ConexaoPage() {
  const { sessao, usuario, carregandoUsuario, erroUsuario, entrar, sair } = useAuth();
  const saude = useQuery({ queryKey: ['saude'], queryFn: verificarSaudeApi, retry: false });
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setEnviando(true);
    try { await entrar(email, senha); } catch (err) { setErro((err as ErroApi).message); } finally { setEnviando(false); }
  }

  const etapas = [
    { nome: 'Supabase configurado (.env.local)', ok: supabaseConfigurado, detalhe: supabaseConfigurado ? 'URL e chave anon definidas' : 'Preencha frontend/.env.local' },
    { nome: 'API Spring Boot respondendo', ok: saude.isSuccess, carregando: saude.isLoading, detalhe: saude.isError ? (saude.error as ErroApi).message : saude.data ? 'GET /api/saude → ok' : '' },
    { nome: 'Login no Supabase Auth', ok: !!sessao, detalhe: sessao ? sessao.user.email : 'Entre com um usuário de demonstração' },
    { nome: 'Backend validou o JWT e leu o perfil', ok: !!usuario, carregando: carregandoUsuario, detalhe: usuario ? `${usuario.nome} · ${usuario.perfil} → ${HOME_DO_PERFIL[usuario.perfil]}` : erroUsuario?.message ?? '' },
  ];

  return (
    <main className={s.pagina}>
      <Logo />
      <h1 className={s.titulo}>Verificação de <span className="script">conexão</span></h1>
      <p className={s.sub}>Página técnica da Fase 0: confirma que frontend, Supabase e backend conversam.</p>

      <ol className={s.etapas}>
        {etapas.map((e) => (
          <li key={e.nome} className={s.etapa}>
            {e.carregando ? <CircleDashed className={s.pendente} aria-hidden /> : e.ok ? <CheckCircle2 className={s.ok} aria-hidden /> : <XCircle className={s.falha} aria-hidden />}
            <div>
              <p className={s.etapaNome}>{e.nome} <span className="sr-only">{e.ok ? '(ok)' : '(pendente)'}</span></p>
              {e.detalhe && <p className={s.etapaDetalhe}>{e.detalhe}</p>}
            </div>
          </li>
        ))}
      </ol>

      {sessao ? (
        <div className={s.logado}>
          {usuario && <Badge tom="pronto">{usuario.perfil}</Badge>}
          <Botao variante="secundario" onClick={sair}>Sair</Botao>
        </div>
      ) : (
        <form onSubmit={aoEntrar} className={s.form} noValidate>
          <Campo rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@cleaneats.app" required />
          <CampoSenha rotulo="Senha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" required erro={erro} />
          <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando} disabled={!supabaseConfigurado}>Entrar</Botao>
        </form>
      )}
    </main>
  );
}
