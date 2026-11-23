import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, Building2, Camera, Check, ClipboardCheck, Clock,
  DollarSign, Flame, Leaf, MapPin, PenLine, Salad, Soup, UtensilsCrossed, WheatOff,
} from 'lucide-react';
import { Logo, Stepper, useToast } from '../../../design-system';
import { CarregandoPagina } from '../../../app/CarregandoPagina';
import { useAuth } from '../../../hooks/useAuth';
import { ErroApi } from '../../../services/api';
import {
  buscarCozinhasCadastro, cadastrarRestaurante, cnpjValido, COZINHAS_PADRAO, enviarLogoCadastroRestaurante,
  ESTADOS_BR, formatarCep, formatarCnpj, formatarTelefone, type HorarioRestaurante,
} from '../../../services/restaurante';
import { lerRascunho, limparRascunho } from '../../conta/rascunhoCadastro';
import s from './CadastroRestaurantePage.module.css';

const ORDEM_DIAS = [
  { dia: 1, nome: 'Segunda' }, { dia: 2, nome: 'Terça' }, { dia: 3, nome: 'Quarta' },
  { dia: 4, nome: 'Quinta' }, { dia: 5, nome: 'Sexta' }, { dia: 6, nome: 'Sábado' }, { dia: 0, nome: 'Domingo' },
];

const HORARIOS_INICIAIS: HorarioRestaurante[] = [
  { dia: 1, aberto: true, abre: '08:00', fecha: '22:00' },
  { dia: 2, aberto: true, abre: '08:00', fecha: '22:00' },
  { dia: 3, aberto: true, abre: '08:00', fecha: '22:00' },
  { dia: 4, aberto: true, abre: '08:00', fecha: '22:00' },
  { dia: 5, aberto: true, abre: '08:00', fecha: '23:00' },
  { dia: 6, aberto: true, abre: '11:00', fecha: '22:00' },
  { dia: 0, aberto: false, abre: '08:00', fecha: '18:00' },
];

function iconeCozinha(nome: string) {
  switch (nome) {
    case 'Fitness': return <Activity size={22} aria-hidden />;
    case 'Saudável': case 'Vegano': case 'Vegetariano': return <Leaf size={22} aria-hidden />;
    case 'Low Carb': return <Flame size={22} aria-hidden />;
    case 'Sem Glúten': return <WheatOff size={22} aria-hidden />;
    case 'Bowls': case 'Sucos': case 'Açaí': return <Salad size={22} aria-hidden />;
    case 'Integral': case 'Marmitas': return <Soup size={22} aria-hidden />;
    default: return <UtensilsCrossed size={22} aria-hidden />;
  }
}

