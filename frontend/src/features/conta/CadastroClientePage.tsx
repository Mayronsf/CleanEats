import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Beef, Carrot, Check, Dumbbell, Fish, MilkOff, Nut, Ruler, Salad, Scale, ShieldAlert, Sparkles, Sprout,
  Target, TrendingDown, WheatOff, type LucideIcon,
} from 'lucide-react';
import { Botao, ErroCarregamento, Logo, Skeleton, Stepper, useToast } from '../../design-system';
import { useAuth } from '../../hooks/useAuth';
import { ErroApi, HOME_DO_PERFIL } from '../../services/api';
import {
  buscarMetasIniciais, buscarRestricoes, cadastrarCliente, calcularImc, calcularMetabolismoBasal,
  type NivelAtividadeCadastro, type ObjetivoNutricional,
} from '../../services/cadastro';
import { CarregandoPagina } from '../../app/CarregandoPagina';
import { ETAPAS_CADASTRO, lerRascunho, limparRascunho } from './rascunhoCadastro';
import s from './CadastroClientePage.module.css';

const OBJETIVOS: { valor: ObjetivoNutricional; classe: string; titulo: string; protocolo: string; descricao: string; icone: LucideIcon }[] = [
  { valor: 'EMAGRECIMENTO', classe: 'emagrecer', titulo: 'Emagrecimento', protocolo: 'Cutting · Déficit calórico', descricao: 'Reduzir gordura corporal com déficit calórico controlado e proteína alta (2,0 g/kg).', icone: TrendingDown },
  { valor: 'GANHO_MASSA', classe: 'massa', titulo: 'Ganho de Massa', protocolo: 'Bulking · Superávit calórico', descricao: 'Hipertrofia com superávit calórico limpo (~12%) e carboidratos ajustados pro treino.', icone: Dumbbell },
  { valor: 'EQUILIBRIO', classe: 'equilibrio', titulo: 'Dieta Equilibrada', protocolo: 'Manutenção · Normocalórica', descricao: 'Manter peso atual com ingestão igual ao seu gasto energético total (GET).', icone: Scale },
];

const NIVEIS_ATIVIDADE: { valor: NivelAtividadeCadastro; rotulo: string }[] = [
  { valor: 'SEDENTARIO', rotulo: 'Sedentário · pouco exercício (1,2×)' },
  { valor: 'LEVE', rotulo: 'Leve · 1–2× por semana (1,375×)' },
  { valor: 'MODERADO', rotulo: 'Moderado · 3–5× por semana (1,55×)' },
  { valor: 'INTENSO', rotulo: 'Intenso · 6–7× por semana (1,725×)' },
  { valor: 'ATLETA', rotulo: 'Atleta · treino 2× ao dia (1,9×)' },
];

const ICONE_RESTRICAO: Record<string, LucideIcon> = {
  'sem-gluten': WheatOff, 'sem-lactose': MilkOff, vegetariano: Carrot, vegano: Sprout, 'low-carb': Salad,
  'sem-oleaginosas': Nut, 'sem-frutos-do-mar': Fish, 'sem-carne-suina': Beef,
};

