import { supabase } from './supabase';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/api';

export type PerfilUsuario = 'CLIENTE' | 'NUTRICIONISTA' | 'RESTAURANTE' | 'ADMIN';

export interface UsuarioAtual {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  avatarUrl: string | null;
  /** Plano vigente (CE-15) */
  tier: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
}

/** Erro padronizado da API (ErroDto do backend). */
export class ErroApi extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
  }
}

/** Chamada autenticada ao backend Spring Boot: anexa o JWT da sessão do Supabase. */
export async function chamarApi<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ErroApi(0, 'SEM_CONEXAO', 'Não foi possível falar com o servidor. Ele está rodando?');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroApi(resposta.status, corpo?.codigo ?? 'ERRO', corpo?.mensagem ?? `Erro ${resposta.status}`);
  }
  return resposta.status === 204 ? (undefined as T) : resposta.json();
}

export const verificarSaudeApi = () => chamarApi<{ status: string; momento: string }>('/saude');
export const buscarUsuarioAtual = () => chamarApi<UsuarioAtual>('/auth/me');

/** Home de cada perfil — usada no redirecionamento após o login (CE-1). */
export const HOME_DO_PERFIL: Record<PerfilUsuario, string> = {
  CLIENTE: '/app',
  NUTRICIONISTA: '/nutri',
  RESTAURANTE: '/restaurante',
  ADMIN: '/admin',
};
