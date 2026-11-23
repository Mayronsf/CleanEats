import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true quando o .env.local foi preenchido com um projeto Supabase real. */
export const supabaseConfigurado = Boolean(url && anonKey && !url.includes('SEU-PROJETO'));

/** Cliente do Supabase no navegador — só com a chave anon/publishable (RLS protege os dados). */
export const supabase: SupabaseClient = createClient(url ?? 'http://localhost:54321', anonKey ?? 'chave-ausente', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
