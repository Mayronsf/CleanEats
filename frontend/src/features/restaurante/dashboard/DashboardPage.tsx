import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, DollarSign, FileDown, FileText, Plus, Settings, Star, UtensilsCrossed } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton } from '../../../design-system';
import { formatarMoeda, formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarResumoPainel, ROTULO_STATUS } from '../../../services/restaurante';
import s from './DashboardPage.module.css';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const pct = (atual: number, anterior: number) => (anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null);

/** Tela 36 — Dashboard do restaurante (CE-14): pedidos em andamento, métricas do mês e atalhos. Novos pedidos chegam em tempo real. */
export default function DashboardPage() {
  const resumo = useQuery({ queryKey: ['restaurante', 'resumo'], queryFn: buscarResumoPainel });
  const hoje = new Date();

  if (resumo.isError) return <ErroCarregamento mensagem={resumo.error instanceof ErroApi ? resumo.error.message : undefined} onTentarNovamente={() => resumo.refetch()} />;
  if (!resumo.data) return <div className={s.pagina}><Skeleton altura={60} raio={16} /><div style={{ height: 24 }} /><Skeleton altura={130} raio={28} /><div style={{ height: 24 }} /><Skeleton altura={170} raio={22} /></div>;

  const r = resumo.data; const m = r.metricas;
  const pedidosVar = pct(m.pedidosMes, m.pedidosMesAnterior);
  const receitaVar = pct(Number(m.receitaMes), Number(m.receitaMesAnterior));
  const mesAnterior = MESES[(hoje.getMonth() + 11) % 12];
  const preparoVar = m.tempoPreparoMin != null && m.tempoPreparoAnterior != null ? m.tempoPreparoMin - m.tempoPreparoAnterior : null;

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div>
          <h1 className={s.titulo}>Olá, <span className="script">{r.restaurante.nome}!</span></h1>
          <p className={s.data}>{DIAS[hoje.getDay()]} · {hoje.getDate()} de {MESES[hoje.getMonth()]} de {hoje.getFullYear()}</p>
        </div>
      </header>

      {r.restaurante.statusAprovacao !== 'APROVADO' && (
        <div className={s.avisoAprovacao} role="status">
          {r.restaurante.statusAprovacao === 'PENDENTE' ? 'Seu cadastro está em análise pela equipe CleanEats. Os pratos aparecem no marketplace depois da aprovação.'
            : `Cadastro rejeitado: ${r.restaurante.motivoRejeicao ?? 'fale com o suporte'}. Corrija em Perfil e reenvie.`}
        </div>
      )}

      <section className={s.heroi} aria-labelledby="andamento">
        <div>
          <h2 id="andamento">Você tem <span className="script">{r.emAndamento} {r.emAndamento === 1 ? 'pedido' : 'pedidos'}</span> em andamento</h2>
          <p>{r.novosUltimos15Min > 0 ? `${r.novosUltimos15Min} ${r.novosUltimos15Min === 1 ? 'novo pedido chegou' : 'novos pedidos chegaram'} nos últimos 15 minutos. Verifique a fila de preparo.`
            : r.novos > 0 ? `${r.novos} ${r.novos === 1 ? 'pedido aguarda' : 'pedidos aguardam'} sua confirmação.` : 'Nenhum pedido novo esperando agora. Novos pedidos aparecem aqui na hora.'}</p>
        </div>
        <Link to={r.novos > 0 ? '/restaurante/pedidos?aba=NOVOS' : '/restaurante/pedidos'} className={s.verPedidos}><FileText size={16} aria-hidden /> Ver pedidos</Link>
      </section>

      <ul className={s.metricas}>
        <Metrica icone={<FileText size={20} />} tom="coral" valor={formatarNumero(m.pedidosMes)} rotulo="Pedidos no mês"
          variacao={pedidosVar == null ? 'primeiro mês' : `${pedidosVar >= 0 ? '+' : ''}${pedidosVar}% vs ${mesAnterior}`} positiva={(pedidosVar ?? 0) >= 0} />
        <Metrica icone={<DollarSign size={20} />} tom="verde" valor={formatarMoeda(Number(m.receitaMes)).replace(/,00$/, '')} rotulo="Receita bruta"
          variacao={receitaVar == null ? 'primeiro mês' : `${receitaVar >= 0 ? '+' : ''}${receitaVar}% vs ${mesAnterior}`} positiva={(receitaVar ?? 0) >= 0} />
        <Metrica icone={<Star size={20} />} tom="azul" valor={m.notaMedia != null ? Number(m.notaMedia).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '—'} rotulo="Avaliação média"
          variacao={`${m.avaliacoesMes} ${m.avaliacoesMes === 1 ? 'avaliação' : 'avaliações'} este mês`} positiva />
        <Metrica icone={<Clock size={20} />} tom="laranja" valor={m.tempoPreparoMin != null ? `${m.tempoPreparoMin} min` : '—'} rotulo="Tempo médio preparo"
          variacao={preparoVar == null ? 'aceite até pronto' : `${preparoVar <= 0 ? '' : '+'}${preparoVar} min vs ${mesAnterior}`} positiva={(preparoVar ?? 0) <= 0} />
      </ul>

      <div className={s.grade}>
        <section className={s.cartao} aria-labelledby="recentes">
          <div className={s.cabeca}>
            <div><h2 id="recentes" className={s.cartaoTitulo}>Pedidos recentes</h2><p className={s.cartaoSub}>Últimos pedidos em andamento</p></div>
            <Link to="/restaurante/pedidos" className={s.link}>Ver todos</Link>
          </div>
          {r.recentes.length === 0 ? <EmptyState compacto titulo="Nenhum pedido em andamento" descricao="Os novos pedidos aparecem aqui em tempo real." /> : (
            <ul className={s.recentes}>
              {r.recentes.map((p) => (
                <li key={p.id}>
                  <Link to={`/restaurante/pedidos${p.status === 'NOVO' ? '?aba=NOVOS' : ''}`} className={s.recente}>
                    <span className={s.codigo}>#{p.codigo.replace(/^CE-/, '')}</span>
                    <span className={s.recenteInfo}><strong>{p.cliente}</strong><small>{p.itens.reduce((t, i) => t + i.quantidade, 0)} {p.itens.length === 1 && p.itens[0]!.quantidade === 1 ? 'item' : 'itens'} · {formatarMoeda(Number(p.total))}</small></span>
                    <span className={`${s.status} ${s[`st${p.status}`] ?? ''}`}>{ROTULO_STATUS[p.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.cartao} aria-labelledby="atalhos">
          <h2 id="atalhos" className={s.cartaoTitulo}>Ações rápidas</h2>
          <div className={s.atalhos}>
            <Atalho para="/restaurante/cardapio/novo" icone={<Plus size={20} />} tom="coral" rotulo="Novo prato" />
            <Atalho para="/restaurante/cardapio" icone={<UtensilsCrossed size={20} />} tom="verde" rotulo="Ver cardápio" />
            <Atalho para="/restaurante/analytics" icone={<BarChart3 size={20} />} tom="azul" rotulo="Analytics" />
            <Atalho para="/restaurante/financeiro" icone={<DollarSign size={20} />} tom="laranja" rotulo="Financeiro" />
            <Atalho para="/restaurante/relatorios" icone={<FileDown size={20} />} tom="cinza" rotulo="Relatórios" />
            <Atalho para="/restaurante/perfil" icone={<Settings size={20} />} tom="coral" rotulo="Perfil" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metrica({ icone, tom, valor, rotulo, variacao, positiva }: { icone: React.ReactNode; tom: string; valor: string; rotulo: string; variacao: string; positiva: boolean }) {
  return (
    <li className={s.metrica}>
      <span className={`${s.metricaIcone} ${s[tom]}`} aria-hidden>{icone}</span>
      <strong>{valor}</strong><span className={s.metricaRotulo}>{rotulo}</span>
      <span className={`${s.variacao} ${positiva ? s.sobe : s.desce}`}>{variacao}</span>
    </li>
  );
}

function Atalho({ para, icone, tom, rotulo }: { para: string; icone: React.ReactNode; tom: string; rotulo: string }) {
  return <Link to={para} className={s.atalho}><span className={`${s.atalhoIcone} ${s[tom]}`} aria-hidden>{icone}</span>{rotulo}</Link>;
}
