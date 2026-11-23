import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

/**
 * Apoio dos testes E2E. Roda só no Node (nunca vai para o navegador).
 * Lê URLs e chaves de frontend/.env.local e backend/.env.
 */
function lerEnv(arquivo: string): Record<string, string> {
  try {
    return Object.fromEntries(readFileSync(arquivo, 'utf8').split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  } catch { return {}; }
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const front = lerEnv(join(raiz, 'frontend', '.env.local'));
const back = lerEnv(join(raiz, 'backend', '.env'));

export const SUPABASE_URL = front.VITE_SUPABASE_URL;
export const ANON = front.VITE_SUPABASE_ANON_KEY;
export const API = front.VITE_API_URL;
const SERVICE = back.SUPABASE_SERVICE_ROLE_KEY;

export const SENHA_DEMO = 'CleanEats@2026';
export const DEMO = {
  cliente: 'cliente@cleaneats.test',
  nutri: 'nutri@cleaneats.test',
  restaurante: 'restaurante@cleaneats.test',
  admin: 'admin@cleaneats.test',
};

/** Cria um usuário já confirmado (contorna a confirmação de e-mail do projeto). */
export async function criarUsuarioConfirmado(email: string, senha: string, nome: string): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome } }),
  });
  if (!r.ok) throw new Error(`criar usuário: ${r.status} ${await r.text()}`);
  return (await r.json()).id;
}

/** Apaga o usuário de teste (a linha em `usuario` cai junto por cascade). */
export async function apagarUsuario(id: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
}

/** Token de acesso real (para conferir o backend sem passar pela interface). */
export async function token(email: string, senha = SENHA_DEMO): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  return (await r.json()).access_token;
}

export async function entrarPelaTela(page: Page, email: string, senha = SENHA_DEMO) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
