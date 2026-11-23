import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, ArrowRight, Check, Drumstick, Flame, Leaf, Plus, Scale, Star, Wheat } from 'lucide-react';
import { Confirmacao, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarNumero, partesPreco } from '../../../lib/formato';
import { useCarrinho } from '../../../hooks/cliente/useCarrinho';
import { ErroApi } from '../../../services/api';
import {
  buscarComponentesMarmita, calcularMarmita, ROTULO_OBJETIVO, type CatalogoMonte, type CategoriaComponente, type ComponenteMarmita, type Objetivo, type SelecaoMonte,
} from '../../../services/cliente';
import s from './MonteSuaMarmitaPage.module.css';

const SECOES: { categoria: CategoriaComponente; titulo: string; icone: typeof Leaf; unidade: (c: ComponenteMarmita) => string }[] = [
  { categoria: 'PROTEINA', titulo: 'Proteína', icone: Drumstick, unidade: (c) => `${c.porcaoG}g · ${um(c.proteinas)}g prot` },
  { categoria: 'CARBOIDRATO', titulo: 'Carboidrato', icone: Wheat, unidade: (c) => `${c.porcaoG}g · ${um(c.carboidratos)}g carb` },
  { categoria: 'VEGETAL', titulo: 'Vegetais', icone: Leaf, unidade: (c) => `${c.porcaoG}g · ${c.calorias} kcal` },
  { categoria: 'ADICIONAL', titulo: 'Adicionais', icone: Star, unidade: (c) => `+${formatarMoeda(c.preco)} · ${c.calorias} kcal` },
];
const OBJETIVOS: { valor: Objetivo; icone: typeof Flame; cor: string }[] = [
  { valor: 'EMAGRECIMENTO', icone: Flame, cor: 'laranja' },
  { valor: 'GANHO_MASSA', icone: Activity, cor: 'coral' },
  { valor: 'EQUILIBRIO', icone: Scale, cor: 'verde' },
];
const VAZIA: SelecaoMonte = { proteina: null, carboidrato: null, tamanho: 'M', vegetais: [], adicionais: [] };
const um = (v: number) => formatarNumero(Math.round(Number(v)));
const ESCALA = { min: 400, max: 900 };

/** Prévia local com as mesmas regras do backend (a conta oficial é a do servidor, ao adicionar e no checkout). */
function calcularLocal(cat: CatalogoMonte, sel: SelecaoMonte) {
  const porId = new Map(cat.componentes.map((c) => [c.id, c]));
  const tam = cat.tamanhos.find((t) => t.codigo === sel.tamanho) ?? { fator: 1, ajustePreco: 0 };
  const t = { kcal: 0, p: 0, c: 0, g: 0, preco: 0 };
  const somar = (c: ComponenteMarmita | undefined, fator = 1, ajuste = 0) => {
    if (!c) return;
    t.kcal += c.calorias * fator; t.p += Number(c.proteinas) * fator; t.c += Number(c.carboidratos) * fator; t.g += Number(c.gorduras) * fator;
    t.preco += Number(c.preco) + ajuste;
  };
  somar(sel.proteina ? porId.get(sel.proteina) : undefined);
  const carbo = sel.carboidrato ? porId.get(sel.carboidrato) : undefined;
  somar(carbo, carbo?.permiteTamanho ? Number(tam.fator) : 1, carbo?.permiteTamanho ? Number(tam.ajustePreco) : 0);
  [...sel.vegetais, ...sel.adicionais].forEach((id) => somar(porId.get(id)));
  return { ...t, kcal: Math.round(t.kcal) };
}

