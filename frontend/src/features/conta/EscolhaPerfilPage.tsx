import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChefHat, HelpCircle, Stethoscope, User } from 'lucide-react';
import { Logo, Stepper } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { HOME_DO_PERFIL } from '../../services/api';
import { CarregandoPagina } from '../../app/CarregandoPagina';
import { FaleConosco } from '../suporte/FaleConosco';
import { ETAPAS_CADASTRO, lerRascunho, ROTA_DO_PERFIL, salvarRascunho, type PerfilEscolhido } from './rascunhoCadastro';
import s from './EscolhaPerfilPage.module.css';

const PERFIS: {
  perfil: PerfilEscolhido; classe: string; tag: string; titulo: string; descricao: string; imagem: string;
  icone: typeof User; recursos: string[]; rotuloBotao: string;
}[] = [
  { perfil: 'CLIENTE', classe: 'cliente', tag: 'Mais escolhido', titulo: 'Sou Cliente', imagem: '/img/perfis/cliente.jpg', icone: User,
    descricao: 'Quero comer melhor com cardápio personalizado e pedido em 1 clique.', rotuloBotao: 'Cliente',
    recursos: ['Marketplace com 120+ restaurantes saudáveis', 'Plano alimentar montado por nutricionista', 'NutriBot 24/7 contextualizado', 'Acompanhamento de macros em tempo real'] },
  { perfil: 'NUTRICIONISTA', classe: 'nutri', tag: 'Para profissionais', titulo: 'Sou Nutricionista', imagem: '/img/perfis/nutricionista.jpg', icone: Stethoscope,
    descricao: 'Quero escalar atendimento com pratos reais e prescrição digital com CRN.', rotuloBotao: 'Nutricionista',
    recursos: ['Renda recorrente por clientes ativos', 'Editor de plano com catálogo aprovado', 'Prescrição digital com CRN validado', 'Acompanhamento de adesão em tempo real'] },
  { perfil: 'RESTAURANTE', classe: 'rest', tag: 'Para negócios', titulo: 'Sou Restaurante', imagem: '/img/perfis/restaurante.jpg', icone: ChefHat,
    descricao: 'Quero vender comida saudável pra um público fit em um canal especializado.', rotuloBotao: 'Restaurante',
    recursos: ['Acesso direto a público que busca saúde', 'Pedidos recorrentes via planos alimentares', 'Painel financeiro com extrato detalhado', 'Selo nutricional que diferencia no mercado'] },
];

/** Tela 04 — Cadastro, etapa 2: escolha do perfil (um único perfil por conta, CE-2). */
export default function EscolhaPerfilPage() {
  const { sessao, carregandoSessao, usuario } = useAuth();
  const navegar = useNavigate();
  const [escolhido, setEscolhido] = useState<PerfilEscolhido>(lerRascunho().perfil ?? 'CLIENTE');
  const [suporteAberto, setSuporteAberto] = useState(false);

  if (carregandoSessao) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/cadastro" replace />;
  if (usuario) return <Navigate to={HOME_DO_PERFIL[usuario.perfil]} replace />;   // conta já tem perfil

  const atual = PERFIS.find((p) => p.perfil === escolhido)!;
  const continuar = () => { salvarRascunho({ perfil: escolhido }); navegar(ROTA_DO_PERFIL[escolhido]); };

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <Logo />
        <Link to="/cadastro" className={s.voltarTopo}><ArrowLeft size={16} aria-hidden /> <span>Voltar</span></Link>
      </header>
      <div className={s.faixaEtapas}><Stepper etapas={ETAPAS_CADASTRO} atual={1} /></div>

      <main className={s.principal}>
        <div className={s.cabeca}>
          <p className={s.rotulo}>Etapa 2 de 3</p>
          <h1 className={s.titulo}>Qual é o seu <span className="script">perfil?</span></h1>
          <p className={s.sub}>Escolha como você vai usar o CleanEats. Cada perfil tem uma experiência feita pra ele — você pode ter apenas um por conta.</p>
        </div>

        <div className={s.perfis} role="radiogroup" aria-label="Perfil da conta">
          {PERFIS.map((p) => {
            const selecionado = p.perfil === escolhido;
            const Icone = p.icone;
            return (
              <div key={p.perfil} role="radio" aria-checked={selecionado} tabIndex={selecionado ? 0 : -1}
                className={`${s.cartao} ${s[p.classe]} ${selecionado ? s.selecionado : ''}`}
                onClick={() => setEscolhido(p.perfil)}
                onKeyDown={(e) => {
                  const i = PERFIS.findIndex((x) => x.perfil === escolhido);
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setEscolhido(PERFIS[(i + 1) % 3]!.perfil); }
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setEscolhido(PERFIS[(i + 2) % 3]!.perfil); }
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (selecionado) continuar(); else setEscolhido(p.perfil); }
                }}>
                <span className={s.selo} aria-hidden><Check size={16} /></span>
                <div className={s.imagem}>
                  <img src={p.imagem} alt="" />
                  <span className={s.icone} aria-hidden><Icone size={28} /></span>
                </div>
                <div className={s.corpo}>
                  <span className={s.tag}>{p.tag}</span>
                  <h2 className={s.tituloPerfil}>{p.titulo}</h2>
                  <p className={s.descricao}>{p.descricao}</p>
                  <ul className={s.recursos}>
                    {p.recursos.map((r) => <li key={r}><span className={s.check} aria-hidden><Check size={12} /></span>{r}</li>)}
                  </ul>
                  <span className={s.seletor} aria-hidden><span className={s.radio} />{selecionado ? 'Selecionado' : 'Escolher este perfil'}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.navegacao}>
          <Link to="/cadastro" className={s.anterior}><ArrowLeft size={16} aria-hidden /> Voltar</Link>
          <button type="button" className={`${s.proximo} ${s[`proximo-${atual.classe}`]}`} onClick={continuar}>
            Continuar como {atual.rotuloBotao} <ArrowRight size={18} aria-hidden />
          </button>
        </div>

        <aside className={s.ajuda}>
          <span className={s.ajudaIcone} aria-hidden><HelpCircle size={22} /></span>
          <p className={s.ajudaTexto}>
            <strong>Dúvida sobre qual perfil escolher?</strong><br />
            Se você quer apenas pedir comida saudável, escolha <strong>Cliente</strong>. Para os outros perfis precisamos validar documentação profissional.
          </p>
          <button type="button" className={s.ajudaLink} onClick={() => setSuporteAberto(true)}>Falar com suporte <ArrowRight size={14} aria-hidden /></button>
        </aside>
      </main>
      <FaleConosco aberto={suporteAberto} onFechar={() => setSuporteAberto(false)} assuntoInicial="Dúvida no cadastro" />
    </div>
  );
}
