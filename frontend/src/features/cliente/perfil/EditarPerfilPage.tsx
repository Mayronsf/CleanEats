import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowLeft, ArrowRight, Ban, Briefcase, Camera, Flame, Home, KeyRound, Lock, LogOut, MapPin, Pencil, Plus, Ruler, Save,
  Scale, ShieldCheck, Target, Trash2, User,
} from 'lucide-react';
import { Confirmacao, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarNumero, iniciais } from '../../../lib/formato';
import { useAuth } from '../../../hooks/useAuth';
import { ErroApi } from '../../../services/api';
import { supabase } from '../../../services/supabase';
import { buscarMetasIniciais, buscarRestricoes } from '../../../services/cadastro';
import {
  atualizarPerfil, buscarPerfil, enviarAvatar, excluirConta, excluirEndereco, listarEnderecos, removerAvatar, ROTULO_OBJETIVO,
  type AtualizarPerfil, type Endereco, type NivelAtividade, type Objetivo, type PerfilCliente,
} from '../../../services/cliente';
import { EnderecoDialog } from '../componentes/EnderecoDialog';
import s from './EditarPerfilPage.module.css';

const NIVEIS: { valor: NivelAtividade; rotulo: string }[] = [
  { valor: 'SEDENTARIO', rotulo: 'Sedentário · pouco ou nenhum exercício' },
  { valor: 'LEVE', rotulo: 'Leve · 1–2× por semana' },
  { valor: 'MODERADO', rotulo: 'Moderado · 3–5× por semana' },
  { valor: 'INTENSO', rotulo: 'Intenso · 6–7× por semana' },
  { valor: 'ATLETA', rotulo: 'Atleta · treino 2× ao dia' },
];
const OBJETIVOS: { valor: Objetivo; icone: typeof Flame; cor: string }[] = [
  { valor: 'EMAGRECIMENTO', icone: Flame, cor: 'laranja' },
  { valor: 'GANHO_MASSA', icone: Activity, cor: 'coral' },
  { valor: 'EQUILIBRIO', icone: Scale, cor: 'verde' },
];
const SECOES = [
  { id: 'dados', titulo: 'Dados pessoais', sub: 'Nome, contato, foto', icone: User },
  { id: 'fisicos', titulo: 'Dados físicos', sub: 'Peso, altura, idade', icone: Ruler },
  { id: 'objetivo', titulo: 'Objetivo nutricional', sub: 'Meta de macros', icone: Target },
  { id: 'restricoes', titulo: 'Restrições alimentares', sub: 'Filtra cardápio', icone: Ban },
  { id: 'enderecos', titulo: 'Endereços', sub: 'Entrega', icone: MapPin },
  { id: 'seguranca', titulo: 'Segurança', sub: 'Senha, sessões, conta', icone: Lock },
] as const;

type Form = Omit<AtualizarPerfil, 'pesoKg' | 'alturaCm' | 'metaPesoKg' | 'prazoMetaMeses'> & { pesoKg: string; alturaCm: string; metaPesoKg: string; prazoMetaMeses: string };

const paraForm = (p: PerfilCliente): Form => ({
  nome: p.nome, telefone: p.telefone ?? '', username: p.username ?? '', bio: p.bio ?? '', dataNascimento: p.dataNascimento ?? '',
  sexo: p.sexo, pesoKg: p.pesoKg != null ? String(Number(p.pesoKg)) : '', alturaCm: p.alturaCm != null ? String(Number(p.alturaCm)) : '',
  nivelAtividade: p.nivelAtividade, objetivo: p.objetivo, metaPesoKg: p.metaPesoKg != null ? String(Number(p.metaPesoKg)) : '',
  prazoMetaMeses: p.prazoMetaMeses != null ? String(p.prazoMetaMeses) : '', restricoes: p.restricoes.map((r) => r.slug),
  observacoesAlimentares: p.observacoesAlimentares ?? '',
});
const numero = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const idadeDe = (iso: string) => {
  if (!iso) return null;
  const n = new Date(`${iso}T12:00:00`); const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
};
function classificar(imc: number) {
  if (imc < 18.5) return { texto: 'abaixo do peso', faixa: 'Abaixo da faixa', tom: s.alerta };
  if (imc < 25) return { texto: 'peso normal', faixa: 'Faixa saudável', tom: s.saudavel };
  if (imc < 30) return { texto: 'sobrepeso', faixa: 'Acima da faixa', tom: s.alerta };
  return { texto: 'obesidade', faixa: 'Acima da faixa', tom: s.alerta };
}

