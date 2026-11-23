import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CreditCard, Headphones, RotateCcw, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { ErroCarregamento, Logo, PlanoTierCard, Skeleton } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { formatarMoeda } from '../../lib/formato';
import { buscarTiers, economiaAnualMaxima, type Ciclo, type CodigoTier, type Tier } from '../../services/planos';
import { FaleConosco } from '../suporte/FaleConosco';
import { ConfirmarAssinatura } from './ConfirmarAssinatura';
import { COMPARATIVO, FAQ, montarPlano, type Celula } from './conteudoPlanos';
import s from './PlanosPage.module.css';

const CONFIANCA = [
  { icone: ShieldCheck, titulo: 'Pagamento seguro', texto: 'Stripe e Mercado Pago' },
  { icone: RotateCcw, titulo: '7 dias grátis', texto: 'Cancele sem custo' },
  { icone: X, titulo: 'Sem fidelidade', texto: 'Cancele quando quiser' },
  { icone: Zap, titulo: 'Ativação imediata', texto: 'Sem espera após pagamento' },
];

/** Tela 09 — Seleção de plano (CE-15): tiers, comparativo, confiança e FAQ. Pública; assinar exige conta de cliente. */
export default function PlanosPage() {
  const { usuario, sessao } = useAuth();
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const onboarding = params.get('onboarding') === '1';
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: buscarTiers, staleTime: 5 * 60_000 });
  const [ciclo, setCiclo] = useState<Ciclo>('ANUAL');
  const [escolhido, setEscolhido] = useState<Tier | null>(null);
  const [suporte, setSuporte] = useState(false);

  const ehCliente = usuario?.perfil === 'CLIENTE';
  const tierAtual: CodigoTier | undefined = ehCliente ? usuario?.tier : undefined;
  const destinoPular = ehCliente ? '/app' : sessao ? '/cadastro/perfil' : '/cadastro';

  function aoAssinar(t: Tier) {
    if (!sessao) { navegar('/cadastro', { state: { plano: t.codigo } }); return; }
    if (!usuario) { navegar('/cadastro/perfil'); return; }
    if (!ehCliente) return;
    if (t.codigo === 'FREE') { navegar('/app'); return; }
    setEscolhido(t);
  }

  async function aoConcluir() {
    setEscolhido(null);
    await queryClient.invalidateQueries({ queryKey: ['usuario-atual'] });
    navegar(onboarding ? '/app' : '/app/assinatura');
  }

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <Logo />
        <div className={s.topoDireita}>
          {!sessao && <Link to="/login" className={s.topoLink}>Já tenho conta</Link>}
          <Link to={destinoPular} className={s.pular}>Pular por agora <ArrowRight size={16} aria-hidden /></Link>
        </div>
      </header>

      <main className={s.principal}>
        <div className={s.cabeca}>
          <p className={s.rotulo}>Escolha seu plano · 7 dias grátis</p>
          <h1 className={s.titulo}>Comece <span className="script">do jeito</span><br />que faz sentido pra você</h1>
          <p className={s.sub}>Sem fidelidade, cancele quando quiser. Todos os planos incluem acesso ao marketplace e suporte. Você pode mudar de plano a qualquer momento.</p>
          <div className={s.linhaCiclo}>
          <div className={s.ciclo} role="radiogroup" aria-label="Ciclo de cobrança">
            <button type="button" role="radio" aria-checked={ciclo === 'MENSAL'} className={ciclo === 'MENSAL' ? s.cicloAtivo : undefined} onClick={() => setCiclo('MENSAL')}>Mensal</button>
            <button type="button" role="radio" aria-checked={ciclo === 'ANUAL'} className={ciclo === 'ANUAL' ? s.cicloAtivo : undefined} onClick={() => setCiclo('ANUAL')}>
              Anual <span className={s.descontoAnual}>-20%</span>
            </button>
          </div>
          {tiers.data && (
            <p className={s.economia}><Sparkles size={14} aria-hidden /> Economize até {formatarMoeda(Math.floor(economiaAnualMaxima(tiers.data))).replace(',00', '')}/ano <span className="script">— vale a pena!</span></p>
          )}
          </div>
        </div>

        {tiers.isError && <ErroCarregamento onTentarNovamente={() => tiers.refetch()} />}
        <section className={s.planos} aria-label="Planos">
          {tiers.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={620} raio={24} />)}
          {tiers.data?.map((t) => (
            <PlanoTierCard key={t.codigo} plano={montarPlano(t)} ciclo={ciclo} atual={tierAtual === t.codigo}
              onAssinar={() => aoAssinar(t)} />
          ))}
        </section>
        {sessao && usuario && !ehCliente && (
          <p className={s.avisoPerfil} role="note">Os planos de assinatura são para contas de cliente. Sua conta é de {usuario.perfil === 'NUTRICIONISTA' ? 'nutricionista' : 'restaurante'}.</p>
        )}

        {tiers.data && (
          <section className={s.comparativo} aria-labelledby="comparativo-titulo">
            <div className={s.comparativoCabeca}>
              <h2 id="comparativo-titulo">Compare todos os recursos</h2>
              <p>Veja exatamente o que está incluso em cada plano</p>
            </div>
            <div className={s.tabelaRolagem}>
              <table className={s.tabela}>
                <caption className="sr-only">Comparativo de recursos por plano</caption>
                <thead>
                  <tr>
                    <th scope="col">Recurso</th>
                    {tiers.data.map((t) => <th key={t.codigo} scope="col" className={t.codigo === 'PRO' ? s.recomendado : undefined}>{t.nome}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVO.map((g) => [
                    <tr key={g.categoria} className={s.categoria}><th scope="rowgroup" colSpan={tiers.data.length + 1}>{g.categoria}</th></tr>,
                    ...g.linhas.map((l) => (
                      <tr key={l.recurso}>
                        <th scope="row">{l.recurso}</th>
                        {tiers.data.map((t) => <td key={t.codigo}><CelulaComparativo valor={l.valores(t)} /></td>)}
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className={s.confianca} aria-label="Garantias">
          {CONFIANCA.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className={s.confiancaItem}>
              <span className={s.confiancaIcone} aria-hidden><Icone size={22} /></span>
              <p><strong>{titulo}</strong>{texto}</p>
            </div>
          ))}
        </section>

        <section className={s.faq} aria-labelledby="faq-titulo">
          <div className={s.faqCabeca}>
            <h2 id="faq-titulo">Perguntas <span className="script">frequentes</span></h2>
            <button type="button" className={s.faqAjuda} onClick={() => setSuporte(true)}>
              <span className={s.faqAjudaIcone} aria-hidden><Headphones size={18} /></span>
              <span>Tem outra dúvida?<small>Fale com a gente</small></span>
            </button>
          </div>
          <div className={s.faqGrade}>
            {FAQ.map((f) => (
              <details key={f.pergunta} className={s.faqItem}>
                <summary>{f.pergunta}</summary>
                <p>{f.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {escolhido && <ConfirmarAssinatura tier={escolhido} ciclo={ciclo} onFechar={() => setEscolhido(null)} onConcluido={aoConcluir} />}
      <FaleConosco aberto={suporte} onFechar={() => setSuporte(false)} assuntoInicial="Dúvida sobre planos" />
      <footer className={s.rodape}><CreditCard size={14} aria-hidden /> Preços em reais. Cobrança recorrente; cancele quando quiser.</footer>
    </div>
  );
}

function CelulaComparativo({ valor }: { valor: Celula }) {
  if (valor === true) return <span className={s.sim}><Check size={18} aria-hidden /><span className="sr-only">Incluso</span></span>;
  if (valor === false) return <span className={s.nao} aria-label="Não incluso">—</span>;
  return <span className={s.texto}>{valor}</span>;
}
