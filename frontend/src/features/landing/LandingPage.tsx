import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ClipboardList, Menu, Play, Plus, ShoppingBag, Star, Target, X } from 'lucide-react';
import { ErroCarregamento, Logo, Preco, Skeleton } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { HOME_DO_PERFIL } from '../../services/api';
import { buscarVitrine } from '../../services/vitrine';
import { FaleConosco } from '../suporte/FaleConosco';
import s from './LandingPage.module.css';

const PASSOS = [
  { icone: Target, titulo: 'Defina seu objetivo', texto: 'Conte pra gente se você quer emagrecer, ganhar massa ou manter uma dieta equilibrada. Nosso sistema entende sua meta.' },
  { icone: ClipboardList, titulo: 'Receba seu plano', texto: 'Nutricionistas com CRN validado montam um cardápio semanal com pratos reais dos restaurantes parceiros.' },
  { icone: ShoppingBag, titulo: 'Peça com 1 clique', texto: 'Cada refeição do plano vira um pedido instantâneo. Sem montar, sem planejar — é só comer e acompanhar a evolução.' },
];

const PERFIS = [
  { imagem: '/img/perfis/cliente.jpg', selo: 'Para Clientes', titulo: 'Cardápio personalizado, sem complicação.', texto: 'Defina seu objetivo, receba plano alimentar de um nutricionista e peça com um clique. Macros transparentes em tudo.', acao: 'Explorar cardápio', para: '/app/marketplace' },
  { imagem: '/img/perfis/nutricionista.jpg', selo: 'Para Nutricionistas', titulo: 'Renda recorrente, sem perder controle.', texto: 'Monte planos com catálogo aprovado, emita prescrições digitais com CRN e acompanhe adesão em tempo real.', acao: 'Sou nutricionista', para: '/cadastro' },
  { imagem: '/img/perfis/restaurante.jpg', selo: 'Para Restaurantes', titulo: 'Público fit, sem disputar fast food.', texto: 'Canal especializado em saúde. Pedidos recorrentes via planos alimentares. Selo de aprovação nutricional.', acao: 'Sou restaurante', para: '/cadastro' },
];

const compacto = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(n));