/** Tela 22 — Editar perfil (CE-12): dados pessoais e físicos (IMC), objetivo, restrições, endereços, segurança e exclusão de conta (LGPD). */
export default function EditarPerfilPage() {
  const navegar = useNavigate();
  const local = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const { sair } = useAuth();
  const perfil = useQuery({ queryKey: ['cliente', 'perfil'], queryFn: buscarPerfil });
  const restricoes = useQuery({ queryKey: ['restricoes'], queryFn: buscarRestricoes, staleTime: 10 * 60_000 });
  const metas = useQuery({ queryKey: ['metas-iniciais'], queryFn: buscarMetasIniciais, staleTime: 10 * 60_000 });
  const enderecos = useQuery({ queryKey: ['cliente', 'enderecos'], queryFn: listarEnderecos });
  const [form, setForm] = useState<Form | null>(null);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [secaoAtiva, setSecaoAtiva] = useState<string>('dados');
  const [enderecoDialogo, setEnderecoDialogo] = useState<{ aberto: boolean; endereco: Endereco | null }>({ aberto: false, endereco: null });
  const [enderecoExcluir, setEnderecoExcluir] = useState<Endereco | null>(null);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
  const [senha, setSenha] = useState({ nova: '', confirmar: '' });
  const entradaFoto = useRef<HTMLInputElement>(null);

  useEffect(() => { if (perfil.data && !form) setForm(paraForm(perfil.data)); }, [perfil.data, form]);
  useEffect(() => {
    if (!form || !local.hash) return;
    const id = local.hash.slice(1);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    setSecaoAtiva(id);
  }, [local.hash, form !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = useMemo(() => (perfil.data ? paraForm(perfil.data) : null), [perfil.data]);
  const sujo = !!form && !!original && JSON.stringify(form) !== JSON.stringify(original);
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sujo]);

  const aplicarPerfil = (p: PerfilCliente) => {
    qc.setQueryData(['cliente', 'perfil'], p);
    void qc.invalidateQueries({ queryKey: ['usuario-atual'] });
    void qc.invalidateQueries({ queryKey: ['cliente', 'resumo'] });
    void qc.invalidateQueries({ queryKey: ['cliente', 'perfil', 'estatisticas'] });
  };
  const salvar = useMutation({
    mutationFn: (f: Form) => atualizarPerfil({
      ...f, telefone: f.telefone || null, username: f.username || null, bio: f.bio || null, dataNascimento: f.dataNascimento || null,
      pesoKg: numero(f.pesoKg), alturaCm: numero(f.alturaCm), metaPesoKg: numero(f.metaPesoKg), prazoMetaMeses: numero(f.prazoMetaMeses),
      observacoesAlimentares: f.observacoesAlimentares || null,
    }),
    onSuccess: (p) => {
      aplicarPerfil(p); setForm(paraForm(p));
      void qc.invalidateQueries({ queryKey: ['cliente', 'marmitas'] });
      toast(p.objetivo !== original?.objetivo ? 'Perfil salvo. Suas metas foram recalculadas para o novo objetivo.' : 'Perfil salvo.', 'sucesso');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível salvar o perfil.', 'erro'),
  });
  const foto = useMutation({
    mutationFn: (arquivo: File | null) => (arquivo ? enviarAvatar(arquivo) : removerAvatar()),
    onSuccess: (p, arquivo) => { aplicarPerfil(p); toast(arquivo ? 'Foto atualizada.' : 'Foto removida.', 'sucesso'); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível atualizar a foto.', 'erro'),
  });
  const removerEndereco = useMutation({
    mutationFn: (e: Endereco) => excluirEndereco(e.id),
    onSuccess: () => { setEnderecoExcluir(null); void qc.invalidateQueries({ queryKey: ['cliente', 'enderecos'] }); void qc.invalidateQueries({ queryKey: ['cliente', 'perfil'] }); toast('Endereço removido.', 'sucesso'); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível remover o endereço.', 'erro'),
  });
  const trocarSenha = useMutation({
    mutationFn: async () => { const { error } = await supabase.auth.updateUser({ password: senha.nova }); if (error) throw error; },
    onSuccess: () => { setSenha({ nova: '', confirmar: '' }); toast('Senha alterada.', 'sucesso'); },
    onError: (e) => toast(e instanceof Error && /different|same/i.test(e.message) ? 'A nova senha precisa ser diferente da atual.' : 'Não foi possível trocar a senha.', 'erro'),
  });
  const encerrarSessoes = useMutation({
    mutationFn: async () => { await supabase.auth.signOut({ scope: 'global' }); },
    onSuccess: () => { qc.clear(); navegar('/login'); },
  });
  const excluir = useMutation({
    mutationFn: excluirConta,
    onSuccess: async () => { await sair(); qc.clear(); navegar('/', { replace: true }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível excluir a conta.', 'erro'),
  });

  if (perfil.isError) return <div className={s.pagina}><ErroCarregamento onTentarNovamente={() => perfil.refetch()} /></div>;
  if (!perfil.data || !form) return <div className={s.pagina}><Skeleton altura={60} raio={16} /><div style={{ height: 24 }} /><Skeleton altura={700} raio={24} /></div>;

  const p = perfil.data;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm({ ...form, [k]: v }); if (erros[k]) setErros({ ...erros, [k]: undefined }); };
  const peso = numero(form.pesoKg); const altura = numero(form.alturaCm);
  const imc = peso && altura ? peso / ((altura / 100) ** 2) : null;
  const classe = imc ? classificar(imc) : null;
  const idade = idadeDe(form.dataNascimento ?? '');
  const senhaFraca = senha.nova.length > 0 && senha.nova.length < 8;
  const senhaDiferente = senha.confirmar.length > 0 && senha.nova !== senha.confirmar;

  function validarESalvar() {
    const e: typeof erros = {};
    if (form!.nome.trim().length < 3) e.nome = 'Informe o nome completo';
    if (form!.telefone && form!.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Use DDD + número';
    if (form!.username && !/^@?[a-z0-9_.]{3,30}$/.test(form!.username)) e.username = '3 a 30 letras minúsculas, números, ponto ou _';
    if (!peso || peso < 20 || peso > 400) e.pesoKg = 'Entre 20 e 400 kg';
    if (!altura || altura < 80 || altura > 250) e.alturaCm = 'Entre 80 e 250 cm';
    if (idade != null && (idade < 13 || idade > 120)) e.dataNascimento = 'Data inválida';
    setErros(e);
    if (Object.keys(e).length) {
      const primeiro = Object.keys(e)[0];
      document.getElementById(`campo-${primeiro}`)?.focus();
      toast('Revise os campos destacados.', 'erro');
      return;
    }
    salvar.mutate(form!);
  }
  const irPara = (id: string) => { setSecaoAtiva(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const aoEscolherFoto = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) foto.mutate(f); };

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <button type="button" className={s.voltar} onClick={() => navegar('/app/perfil')} aria-label="Voltar ao perfil"><ArrowLeft size={18} aria-hidden /></button>
        <div className={s.topoTexto}>
          <h1 className={s.titulo}>Editar <span className="script">perfil</span></h1>
          <p className={s.sub}>Mantenha seus dados atualizados pra ter recomendações precisas</p>
        </div>
        <span className={`${s.estado} ${sujo ? s.estadoSujo : ''}`} role="status"><span className={s.ponto} aria-hidden />{sujo ? 'Alterações não salvas' : 'Tudo salvo'}</span>
      </header>

      <div className={s.grade}>
        <nav className={s.menu} aria-label="Seções do perfil">
          {SECOES.map((x, i) => (
            <div key={x.id}>
              {i === 4 && <hr className={s.divisor} />}
              <button type="button" className={`${s.menuItem} ${secaoAtiva === x.id ? s.menuAtivo : ''}`} onClick={() => irPara(x.id)} aria-current={secaoAtiva === x.id ? 'true' : undefined}>
                <span className={s.menuIcone} aria-hidden><x.icone size={16} /></span>
                <span><strong>{x.titulo}</strong><small>{x.id === 'enderecos' ? `${enderecos.data?.length ?? p.totalEnderecos} cadastrados` : x.sub}</small></span>
              </button>
            </div>
          ))}
        </nav>

        <div className={s.secoes}>
          <Secao id="dados" icone={<User size={18} />} titulo="Dados pessoais" sub="Informações básicas de identificação e contato">
            <div className={s.foto}>
              <span className={s.avatar}>{p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : iniciais(p.nome)}</span>
              <div>
                <p className={s.fotoTitulo}>Sua foto de perfil</p>
                <p className={s.dica}>JPG, PNG, WEBP ou GIF · Tamanho máximo 5MB · Quadrado recomendado</p>
                <div className={s.fotoAcoes}>
                  <button type="button" className={s.botaoVerde} onClick={() => entradaFoto.current?.click()} disabled={foto.isPending}><Camera size={14} aria-hidden /> {foto.isPending ? 'Enviando…' : 'Trocar foto'}</button>
                  <button type="button" className={s.botaoClaro} onClick={() => foto.mutate(null)} disabled={foto.isPending || !p.avatarUrl}>Remover</button>
                  <input ref={entradaFoto} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={aoEscolherFoto} />
                </div>
              </div>
            </div>
            <div className={s.campos2}>
              <Campo id="nome" rotulo="Nome completo" obrigatorio erro={erros.nome}><input id="campo-nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" /></Campo>
              <Campo id="username" rotulo="Username" dica="Aparece publicamente em avaliações" erro={erros.username}>
                <input id="campo-username" value={form.username ? `@${form.username.replace(/^@/, '')}` : ''} placeholder="@seunome" onChange={(e) => set('username', e.target.value.replace(/^@/, '').toLowerCase())} />
              </Campo>
              <Campo id="email" rotulo="E-mail" obrigatorio dica="O e-mail de login não pode ser alterado aqui"><input id="campo-email" value={p.email} readOnly aria-readonly /></Campo>
              <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}><input id="campo-telefone" value={form.telefone ?? ''} onChange={(e) => set('telefone', mascaraTelefone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(81) 90000-0000" /></Campo>
            </div>
            <Campo id="bio" rotulo="Bio (opcional)" dica={`${(form.bio ?? '').length}/400`}><textarea id="campo-bio" rows={3} maxLength={400} value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} /></Campo>
            <div className={s.campos2}>
              <Campo id="dataNascimento" rotulo="Data de nascimento" erro={erros.dataNascimento}><input id="campo-dataNascimento" type="date" value={form.dataNascimento ?? ''} onChange={(e) => set('dataNascimento', e.target.value)} max={new Date().toISOString().slice(0, 10)} /></Campo>
              <Campo id="sexo" rotulo="Gênero (opcional)">
                <select id="campo-sexo" value={form.sexo ?? ''} onChange={(e) => set('sexo', (e.target.value || null) as Form['sexo'])}>
                  <option value="">Prefiro não informar</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option>
                </select>
              </Campo>
            </div>
          </Secao>

          <Secao id="fisicos" icone={<Ruler size={18} />} titulo="Dados físicos" sub="Usados pra calcular suas metas calóricas e proteicas diárias" tom="azul">
            <div className={s.campos3}>
              <Campo id="pesoKg" rotulo="Peso atual" obrigatorio erro={erros.pesoKg}><Unidade u="kg"><input id="campo-pesoKg" inputMode="decimal" value={form.pesoKg} onChange={(e) => set('pesoKg', e.target.value.replace(/[^\d.,]/g, ''))} /></Unidade></Campo>
              <Campo id="alturaCm" rotulo="Altura" obrigatorio erro={erros.alturaCm}><Unidade u="cm"><input id="campo-alturaCm" inputMode="numeric" value={form.alturaCm} onChange={(e) => set('alturaCm', e.target.value.replace(/[^\d.,]/g, ''))} /></Unidade></Campo>
              <Campo id="idade" rotulo="Idade" dica="Calculada pela data de nascimento"><Unidade u="anos"><input id="campo-idade" value={idade ?? ''} readOnly aria-readonly /></Unidade></Campo>
            </div>
            <Campo id="nivelAtividade" rotulo="Nível de atividade física" dica="Ajuda no cálculo da sua taxa metabólica basal (TMB)">
              <select id="campo-nivelAtividade" value={form.nivelAtividade ?? ''} onChange={(e) => set('nivelAtividade', (e.target.value || null) as NivelAtividade | null)}>
                <option value="">Selecione</option>{NIVEIS.map((n) => <option key={n.valor} value={n.valor}>{n.rotulo}</option>)}
              </select>
            </Campo>
            <div className={s.imc} aria-live="polite">
              <div><p className={s.imcRotulo}>Seu IMC calculado</p><p className={s.imcValor}>{imc ? imc.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'} <small>{classe ? `· ${classe.texto}` : '· informe peso e altura'}</small></p></div>
              {classe && <span className={`${s.faixa} ${classe.tom}`}><span className={s.ponto} aria-hidden />{classe.faixa}</span>}
            </div>
          </Secao>

          <Secao id="objetivo" icone={<Target size={18} />} titulo="Objetivo nutricional" sub="Define o cálculo de calorias e macros recomendados" tom="coral">
            <div className={s.objetivos} role="radiogroup" aria-label="Objetivo nutricional">
              {OBJETIVOS.map((o) => (
                <button key={o.valor} type="button" role="radio" aria-checked={form.objetivo === o.valor} className={`${s.objetivo} ${form.objetivo === o.valor ? s.objetivoAtivo : ''}`} onClick={() => set('objetivo', o.valor)}>
                  <span className={`${s.objetivoIcone} ${s[o.cor]}`} aria-hidden><o.icone size={18} /></span>
                  <strong>{ROTULO_OBJETIVO[o.valor].replace('Dieta equilibrada', 'Equilíbrio')}</strong>
                  <small>{metas.data ? `~${formatarNumero(metas.data[o.valor].calorias)} kcal/dia` : '…'}</small>
                  <span className={s.radio} aria-hidden />
                </button>
              ))}
            </div>
            {original && form.objetivo !== original.objetivo && <p className={s.avisoMetas}>Ao salvar, suas metas diárias voltam para as do novo objetivo. Sua nutricionista pode ajustá-las depois.</p>}
            <div className={s.campos2}>
              <Campo id="metaPesoKg" rotulo="Meta de peso (opcional)" dica="Sua nutri vai usar essa meta pra montar seu plano"><Unidade u="kg"><input id="campo-metaPesoKg" inputMode="decimal" value={form.metaPesoKg} onChange={(e) => set('metaPesoKg', e.target.value.replace(/[^\d.,]/g, ''))} /></Unidade></Campo>
              <Campo id="prazoMetaMeses" rotulo="Prazo">
                <select id="campo-prazoMetaMeses" value={form.prazoMetaMeses} onChange={(e) => set('prazoMetaMeses', e.target.value)}>
                  <option value="">Sem prazo</option>{[1, 2, 3, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>Em {m} {m === 1 ? 'mês' : 'meses'}</option>)}
                </select>
              </Campo>
            </div>
          </Secao>

          <Secao id="restricoes" icone={<Ban size={18} />} titulo="Restrições alimentares" sub="Filtra automaticamente pratos do marketplace que não combinam" tom="laranja">
            {restricoes.isError ? <ErroCarregamento onTentarNovamente={() => restricoes.refetch()} /> : !restricoes.data ? <Skeleton altura={100} raio={14} /> : (
              <div className={s.restricoes}>
                {restricoes.data.map((r) => {
                  const marcada = form.restricoes.includes(r.slug);
                  return (
                    <label key={r.slug} className={`${s.restricao} ${marcada ? s.restricaoAtiva : ''}`}>
                      <span>{r.nome}</span>
                      <input type="checkbox" checked={marcada} onChange={() => set('restricoes', marcada ? form.restricoes.filter((x) => x !== r.slug) : [...form.restricoes, r.slug])} />
                    </label>
                  );
                })}
              </div>
            )}
            <Campo id="observacoesAlimentares" rotulo="Alergias e observações específicas" dica="Essa informação é compartilhada com sua nutricionista">
              <textarea id="campo-observacoesAlimentares" rows={3} maxLength={1000} value={form.observacoesAlimentares ?? ''} onChange={(e) => set('observacoesAlimentares', e.target.value)} />
            </Campo>
          </Secao>

          <Secao id="enderecos" icone={<MapPin size={18} />} titulo="Endereços" sub="Usados na entrega dos seus pedidos" tom="verde"
            acao={<button type="button" className={s.botaoVerde} onClick={() => setEnderecoDialogo({ aberto: true, endereco: null })}><Plus size={14} aria-hidden /> Novo endereço</button>}>
            {enderecos.isError ? <ErroCarregamento onTentarNovamente={() => enderecos.refetch()} /> : !enderecos.data ? <Skeleton altura={90} raio={14} /> :
              enderecos.data.length === 0 ? <p className={s.vazio}>Nenhum endereço salvo. Cadastre um para agilizar o checkout.</p> : (
                <ul className={s.enderecos}>
                  {enderecos.data.map((e) => (
                    <li key={e.id} className={s.endereco}>
                      <span className={s.enderecoIcone} aria-hidden>{e.apelido.toLowerCase().includes('trab') ? <Briefcase size={16} /> : <Home size={16} />}</span>
                      <div className={s.enderecoTexto}>
                        <p>{e.apelido} {e.principal && <span className={s.principal}>Principal</span>}</p>
                        <small>{e.logradouro}, {e.numero}{e.complemento ? ` · ${e.complemento}` : ''} — {e.bairro}, {e.cidade}/{e.uf}</small>
                      </div>
                      <button type="button" className={s.icone} onClick={() => setEnderecoDialogo({ aberto: true, endereco: e })} aria-label={`Editar endereço ${e.apelido}`}><Pencil size={16} aria-hidden /></button>
                      <button type="button" className={`${s.icone} ${s.iconePerigo}`} onClick={() => setEnderecoExcluir(e)} aria-label={`Remover endereço ${e.apelido}`}><Trash2 size={16} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
          </Secao>

          <Secao id="seguranca" icone={<ShieldCheck size={18} />} titulo="Segurança" sub="Senha de acesso e sessões abertas">
            <form className={s.campos2} onSubmit={(e) => { e.preventDefault(); if (!senhaFraca && !senhaDiferente && senha.nova) trocarSenha.mutate(); }}>
              <Campo id="novaSenha" rotulo="Nova senha" erro={senhaFraca ? 'Mínimo de 8 caracteres' : undefined}><input id="campo-novaSenha" type="password" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} /></Campo>
              <Campo id="confirmarSenha" rotulo="Confirmar nova senha" erro={senhaDiferente ? 'As senhas não conferem' : undefined}><input id="campo-confirmarSenha" type="password" autoComplete="new-password" value={senha.confirmar} onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })} /></Campo>
              <div className={s.segurancaAcoes}>
                <button type="submit" className={s.botaoVerde} disabled={!senha.nova || senhaFraca || senhaDiferente || !senha.confirmar || trocarSenha.isPending}><KeyRound size={14} aria-hidden /> {trocarSenha.isPending ? 'Salvando…' : 'Trocar senha'}</button>
                <button type="button" className={s.botaoClaro} onClick={() => encerrarSessoes.mutate()} disabled={encerrarSessoes.isPending}><LogOut size={14} aria-hidden /> Sair de todos os dispositivos</button>
              </div>
            </form>
            <div className={s.excluir}>
              <div><p>Excluir minha conta</p><small>Apaga seus dados pessoais, endereços e preferências e encerra a assinatura. Pedidos ficam no histórico dos restaurantes sem identificar você. Não pode ser desfeito.</small></div>
              <button type="button" onClick={() => { setConfirmacaoTexto(''); setExcluirAberto(true); }}>Excluir conta</button>
            </div>
          </Secao>
        </div>
      </div>

      {sujo && (
        <div className={s.barra} role="region" aria-label="Alterações não salvas">
          <span className={s.barraIcone} aria-hidden><Save size={16} /></span>
          <p>Você tem <strong>alterações não salvas</strong> · suas mudanças nas metas vão refletir no plano</p>
          <button type="button" className={s.descartar} onClick={() => { setForm(original); setErros({}); }}>Descartar</button>
          <button type="button" className={s.salvar} onClick={validarESalvar} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar alterações'} <ArrowRight size={14} aria-hidden /></button>
        </div>
      )}

      <EnderecoDialog aberto={enderecoDialogo.aberto} endereco={enderecoDialogo.endereco} onFechar={() => setEnderecoDialogo({ aberto: false, endereco: null })}
        onSalvo={() => { setEnderecoDialogo({ aberto: false, endereco: null }); void qc.invalidateQueries({ queryKey: ['cliente', 'enderecos'] }); void qc.invalidateQueries({ queryKey: ['cliente', 'perfil'] }); toast('Endereço salvo.', 'sucesso'); }} />
      <Confirmacao aberto={!!enderecoExcluir} perigo titulo="Remover endereço?" rotuloConfirmar="Remover" carregando={removerEndereco.isPending}
        onCancelar={() => setEnderecoExcluir(null)} onConfirmar={() => enderecoExcluir && removerEndereco.mutate(enderecoExcluir)}>
        {enderecoExcluir && `${enderecoExcluir.apelido}: ${enderecoExcluir.logradouro}, ${enderecoExcluir.numero}. Pedidos antigos continuam com o endereço registrado.`}
      </Confirmacao>
      <Confirmacao aberto={excluirAberto} perigo titulo="Excluir sua conta?" rotuloConfirmar={excluir.isPending ? 'Excluindo…' : 'Excluir definitivamente'} carregando={excluir.isPending}
        onCancelar={() => setExcluirAberto(false)} onConfirmar={() => { if (confirmacaoTexto.trim().toUpperCase() === 'EXCLUIR') excluir.mutate(); else toast('Digite EXCLUIR para confirmar.', 'erro'); }}>
        <p>Seus dados pessoais são anonimizados (LGPD), a assinatura é encerrada e você não consegue mais entrar com este e-mail.</p>
        <label className={s.confirmarExclusao}>Digite <strong>EXCLUIR</strong> para confirmar
          <input value={confirmacaoTexto} onChange={(e) => setConfirmacaoTexto(e.target.value)} autoComplete="off" />
        </label>
      </Confirmacao>
    </div>
  );
}

function Secao({ id, icone, titulo, sub, tom = 'verde', acao, children }: { id: string; icone: ReactNode; titulo: string; sub: string; tom?: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={s.secao} aria-labelledby={`${id}-titulo`}>
      <div className={s.secaoTopo}>
        <span className={`${s.secaoIcone} ${s[tom]}`} aria-hidden>{icone}</span>
        <div className={s.secaoTexto}><h2 id={`${id}-titulo`}>{titulo}</h2><p>{sub}</p></div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Campo({ id, rotulo, obrigatorio, dica, erro, children }: { id: string; rotulo: string; obrigatorio?: boolean; dica?: string; erro?: string; children: ReactNode }) {
  return (
    <div className={`${s.campo} ${erro ? s.campoErro : ''}`}>
      <label htmlFor={`campo-${id}`}>{rotulo}{obrigatorio && <span className={s.obrigatorio} aria-hidden> *</span>}</label>
      {children}
      {erro ? <small className={s.erro} role="alert">{erro}</small> : dica && <small>{dica}</small>}
    </div>
  );
}

function Unidade({ u, children }: { u: string; children: ReactNode }) {
  return <div className={s.unidade}>{children}<span aria-hidden>{u}</span></div>;
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}
