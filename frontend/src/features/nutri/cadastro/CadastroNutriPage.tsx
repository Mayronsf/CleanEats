import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, Info, Plus, Star, X } from 'lucide-react';
import { Botao, Logo, Stepper, useToast } from '../../../design-system';
import { CarregandoPagina } from '../../../app/CarregandoPagina';
import { useAuth } from '../../../hooks/useAuth';
import { cadastrarNutricionista, type Disponibilidade } from '../../../services/nutri/triagens';
import { lerRascunho, limparRascunho } from '../../conta/rascunhoCadastro';
import s from './CadastroNutriPage.module.css';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SUGESTOES = ['Nutrição Clínica', 'Nutrição Funcional', 'Reeducação Alimentar', 'Nutrição Materno-Infantil', 'Nutrição Vegana', 'Transtornos Alimentares'];

export default function CadastroNutriPage() {
  const { sessao, carregandoSessao, usuario } = useAuth();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const toast = useToast();
  const rascunho = lerRascunho();
  const metadata = sessao?.user.user_metadata as { nome?: string; name?: string; full_name?: string } | undefined;
  const nome = [rascunho.nome, rascunho.sobrenome].filter(Boolean).join(' ') || metadata?.nome || metadata?.full_name || metadata?.name || '';
  const [crn, setCrn] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [anos, setAnos] = useState('');
  const [dias, setDias] = useState<number[]>([]);
  const [inicio, setInicio] = useState('09:00');
  const [fim, setFim] = useState('18:00');
  const [bio, setBio] = useState('');
  const [erro, setErro] = useState('');
  const salvar = useMutation({ mutationFn: cadastrarNutricionista, onError: (e) => setErro((e as Error).message) });

  if (carregandoSessao) return <CarregandoPagina />;
  if (!sessao) return <Navigate to="/cadastro" replace />;
  if (usuario) return <Navigate to="/nutri" replace />;

  function adicionar(valor = especialidade) {
    const novo = valor.trim();
    if (novo && !especialidades.some((x) => x.toLocaleLowerCase() === novo.toLocaleLowerCase())) setEspecialidades([...especialidades, novo]);
    setEspecialidade('');
  }
  function alternarDia(dia: number) { setDias((atuais) => atuais.includes(dia) ? atuais.filter((x) => x !== dia) : [...atuais, dia].sort()); }
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro('');
    const disponibilidade: Disponibilidade[] = dias.map((dia) => ({ dia: dia + 1, inicio, fim }));
    const nomeFinal = nome || sessao?.user.email?.split('@')[0] || '';
    try {
      await salvar.mutateAsync({ nome: nomeFinal, crn, especialidades, anosExperiencia: Number(anos), bio,
        disponibilidade, aceiteTermosEm: rascunho.aceiteTermosEm ?? new Date().toISOString() });
      limparRascunho();
      toast('Cadastro enviado para aprovação. Você poderá acessar o painel enquanto seu CRN é validado.');
      navegar('/nutri', { replace: true });
      void cliente.invalidateQueries({ queryKey: ['usuario-atual'] });
    } catch { /* O erro é mostrado junto ao formulário. */ }
  }

  return <div className={s.pagina}>
    <header className={s.topo}><Logo /><Link to="/cadastro/perfil" className={s.voltar}><ArrowLeft size={16} aria-hidden /><span>Voltar</span></Link></header>
    <div className={s.faixa}><Stepper etapas={['Conta', 'Perfil', 'Profissional']} atual={2} /></div>
    <main className={s.principal}>
      <header className={s.cabeca}><p className={s.rotulo}>Cadastro de Nutricionista · Etapa 3 de 3</p><h1>Conte sua <span className="script">história</span></h1>
        <p>Esses dados serão usados pra montar seu perfil público e validar sua atuação profissional. Seu cadastro passa por aprovação manual antes de ser ativado.</p></header>

      <div className={s.aviso}><span><Info size={21} aria-hidden /></span><p><strong>Validação profissional obrigatória</strong>Conforme exigência do CFN (Conselho Federal de Nutricionistas), validamos manualmente seu CRN antes de liberar seu perfil. O processo leva até 48h úteis. Você só pode atender clientes após aprovação.</p></div>

      <form className={s.formulario} onSubmit={enviar}>
        <section className={s.secao}>
          <CabecaSecao icone={<ClipboardList size={19} />} titulo="Dados profissionais" sub="Informações de registro profissional" />
          <div className={s.linha}>
            <Campo id="crn" rotulo="Número e regional do CRN" dica="Formato: CRN-6 PE 12345/P" required><input id="crn" value={crn} onChange={(e) => setCrn(e.target.value.toUpperCase())} placeholder="CRN-6 PE 12345/P" autoComplete="off" required /></Campo>
            <Campo id="anos" rotulo="Anos de experiência" required><select id="anos" value={anos} onChange={(e) => setAnos(e.target.value)} required><option value="">Selecione</option>{Array.from({ length: 41 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Menos de 1 ano' : `${i} ${i === 1 ? 'ano' : 'anos'}`}</option>)}</select></Campo>
          </div>
        </section>

        <section className={s.secao}>
          <CabecaSecao icone={<Star size={19} />} titulo="Especialidades" sub="Selecione ou adicione suas áreas de atuação" />
          <div className={s.tagsBox}>{especialidades.map((item) => <span className={s.tag} key={item}>{item}<button type="button" aria-label={`Remover ${item}`} onClick={() => setEspecialidades(especialidades.filter((x) => x !== item))}><X size={13} /></button></span>)}
            <input aria-label="Adicionar especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } }} placeholder="Adicionar especialidade..." />
            <button className={s.adicionar} type="button" onClick={() => adicionar()} aria-label="Adicionar especialidade"><Plus size={16} /></button>
          </div>
          <div className={s.sugestoes}><span>Sugestões:</span>{SUGESTOES.map((item) => <button type="button" key={item} onClick={() => adicionar(item)} disabled={especialidades.includes(item)}>+ {item}</button>)}</div>
        </section>

        <section className={s.secao}>
          <CabecaSecao icone={<CalendarDays size={19} />} titulo="Disponibilidade" sub="Quando você poderá atender clientes" />
          <p className={s.label}>Dias da semana</p><div className={s.dias} role="group" aria-label="Dias disponíveis">{DIAS.map((dia, i) => <button type="button" aria-pressed={dias.includes(i)} className={dias.includes(i) ? s.diaSelecionado : ''} key={dia} onClick={() => alternarDia(i)}><small>{dia}</small><strong>{i < 5 ? i + 2 : dia[0]}</strong></button>)}</div>
          <div className={s.linha}><Campo id="inicio" rotulo="Horário inicial"><input id="inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo><Campo id="fim" rotulo="Horário final"><input id="fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></Campo></div>
        </section>

        <section className={s.secao}>
          <CabecaSecao icone={<Check size={19} />} titulo="Sobre você" sub="Apresentação que os clientes verão no seu perfil" />
          <Campo id="bio" rotulo="Biografia completa" dica="Mínimo de 100 caracteres" required><textarea id="bio" rows={5} minLength={100} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte sobre sua formação, experiência, abordagem e diferenciais..." required /></Campo>
          <p className={s.contador}>{bio.length} / 500</p>
        </section>

        {erro && <p className={s.erro} role="alert">{erro}</p>}
        <div className={s.navegacao}><Link to="/cadastro/perfil"><ArrowLeft size={16} /> Voltar</Link><Botao type="submit" tamanho="lg" carregando={salvar.isPending} iconeDireita={<ArrowRight size={18} aria-hidden />}>Enviar para aprovação</Botao></div>
      </form>
    </main>
  </div>;
}

function CabecaSecao({ icone, titulo, sub }: { icone: ReactNode; titulo: string; sub: string }) {
  return <div className={s.secaoCabeca}><span className={s.secaoIcone} aria-hidden>{icone}</span><div><h2>{titulo}</h2><p>{sub}</p></div><span className={s.obrigatorio}>Obrigatório</span></div>;
}
function Campo({ id, rotulo, dica, required, children }: { id: string; rotulo: string; dica?: string; required?: boolean; children: ReactNode }) {
  return <div className={s.campo}><label htmlFor={id}>{rotulo}{required && <span aria-hidden> *</span>}</label>{children}{dica && <small>{dica}</small>}</div>;
}
