import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Beef, Bot, Check, ClipboardList, Flame, Heart, Leaf, Plus, Receipt, Store, Sun, Wheat } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarNumero, partesPreco } from '../../../lib/formato';
import {
  buscarConsumo, buscarPlano, buscarResumo, desfavoritar, favoritar, listarMarmitas,
  ROTULO_OBJETIVO, ROTULO_REFEICAO, type Prato, type RefeicaoPlano,
} from '../../../services/cliente';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import { agoraEmRecife, dataPorExtenso, hojeIso, saudacao, situacaoRefeicao } from '../tempo';
import s from './HomeClientePage.module.css';

const pct = (v: number, meta: number) => (meta > 0 ? Math.min(100, Math.round((v / meta) * 100)) : 0);
const num = (v: number) => formatarNumero(Math.round(Number(v)));

/** Tela 10 — Home do cliente. Consumo, plano de hoje e recomendados vêm do banco (CE-9, CE-19, CE-4). */
export default function HomeClientePage() {
  const resumo = useQuery({ queryKey: ['cliente', 'resumo'], queryFn: buscarResumo });
  const consumo = useQuery({ queryKey: ['cliente', 'consumo', hojeIso()], queryFn: () => buscarConsumo() });
  const plano = useQuery({ queryKey: ['cliente', 'plano'], queryFn: buscarPlano });
  const recomendados = useQuery({ queryKey: ['marmitas', 'recomendados'], queryFn: () => listarMarmitas({ tamanho: 4 }) });
  const { adicionar, dialogo } = useAdicionarAoCarrinho();
  const navegar = useNavigate();

  const r = resumo.data;
  const c = consumo.data;
  const primeiroNome = r?.nome.split(' ')[0] ?? '';
  const hoje = hojeIso();
  const refeicoesHoje = (plano.data?.refeicoes ?? []).filter((x) => x.data === hoje);
  const restantes = refeicoesHoje.filter((x) => !x.consumida).length;

  const stats = c && [
    { icone: Flame, fundo: '#FEF3E5', cor: 'var(--kcal)', valor: num(c.consumo.calorias), rotulo: `de ${num(c.metas.calorias)} kcal hoje`, p: pct(c.consumo.calorias, c.metas.calorias), barra: 'var(--kcal)' },
    { icone: Beef, fundo: '#FDE2DC', cor: 'var(--prot)', valor: `${num(c.consumo.proteinas)}g`, rotulo: `de ${num(c.metas.proteinas)}g proteína`, p: pct(c.consumo.proteinas, c.metas.proteinas), barra: 'var(--prot)' },
    { icone: Wheat, fundo: '#FBF1D2', cor: 'var(--ink)', valor: `${num(c.consumo.carboidratos)}g`, rotulo: `de ${num(c.metas.carboidratos)}g carbs`, p: pct(c.consumo.carboidratos, c.metas.carboidratos), barra: 'var(--carb)' },
    { icone: Leaf, fundo: '#E0F2DD', cor: 'var(--fiber)', valor: `${num(c.consumo.fibras)}g`, rotulo: `de ${num(c.metas.fibras)}g fibras`, p: pct(c.consumo.fibras, c.metas.fibras), barra: 'var(--fiber)' },
  ];

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="home-titulo">
        <div>
          <p className={s.saudacao}><Sun size={14} aria-hidden /> {saudacao(agoraEmRecife())}{primeiroNome ? `, ${primeiroNome}!` : '!'}</p>
          <h1 id="home-titulo" className={s.titulo}>O que vamos<br /><span className="script">comer</span> hoje?</h1>
          <p className={s.sub}>
            {c ? <>
              {plano.data ? 'Seu plano da semana está atualizado. ' : ''}
              Você já consumiu {num(c.consumo.calorias)} kcal de {num(c.metas.calorias)} hoje
              {c.consumo.calorias === 0 ? ' — que tal começar pelo plano?' : pct(c.consumo.calorias, c.metas.calorias) >= 100 ? ' — meta batida!' : ' — bom ritmo!'}
            </> : <Skeleton altura={40} />}
          </p>
          <div className={s.selos}>
            {r ? <>
              <span className={s.selo}><span className={s.ponto} style={{ background: 'var(--green-primary)' }} /> Plano <strong>{r.tier === 'FREE' ? 'Free' : r.tier.charAt(0) + r.tier.slice(1).toLowerCase()}</strong></span>
              {r.objetivo && <span className={s.selo}><span className={s.ponto} style={{ background: 'var(--prot)' }} /> {ROTULO_OBJETIVO[r.objetivo]}</span>}
              {c && <span className={s.selo}><span className={s.ponto} style={{ background: 'var(--kcal)' }} /> Meta: {num(c.metas.calorias)} kcal</span>}
            </> : <Skeleton altura={38} largura={320} raio={999} />}
          </div>
          <Link to="/app/marketplace" className={s.cta}>Explorar marketplace <ArrowRight size={16} aria-hidden /></Link>
        </div>
        <div className={s.stats}>
          {consumo.isError && <ErroCarregamento onTentarNovamente={() => consumo.refetch()} />}
          {!stats && !consumo.isError && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={138} raio={18} />)}
          {stats?.map(({ icone: Icone, ...st }) => (
            <div key={st.rotulo} className={s.stat}>
              <span className={s.statIcone} style={{ background: st.fundo, color: st.cor }} aria-hidden><Icone size={20} /></span>
              <p className={s.statValor}>{st.valor}</p>
              <p className={s.statRotulo}>{st.rotulo}</p>
              <div className={s.statBarra} role="progressbar" aria-valuenow={st.p} aria-valuemin={0} aria-valuemax={100} aria-label={st.rotulo}>
                <div style={{ width: `${st.p}%`, background: st.barra }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <nav className={s.atalhos} aria-label="Atalhos">
        {[
          { para: '/app/marketplace', icone: Store, fundo: 'var(--green-bg)', cor: 'var(--green-primary)', titulo: 'Marketplace', sub: r ? `${r.restaurantes} restaurantes` : '…' },
          { para: '/app/meu-plano', icone: ClipboardList, fundo: '#FEF3E5', cor: 'var(--kcal)', titulo: 'Meu plano', sub: plano.data ? (refeicoesHoje.length ? `${restantes} ${restantes === 1 ? 'refeição' : 'refeições'} hoje` : 'Hoje é dia livre') : 'Aguardando a nutri' },
          { para: '/app/nutribot', icone: Bot, fundo: '#E8F0F8', cor: '#457B9D', titulo: 'NutriBot', sub: 'Tire dúvidas agora' },
          { para: '/app/pedidos', icone: Receipt, fundo: '#FDE2DC', cor: 'var(--prot)', titulo: 'Histórico', sub: r ? `${r.pedidos} ${r.pedidos === 1 ? 'pedido feito' : 'pedidos feitos'}` : '…' },
        ].map(({ icone: Icone, ...a }) => (
          <Link key={a.para} to={a.para} className={s.atalho}>
            <span className={s.atalhoIcone} style={{ background: a.fundo, color: a.cor }} aria-hidden><Icone size={24} /></span>
            <span className={s.atalhoTitulo}>{a.titulo}</span>
            <span className={s.atalhoSub}><span>{a.sub}</span><span className={s.seta} aria-hidden><ArrowRight size={12} /></span></span>
          </Link>
        ))}
      </nav>

      <div className={s.duasColunas}>
        <section className={s.plano} aria-labelledby="plano-hoje">
          <div className={s.planoCabeca}>
            <div>
              <h2 id="plano-hoje">Seu plano de hoje</h2>
              <p>{dataPorExtenso(hoje)}{refeicoesHoje.length ? ` · ${refeicoesHoje.length} refeições` : ''}</p>
            </div>
            {plano.data && (
              <Link to="/app/meu-plano" className={s.nutri}>
                {plano.data.nutricionista.avatarUrl
                  ? <img src={plano.data.nutricionista.avatarUrl} alt="" />
                  : <span className={s.nutriInicial} aria-hidden>{plano.data.nutricionista.nome.replace(/^Dra?\.\s*/, '')[0]}</span>}
                {plano.data.nutricionista.nome}
              </Link>
            )}
          </div>
          {plano.isLoading && <div className={s.refeicoes}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={88} raio={16} />)}</div>}
          {plano.isError && <ErroCarregamento onTentarNovamente={() => plano.refetch()} />}
          {plano.data === null && (
            <EmptyState compacto titulo="Sua nutricionista ainda não montou o plano"
              descricao="Assim que o plano da semana ficar pronto, suas refeições de hoje aparecem aqui com o botão de pedir."
              acao={r?.tier === 'FREE' || r?.tier === 'BASIC' ? { rotulo: 'Conhecer o plano Pro', onClick: () => navegar('/app/assinatura') } : undefined} />
          )}
          {plano.data && refeicoesHoje.length === 0 && (
            <EmptyState compacto titulo="Hoje é dia livre no seu plano" descricao="Aproveite com equilíbrio. Que tal ver o plano de amanhã?"
              acao={{ rotulo: 'Ver a semana', onClick: () => navegar('/app/meu-plano') }} />
          )}
          {refeicoesHoje.length > 0 && (
            <ul className={s.refeicoes}>
              {marcarAgora(refeicoesHoje).map(({ refeicao, situacao }) => (
                <li key={refeicao.id} className={`${s.refeicao} ${situacao.tipo === 'agora' ? s.refeicaoAgora : ''}`}>
                  <span className={s.refeicaoImg}>{refeicao.prato.imagemUrl && <img src={refeicao.prato.imagemUrl} alt="" loading="lazy" />}</span>
                  <div>
                    <p className={s.refeicaoHora}>{refeicao.horario?.slice(0, 5)} · {ROTULO_REFEICAO[refeicao.tipo]}{situacao.tipo === 'agora' ? ' · agora' : ''}</p>
                    <Link to={`/app/marmitas/${refeicao.prato.id}`} className={s.refeicaoNome}>{refeicao.prato.nome}</Link>
                    <p className={s.refeicaoMacros}>{refeicao.prato.macros.calorias} kcal · {num(refeicao.prato.macros.proteinas)}g prot · {num(refeicao.prato.macros.carboidratos)}g carb</p>
                  </div>
                  <div className={s.refeicaoStatus}>
                    {situacao.tipo === 'consumida' && <><span className={s.consumido}>Consumido</span><span className={s.check} aria-hidden><Check size={14} /></span></>}
                    {situacao.tipo === 'agora' && (
                      <button type="button" className={s.pedir} onClick={() => adicionar(refeicao.prato, { irParaCarrinho: true, observacao: refeicao.observacao ?? undefined })}>
                        Pedir agora <ArrowRight size={12} aria-hidden />
                      </button>
                    )}
                    {situacao.tipo === 'futura' && <span className={s.pendente}>{situacao.texto}</span>}
                    {situacao.tipo === 'passou' && (
                      <button type="button" className={s.pedirLinha} onClick={() => adicionar(refeicao.prato, { irParaCarrinho: true, observacao: refeicao.observacao ?? undefined })}>Pedir</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.macros} aria-labelledby="macros-hoje">
          <div className={s.macrosCabeca}>
            <h2 id="macros-hoje">Macros de hoje</h2>
            <p>Atualizado a cada pedido</p>
          </div>
          {c ? <>
            <AnelKcal consumido={c.consumo.calorias} meta={c.metas.calorias} />
            <ul className={s.macrosLista}>
              {[
                { letra: 'P', nome: 'Proteína', v: c.consumo.proteinas, m: c.metas.proteinas, cor: 'var(--prot)' },
                { letra: 'C', nome: 'Carboidratos', v: c.consumo.carboidratos, m: c.metas.carboidratos, cor: 'var(--carb)', escuro: true },
                { letra: 'G', nome: 'Gordura', v: c.consumo.gorduras, m: c.metas.gorduras, cor: 'var(--fat)' },
                { letra: 'F', nome: 'Fibras', v: c.consumo.fibras, m: c.metas.fibras, cor: 'var(--fiber)' },
              ].map((x) => (
                <li key={x.letra} className={s.macro}>
                  <span className={s.macroIcone} style={{ background: x.cor, color: x.escuro ? 'var(--ink)' : 'var(--white)' }} aria-hidden>{x.letra}</span>
                  <div className={s.macroInfo}>
                    <p className={s.macroTopo}><span>{x.nome}</span><span>{num(x.v)} / {num(x.m)}g</span></p>
                    <div className={s.macroBarra} role="progressbar" aria-label={x.nome} aria-valuenow={pct(x.v, x.m)} aria-valuemin={0} aria-valuemax={100}>
                      <div style={{ width: `${pct(x.v, x.m)}%`, background: x.cor }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </> : <Skeleton altura={380} raio={16} />}
        </section>
      </div>

      <section className={s.recomendados} aria-labelledby="rec-titulo">
        <div className={s.secaoCabeca}>
          <h2 id="rec-titulo" className={s.secaoTitulo}>Recomendado <span className={s.verde}>pra você</span></h2>
          <Link to="/app/marketplace" className={s.secaoLink}>Ver todos <ArrowRight size={14} aria-hidden /></Link>
        </div>
        {recomendados.isError && <ErroCarregamento onTentarNovamente={() => recomendados.refetch()} />}
        <div className={s.gradeRec}>
          {recomendados.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={400} raio={22} />)}
          {recomendados.data?.itens.map((p) => <CardRecomendado key={p.id} prato={p} onAdicionar={() => adicionar(p)} />)}
        </div>
        {recomendados.data?.itens.length === 0 && (
          <EmptyState titulo="Nenhum prato compatível agora" descricao="Suas restrições escondem os pratos disponíveis. Ajuste no perfil ou veja o marketplace completo." />
        )}
      </section>
      {dialogo}
    </div>
  );
}

/** A primeira refeição ainda não consumida perto do horário vira "agora" (destaque da tela 10). */
function marcarAgora(refeicoes: RefeicaoPlano[]) {
  const agora = agoraEmRecife();
  let marcou = false;
  return refeicoes.map((refeicao) => {
    let situacao = situacaoRefeicao(refeicao, agora);
    if (situacao.tipo === 'agora') {
      if (marcou) situacao = { tipo: 'futura', texto: 'Em seguida' };
      marcou = true;
    }
    return { refeicao, situacao };
  });
}

function AnelKcal({ consumido, meta }: { consumido: number; meta: number }) {
  const raio = 80;
  const circ = 2 * Math.PI * raio;
  const p = meta > 0 ? Math.min(consumido / meta, 1) : 0;
  return (
    <div className={s.anel} role="img" aria-label={`${num(consumido)} de ${num(meta)} kcal, ${pct(consumido, meta)}% da meta`}>
      <svg viewBox="0 0 180 180" className={s.anelSvg} aria-hidden>
        <circle cx="90" cy="90" r={raio} className={s.anelTrilha} />
        <circle cx="90" cy="90" r={raio} className={s.anelProgresso} strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} />
      </svg>
      <div className={s.anelCentro}>
        <span className={s.anelNum}>{num(consumido)}</span>
        <span className={s.anelDe}>/ {num(meta)} kcal</span>
        <span className={s.anelRotulo}>{pct(consumido, meta)}% da meta</span>
      </div>
    </div>
  );
}

function CardRecomendado({ prato, onAdicionar }: { prato: Prato; onAdicionar: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fav = useMutation({
    mutationFn: () => (prato.favorito ? desfavoritar(prato.id) : favoritar(prato.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marmitas'] }),
    onError: () => toast('Não foi possível atualizar o favorito', 'erro'),
  });
  const { reais, centavos } = partesPreco(Number(prato.preco));
  return (
    <article className={s.rec}>
      <div className={s.recImg}>
        {prato.imagemUrl && <img src={prato.imagemUrl} alt={prato.nome} loading="lazy" />}
        <span className={s.recTag}>{prato.categoria}</span>
        <button type="button" className={`${s.recFav} ${prato.favorito ? s.recFavAtivo : ''}`} onClick={() => fav.mutate()} disabled={fav.isPending}
          aria-pressed={prato.favorito} aria-label={prato.favorito ? `Remover ${prato.nome} dos favoritos` : `Favoritar ${prato.nome}`}>
          <Heart size={16} fill={prato.favorito ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>
      <p className={s.recRest}>{prato.restaurante.nome}</p>
      <h3 className={s.recNome}><Link to={`/app/marmitas/${prato.id}`}>{prato.nome}</Link></h3>
      <div className={s.recMacros}>
        <span><span className={s.ponto} style={{ background: 'var(--kcal)' }} />{prato.macros.calorias}kcal</span>
        <span><span className={s.ponto} style={{ background: 'var(--prot)' }} />{num(prato.macros.proteinas)}g</span>
      </div>
      <div className={s.recRodape}>
        <p className={s.recPreco}>R$ {reais}<small>,{centavos}</small></p>
        <button type="button" className={s.recAdd} onClick={onAdicionar} aria-label={`Adicionar ${prato.nome} ao carrinho`}><Plus size={18} aria-hidden /></button>
      </div>
    </article>
  );
}
