import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ErroCarregamento, Logo } from '../../design-system';
import { supabase } from '../../services/supabase';
import { destinoAposLogin } from '../../services/conta';
import { CarregandoPagina } from '../../app/CarregandoPagina';

/** /auth/callback — retorno do login com Google (PKCE ou implícito). */
export default function CallbackAuthPage() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    let feito = false;
    const seguir = async () => {
      if (feito) return;
      feito = true;
      try {
        await qc.invalidateQueries({ queryKey: ['usuario-atual'] });
        navegar(await destinoAposLogin(), { replace: true });
      } catch {
        setErro('Entramos com o Google, mas não conseguimos carregar sua conta. Tente de novo.');
      }
    };

    const busca = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const erroUrl = busca.get('error') ?? hash.get('error');
    if (erroUrl) {
      setErro(busca.get('error_description') ?? hash.get('error_description') ?? 'O login com o Google foi cancelado.');
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (sessao && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED')) {
        void seguir();
      }
    });

    const iniciar = async () => {
      const { data: atual } = await supabase.auth.getSession();
      if (atual.session) {
        await seguir();
        return;
      }
      const code = busca.get('code');
      if (code) {
        const { data: trocado, error } = await supabase.auth.exchangeCodeForSession(code);
        if (trocado.session) {
          await seguir();
          return;
        }
        if (error) {
          // Pode já ter sido trocado automaticamente pelo detectSessionInUrl
          const { data: recheck } = await supabase.auth.getSession();
          if (recheck.session) { await seguir(); return; }
          setErro('Não foi possível concluir o login com o Google. Tente novamente.');
        }
      }
    };
    void iniciar();

    const limite = window.setTimeout(() => {
      if (!feito) setErro('O login com o Google demorou demais. Tente de novo.');
    }, 15000);

    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(limite);
    };
  }, [navegar, qc]);

  if (!erro) return <CarregandoPagina />;
  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '48px 16px', display: 'grid', gap: 24 }}>
      <Logo />
      <ErroCarregamento mensagem={erro} onTentarNovamente={() => navegar('/login', { replace: true })} />
    </main>
  );
}
