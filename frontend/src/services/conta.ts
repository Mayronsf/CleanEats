import { supabase } from './supabase';
import { buscarUsuarioAtual, ErroApi, HOME_DO_PERFIL } from './api';

/**
 * Serviços de conta (sessão principal): login social, recuperação de senha e para onde ir depois do login.
 * Login e-mail/senha ficam em useAuth().entrar.
 */

const URL_CALLBACK = () => `${window.location.origin}/auth/callback`;

/** CE-1 — Google REAL via Supabase Auth. Volta em /auth/callback. */
export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: URL_CALLBACK(), queryParams: { prompt: 'select_account' } },
  });
  if (error) throw new ErroApi(400, 'GOOGLE', 'Não foi possível abrir o login do Google. Tente de novo.');
}

/**
 * Depois de autenticar (e-mail/senha ou Google): home do perfil (CE-1),
 * ou o cadastro do perfil se a conta ainda não tem um (ex.: 1º login com Google).
 */
export async function destinoAposLogin(voltarPara?: string): Promise<string> {
  try {
    const usuario = await buscarUsuarioAtual();
    const home = HOME_DO_PERFIL[usuario.perfil];
    return voltarPara && voltarPara.startsWith(home) ? voltarPara : home;
  } catch (e) {
    if (e instanceof ErroApi && e.codigo === 'PERFIL_PENDENTE') return '/cadastro/perfil';
    throw e;
  }
}

/** "Lembrar de mim": sem a marca, a sessão é encerrada quando o navegador fecha. */
const CHAVE_NAO_LEMBRAR = 'cleaneats.nao-lembrar';
const CHAVE_SESSAO_ABERTA = 'cleaneats.sessao-aberta';

export function definirLembrarDeMim(lembrar: boolean) {
  try {
    if (lembrar) localStorage.removeItem(CHAVE_NAO_LEMBRAR);
    else localStorage.setItem(CHAVE_NAO_LEMBRAR, '1');
    sessionStorage.setItem(CHAVE_SESSAO_ABERTA, '1');
  } catch { /* navegação privada: segue com o padrão do Supabase */ }
}

/** Chamado uma vez ao abrir o app: encerra a sessão de quem não marcou "Lembrar de mim" e fechou o navegador. */
export async function aplicarLembrarDeMim() {
  try {
    if (localStorage.getItem(CHAVE_NAO_LEMBRAR) && !sessionStorage.getItem(CHAVE_SESSAO_ABERTA)) {
      localStorage.removeItem(CHAVE_NAO_LEMBRAR);
      await supabase.auth.signOut();
    }
  } catch { /* ignora */ }
}

/** Tela 08, passo 1 — envia o código de 6 dígitos (template "Reset password" do Supabase com {{ .Token }}). */
export async function enviarCodigoRecuperacao(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw new ErroApi(400, 'RECUPERACAO', error.status === 429
      ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
      : 'Não foi possível enviar o código. Confira o e-mail e tente de novo.');
  }
}

/** Tela 08, passo 2 — valida o código (expira em 15 min, configurado no Supabase). */
export async function validarCodigoRecuperacao(email: string, codigo: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'recovery' });
  if (error) throw new ErroApi(400, 'CODIGO_INVALIDO', 'Código inválido ou expirado. Confira os 6 dígitos ou peça um novo.');
}

/** Tela 08, passo 3 — nova senha (a sessão de recuperação foi aberta pelo verifyOtp). */
export async function definirNovaSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    throw new ErroApi(400, 'SENHA', error.message.includes('different')
      ? 'A nova senha precisa ser diferente da anterior.'
      : 'Não foi possível salvar a nova senha. Tente de novo.');
  }
}

/** Força da senha (telas 03 e 08): mesmos 4 requisitos da tela. */
export function requisitosSenha(senha: string) {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    numero: /\d/.test(senha),
    simbolo: /[^A-Za-z0-9]/.test(senha),
  };
}

export function forcaSenha(senha: string): 0 | 1 | 2 | 3 | 4 {
  return Object.values(requisitosSenha(senha)).filter(Boolean).length as 0 | 1 | 2 | 3 | 4;
}
