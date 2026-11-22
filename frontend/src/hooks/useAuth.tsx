import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { buscarUsuarioAtual, type UsuarioAtual, ErroApi } from '../services/api';

interface EstadoAuth {
  sessao: Session | null;
  carregandoSessao: boolean;
  usuario: UsuarioAtual | undefined;
  carregandoUsuario: boolean;
  erroUsuario: ErroApi | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<EstadoAuth | null>(null);

/** Sessão via Supabase Auth + perfil vindo do backend (/api/auth/me). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregandoSessao(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
      queryClient.invalidateQueries({ queryKey: ['usuario-atual'] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const consulta = useQuery({
    queryKey: ['usuario-atual', sessao?.user.id],
    queryFn: buscarUsuarioAtual,
    enabled: !!sessao,
    retry: false,
  });

  const entrar = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      throw new ErroApi(401, 'CREDENCIAIS_INVALIDAS',
        error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['usuario-atual'] });
  };

  return (
    <AuthContext.Provider value={{
      sessao, carregandoSessao,
      usuario: consulta.data, carregandoUsuario: consulta.isLoading,
      erroUsuario: (consulta.error as ErroApi | null) ?? null,
      entrar, sair,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