/** Tela 07 — Cadastro do restaurante (CE-2, CE-3): dados jurídicos, endereço, cozinhas, horários e apresentação. */
export default function CadastroRestaurantePage() {
  const { sessao, carregandoSessao, usuario } = useAuth();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const rascunho = lerRascunho();
  const metadata = sessao?.user.user_metadata as { nome?: string; name?: string; full_name?: string } | undefined;
  const responsavel = [rascunho.nome, rascunho.sobrenome].filter(Boolean).join(' ') || metadata?.nome || metadata?.full_name || metadata?.name || '';

  const cozinhasQuery = useQuery({ queryKey: ['cadastro', 'cozinhas'], queryFn: buscarCozinhasCadastro, enabled: !!sessao, staleTime: Infinity });
  const opcoesCozinha = cozinhasQuery.data?.length ? cozinhasQuery.data : COZINHAS_PADRAO;

  const [nome, setNome] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjTocado, setCnpjTocado] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('Recife');
  const [uf, setUf] = useState('PE');
  const [tiposCozinha, setTiposCozinha] = useState<string[]>(['Fitness', 'Saudável']);
  const [horarios, setHorarios] = useState<HorarioRestaurante[]>(HORARIOS_INICIAIS);
  const [slogan, setSlogan] = useState('');
  const [descricao, setDescricao] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const inputLogo = useRef<HTMLInputElement>(null);

  const enviarLogo = useMutation({
    mutationFn: enviarLogoCadastroRestaurante,
    onSuccess: (res) => { setLogoUrl(res.url); toast('Logo enviada com sucesso!', 'sucesso'); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a logo.', 'erro'),
  });

  const salvar = useMutation({
    mutationFn: cadastrarRestaurante,
    onError: (e) => setErro(e instanceof ErroApi ? e.message : (e as Error).message),
  });

  if (carregandoSessao) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/cadastro" replace />;
  if (usuario) return <Navigate to="/restaurante" replace />;

  const digitosCnpj = cnpj.replace(/\D/g, '');
  const cnpjOk = digitosCnpj.length === 14 && cnpjValido(cnpj);
  const mostrarErroCnpj = (cnpjTocado && digitosCnpj.length > 0 && !cnpjOk) || (digitosCnpj.length === 14 && !cnpjOk);

  function alternarCozinha(item: string) {
    setTiposCozinha((atuais) => (atuais.includes(item) ? atuais.filter((x) => x !== item) : [...atuais, item]));
  }

  function atualizarHorario(dia: number, patch: Partial<HorarioRestaurante>) {
    setHorarios((lista) => lista.map((h) => (h.dia === dia ? { ...h, ...patch } : h)));
  }

  function aoEscolherLogo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (arquivo) enviarLogo.mutate(arquivo);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (!cnpjOk) {
      setCnpjTocado(true);
      setErro('CNPJ inválido: confira os 14 dígitos antes de enviar.');
      document.getElementById('rest-cnpj')?.focus();
      return;
    }
    if (tiposCozinha.length === 0) {
      setErro('Selecione pelo menos um tipo de cozinha.');
      return;
    }
    if (!horarios.some((h) => h.aberto)) {
      setErro('Ative pelo menos um dia de funcionamento.');
      return;
    }
    try {
      await salvar.mutateAsync({
        nomeResponsavel: responsavel || nome.trim(),
        aceiteTermosEm: rascunho.aceiteTermosEm ?? new Date().toISOString(),
        restaurante: {
          nome: nome.trim(),
          razaoSocial: razaoSocial.trim() || null,
          cnpj: digitosCnpj,
          telefone: telefone.trim(),
          slogan: slogan.trim() || null,
          descricao: descricao.trim(),
          cep: cep.replace(/\D/g, ''),
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim() || null,
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          uf,
          tiposCozinha,
          horarios,
          tempoEntregaMin: 30,
          tempoEntregaMax: 45,
          taxaEntrega: 0,
          pedidoMinimo: 0,
          chavePix: null,
          tipoChavePix: null,
          titularPix: null,
          logoUrl,
          capaUrl: null,
        },
      });
      limparRascunho();
      toast('Cadastro enviado para análise! Você já pode preparar seus pratos no painel.', 'sucesso');
      await qc.invalidateQueries({ queryKey: ['usuario-atual'] });
      navegar('/restaurante', { replace: true });
    } catch {
      /* Erro exibido no alerta do formulário. */
    }
  }

  return (
    <div className={`${s.pagina} tema-restaurante`}>
      <header className={s.topo}>
        <Logo />
        <Link to="/cadastro/perfil" className={s.voltar}>
          <ArrowLeft size={16} aria-hidden />
          <span>Voltar</span>
        </Link>
      </header>

      <div className={s.faixa}>
        <Stepper etapas={['Conta', 'Perfil', 'Estabelecimento']} atual={2} />
      </div>

      <main className={s.principal}>
        <header className={s.cabeca}>
          <p className={s.eyebrow}>Cadastro de Restaurante · Etapa 3 de 3</p>
          <h1>Conte sobre seu <span className="script">negócio</span></h1>
          <p>Cadastre seu restaurante no CleanEats. Após aprovação, você poderá começar a publicar pratos no marketplace e receber pedidos.</p>
        </header>

        <section className={s.comissao} aria-label="Comissão da plataforma">
          <div className={s.comissaoIcone}><DollarSign size={28} aria-hidden /></div>
          <div className={s.comissaoTexto}>
            <h2>Modelo simples e transparente</h2>
            <p>Cobramos apenas uma comissão por pedido entregue. Sem mensalidade, sem taxa de adesão, sem letra miúda. Você só paga quando vende.</p>
          </div>
          <div className={s.comissaoTaxa}>
            <strong>8%</strong>
            <span>por pedido</span>
          </div>
        </section>

        <aside className={s.aviso} role="note">
          <div className={s.avisoIcone}><ClipboardCheck size={20} aria-hidden /></div>
          <p>
            <strong>Aprovação manual do restaurante</strong>
            Validamos CNPJ e endereço comercial antes de ativar seu perfil. O processo leva até 72h úteis. Enquanto isso, você já pode cadastrar seus pratos com fichas nutricionais.
          </p>
        </aside>

        <div className={s.grade}>
          <aside className={s.colunaLogo}>
            <button type="button" className={s.uploadLogo} onClick={() => inputLogo.current?.click()} disabled={enviarLogo.isPending} aria-label={logoUrl ? 'Alterar logo do restaurante' : 'Enviar logo do restaurante'}>
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo do restaurante" />
                  <span className={s.uploadOverlay}>
                    <span className={s.uploadOverlayIcone}><Camera size={16} aria-hidden /></span>
                    {enviarLogo.isPending ? 'Enviando…' : 'Alterar logo'}
                  </span>
                </>
              ) : (
                <>
                  <span className={s.uploadOverlayIcone}><Camera size={18} aria-hidden /></span>
                  <strong>{enviarLogo.isPending ? 'Enviando logo…' : 'Enviar logo'}</strong>
                  <small>PNG ou JPG · até 5 MB</small>
                </>
              )}
            </button>
            <input ref={inputLogo} type="file" accept="image/png,image/jpeg,image/webp" className={s.visuallyHidden} onChange={aoEscolherLogo} />

            {logoUrl && (
              <div className={s.statusLogo} role="status">
                <span>Logo carregada</span>
                <button type="button" onClick={() => setLogoUrl(null)}>Remover</button>
              </div>
            )}

            <div className={s.dicas}>
              <strong>Dicas para a logo:</strong>
              <ul>
                <li>Use a logo oficial do restaurante</li>
                <li>Fundo neutro ou transparente</li>
                <li>Formato quadrado, mín. 500×500px</li>
                <li>PNG (preferencial) ou JPG, até 5MB</li>
                <li>Evite logos com muito texto pequeno</li>
              </ul>
            </div>
          </aside>

          <form className={s.formulario} onSubmit={enviar} method="POST">
            <section className={s.secao}>
              <CabecaSecao icone={<Building2 size={20} />} titulo="Dados da empresa" sub="Informações jurídicas para validação" />

              <div className={s.campo}>
                <label htmlFor="rest-nome">Nome fantasia do restaurante <span className={s.req} aria-hidden>*</span> <span className={s.info}>· aparece no marketplace</span></label>
                <input id="rest-nome" name="nome" type="text" autoComplete="organization" enterKeyHint="next" minLength={3} maxLength={60} required placeholder="Ex: Bowl & Cia" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className={s.campo}>
                <label htmlFor="rest-razao">Razão social <span className={s.info}>· opcional</span></label>
                <input id="rest-razao" name="razaoSocial" type="text" enterKeyHint="next" placeholder="Ex: Bowl & Cia Alimentação Saudável Ltda" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
              </div>

              <div className={s.linha2}>
                <div className={s.campo}>
                  <label htmlFor="rest-cnpj">CNPJ <span className={s.req} aria-hidden>*</span></label>
                  <input
                    id="rest-cnpj"
                    name="cnpj"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="next"
                    required
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    aria-invalid={mostrarErroCnpj ? 'true' : 'false'}
                    aria-describedby={mostrarErroCnpj ? 'cnpj-status' : undefined}
                    onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                    onBlur={() => setCnpjTocado(true)}
                  />
                  {cnpjOk && (
                    <div id="cnpj-status" className={`${s.cnpjStatus} ${s.cnpjOk}`} role="status">
                      <Check size={14} aria-hidden /> CNPJ válido
                    </div>
                  )}
                  {mostrarErroCnpj && (
                    <div id="cnpj-status" className={`${s.cnpjStatus} ${s.cnpjErro}`} role="status">
                      <AlertCircle size={14} aria-hidden /> CNPJ inválido: confira os 14 dígitos.
                    </div>
                  )}
                </div>

                <div className={s.campo}>
                  <label htmlFor="rest-tel">Telefone comercial <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-tel" name="telefone" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" required placeholder="(81) 99999-9999" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} />
                </div>
              </div>
            </section>

            <section className={s.secao}>
              <CabecaSecao icone={<MapPin size={20} />} titulo="Endereço comercial" sub="Local de funcionamento do restaurante" />

              <div className={s.linhaCep}>
                <div className={s.campo}>
                  <label htmlFor="rest-cep">CEP <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-cep" name="cep" type="text" inputMode="numeric" autoComplete="postal-code" enterKeyHint="next" required placeholder="50030-000" value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} />
                </div>
                <div className={s.campo}>
                  <label htmlFor="rest-rua">Rua <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-rua" name="logradouro" type="text" autoComplete="address-line1" enterKeyHint="next" required placeholder="Ex: Avenida Boa Viagem" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
                </div>
              </div>

              <div className={s.linha3}>
                <div className={s.campo}>
                  <label htmlFor="rest-bairro">Bairro <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-bairro" name="bairro" type="text" enterKeyHint="next" required placeholder="Boa Viagem" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                </div>
                <div className={s.campo}>
                  <label htmlFor="rest-num">Número <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-num" name="numero" type="text" enterKeyHint="next" required placeholder="1820" value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div className={s.campo}>
                  <label htmlFor="rest-comp">Complemento</label>
                  <input id="rest-comp" name="complemento" type="text" autoComplete="address-line2" enterKeyHint="next" placeholder="Loja 3" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                </div>
              </div>

              <div className={s.linha2}>
                <div className={s.campo}>
                  <label htmlFor="rest-cidade">Cidade <span className={s.req} aria-hidden>*</span></label>
                  <input id="rest-cidade" name="cidade" type="text" autoComplete="address-level2" enterKeyHint="next" required value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </div>
                <div className={s.campo}>
                  <label htmlFor="rest-uf">Estado <span className={s.req} aria-hidden>*</span></label>
                  <select id="rest-uf" name="uf" autoComplete="address-level1" required value={uf} onChange={(e) => setUf(e.target.value)}>
                    {ESTADOS_BR.map((e) => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className={s.secao}>
              <CabecaSecao icone={<UtensilsCrossed size={20} />} titulo="Tipo de cozinha" sub="Selecione tudo que se aplica ao seu cardápio" />
              <div className={s.cozinhas} role="group" aria-label="Tipos de cozinha">
                {opcoesCozinha.map((item) => {
                  const ativo = tiposCozinha.includes(item);
                  return (
                    <button key={item} type="button" aria-pressed={ativo} className={`${s.cozinhaBtn} ${ativo ? s.cozinhaAtiva : ''}`} onClick={() => alternarCozinha(item)}>
                      {iconeCozinha(item)}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={s.secao}>
              <CabecaSecao icone={<Clock size={20} />} titulo="Horário de funcionamento" sub="Quando o restaurante aceita pedidos" />
              <div className={s.horarios}>
                {ORDEM_DIAS.map(({ dia, nome: rotulo }) => {
                  const h = horarios.find((x) => x.dia === dia)!;
                  return (
                    <div key={dia} className={s.horarioLinha}>
                      <div className={s.diaToggle}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={h.aberto}
                          aria-label={`${rotulo}: ${h.aberto ? 'aberto' : 'fechado'}`}
                          className={`${s.switch} ${h.aberto ? s.switchOn : ''}`}
                          onClick={() => atualizarHorario(dia, { aberto: !h.aberto })}
                        />
                        <span>{rotulo}</span>
                      </div>
                      {h.aberto ? (
                        <>
                          <input type="time" className={s.horaInput} aria-label={`Abertura ${rotulo}`} value={h.abre} onChange={(e) => atualizarHorario(dia, { abre: e.target.value })} />
                          <input type="time" className={s.horaInput} aria-label={`Fechamento ${rotulo}`} value={h.fecha} onChange={(e) => atualizarHorario(dia, { fecha: e.target.value })} />
                        </>
                      ) : (
                        <div className={s.fechado}>Fechado</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={s.secao}>
              <CabecaSecao icone={<PenLine size={20} />} titulo="Apresentação do restaurante" sub="Como você quer aparecer para os clientes" />

              <div className={s.campo}>
                <label htmlFor="rest-slogan">Slogan curto <span className={s.info}>· aparece no card de busca</span></label>
                <input id="rest-slogan" name="slogan" type="text" maxLength={120} enterKeyHint="next" placeholder="Em uma frase, o que define seu restaurante?" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
              </div>

              <div className={s.campo}>
                <label htmlFor="rest-desc">Descrição completa <span className={s.req} aria-hidden>*</span> <span className={s.info}>· mín. 100 caracteres</span></label>
                <textarea id="rest-desc" name="descricao" rows={5} minLength={100} maxLength={500} required placeholder="Conte sobre seu restaurante, ingredientes, abordagem e diferenciais..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                <p className={`${s.contador} ${descricao.trim().length >= 100 ? s.contadorOk : ''}`}>{descricao.length} / 500</p>
              </div>
            </section>

            {erro && <p className={s.erro} role="alert"><AlertCircle size={18} aria-hidden /> {erro}</p>}

            <div className={s.navegacao}>
              <Link to="/cadastro/perfil" className={s.btnVoltar}><ArrowLeft size={16} aria-hidden /> Voltar</Link>
              <button type="submit" className={s.btnEnviar} disabled={salvar.isPending || enviarLogo.isPending}>
                {salvar.isPending ? 'Enviando…' : 'Enviar para aprovação'}
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function CabecaSecao({ icone, titulo, sub }: { icone: ReactNode; titulo: string; sub: string }) {
  return (
    <div className={s.secaoCabeca}>
      <span className={s.secaoIcone} aria-hidden>{icone}</span>
      <div>
        <h3>{titulo}</h3>
        <p>{sub}</p>
      </div>
      <span className={s.badge}>Obrigatório</span>
    </div>
  );
}
