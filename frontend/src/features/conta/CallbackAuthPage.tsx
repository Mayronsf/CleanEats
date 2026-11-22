import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErroCarregamento, Logo } from '../../design-system';
import { supabase } from '../../services/supabase';
import { destinoAposLogin } from '../../services/conta';
import { CarregandoPagina } from '../../app/CarregandoPagina';

/** /auth/callback — retorno do login com Google (o supabase-js troca o código da URL pela sessão). */
export default function CallbackAuthPage() {
  const navegar = useNavigate();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    let feito = false;
    const seguir = async () => {
      if (feito) return;
      feito = true;
      try { navegar(await destinoAposLogin(), { replace: true }); }
      catch { setErro('Entramos com o Google, mas não conseguimos carregar sua conta. Tente de novo.'); }
    };
    const params = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&'));
    if (params.get('error')) {
      setErro(params.get('error_description') ?? 'O login com o Google foi cancelado.');
      return;
    }
    supabase.auth.getSession().then(({ data }) => { if (data.session) seguir(); });
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (sessao && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) seguir();
    });
    const limite = window.setTimeout(() => { if (!feito) setErro('O login com o Google demorou demais. Tente de novo.'); }, 15000);
    return () => { data.subscription.unsubscribe(); window.clearTimeout(limite); };
  }, [navegar]);

  if (!erro) return <CarregandoPagina />;
  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '48px 16px', display: 'grid', gap: 24 }}>
      <Logo />
      <ErroCarregamento mensagem={erro} onTentarNovamente={() => navegar('/login', { replace: true })} />
    </main>
  );
}