/** Tela 01 — Landing (lane "brand"). Destaques e números vêm de GET /api/vitrine. */
export default function LandingPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const vitrine = useQuery({ queryKey: ['vitrine'], queryFn: buscarVitrine, staleTime: 5 * 60_000 });
  const [menu, setMenu] = useState(false);
  const [suporte, setSuporte] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const destaques = vitrine.data?.destaques ?? [];
  const heroi = destaques[indice % Math.max(destaques.length, 1)];
  const mover = (passo: number) => setIndice((i) => (i + passo + destaques.length) % Math.max(destaques.length, 1));
  const n = vitrine.data?.numeros;
  const minhaArea = usuario ? HOME_DO_PERFIL[usuario.perfil] : null;

  const LINKS = [
    { rotulo: 'Home', para: '/' },
    { rotulo: 'Marketplace', para: '/app/marketplace' },
    { rotulo: 'Planos', para: '/planos' },
    { rotulo: 'Nutricionistas', para: '/#perfis' },
    { rotulo: 'Como funciona', para: '/#como-funciona' },
  ];

  return (
    <div className={s.pagina}>
      <header className={s.nav}>
        <div className={s.navDentro}>
          <Logo />
          <nav aria-label="Principal">
            <ul className={s.links}>
              {LINKS.map((l) => <li key={l.rotulo}><a href={l.para} className={l.para === '/' ? s.ativo : undefined}>{l.rotulo}</a></li>)}
            </ul>
          </nav>
          <div className={s.acoes}>
            {minhaArea ? (
              <Link to={minhaArea} className={s.btnPrimario}>Ir para minha área <ArrowRight size={16} aria-hidden /></Link>
            ) : (
              <>
                <Link to="/login" className={s.btnLinha}>Login</Link>
                <Link to="/cadastro" className={s.btnPrimario}>Criar conta <ArrowRight size={16} aria-hidden /></Link>
              </>
            )}
            <button type="button" className={s.hamburguer} onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu}><Menu size={22} aria-hidden /></button>
          </div>
        </div>
      </header>
      {menu && (
        <div className={s.menuMobile} role="dialog" aria-modal="true" aria-label="Menu">
          <div className={s.menuTopo}><Logo /><button type="button" onClick={() => setMenu(false)} aria-label="Fechar menu"><X size={20} aria-hidden /></button></div>
          {LINKS.map((l) => <a key={l.rotulo} href={l.para} onClick={() => setMenu(false)}>{l.rotulo}</a>)}
          <Link to={minhaArea ?? '/login'} onClick={() => setMenu(false)}>{minhaArea ? 'Minha área' : 'Entrar'}</Link>
        </div>
      )}

      <main>
        <section className={s.heroi}>
          <svg className={`${s.folha} ${s.folha1}`} viewBox="0 0 60 80" fill="none" aria-hidden><path d="M30 0 C 50 20, 50 60, 30 80 C 10 60, 10 20, 30 0 Z" fill="#5BB033" /><path d="M30 5 L 30 75" stroke="#2D6A1F" strokeWidth="1" /></svg>
          <svg className={`${s.folha} ${s.folha2}`} viewBox="0 0 70 50" fill="none" aria-hidden><path d="M0 25 C 15 5, 55 5, 70 25 C 55 45, 15 45, 0 25 Z" fill="#8BC34A" /></svg>
          <svg className={`${s.folha} ${s.folha3}`} viewBox="0 0 140 100" fill="none" aria-hidden><path d="M70 0 C 130 20, 130 80, 70 100 C 10 80, 10 20, 70 0 Z" fill="#5BB033" /></svg>
          <div className={s.heroiGrade}>
            <div>
              <p className={s.rotulo}>Marketplace de alimentação saudável</p>
              <h1 className={s.titulo}><span className={s.verde}>Coma</span> bem,<br /><span className="script">viva</span> melhor.</h1>
              <p className={s.descricao}>A primeira plataforma que conecta restaurantes saudáveis, nutricionistas com CRN e clientes em um só lugar. Cardápio personalizado, macros transparentes, pedido com um clique.</p>
              <div className={s.ctas}>
                <Link to={minhaArea ?? '/cadastro'} className={s.btnComecar}>Começar agora <ArrowRight size={18} aria-hidden /></Link>
                <Link to="/app/marketplace" className={s.btnMarketplace}><span className={s.play} aria-hidden><Play size={11} fill="currentColor" /></span>Ver marketplace</Link>
              </div>
              <div className={s.avaliacoes}>
                <div className={s.avatares} aria-hidden>{[1, 2, 3, 4, 5].map((i) => <img key={i} src={`/img/pessoas/comunidade-${i}.jpg`} alt="" />)}</div>
                <div>
                  <p className={s.avaliacoesTexto}>{n ? `${compacto(n.avaliacoes)} Avaliações` : <Skeleton altura={18} largura={140} />}</p>
                  <p className={s.estrelas} aria-label={n?.notaMedia ? `Nota média ${String(n.notaMedia).replace('.', ',')}` : undefined}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" aria-hidden />)}
                  </p>
                </div>
              </div>
            </div>
            <div className={s.pratoHeroi}>
              <span className={s.circulo} aria-hidden /><span className={s.anel} aria-hidden />
              {heroi ? (
                <Link to={`/ficha/${heroi.id}`} className={s.pratoImg} aria-label={`Ver ficha técnica: ${heroi.nome}`}>
                  <img src={heroi.imagemUrl} alt={heroi.nome} />
                </Link>
              ) : <div className={s.pratoImg}><Skeleton altura="100%" raio={999} /></div>}
              {destaques.length > 1 && (
                <div className={s.carrossel} role="group" aria-label="Pratos em destaque">
                  <span className={s.carrosselNum} aria-live="polite">{String(indice + 1).padStart(2, '0')}<span className="sr-only"> de {destaques.length}: {heroi?.nome}</span></span>
                  <span className={s.carrosselBarra} aria-hidden><span style={{ transform: `scaleX(${(indice + 1) / destaques.length})` }} /></span>
                  <button type="button" className={s.carrosselBtn} onClick={() => mover(-1)} aria-label="Prato anterior"><ArrowLeft size={14} aria-hidden /></button>
                  <button type="button" className={`${s.carrosselBtn} ${s.carrosselBtnAtivo}`} onClick={() => mover(1)} aria-label="Próximo prato"><ArrowRight size={14} aria-hidden /></button>
                </div>
              )}
              {heroi && (
                <>
                  <Chamada classe={s.cKcal} cor="var(--kcal)" valor={heroi.calorias} unidade="kcal" rotulo="Calorias" />
                  <Chamada classe={s.cProt} cor="var(--prot)" valor={Number(heroi.proteinas)} unidade="g" rotulo="Proteína" />
                  <Chamada classe={s.cCarb} cor="var(--carb)" valor={Number(heroi.carboidratos)} unidade="g" rotulo="Carbs" />
                  {heroi.fibras != null && <Chamada classe={s.cFibra} cor="var(--fiber)" valor={Number(heroi.fibras)} unidade="g" rotulo="Fibras" />}
                </>
              )}
            </div>
          </div>
        </section>

        <section className={s.destaques} aria-labelledby="destaques-titulo">
          <div className={s.secaoCabeca}>
            <div>
              <p className={s.secaoRotulo}>Em destaque</p>
              <h2 id="destaques-titulo" className={s.secaoTitulo}>Os pratos mais pedidos do <span className={s.verde}>marketplace</span></h2>
            </div>
            <Link to="/app/marketplace" className={s.secaoLink}>Ver todos <ArrowRight size={16} aria-hidden /></Link>
          </div>
          {vitrine.isError && <ErroCarregamento onTentarNovamente={() => vitrine.refetch()} />}
          <div className={s.gradePratos}>
            {vitrine.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={420} raio={24} />)}
            {vitrine.data?.destaques.map((p) => (
              <article key={p.id} className={s.prato}>
                <div className={s.pratoFoto}>
                  <span className={s.pratoFundo} aria-hidden />
                  <img src={p.imagemUrl} alt={p.nome} loading="lazy" />
                  <button type="button" className={s.pratoAdd} onClick={() => navegar(`/app/marmitas/${p.id}`)} aria-label={`Pedir ${p.nome}`}><Plus size={18} aria-hidden /></button>
                </div>
                <span className={s.pratoTag}>{p.categoria}</span>
                <h3 className={s.pratoNome}><Link to={`/ficha/${p.id}`}>{p.nome}</Link></h3>
                <p className={s.pratoRest}>{p.restaurante} · {p.cidade}</p>
                <div className={s.pratoStats}>
                  <span><strong>{p.calorias}</strong>kcal</span>
                  <span><strong>{Number(p.proteinas)}g</strong>prot</span>
                  <span><strong>{Number(p.carboidratos)}g</strong>carb</span>
                </div>
                <div className={s.pratoRodape}>
                  <Preco valor={Number(p.preco)} />
                  <span className={s.pratoNota}><Star size={14} fill="currentColor" aria-hidden /> {Number(p.notaMedia).toFixed(1)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className={s.como} aria-labelledby="como-titulo">
          <div className={s.comoCabeca}>
            <p className={s.secaoRotulo}>Como funciona</p>
            <h2 id="como-titulo" className={s.secaoTitulo}>Do <span className="script">cadastro</span> ao prato em 3 passos simples</h2>
          </div>
          <ol className={s.passos}>
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className={s.passo}>
                <span className={s.passoNum} aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className={s.passoIcone} aria-hidden><Icone size={28} /></span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="perfis" className={s.perfis} aria-labelledby="perfis-titulo">
          <div className={s.comoCabeca}>
            <p className={s.secaoRotulo}>Três perfis · Um ecossistema</p>
            <h2 id="perfis-titulo" className={s.secaoTitulo}>Feito pra quem<br />vive de <span className={s.verde}>verdade</span>.</h2>
          </div>
          <div className={s.gradePerfis}>
            {PERFIS.map((p) => (
              <Link key={p.selo} to={p.para} className={s.perfil}>
                <img src={p.imagem} alt="" loading="lazy" />
                <div className={s.perfilVeu}>
                  <span className={s.perfilSelo}>{p.selo}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                  <span className={s.perfilAcao}>{p.acao} <ArrowRight size={16} aria-hidden /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={s.numeros} aria-label="CleanEats em números">
          <div className={s.numerosGrade}>
            {[
              [n?.usuarios, 'Clientes ativos'], [n?.restaurantes, 'Restaurantes parceiros'],
              [n?.nutricionistas, 'Nutricionistas CRN'], [n?.notaMedia != null ? String(n.notaMedia).replace('.', ',') : undefined, 'Avaliação média'],
            ].map(([v, r]) => (
              <div key={r as string} className={s.numero}>
                <p className={s.numeroValor}>{v ?? '—'}</p>
                <p className={s.numeroRotulo}>{r}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={s.rodape}>
        <div className={s.rodapeDentro}>
          <div className={s.rodapeGrade}>
            <div className={s.rodapeMarca}>
              <Logo />
              <p>Marketplace de alimentação saudável que conecta restaurantes, nutricionistas e clientes em um único ecossistema. Uma plataforma TRICODE Solutions.</p>
            </div>
            <nav aria-label="Produto">
              <h4>Produto</h4>
              <ul><li><Link to="/app/marketplace">Marketplace</Link></li><li><Link to="/planos">Planos de assinatura</Link></li><li><a href="#perfis">Nutricionistas</a></li><li><Link to="/app/restaurantes">Restaurantes</Link></li></ul>
            </nav>
            <nav aria-label="Empresa">
              <h4>Empresa</h4>
              <ul><li><a href="#como-funciona">Sobre nós</a></li><li><Link to="/termos#servico">Equipe TRICODE</Link></li><li><button type="button" onClick={() => setSuporte('Carreira na TRICODE')}>Carreira</button></li><li><button type="button" onClick={() => setSuporte('Contato')}>Contato</button></li></ul>
            </nav>
            <nav aria-label="Suporte">
              <h4>Suporte</h4>
              <ul><li><button type="button" onClick={() => setSuporte('Central de ajuda')}>Central de ajuda</button></li><li><Link to="/termos">Termos de uso</Link></li><li><Link to="/privacidade">Privacidade</Link></li><li><Link to="/privacidade#direitos">LGPD</Link></li></ul>
            </nav>
          </div>
          <div className={s.rodapeBase}>
            <p>© 2026 CleanEats — TRICODE Solutions · Recife · Brasil</p>
            <p>v1.0 · MVP — UNIFACOL</p>
          </div>
        </div>
      </footer>
      <FaleConosco aberto={suporte !== null} onFechar={() => setSuporte(null)} assuntoInicial={suporte ?? ''} />
    </div>
  );
}

function Chamada({ classe, cor, valor, unidade, rotulo }: { classe: string; cor: string; valor: number; unidade: string; rotulo: string }) {
  return (
    <div className={`${s.chamada} ${classe}`} aria-hidden>
      <span className={s.ponto} style={{ background: cor }} />
      <div><p className={s.chamadaValor}>{valor}<small>{unidade}</small></p><p className={s.chamadaRotulo}>{rotulo}</p></div>
    </div>
  );
}