/** Tela 05 — Cadastro do cliente, etapa 3: objetivo, restrições, dados físicos e IMC (CE-2, CE-6, CE-12). */
export default function CadastroClientePage() {
  const { sessao, carregandoSessao, usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const restricoes = useQuery({ queryKey: ['restricoes'], queryFn: buscarRestricoes, staleTime: Infinity });
  const metas = useQuery({ queryKey: ['metas-iniciais'], queryFn: buscarMetasIniciais, staleTime: Infinity, enabled: !!sessao });

  const [objetivo, setObjetivo] = useState<ObjetivoNutricional>('GANHO_MASSA');
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState<'' | 'F' | 'M' | 'O'>('');
  const [nivelAtividade, setNivelAtividade] = useState<NivelAtividadeCadastro>('MODERADO');
  const [erros, setErros] = useState<Partial<Record<'peso' | 'altura' | 'idade' | 'geral', string>>>({});
  const [enviando, setEnviando] = useState(false);

  if (carregandoSessao) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/cadastro" replace />;
  if (usuario) return <Navigate to={HOME_DO_PERFIL[usuario.perfil]} replace />;

  const imc = calcularImc(Number(peso), Number(altura));
  const basal = calcularMetabolismoBasal({
    objetivo, pesoKg: Number(peso), alturaCm: Number(altura), idade: Number(idade),
    sexo: sexo || null, nivelAtividade,
  });
  const basalPorObjetivo = (obj: ObjetivoNutricional) => calcularMetabolismoBasal({
    objetivo: obj, pesoKg: Number(peso), alturaCm: Number(altura), idade: Number(idade),
    sexo: sexo || null, nivelAtividade,
  });
  const meta = basal ?? metas.data?.[objetivo];
  const alternar = (slug: string) => setEscolhidas((l) => (l.includes(slug) ? l.filter((x) => x !== slug) : [...l, slug]));

  async function concluir() {
    const p = Number(peso); const a = Number(altura); const i = Number(idade);
    const novos: typeof erros = {};
    if (!(p >= 30 && p <= 300)) novos.peso = 'Informe o peso em kg (30 a 300).';
    if (!(a >= 100 && a <= 230)) novos.altura = 'Informe a altura em cm (100 a 230).';
    if (!(i >= 14 && i <= 110)) novos.idade = 'Informe a idade (14 a 110 anos).';
    setErros(novos);
    if (Object.keys(novos).length) return;

    const rascunho = lerRascunho();
    const meta_ = sessao!.user.user_metadata as { nome?: string; full_name?: string; name?: string };
    const nome = [rascunho.nome, rascunho.sobrenome].filter(Boolean).join(' ') || meta_.nome || meta_.full_name || meta_.name || sessao!.user.email!.split('@')[0]!;
    setEnviando(true);
    try {
      await cadastrarCliente({
        nome, objetivo, restricoes: escolhidas, pesoKg: p, alturaCm: a, idade: i,
        sexo: sexo || null, nivelAtividade,
        aceiteTermosEm: rascunho.aceiteTermosEm ?? new Date().toISOString(),
      });
      limparRascunho();
      toast('Conta criada! Agora escolha seu plano.');
      // navega ANTES de atualizar o usuário: com o perfil carregado, a guarda desta tela mandaria para /app
      navegar('/planos?onboarding=1', { replace: true });
      void queryClient.invalidateQueries({ queryKey: ['usuario-atual'] });
    } catch (err) {
      setErros({ geral: err instanceof ErroApi ? err.message : 'Não foi possível concluir o cadastro. Tente de novo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <Logo />
        <Link to="/cadastro/perfil" className={s.voltarTopo}><ArrowLeft size={16} aria-hidden /> <span>Voltar</span></Link>
      </header>
      <div className={s.faixaEtapas}><Stepper etapas={ETAPAS_CADASTRO} atual={2} /></div>

      <main className={s.principal}>
        <div className={s.cabeca}>
          <p className={s.rotulo}>Etapa 3 de 3 · Quase lá!</p>
          <h1 className={s.titulo}>Conte sobre seu <span className="script">objetivo</span></h1>
          <p className={s.sub}>Vamos personalizar seu cardápio. Essas informações vão ser usadas pra montar seu plano alimentar inicial. Você pode ajustar tudo depois.</p>
        </div>

        <section className={s.secao} aria-labelledby="sec-objetivo">
          <CabecaSecao id="sec-objetivo" icone={Target} titulo="Qual seu objetivo principal?" sub="Escolha um — você pode mudar a qualquer momento no seu perfil." selo="Obrigatório" />
          <div className={s.objetivos} role="radiogroup" aria-labelledby="sec-objetivo">
            {OBJETIVOS.map(({ valor, classe, titulo, protocolo, descricao, icone: Icone }) => {
              const ativo = objetivo === valor;
              const calcObj = basalPorObjetivo(valor);
              const kcalExibir = calcObj?.calorias ?? metas.data?.[valor].calorias;
              return (
                <button key={valor} type="button" role="radio" aria-checked={ativo}
                  className={`${s.objetivo} ${s[classe]} ${ativo ? s.selecionado : ''}`} onClick={() => setObjetivo(valor)}>
                  <span className={s.objetivoCheck} aria-hidden><Check size={14} /></span>
                  <span className={s.objetivoIcone} aria-hidden><Icone size={26} /></span>
                  <span className={s.objetivoTexto}>
                    <span className={s.objetivoTitulo}>{titulo}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{protocolo}</span>
                    <span className={s.objetivoDesc}>{descricao}</span>
                    <span className={s.objetivoKcal}><span className={s.pontoKcal} aria-hidden />
                      {kcalExibir ? `~${kcalExibir.toLocaleString('pt-BR')} kcal/dia${calcObj ? (calcObj.ajusteKcal > 0 ? ` (+${calcObj.ajusteKcal})` : calcObj.ajusteKcal < 0 ? ` (${calcObj.ajusteKcal})` : ' (GET)') : ''}` : <Skeleton altura={12} largura={90} />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={s.secao} aria-labelledby="sec-restricoes">
          <CabecaSecao id="sec-restricoes" icone={ShieldAlert} fundo="#FDE2DC" cor="#B5402A" titulo="Restrições alimentares" sub="Marque tudo que se aplica — filtramos automaticamente os pratos." selo="Opcional" opcional />
          {restricoes.isError ? <ErroCarregamento onTentarNovamente={() => restricoes.refetch()} /> : (
            <div className={s.restricoes} role="group" aria-labelledby="sec-restricoes">
              {(restricoes.data ?? Array.from({ length: 8 }, (_, i) => ({ slug: `carregando-${i}`, nome: '' }))).map((r) => {
                if (!r.nome) return <Skeleton key={r.slug} altura={52} raio={14} />;
                const Icone = ICONE_RESTRICAO[r.slug] ?? ShieldAlert;
                const ativa = escolhidas.includes(r.slug);
                return (
                  <button key={r.slug} type="button" aria-pressed={ativa} className={`${s.restricao} ${ativa ? s.restricaoAtiva : ''}`} onClick={() => alternar(r.slug)}>
                    <Icone size={18} aria-hidden /> {r.nome}
                    <span className={s.checkMini} aria-hidden><Check size={11} /></span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={s.secao} aria-labelledby="sec-fisico">
          <CabecaSecao id="sec-fisico" icone={Ruler} fundo="var(--blue-bg)" cor="var(--blue-dark)" titulo="Seus dados físicos" sub="Usamos pra calcular suas metas iniciais de calorias e macros." selo="Obrigatório" />
          <div className={s.fisico}>
            <CampoUnidade id="peso" rotulo="Peso atual" unidade="KG" placeholder="72" ajuda="Valor aproximado é o suficiente" valor={peso} onChange={setPeso} erro={erros.peso} />
            <CampoUnidade id="altura" rotulo="Altura" unidade="CM" placeholder="170" ajuda="Em centímetros (ex: 178)" valor={altura} onChange={setAltura} erro={erros.altura} />
            <CampoUnidade id="idade" rotulo="Idade" unidade="ANOS" placeholder="28" ajuda="Pra cálculo metabólico basal (TMB)" valor={idade} onChange={setIdade} erro={erros.idade} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
            <div>
              <label htmlFor="sexo" className={s.rotuloCampo}>Sexo biológico (para TMB Mifflin-St Jeor)</label>
              <select id="sexo" className={s.entrada} style={{ paddingRight: 16 }} value={sexo} onChange={(e) => setSexo(e.target.value as '' | 'F' | 'M' | 'O')}>
                <option value="">Neutro / prefiro não informar</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="O">Outro</option>
              </select>
            </div>
            <div>
              <label htmlFor="nivelAtividade" className={s.rotuloCampo}>Nível de atividade física (GET)</label>
              <select id="nivelAtividade" className={s.entrada} style={{ paddingRight: 16 }} value={nivelAtividade} onChange={(e) => setNivelAtividade(e.target.value as NivelAtividadeCadastro)}>
                {NIVEIS_ATIVIDADE.map((n) => <option key={n.valor} value={n.valor}>{n.rotulo}</option>)}
              </select>
            </div>
          </div>
          <div className={s.imc} aria-live="polite">
            <div className={s.imcInfo}>
              <p className={s.imcRotulo}>Seu IMC e gasto basal (Mifflin-St Jeor)</p>
              <p className={s.imcValor}>
                {imc ? <>{imc.imc.toLocaleString('pt-BR')} <small>· {imc.classe}</small></> : <small>Preencha peso e altura</small>}
              </p>
              {basal && (
                <p style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 700, marginTop: 4 }}>
                  TMB: {basal.tmb.toLocaleString('pt-BR')} kcal · GET: {basal.get.toLocaleString('pt-BR')} kcal/dia · {basal.protocolo}
                </p>
              )}
            </div>
            {imc && <span className={`${s.imcStatus} ${s[`imc-${imc.tom}`]}`}><span className={s.imcPonto} aria-hidden />{imc.status}</span>}
          </div>
        </section>

        <section className={s.previa} aria-labelledby="sec-previa">
          <p className={s.previaRotulo}><Sparkles size={14} aria-hidden /> {basal ? basal.protocolo : 'Seu plano inicial'}</p>
          <h2 id="sec-previa" className={s.previaTitulo}>Com base na sua <span className="script">TMB</span>,<br />calculamos seu plano inicial</h2>
          <p className={s.previaDesc}>
            {basal
              ? `${basal.descricaoProtocolo} TMB de ${basal.tmb.toLocaleString('pt-BR')} kcal e GET de ${basal.get.toLocaleString('pt-BR')} kcal/dia (${basal.ajusteKcal > 0 ? `+${basal.ajusteKcal}` : basal.ajusteKcal} kcal).`
              : 'Preencha peso, altura e idade acima para calcular sua Taxa Metabólica Basal (Mifflin-St Jeor) e ajustar automaticamente Bulking ou Cutting.'}
          </p>
          <div className={s.previaMacros}>
            {[['Calorias', meta?.calorias, 'kcal'], ['Proteína', meta?.proteinas, 'g'], ['Carbs', meta?.carboidratos, 'g'], ['Gordura', meta?.gorduras, 'g']].map(([rotulo, valor, un]) => (
              <div key={rotulo as string} className={s.previaMacro}>
                <p className={s.previaMacroRotulo}>{rotulo}</p>
                <p className={s.previaMacroValor}>{valor !== undefined ? <>{(valor as number).toLocaleString('pt-BR')} <small>{un}</small></> : '—'}</p>
              </div>
            ))}
          </div>
        </section>

        {erros.geral && <p className={s.erroGeral} role="alert">{erros.geral}</p>}
        <div className={s.navegacao}>
          <Link to="/cadastro/perfil" className={s.anterior}><ArrowLeft size={16} aria-hidden /> Voltar</Link>
          <Botao tamanho="lg" className={s.proximo} carregando={enviando} onClick={concluir} iconeDireita={<ArrowRight size={18} aria-hidden />}>
            Ver planos disponíveis
          </Botao>
        </div>
      </main>
    </div>
  );
}

function CabecaSecao({ id, icone: Icone, titulo, sub, selo, opcional = false, fundo, cor }: {
  id: string; icone: LucideIcon; titulo: string; sub: string; selo: string; opcional?: boolean; fundo?: string; cor?: string;
}) {
  return (
    <div className={s.secaoCabeca}>
      <span className={s.secaoIcone} style={{ background: fundo, color: cor }} aria-hidden><Icone size={22} /></span>
      <div className={s.secaoTexto}>
        <h2 id={id} className={s.secaoTitulo}>{titulo}</h2>
        <p className={s.secaoSub}>{sub}</p>
      </div>
      <span className={`${s.selo} ${opcional ? s.seloOpcional : ''}`}>{selo}</span>
    </div>
  );
}

function CampoUnidade({ id, rotulo, unidade, placeholder, ajuda, valor, onChange, erro }: {
  id: string; rotulo: string; unidade: string; placeholder: string; ajuda: string; valor: string; onChange: (v: string) => void; erro?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={s.rotuloCampo}>{rotulo} <span className={s.req} aria-hidden>*</span></label>
      <div className={s.campoUnidade}>
        <input id={id} type="number" inputMode="decimal" min={0} className={`${s.entrada} ${erro ? s.entradaErro : ''}`} placeholder={placeholder}
          value={valor} onChange={(e) => onChange(e.target.value)} aria-invalid={erro ? true : undefined} aria-describedby={`${id}-ajuda`} required />
        <span className={s.unidade} aria-hidden>{unidade}</span>
      </div>
      <p id={`${id}-ajuda`} className={erro ? s.erroCampo : s.ajuda}>{erro ?? ajuda}</p>
    </div>
  );
}
