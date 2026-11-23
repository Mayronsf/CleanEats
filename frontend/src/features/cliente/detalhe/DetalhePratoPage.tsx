import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Apple, ArrowRight, BadgeCheck, Banana, Beef, Carrot, Clock, Droplet, Drumstick, Egg, ExternalLink, Fish, Heart, Leaf, MapPin,
  Milk, Minus, PieChart, Plus, Sprout, Star, Wheat, type LucideIcon,
} from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarNumero, partesPreco } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { buscarMarmita, desfavoritar, favoritar, type Prato } from '../../../services/cliente';
import { urlFichaTecnica } from '../../../services/fichas';
import { useAdicionarAoCarrinho } from '../useAdicionarAoCarrinho';
import s from './DetalhePratoPage.module.css';

const ICONES: [RegExp, LucideIcon][] = [
  [/frango|peito|peru/i, Drumstick], [/carne|patinho|fil[eé] mignon|steak/i, Beef], [/salm[aã]o|til[aá]pia|peixe|atum/i, Fish],
  [/ovo|clara|omelete/i, Egg], [/batata|cenoura|mandioq|ab[oó]bora/i, Carrot], [/arroz|quinoa|aveia|tapioca|trigo|p[aã]o|granola|wrap/i, Wheat],
  [/azeite|[oó]leo|molho/i, Droplet], [/banana/i, Banana], [/a[cç]a[ií]|morango|fruta|ma[cç][aã]/i, Apple], [/leite|iogurte|queijo|whey/i, Milk],
  [/erva|especiaria|tempero|alho|cebola/i, Sprout],
];
const iconeIngrediente = (nome: string) => ICONES.find(([re]) => re.test(nome))?.[1] ?? Leaf;

const relativo = (iso: string) => {
  const dias = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 7) return `Há ${dias} dias`;
  if (dias < 14) return 'Há 1 semana';
  return `Há ${Math.floor(dias / 7)} semanas`;
};
const um = (v: number) => formatarNumero(Math.round(Number(v)));

