import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Clock, MapPin, Plus, Share2, ShieldCheck, Star, Store } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarNumero, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarRestaurante, formatarCep, type Prato } from '../../../services/cliente';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import { agoraEmRecife } from '../tempo';
import s from './PerfilRestaurantePage.module.css';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const slug = (t: string) => t.normalize('NFD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
const um = (v: number) => formatarNumero(Math.round(Number(v)));

/** Tela 14 — Perfil do restaurante: dados, horário, cardápio por categoria (restrições do cliente escondem pratos). */
export default function PerfilRestaurantePage() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { adicionar, dialogo } = useAdicionarAoCarrinho();
  const detalhe = useQuery({ queryKey: ['restaurantes', 'detalhe', id], queryFn: () => buscarRestaurante(id), retry: (n, e) => !(e instanceof ErroApi && e.status === 404) && n < 2 });
  const [secaoAtiva, setSecaoAtiva] = useState('destaques');

  if (detalhe.isError) {
    return <div className={s.erro}>{detalhe.error instanceof ErroApi && detalhe.error.status === 404
      ? <EmptyState icone={<Store size={28} aria-hidden />} titulo="Restaurante indisponível" descricao="Ele pode estar em análise ou sem pratos aprovados no momento." acao={{ rotulo: 'Ver restaurantes', onClick: () => navegar('/app/restaurantes') }} />
      : <ErroCarregamento onTentarNovamente={() => detalhe.refetch()} />}</div>;
  }
  const d = detalhe.data;
  if (!d) return <div><Skeleton altura={320} raio={0} /><div className={s.erro}><Skeleton altura={200} raio={28} /></div></div>;

  const r = d.restaurante;
  const [primeira, ...resto] = r.nome.split(' ');
  const hoje = agoraEmRecife().getDay();
  const secoes = [{ id: 'destaques', nome: 'Destaques', pratos: d.destaques }, ...d.secoes.map((x) => ({ id: slug(x.categoria), nome: x.categoria, pratos: x.pratos }))].filter((x) => x.pratos.length > 0);
  const totalPratos = secoes.reduce((t, x) => t + x.pratos.length, 0);

  async function compartilhar() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${r.nome} no CleanEats`, url });
      else { await navigator.clipboard.writeText(url); toast('Link copiado', 'sucesso'); }
    } catch { /* cancelado pelo usuário */ }
  }

  return (
    <div className={s.pagina}>
      <nav className={s.trilhaBarra} aria-label="Você está em">
        <div className={s.trilha}><Link to="/app">Home</Link><span aria-hidden>/</span><Link to="/app/restaurantes">Restaurantes</Link><span aria-hidden>/</span><span className={s.atual} aria-current="page">{r.nome}</span></div>
      </nav>
      <div className={s.capa}>
        {r.capaUrl && <img src={r.capaUrl} alt="" />}
        <Link to="/app/restaurantes" className={s.voltar}><ArrowLeft size={14} aria-hidden /> Voltar</Link>
        <div className={s.capaAcoes}><button type="button" onClick={compartilhar} aria-label="Compartilhar restaurante"><Share2 size={18} aria-hidden /></button></div>
      </div>

      <div className={s.cabecalho}>
        <div className={s.cabecalhoCartao}>
          <span className={s.logoGrande} aria-hidden>{r.logoUrl ? <img src={r.logoUrl} alt="" /> : r.sigla}</span>
          <div className={s.info}>
            <div className={s.tags}>
              <span className={`${s.tag} ${s.verificado}`}><BadgeCheck size={12} aria-hidden /> Verificado</span>
              {r.cozinhas.map((c) => <span key={c} className={`${s.tag} ${s.cozinha}`}>{c}</span>)}
            </div>
            <h1 className={s.nome}>{primeira} {resto.length > 0 && <span className="script">{resto.join(' ')}</span>}</h1>
            {r.descricao && <p className={s.descricao}>{r.descricao}</p>}
            <p className={s.meta}>
              <span className={r.aberto ? s.aberto : s.fechadoTxt}><span className={s.ponto} aria-hidden />{r.aberto ? 'Aberto agora' : r.abreAs ? `Fechado · abre ${r.abreAs}` : 'Fechado agora'}</span>
              {r.bairro && <span><MapPin size={13} aria-hidden /> {r.bairro}</span>}
              <span><Clock size={13} aria-hidden /> Entrega em <strong>{r.tempoEntregaMin}-{r.tempoEntregaMax}min</strong></span>
              <span>Taxa: <strong>{Number(r.taxaEntrega) === 0 ? 'Grátis' : formatarMoeda(Number(r.taxaEntrega))}</strong></span>
              {Number(r.pedidoMinimo) > 0 && <span>Pedido mín. <strong>{formatarMoeda(Number(r.pedidoMinimo))}</strong></span>}
            </p>
          </div>
          {r.totalAvaliacoes > 0 && (
            <div className={s.notaGrande}><p><Star size={18} fill="currentColor" className={s.estrela} aria-hidden /> {Number(r.nota).toFixed(1)}</p><span>{r.totalAvaliacoes} avaliações</span></div>
          )}
        </div>
      </div>

      <div className={s.conteudo}>
        <div className={s.cardapio}>
          {secoes.length > 1 && (
            <nav className={s.nav} aria-label="Categorias do cardápio">
              {secoes.map((x) => (
                <a key={x.id} href={`#${x.id}`} className={`${s.navItem} ${secaoAtiva === x.id ? s.navAtivo : ''}`}
                  onClick={(e) => { e.preventDefault(); setSecaoAtiva(x.id); document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                  {x.nome} <span className={s.contagem}>{x.pratos.length}</span>
                </a>
              ))}
            </nav>
          )}
          {totalPratos === 0 && <EmptyState titulo="Nenhum prato compatível com suas restrições" descricao="As restrições do seu perfil escondem os pratos deste restaurante." />}
          {secoes.map((x) => (
            <section key={x.id} id={x.id} className={s.secao} aria-labelledby={`t-${x.id}`}>
              <div className={s.secaoCabeca}>
                <h2 id={`t-${x.id}`} className={s.secaoTitulo}>{x.id === 'destaques' ? 'Destaques da casa' : x.nome}</h2>
                <span className={s.secaoContagem}>{x.pratos.length} {x.pratos.length === 1 ? 'prato' : 'pratos'}</span>
              </div>
              <ul className={s.pratos}>{x.pratos.map((p, i) => <ItemPrato key={p.id} p={p} selo={x.id === 'destaques' && i === 0 ? 'Top vendido' : undefined} onAdicionar={() => adicionar(p)} />)}</ul>
            </section>
          ))}
        </div>

        <aside className={s.lateral}>
          <section className={s.cartao} aria-labelledby="horario-titulo">
            <h2 id="horario-titulo" className={s.cartaoTitulo}><Clock size={16} aria-hidden /> Horário de funcionamento</h2>
            <ul className={s.horarios}>
              {ORDEM_SEMANA.map((dia) => {
                const hs = d.horarios.filter((h) => h.diaSemana === dia);
                return (
                  <li key={dia} className={`${dia === hoje ? s.hoje : ''} ${hs.length === 0 ? s.fechadoDia : ''}`}>
                    <span className={s.dia}>{DIAS[dia]}{dia === hoje ? ' · hoje' : ''}</span>
                    <span className={s.hora}>{hs.length ? hs.map((h) => `${h.abre.slice(0, 5)} - ${h.fecha.slice(0, 5)}`).join(' · ') : 'Fechado'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          {d.logradouro && (
            <section className={s.cartao} aria-labelledby="end-titulo">
              <h2 id="end-titulo" className={s.cartaoTitulo}><MapPin size={16} aria-hidden /> Endereço</h2>
              <p className={s.endereco}>{d.logradouro}{d.numero ? `, ${d.numero}` : ''}<br />{r.bairro}, {d.cidade} · {d.uf}{d.cep && <><br />CEP {formatarCep(d.cep)}</>}</p>
              {d.telefone && <p className={s.endereco}>{d.telefone}</p>}
              <a className={s.mapaLink} href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${d.logradouro} ${d.numero ?? ''} ${d.cidade}`)}`} target="_blank" rel="noreferrer">Ver no mapa</a>
            </section>
          )}
          {d.curadoria && (
            <section className={`${s.cartao} ${s.curadoria}`} aria-labelledby="cur-titulo">
              <p className={s.curadoriaRotulo} id="cur-titulo"><ShieldCheck size={14} aria-hidden /> Aprovado por</p>
              <p className={s.curadoriaSub}>Nutricionista da curadoria</p>
              <p className={s.curadoriaNome}>{d.curadoria.nome}</p>
              <p className={s.curadoriaCrn}>{d.curadoria.crn}</p>
              <p className={s.curadoriaTexto}>Todos os pratos têm ficha técnica nutricional validada antes de entrar no marketplace.</p>
            </section>
          )}
        </aside>
      </div>
      {dialogo}
    </div>
  );
}

function ItemPrato({ p, selo, onAdicionar }: { p: Prato; selo?: string; onAdicionar: () => void }) {
  const pr = partesPreco(Number(p.preco));
  return (
    <li className={s.prato}>
      <span className={s.pratoImg}>{p.imagemUrl && <img src={p.imagemUrl} alt="" loading="lazy" />}<span className={s.pratoSelo}>{selo ?? p.categoria}</span></span>
      <div className={s.pratoCorpo}>
        <h3 className={s.pratoNome}><Link to={`/app/marmitas/${p.id}`}>{p.nome}</Link></h3>
        {p.descricao && <p className={s.pratoDesc}>{p.descricao}</p>}
        <p className={s.pratoMacros}>
          <span><span className={s.pontoMacro} style={{ background: 'var(--kcal)' }} />{p.macros.calorias} kcal</span>
          <span><span className={s.pontoMacro} style={{ background: 'var(--prot)' }} />{um(p.macros.proteinas)}g prot</span>
          <span><span className={s.pontoMacro} style={{ background: 'var(--carb)' }} />{um(p.macros.carboidratos)}g carb</span>
          <span><span className={s.pontoMacro} style={{ background: 'var(--fat)' }} />{um(p.macros.gorduras)}g gord</span>
        </p>
      </div>
      <div className={s.pratoDireita}>
        <p className={s.pratoPreco}>R$ {pr.reais}<small>,{pr.centavos}</small></p>
        <button type="button" className={s.pratoAdd} onClick={onAdicionar} aria-label={`Adicionar ${p.nome} ao carrinho`}><Plus size={18} aria-hidden /></button>
      </div>
    </li>
  );
}
