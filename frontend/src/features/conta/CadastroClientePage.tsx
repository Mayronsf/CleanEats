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
import { buscarMetasIniciais, buscarRestricoes, cadastrarCliente, calcularImc, type ObjetivoNutricional } from '../../services/cadastro';
import { CarregandoPagina } from '../../app/CarregandoPagina';
import { ETAPAS_CADASTRO, lerRascunho, limparRascunho } from './rascunhoCadastro';
import s from './CadastroClientePage.module.css';

const OBJETIVOS: { valor: ObjetivoNutricional; classe: string; titulo: string; descricao: string; icone: LucideIcon }[] = [
  { valor: 'EMAGRECIMENTO', classe: 'emagrecer', titulo: 'Emagrecimento', descricao: 'Reduzir percentual de gordura mantendo massa muscular.', icone: TrendingDown },
  { valor: 'GANHO_MASSA', classe: 'massa', titulo: 'Ganho de Massa', descricao: 'Aumentar massa muscular com superávit calórico controlado.', icone: Dumbbell },
  { valor: 'EQUILIBRIO', classe: 'equilibrio', titulo: 'Dieta Equilibrada', descricao: 'Manter peso atual com alimentação saudável e balanceada.', icone: Scale },
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
  const [erros, setErros] = useState<Partial<Record<'peso' | 'altura' | 'idade' | 'geral', string>>>({});
  const [enviando, setEnviando] = useState(false);

  if (carregandoSessao) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/cadastro" replace />;
  if (usuario) return <Navigate to={HOME_DO_PERFIL[usuario.perfil]} replace />;

  const imc = calcularImc(Number(peso), Number(altura));
  const meta = metas.data?.[objetivo];
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
            {OBJETIVOS.map(({ valor, classe, titulo, descricao, icone: Icone }) => {
              const ativo = objetivo === valor;
              return (
                <button key={valor} type="button" role="radio" aria-checked={ativo}
                  className={`${s.objetivo} ${s[classe]} ${ativo ? s.selecionado : ''}`} onClick={() => setObjetivo(valor)}>
                  <span className={s.objetivoCheck} aria-hidden><Check size={14} /></span>
                  <span className={s.objetivoIcone} aria-hidden><Icone size={26} /></span>
                  <span className={s.objetivoTexto}>
                    <span className={s.objetivoTitulo}>{titulo}</span>
                    <span className={s.objetivoDesc}>{descricao}</span>
                    <span className={s.objetivoKcal}><span className={s.pontoKcal} aria-hidden />
                      {metas.data ? `~${metas.data[valor].calorias.toLocaleString('pt-BR')} kcal/dia` : <Skeleton altura={12} largura={90} />}
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
            <CampoUnidade id="idade" rotulo="Idade" unidade="ANOS" placeholder="28" ajuda="Pra cálculo metabólico basal" valor={idade} onChange={setIdade} erro={erros.idade} />
          </div>
          <div className={s.imc} aria-live="polite">
            <div className={s.imcInfo}>
              <p className={s.imcRotulo}>Seu IMC calculado</p>
              <p className={s.imcValor}>{imc ? <>{imc.imc.toLocaleString('pt-BR')} <small>· {imc.classe}</small></> : <small>Preencha peso e altura</small>}</p>
            </div>
            {imc && <span className={`${s.imcStatus} ${s[`imc-${imc.tom}`]}`}><span className={s.imcPonto} aria-hidden />{imc.status}</span>}
          </div>
        </section>

        <section className={s.previa} aria-labelledby="sec-previa">
          <p className={s.previaRotulo}><Sparkles size={14} aria-hidden /> Seu plano inicial</p>
          <h2 id="sec-previa" className={s.previaTitulo}>Com base nos seus dados,<br />preparamos um <span className="script">plano</span> pra você</h2>
          <p className={s.previaDesc}>Essas metas diárias são iniciais e podem ser ajustadas por um nutricionista quando você assinar um plano Pro ou Premium.</p>
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