/** Tela 12 — Detalhe da marmita: macros, ingredientes, QR Code real da ficha, avaliações publicadas (CE-4, CE-11). */
export default function DetalhePratoPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [quantidade, setQuantidade] = useState(1);
  const { adicionar, dialogo } = useAdicionarAoCarrinho();
  const detalhe = useQuery({ queryKey: ['marmitas', 'detalhe', id], queryFn: () => buscarMarmita(id), retry: (n, e) => !(e instanceof ErroApi && e.status === 404) && n < 2 });
  const fav = useMutation({
    mutationFn: (p: Prato) => (p.favorito ? desfavoritar(p.id) : favoritar(p.id)),
    onSuccess: (_, p) => { toast(p.favorito ? 'Removido dos favoritos' : 'Salvo nos favoritos', 'sucesso'); return qc.invalidateQueries({ queryKey: ['marmitas'] }); },
    onError: () => toast('Não foi possível atualizar o favorito', 'erro'),
  });

  if (detalhe.isError) {
    const naoExiste = detalhe.error instanceof ErroApi && detalhe.error.status === 404;
    return (
      <div className={s.pagina}>
        {naoExiste
          ? <EmptyState titulo="Prato indisponível" descricao="Este prato saiu do cardápio ou ainda não foi aprovado pela curadoria." acao={{ rotulo: 'Voltar ao marketplace', onClick: () => history.back() }} />
          : <ErroCarregamento onTentarNovamente={() => detalhe.refetch()} />}
      </div>
    );
  }
  if (!detalhe.data) {
    return (
      <div className={s.pagina}>
        <div className={s.topo}><Skeleton altura={560} raio={28} /><div className={s.info}><Skeleton altura={44} /><Skeleton altura={96} /><Skeleton altura={120} /><Skeleton altura={260} raio={22} /></div></div>
      </div>
    );
  }

  const { prato, restaurante, ingredientes, avaliacoes, similares, sodioMg, compativelCom } = detalhe.data;
  const m = prato.macros;
  // Proporção em gramas de P/C/G, como na tela 12 (38g · 46%) e no MacroBar do design system
  const kp = Number(m.proteinas), kc = Number(m.carboidratos), kg = Number(m.gorduras);
  const kt = kp + kc + kg || 1;
  const pct = (k: number) => Math.round((k / kt) * 100);
  const palavras = prato.nome.split(' ');
  const ultima = palavras.length > 1 ? palavras.pop() : null;
  const total = Number(prato.preco) * quantidade;
  const { reais, centavos } = partesPreco(total);
  const pedir = () => adicionar(prato, { quantidade, irParaCarrinho: true });

  return (
    <div className={s.pagina}>
      <nav className={s.trilha} aria-label="Você está em">
        <Link to="/app">Home</Link><span aria-hidden>/</span>
        <Link to="/app/marketplace">Marketplace</Link><span aria-hidden>/</span>
        <Link to={`/app/marketplace?busca=${encodeURIComponent(prato.categoria)}`}>{prato.categoria}</Link><span aria-hidden>/</span>
        <span className={s.atual} aria-current="page">{prato.nome}</span>
      </nav>

      <section className={s.topo}>
        <div className={s.galeria}>
          {prato.imagemUrl ? <img src={prato.imagemUrl} alt={prato.nome} /> : <span className={s.semFoto}><Leaf size={48} aria-hidden /></span>}
          <div className={s.selos}>
            {prato.aprovadoPorNutri && <span className={`${s.selo} ${s.seloAprovado}`}><BadgeCheck size={14} aria-hidden /> Aprovado por nutricionista</span>}
            <span className={s.selo}>{prato.categoria}</span>
          </div>
          <button type="button" className={s.fav} onClick={() => fav.mutate(prato)} disabled={fav.isPending} aria-pressed={prato.favorito}
            aria-label={prato.favorito ? 'Remover dos favoritos' : 'Salvar nos favoritos'}>
            <Heart size={22} fill={prato.favorito ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>

        <div className={s.info}>
          <div className={s.restaurante}>
            <Link to={`/app/restaurantes/${prato.restaurante.id}`} className={s.restLogo} aria-hidden tabIndex={-1}>
              {restaurante.logoUrl ? <img src={restaurante.logoUrl} alt="" /> : prato.restaurante.sigla}
            </Link>
            <div>
              <Link to={`/app/restaurantes/${prato.restaurante.id}`} className={s.restNome}>{prato.restaurante.nome}</Link>
              <p className={s.restMeta}><MapPin size={12} aria-hidden /> {restaurante.cidade} · <Clock size={12} aria-hidden /> {prato.restaurante.tempoEntregaMin}-{prato.restaurante.tempoEntregaMax}min</p>
            </div>
            {restaurante.totalAvaliacoes > 0 && (
              <span className={s.restNota}><Star size={14} fill="currentColor" className={s.estrela} aria-hidden /> {Number(restaurante.nota).toFixed(1)} <span>({restaurante.totalAvaliacoes})</span></span>
            )}
          </div>
          <h1 className={s.titulo}>{palavras.join(' ')}{ultima && <><br /><em>{ultima}</em></>}</h1>
          {prato.descricao && <p className={s.descricao}>{prato.descricao}</p>}

          <div className={s.macros}>
            {[
              { v: m.calorias, u: 'kcal', r: 'Calorias', cor: 'var(--kcal)', icone: <Clock size={16} aria-hidden /> },
              { v: um(m.proteinas), u: 'g', r: 'Proteína', cor: 'var(--prot)', icone: 'P' },
              { v: um(m.carboidratos), u: 'g', r: 'Carboidrato', cor: 'var(--carb)', icone: 'C', escuro: true },
              { v: um(m.gorduras), u: 'g', r: 'Gordura', cor: 'var(--fat)', icone: 'G' },
            ].map((x) => (
              <div key={x.r} className={s.macro}>
                <span className={s.macroIcone} style={{ background: x.cor, color: x.escuro ? 'var(--ink)' : 'var(--white)' }} aria-hidden>
                  {x.r === 'Calorias' ? <FlameIcone /> : x.icone}
                </span>
                <p className={s.macroValor}>{x.v}<small>{x.u}</small></p>
                <p className={s.macroRotulo}>{x.r}</p>
              </div>
            ))}
          </div>

          <div className={s.nutricao}>
            <div className={s.nutricaoCabeca}>
              <h2><PieChart size={18} aria-hidden /> Distribuição nutricional</h2>
              {prato.porcaoG && <span>Porção {prato.porcaoG}g</span>}
            </div>
            <div className={s.nutricaoBarra} role="img" aria-label={`Proteínas ${pct(kp)}%, carboidratos ${pct(kc)}%, gorduras ${pct(kg)}% dos macronutrientes`}>
              <span style={{ width: `${pct(kp)}%`, background: 'var(--prot)' }} />
              <span style={{ width: `${pct(kc)}%`, background: 'var(--carb)' }} />
              <span style={{ width: `${pct(kg)}%`, background: 'var(--fat)' }} />
            </div>
            <dl className={s.nutricaoLista}>
              <div><dt>Proteínas</dt><dd>{um(m.proteinas)}g · {pct(kp)}%</dd></div>
              <div><dt>Carboidratos</dt><dd>{um(m.carboidratos)}g · {pct(kc)}%</dd></div>
              <div><dt>Gorduras totais</dt><dd>{um(m.gorduras)}g · {pct(kg)}%</dd></div>
              {m.fibras != null && <div><dt>Fibras alimentares</dt><dd>{um(m.fibras)}g</dd></div>}
              {sodioMg != null && <div><dt>Sódio</dt><dd>{sodioMg}mg</dd></div>}
            </dl>
            {compativelCom.length > 0 && <p className={s.compativel}>Compatível com: {compativelCom.join(' · ')}</p>}
          </div>

          <div className={s.cta}>
            <div className={s.qtd} role="group" aria-label="Quantidade">
              <button type="button" onClick={() => setQuantidade((q) => Math.max(1, q - 1))} disabled={quantidade <= 1} aria-label="Diminuir"><Minus size={16} aria-hidden /></button>
              <span aria-live="polite">{quantidade}</span>
              <button type="button" onClick={() => setQuantidade((q) => Math.min(20, q + 1))} disabled={quantidade >= 20} aria-label="Aumentar"><Plus size={16} aria-hidden /></button>
            </div>
            <p className={s.ctaPreco}>R$ {reais}<small>,{centavos}</small></p>
            <button type="button" className={s.ctaBotao} onClick={pedir}>Adicionar ao pedido <span aria-hidden><ArrowRight size={16} /></span></button>
          </div>
        </div>
      </section>

      <section className={s.baixo}>
        <div className={s.ingredientes}>
          <h2 className={s.secaoTitulo}>Ingredientes <span className="script">naturais</span></h2>
          <p className={s.secaoSub}>Insumos frescos, sem conservantes artificiais.</p>
          {ingredientes.length === 0
            ? <p className={s.secaoSub}>O restaurante ainda não detalhou os ingredientes deste prato.</p>
            : (
              <ul className={s.gradeIngredientes}>
                {ingredientes.map((i) => {
                  const Icone = iconeIngrediente(i.nome);
                  return (
                    <li key={i.nome} className={s.ingrediente}>
                      <span className={s.ingredienteIcone} aria-hidden><Icone size={22} /></span>
                      <div><p className={s.ingredienteNome}>{i.nome}</p><p className={s.ingredienteQtd}>{[i.quantidade, i.preparo].filter(Boolean).join(' · ') || 'a gosto'}</p></div>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
        <div className={s.qr}>
          <p className={s.qrRotulo}>Transparência total</p>
          <p className={s.qrTitulo}>Escaneie a<br />ficha técnica</p>
          <a href={urlFichaTecnica(prato.id)} target="_blank" rel="noreferrer" className={s.qrImagem} aria-label="Abrir a ficha técnica pública em nova aba">
            <QRCodeSVG value={urlFichaTecnica(prato.id)} size={136} fgColor="#1A2E1A" bgColor="#FFFFFF" level="M" />
          </a>
          <p className={s.qrTexto}>Veja a ficha técnica nutricional completa, origem dos ingredientes e selo de aprovação da nutricionista responsável.</p>
          <a href={urlFichaTecnica(prato.id)} target="_blank" rel="noreferrer" className={s.qrLink}>Abrir ficha <ExternalLink size={12} aria-hidden /></a>
        </div>
      </section>

      <section className={s.avaliacoes} aria-labelledby="aval-titulo">
        <div className={s.avaliacoesCabeca}>
          <div>
            <h2 id="aval-titulo" className={s.secaoTitulo}>Avaliações dos clientes</h2>
            <p className={s.secaoSub}>{prato.totalAvaliacoes} avaliações verificadas após o consumo</p>
          </div>
          {prato.totalAvaliacoes > 0 && (
            <div className={s.resumoNota}>
              <p className={s.notaGrande}>{Number(prato.nota).toFixed(1)}</p>
              <div>
                <p className={s.estrelasGrandes} aria-label={`Nota ${Number(prato.nota).toFixed(1)} de 5`}>
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={20} fill={i <= Math.round(Number(prato.nota)) ? 'currentColor' : 'none'} aria-hidden />)}
                </p>
                <p className={s.secaoSub}>{prato.totalAvaliacoes} avaliações</p>
              </div>
            </div>
          )}
        </div>
        {avaliacoes.length === 0
          ? <EmptyState compacto titulo="Ainda sem avaliações publicadas" descricao="As avaliações aparecem aqui depois da moderação." />
          : (
            <ul className={s.gradeAvaliacoes}>
              {avaliacoes.map((a) => (
                <li key={a.id} className={s.avaliacao}>
                  <div className={s.avaliacaoCabeca}>
                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" className={s.avatar} /> : <span className={s.avatar} aria-hidden>{a.autor[0]}</span>}
                    <div><p className={s.avaliacaoNome}>{a.autor}</p><p className={s.avaliacaoData}>{relativo(a.data)} · Pedido {a.codigoPedido}</p></div>
                  </div>
                  <p className={s.estrelas} aria-label={`${a.nota} de 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= a.nota ? 'currentColor' : 'none'} aria-hidden />)}
                  </p>
                  {a.comentario && <p className={s.avaliacaoTexto}>“{a.comentario}”</p>}
                </li>
              ))}
            </ul>
          )}
      </section>

      {similares.length > 0 && (
        <section className={s.relacionados} aria-labelledby="rel-titulo">
          <div className={s.relacionadosCabeca}>
            <h2 id="rel-titulo">Você também vai <span className="script">gostar</span></h2>
            <Link to="/app/marketplace" className={s.verMais}>Ver mais <ArrowRight size={14} aria-hidden /></Link>
          </div>
          <div className={s.gradeRelacionados}>
            {similares.map((p) => {
              const pp = partesPreco(Number(p.preco));
              return (
                <article key={p.id} className={s.relacionado}>
                  <div className={s.relacionadoImg}>{p.imagemUrl && <img src={p.imagemUrl} alt="" loading="lazy" />}</div>
                  <p className={s.relacionadoRest}>{p.restaurante.nome}</p>
                  <h3 className={s.relacionadoNome}><Link to={`/app/marmitas/${p.id}`}>{p.nome}</Link></h3>
                  <div className={s.relacionadoRodape}>
                    <p className={s.relacionadoPreco}>R$ {pp.reais}<small>,{pp.centavos}</small></p>
                    <button type="button" className={s.relacionadoAdd} onClick={() => adicionar(p)} aria-label={`Adicionar ${p.nome} ao carrinho`}><Plus size={16} aria-hidden /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className={s.barraCompra}>
        <p className={s.barraPreco}>R$ {reais}<small>,{centavos}</small></p>
        <button type="button" className={s.barraBotao} onClick={pedir}>Adicionar ao pedido <ArrowRight size={16} aria-hidden /></button>
      </div>
      {dialogo}
    </div>
  );
}

function FlameIcone() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
}