/** Tela 15 — Monte sua marmita (CE-6): objetivo define a meta por refeição; kcal/macros/preço em tempo real; o backend recalcula ao adicionar. */
export default function MonteSuaMarmitaPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const carrinho = useCarrinho();
  const cat = useQuery({ queryKey: ['cliente', 'componentes-marmita'], queryFn: buscarComponentesMarmita, staleTime: 5 * 60_000 });
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [sel, setSel] = useState<SelecaoMonte>(VAZIA);
  const [observacao, setObservacao] = useState('');
  const [trocarRestaurante, setTrocarRestaurante] = useState<(() => void) | null>(null);

  useEffect(() => { if (cat.data && !objetivo) setObjetivo(cat.data.objetivo ?? 'EQUILIBRIO'); }, [cat.data, objetivo]);
  const total = useMemo(() => (cat.data ? calcularLocal(cat.data, sel) : null), [cat.data, sel]);

  const adicionar = useMutation({
    mutationFn: () => calcularMarmita(sel),
    onSuccess: (calc) => {
      const c = cat.data!;
      const proteina = c.componentes.find((x) => x.id === sel.proteina);
      const item = {
        chave: `monte-${crypto.randomUUID()}`, idMarmita: null, nome: calc.nome, imagemUrl: proteina?.imagemUrl ?? null,
        precoUnitario: Number(calc.preco), quantidade: 1, observacao: observacao.trim() || undefined, personalizacao: calc.personalizacao,
        macros: { calorias: calc.calorias, proteinas: Number(calc.proteinas), carboidratos: Number(calc.carboidratos), gorduras: Number(calc.gorduras), fibras: Number(calc.fibras) },
      };
      const concluir = () => { toast('Marmita adicionada ao pedido.', 'sucesso'); navegar('/app/carrinho'); };
      if (carrinho.adicionarItem(c.restaurante, item) === 'outro-restaurante') {
        setTrocarRestaurante(() => () => { carrinho.adicionarItem(c.restaurante, item, true); setTrocarRestaurante(null); concluir(); });
      } else concluir();
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível montar a marmita.', 'erro'),
  });

  if (cat.isError) return <div className={s.pagina}><ErroCarregamento mensagem={cat.error instanceof ErroApi ? cat.error.message : undefined} onTentarNovamente={() => cat.refetch()} /></div>;
  if (!cat.data || !total || !objetivo) return <div className={s.pagina}><Skeleton altura={120} raio={20} /><div style={{ height: 24 }} /><Skeleton altura={720} raio={28} /></div>;

  const c = cat.data;
  const porId = new Map(c.componentes.map((x) => [x.id, x]));
  const meta = c.metaPorRefeicao[objetivo];
  const limite = (categoria: CategoriaComponente) => c.limites.find((l) => l.categoria === categoria)!;
  const pronta = !!sel.proteina && !!sel.carboidrato;
  const carbo = sel.carboidrato ? porId.get(sel.carboidrato) : undefined;
  const selecionados = [sel.proteina, sel.carboidrato, ...sel.vegetais, ...sel.adicionais].filter(Boolean).map((id) => porId.get(id!)!).filter(Boolean);
  const pctMeta = Math.round((total.kcal / meta) * 100);
  const posicao = (v: number) => `${Math.max(0, Math.min(100, ((v - ESCALA.min) / (ESCALA.max - ESCALA.min)) * 100))}%`;

  function alternar(comp: ComponenteMarmita) {
    const l = limite(comp.categoria);
    if (comp.categoria === 'PROTEINA') return setSel({ ...sel, proteina: sel.proteina === comp.id ? null : comp.id });
    if (comp.categoria === 'CARBOIDRATO') return setSel({ ...sel, carboidrato: sel.carboidrato === comp.id ? null : comp.id });
    const chave = comp.categoria === 'VEGETAL' ? 'vegetais' : 'adicionais';
    const lista = sel[chave];
    if (lista.includes(comp.id)) return setSel({ ...sel, [chave]: lista.filter((x) => x !== comp.id) });
    if (lista.length >= l.maximo) { toast(`Escolha até ${l.maximo} ${comp.categoria === 'VEGETAL' ? 'vegetais' : 'adicionais'}. Desmarque um para trocar.`, 'info'); return; }
    setSel({ ...sel, [chave]: [...lista, comp.id] });
  }
  const escolhido = (comp: ComponenteMarmita) => [sel.proteina, sel.carboidrato, ...sel.vegetais, ...sel.adicionais].includes(comp.id);
  const estadoSecao = (categoria: CategoriaComponente) => {
    const l = limite(categoria);
    return l.minimo > 0 ? `Obrigatório · ${l.maximo} ${l.maximo === 1 ? 'item' : 'itens'}` : `Opcional · até ${l.maximo} itens`;
  };
  const quadrantes = [sel.proteina, sel.carboidrato, sel.vegetais[0], sel.vegetais[1]].map((id) => (id ? porId.get(id) : undefined));
  const precoPartes = partesPreco(total.preco);

  return (
    <div className={s.pagina}>
      <nav className={s.trilha} aria-label="Você está em"><Link to="/app">Home</Link><span aria-hidden>/</span><Link to="/app/marketplace">Marketplace</Link><span aria-hidden>/</span><strong>Monte sua marmita</strong></nav>
      <header className={s.cabeca}>
        <p className={s.rotulo}>Personalize sua refeição</p>
        <h1 className={s.titulo}>Monte sua marmita <span className="script">do jeito</span> que combina com seu objetivo</h1>
        <p className={s.sub}>Escolha cada componente e veja as informações nutricionais atualizando em tempo real. Preparada pelo {c.restaurante.nome} · pronta em {c.restaurante.tempoEntregaMin}–{c.restaurante.tempoEntregaMax}min.</p>
      </header>

      <div className={s.grade}>
        <div className={s.coluna}>
          <section className={`${s.passo} ${s.passoObjetivo}`} aria-labelledby="passo1">
            <div className={s.passoTopo}>
              <span className={`${s.numero} ${s.numeroOk}`} aria-hidden><Check size={18} /></span>
              <div className={s.passoTexto}><h2 id="passo1">Seu objetivo nutricional</h2><p>Vamos ajustar porções e proporções de macros</p></div>
              <span className={`${s.estado} ${s.estadoOk}`}>Definido</span>
            </div>
            <div className={s.objetivos} role="radiogroup" aria-label="Objetivo desta refeição">
              {OBJETIVOS.map((o) => (
                <button key={o.valor} type="button" role="radio" aria-checked={objetivo === o.valor} className={`${s.objetivo} ${objetivo === o.valor ? s.objetivoAtivo : ''}`} onClick={() => setObjetivo(o.valor)}>
                  <span className={`${s.objetivoIcone} ${s[o.cor]}`} aria-hidden><o.icone size={18} /></span>
                  <strong>{ROTULO_OBJETIVO[o.valor].replace('Dieta equilibrada', 'Equilíbrio')}</strong>
                  <small>~{formatarNumero(c.metaPorRefeicao[o.valor])} kcal/refeição</small>
                  <span className={s.radio} aria-hidden />
                </button>
              ))}
            </div>
            <div className={s.meta}>
              <div><p className={s.metaRotulo}>Meta de calorias desta refeição</p><p className={s.metaValor}>{formatarNumero(meta)} <small>kcal</small></p></div>
              <div className={s.escala} aria-hidden>
                <div className={s.escalaBarra}><span className={s.escalaAtual} style={{ width: posicao(total.kcal) }} /><span className={s.escalaMeta} style={{ left: posicao(meta) }} /></div>
                <div className={s.escalaRotulos}><span>{ESCALA.min}</span><span style={{ left: posicao(meta) }} className={s.escalaMetaRotulo}>{meta} ←</span><span>{ESCALA.max}</span></div>
              </div>
            </div>
          </section>

          <section className={s.passo} aria-labelledby="passo2">
            <div className={s.passoTopo}>
              <span className={`${s.numero} ${pronta ? s.numeroOk : s.numeroAtivo}`} aria-hidden>{pronta ? <Check size={18} /> : 2}</span>
              <div className={s.passoTexto}><h2 id="passo2">Escolha os componentes</h2><p>Proteína, carbo, vegetais e adicionais</p></div>
              <span className={`${s.estado} ${pronta ? s.estadoOk : s.estadoAndamento}`}>{pronta ? 'Pronta' : 'Em andamento'}</span>
            </div>
            {SECOES.map((secao) => {
              const itens = c.componentes.filter((x) => x.categoria === secao.categoria);
              const obrigatoria = limite(secao.categoria).minimo > 0;
              return (
                <fieldset key={secao.categoria} className={s.secao}>
                  <legend className={s.secaoTopo}>
                    <span className={s.secaoTitulo}><secao.icone size={16} aria-hidden /> {secao.titulo}</span>
                    <span className={obrigatoria ? s.obrigatorio : s.opcional}>{estadoSecao(secao.categoria)}</span>
                  </legend>
                  <div className={s.componentes}>
                    {itens.map((comp) => (
                      <button key={comp.id} type="button" aria-pressed={escolhido(comp)} className={`${s.componente} ${escolhido(comp) ? s.componenteAtivo : ''}`} onClick={() => alternar(comp)}>
                        <span className={s.componenteFoto}>{comp.imagemUrl ? <img src={comp.imagemUrl} alt="" loading="lazy" /> : <secao.icone size={20} aria-hidden />}</span>
                        <span className={s.componenteTexto}><strong>{comp.nome}</strong><small>{secao.unidade(comp)}</small></span>
                        {escolhido(comp) && <span className={s.marca} aria-hidden><Check size={12} /></span>}
                      </button>
                    ))}
                  </div>
                  {secao.categoria === 'CARBOIDRATO' && (
                    <div className={s.tamanhos} role="radiogroup" aria-label="Tamanho do carboidrato">
                      {c.tamanhos.map((t) => {
                        const gramas = Math.round((carbo?.porcaoG ?? 120) * Number(t.fator));
                        const delta = carbo ? Math.round(Number(carbo.carboidratos) * (Number(t.fator) - 1)) : 0;
                        return (
                          <button key={t.codigo} type="button" role="radio" aria-checked={sel.tamanho === t.codigo} className={sel.tamanho === t.codigo ? s.tamanhoAtivo : undefined}
                            onClick={() => setSel({ ...sel, tamanho: t.codigo })}>
                            <strong>{t.nome}</strong>
                            <small>{gramas}g · {t.codigo === 'M' ? 'padrão' : `${delta > 0 ? '+' : ''}${delta}g carb`}{Number(t.ajustePreco) ? ` · ${Number(t.ajustePreco) > 0 ? '+' : '−'}${formatarMoeda(Math.abs(Number(t.ajustePreco)))}` : ''}</small>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </section>

          <section className={s.passo} aria-labelledby="passo3">
            <div className={s.passoTopo}>
              <span className={s.numero} aria-hidden>3</span>
              <div className={s.passoTexto}><h2 id="passo3">Observações (opcional)</h2><p>Alguma instrução pro restaurante?</p></div>
              <span className={s.estado}>Opcional</span>
            </div>
            <label htmlFor="obs" className="sr-only">Observações para o restaurante</label>
            <textarea id="obs" className={s.observacao} rows={3} maxLength={200} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: ovo cozido com gema mole, por favor." />
          </section>
        </div>

        <aside className={s.resumo} aria-label="Sua marmita">
          <div className={s.resumoTopo}><h2>Sua marmita</h2><button type="button" className={s.limpar} onClick={() => { setSel(VAZIA); setObservacao(''); }} disabled={!selecionados.length}>Limpar tudo</button></div>
          <div className={s.prato} aria-hidden>
            <div className={s.pratoCirculo}>
              {quadrantes.map((q, i) => (
                <span key={i} className={`${s.quadrante} ${q ? s.quadranteCheio : ''}`}>{q?.imagemUrl && <img src={q.imagemUrl} alt="" />}{q && <em>{q.nome.split(' ')[0]}</em>}</span>
              ))}
            </div>
            <span className={s.pilulaProt}><i /> {um(total.p)}g prot</span>
            <span className={s.pilulaKcal}><i /> {total.kcal} kcal</span>
          </div>
          <div className={s.painel} aria-live="polite">
            <p className={s.kcal}>{total.kcal} <small>kcal</small></p>
            <p className={s.kcalMeta}>{pctMeta}% da meta ({formatarNumero(meta)} kcal)</p>
            <div className={s.aneis}>
              <Anel valor={total.p} referencia={meta * 0.3 / 4} cor="var(--prot)" rotulo="Proteína" />
              <Anel valor={total.c} referencia={meta * 0.45 / 4} cor="var(--carb)" rotulo="Carbo" />
              <Anel valor={total.g} referencia={meta * 0.25 / 9} cor="var(--fat)" rotulo="Gordura" />
            </div>
          </div>
          {selecionados.length === 0 ? <p className={s.vazio}><Plus size={16} aria-hidden /> Escolha uma proteína e um carboidrato para começar.</p> : (
            <ul className={s.lista}>
              {selecionados.map((x) => (
                <li key={x.id}><span className={s.listaIcone} aria-hidden>{x.categoria === 'VEGETAL' ? <Leaf size={14} /> : x.categoria === 'CARBOIDRATO' ? <Wheat size={14} /> : x.categoria === 'PROTEINA' ? <Drumstick size={14} /> : <Star size={14} />}</span>
                  <span><strong>{x.nome}{x.categoria === 'CARBOIDRATO' ? ` (${c.tamanhos.find((t) => t.codigo === sel.tamanho)?.nome.toLowerCase()})` : ''}</strong>
                    <small>{x.categoria === 'CARBOIDRATO' ? Math.round(x.porcaoG * Number(c.tamanhos.find((t) => t.codigo === sel.tamanho)?.fator ?? 1)) : x.porcaoG}g · {x.categoria === 'ADICIONAL' ? `+${formatarMoeda(x.preco)} · adicional` : x.categoria.toLowerCase().replace('proteina', 'proteína')}</small></span></li>
              ))}
            </ul>
          )}
          <div className={s.total}><span>Total</span><strong>R$ {precoPartes.reais}<small>,{precoPartes.centavos}</small></strong></div>
          <button type="button" className={s.adicionar} disabled={!pronta || adicionar.isPending} onClick={() => adicionar.mutate()}>
            {adicionar.isPending ? 'Calculando…' : pronta ? 'Adicionar ao pedido' : 'Escolha proteína e carboidrato'} {pronta && <ArrowRight size={16} aria-hidden />}
          </button>
          <Link to="/app/marketplace" className={s.voltar}><ArrowLeft size={14} aria-hidden /> Ver pratos prontos</Link>
        </aside>
      </div>

      <Confirmacao aberto={trocarRestaurante !== null} titulo="Trocar de restaurante?" rotuloConfirmar="Esvaziar e adicionar"
        onCancelar={() => setTrocarRestaurante(null)} onConfirmar={() => trocarRestaurante?.()}>
        Seu carrinho tem itens de outro restaurante. A marmita personalizada é preparada pelo {c.restaurante.nome}; para adicioná-la, o carrinho atual será esvaziado.
      </Confirmacao>
    </div>
  );
}

function Anel({ valor, referencia, cor, rotulo }: { valor: number; referencia: number; cor: string; rotulo: string }): ReactNode {
  const pct = referencia > 0 ? Math.min(1, valor / referencia) : 0;
  const r = 22; const circ = 2 * Math.PI * r;
  return (
    <div className={s.anel}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 28 28)" />
      </svg>
      <span className={s.anelValor}>{um(valor)}g</span>
      <span className={s.anelRotulo}>{rotulo}</span>
    </div>
  );
}
