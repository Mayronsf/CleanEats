import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, FileText, ImagePlus, Leaf, Plus, Save, Settings, Target, Trash2, X } from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { buscarRestricoes } from '../../../services/cadastro';
import { buscarAlergenos, buscarCardapio, buscarPrato, enviarFotoPrato, salvarPrato, ROTULO_STATUS_PRATO, type PratoForm } from '../../../services/restaurante';
import s from './PratoFormPage.module.css';

const VAZIO: PratoForm = {
  nome: '', descricao: '', categoria: '', preco: null, porcaoG: null, tempoPreparoMin: null, servePessoas: 1, calorias: null, proteinas: null,
  carboidratos: null, gorduras: null, fibras: null, sodioMg: null, objetivos: [], alergenos: [], compatibilidades: [], tags: [], observacoesInternas: '',
  imagemUrl: null, ingredientes: [], ativo: true,
};
const OBJETIVOS = [{ v: 'EMAGRECIMENTO', r: 'Emagrecimento' }, { v: 'GANHO_MASSA', r: 'Ganho de massa' }, { v: 'EQUILIBRIO', r: 'Equilíbrio' }];
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const txt = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

/** Tela 39 — Criar/editar prato (CE-3): ficha nutricional obrigatória para ir à curadoria; foto no Storage; alérgenos, compatibilidades e objetivos. */
export default function PratoFormPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const prato = useQuery({ queryKey: ['restaurante', 'prato', id], queryFn: () => buscarPrato(id!), enabled: !!id });
  const categorias = useQuery({ queryKey: ['restaurante', 'cardapio'], queryFn: buscarCardapio });
  const alergenos = useQuery({ queryKey: ['alergenos'], queryFn: buscarAlergenos, staleTime: Infinity });
  const restricoes = useQuery({ queryKey: ['restricoes'], queryFn: buscarRestricoes, staleTime: 10 * 60_000 });
  const [f, setF] = useState<PratoForm | null>(id ? null : VAZIO);
  const [tagNova, setTagNova] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const entradaFoto = useRef<HTMLInputElement>(null);

  useEffect(() => { if (prato.data && !f) setF(prato.data.dados); }, [prato.data, f]);

  const foto = useMutation({
    mutationFn: enviarFotoPrato,
    onSuccess: (r) => setF((x) => (x ? { ...x, imagemUrl: r.url } : x)),
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a foto.', 'erro'),
  });
  const salvar = useMutation({
    mutationFn: () => salvarPrato(id ?? null, f!),
    onSuccess: (r) => {
      toast(r.mensagem, 'sucesso');
      void qc.invalidateQueries({ queryKey: ['restaurante'] });
      navegar(r.status === 'EM_ANALISE' ? '/restaurante/aprovacao' : '/restaurante/cardapio');
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível salvar o prato.', 'erro'),
  });

  if (id && prato.isError) return <ErroCarregamento mensagem={prato.error instanceof ErroApi ? prato.error.message : undefined} onTentarNovamente={() => prato.refetch()} />;
  if (!f) return <div className={s.pagina}><Skeleton altura={60} raio={16} /><div style={{ height: 24 }} /><Skeleton altura={620} raio={24} /></div>;

  const set = <K extends keyof PratoForm>(k: K, v: PratoForm[K]) => setF({ ...f, [k]: v });
  const alternar = (k: 'objetivos' | 'alergenos' | 'compatibilidades', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const fichaCompleta = [f.calorias, f.proteinas, f.carboidratos, f.gorduras, f.porcaoG].every((x) => x != null);
  const estimado = f.proteinas != null && f.carboidratos != null && f.gorduras != null ? Math.round((f.proteinas + f.carboidratos) * 4 + f.gorduras * 9) : null;
  const incoerente = estimado != null && f.calorias != null && estimado > 0 && Math.abs(estimado - f.calorias) / estimado > 0.25;
  const aoEscolher = (e: ChangeEvent<HTMLInputElement>) => { const a = e.target.files?.[0]; e.target.value = ''; if (a) foto.mutate(a); };
  const categoriasLista = [...new Set([...(categorias.data?.categorias ?? []), ...(f.categoria ? [f.categoria] : [])])].sort();
  const status = prato.data?.status;
  const rotuloSalvar = fichaCompleta && (!status || status === 'RASCUNHO' || status === 'REJEITADO') ? 'Salvar e enviar à curadoria' : 'Salvar prato';

  return (
    <form className={s.pagina} onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
      <header className={s.topo}>
        <div>
          <h1 className={s.titulo}>{id ? 'Editar prato' : 'Novo prato'}</h1>
          <p className={s.sub}>{id ? <>Status atual: <strong>{ROTULO_STATUS_PRATO[status!]}</strong></> : 'Cadastre um novo item no cardápio'}</p>
        </div>
        <div className={s.botoes}>
          <button type="button" className={s.cancelar} onClick={() => navegar('/restaurante/cardapio')}>Cancelar</button>
          <button type="submit" className={s.salvar} disabled={salvar.isPending || foto.isPending}><Save size={16} aria-hidden /> {salvar.isPending ? 'Salvando…' : rotuloSalvar}</button>
        </div>
      </header>

      {prato.data?.motivoRejeicao && <div className={s.rejeitado} role="status"><AlertTriangle size={18} aria-hidden /><p><strong>Rejeitado pela curadoria:</strong> {prato.data.motivoRejeicao}. Corrija e salve para reenviar.</p></div>}

      <div className={s.grade}>
        <div className={s.coluna}>
          <Cartao icone={<FileText size={18} />} titulo="Informações básicas">
            <Campo id="nome" rotulo="Nome do prato" obrigatorio><input id="nome" required maxLength={80} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Bowl Proteico Frango Grelhado" /></Campo>
            <Campo id="descricao" rotulo="Descrição"><textarea id="descricao" rows={3} maxLength={600} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva os ingredientes e modo de preparo…" /></Campo>
            <div className={s.duas}>
              <Campo id="categoria" rotulo="Categoria" obrigatorio>
                <input id="categoria" list="categorias" required value={f.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Selecione ou digite" />
                <datalist id="categorias">{categoriasLista.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>
              <Campo id="preco" rotulo="Preço (R$)" obrigatorio><input id="preco" required inputMode="decimal" value={txt(f.preco)} onChange={(e) => set('preco', num(e.target.value.replace(/[^\d,.]/g, '')))} placeholder="0,00" /></Campo>
            </div>
            <div className={s.tres}>
              <Campo id="peso" rotulo="Peso (g)"><input id="peso" inputMode="numeric" value={txt(f.porcaoG)} onChange={(e) => set('porcaoG', num(e.target.value.replace(/\D/g, '')))} placeholder="350" /></Campo>
              <Campo id="tempo" rotulo="Tempo preparo (min)"><input id="tempo" inputMode="numeric" value={txt(f.tempoPreparoMin)} onChange={(e) => set('tempoPreparoMin', num(e.target.value.replace(/\D/g, '')))} placeholder="15" /></Campo>
              <Campo id="serve" rotulo="Porção (pessoas)"><input id="serve" inputMode="numeric" value={txt(f.servePessoas)} onChange={(e) => set('servePessoas', num(e.target.value.replace(/\D/g, '')))} placeholder="1" /></Campo>
            </div>
          </Cartao>

          <Cartao icone={<BarChart3 size={18} />} titulo="Informações nutricionais" extra={<span className={fichaCompleta ? s.fichaOk : s.fichaFalta}>{fichaCompleta ? 'Ficha completa' : 'Obrigatória para publicar'}</span>}>
            <div className={s.macros}>
              {([['calorias', 'Calorias', 'kcal'], ['proteinas', 'Proteínas', 'g'], ['carboidratos', 'Carboidratos', 'g'], ['gorduras', 'Gorduras', 'g']] as const).map(([k, r, u]) => (
                <label key={k} className={s.macro}><span>{r}</span><input inputMode="decimal" value={txt(f[k])} onChange={(e) => set(k, num(e.target.value.replace(/[^\d,.]/g, '')))} placeholder="—" aria-label={`${r} (${u})`} /><small>{u}</small></label>
              ))}
            </div>
            <div className={s.duas}>
              <Campo id="fibras" rotulo="Fibras (g)"><input id="fibras" inputMode="decimal" value={txt(f.fibras)} onChange={(e) => set('fibras', num(e.target.value.replace(/[^\d,.]/g, '')))} /></Campo>
              <Campo id="sodio" rotulo="Sódio (mg)"><input id="sodio" inputMode="numeric" value={txt(f.sodioMg)} onChange={(e) => set('sodioMg', num(e.target.value.replace(/\D/g, '')))} /></Campo>
            </div>
            {incoerente && <p className={s.alerta}><AlertTriangle size={14} aria-hidden /> Pelos macros, o prato teria ≈{estimado} kcal. Revise antes de salvar.</p>}
          </Cartao>

          <Cartao icone={<Leaf size={18} />} titulo="Ingredientes">
            <ul className={s.ingredientes}>
              {f.ingredientes.map((ing, i) => (
                <li key={i}>
                  <input value={ing.nome} onChange={(e) => set('ingredientes', f.ingredientes.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} placeholder="Ingrediente" aria-label={`Ingrediente ${i + 1}`} />
                  <input value={ing.quantidade ?? ''} onChange={(e) => set('ingredientes', f.ingredientes.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} placeholder="Quantidade" aria-label={`Quantidade do ingrediente ${i + 1}`} />
                  <button type="button" onClick={() => set('ingredientes', f.ingredientes.filter((_, j) => j !== i))} aria-label={`Remover ingrediente ${i + 1}`}><Trash2 size={15} aria-hidden /></button>
                </li>
              ))}
            </ul>
            <button type="button" className={s.adicionar} onClick={() => set('ingredientes', [...f.ingredientes, { nome: '', quantidade: '' }])}><Plus size={14} aria-hidden /> Adicionar ingrediente</button>
          </Cartao>

          <Cartao icone={<AlertTriangle size={18} />} titulo="Alérgenos">
            <div className={s.chips}>{(alergenos.data ?? []).map((a) => (
              <button key={a} type="button" aria-pressed={f.alergenos.includes(a)} className={f.alergenos.includes(a) ? s.chipAtivo : undefined} onClick={() => alternar('alergenos', a)}>{a}</button>
            ))}</div>
          </Cartao>
        </div>

        <div className={s.coluna}>
          <Cartao icone={<ImagePlus size={18} />} titulo="Imagem do prato">
            <div className={`${s.upload} ${arrastando ? s.uploadAtivo : ''}`} onClick={() => entradaFoto.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entradaFoto.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); const a = e.dataTransfer.files[0]; if (a) foto.mutate(a); }} aria-label="Enviar foto do prato">
              {f.imagemUrl ? <img src={f.imagemUrl} alt="Foto do prato" /> : <><ImagePlus size={28} aria-hidden /><strong>{foto.isPending ? 'Enviando…' : 'Arraste ou clique para enviar'}</strong><small>JPG, PNG ou WebP · Máx. 5MB</small></>}
            </div>
            {f.imagemUrl && <button type="button" className={s.removerFoto} onClick={() => set('imagemUrl', null)}><X size={14} aria-hidden /> Remover foto</button>}
            <input ref={entradaFoto} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={aoEscolher} />
          </Cartao>

          <Cartao icone={<Settings size={18} />} titulo="Configurações">
            {(status === 'APROVADO' || status === 'PAUSADO') && (
              <Campo id="disp" rotulo="Disponibilidade">
                <select id="disp" value={f.ativo ? 'ATIVO' : 'PAUSADO'} onChange={(e) => set('ativo', e.target.value === 'ATIVO')}><option value="ATIVO">Ativo no cardápio</option><option value="PAUSADO">Pausado (fora do marketplace)</option></select>
              </Campo>
            )}
            <Campo id="tags" rotulo="Tags especiais">
              <div className={s.tags}>
                {f.tags.map((t) => <span key={t}>{t}<button type="button" onClick={() => set('tags', f.tags.filter((x) => x !== t))} aria-label={`Remover tag ${t}`}><X size={12} aria-hidden /></button></span>)}
                {f.tags.length < 5 && <input id="tags" value={tagNova} onChange={(e) => setTagNova(e.target.value)} placeholder="Ex: Mais vendido, Novidade"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const t = tagNova.trim(); if (t && !f.tags.includes(t)) set('tags', [...f.tags, t]); setTagNova(''); } }} />}
              </div>
            </Campo>
            <Campo id="obs" rotulo="Observações internas"><textarea id="obs" rows={3} value={f.observacoesInternas ?? ''} onChange={(e) => set('observacoesInternas', e.target.value)} placeholder="Notas para a equipe de cozinha…" /></Campo>
          </Cartao>

          <Cartao icone={<Target size={18} />} titulo="Objetivos e restrições">
            <p className={s.rotuloGrupo}>Indicado para</p>
            <div className={s.chips}>{OBJETIVOS.map((o) => <button key={o.v} type="button" aria-pressed={f.objetivos.includes(o.v)} className={f.objetivos.includes(o.v) ? s.chipAtivo : undefined} onClick={() => alternar('objetivos', o.v)}>{o.r}</button>)}</div>
            <p className={s.rotuloGrupo}>Compatível com</p>
            <div className={s.chips}>{(restricoes.data ?? []).map((r) => <button key={r.slug} type="button" aria-pressed={f.compatibilidades.includes(r.slug)} className={f.compatibilidades.includes(r.slug) ? s.chipAtivo : undefined} onClick={() => alternar('compatibilidades', r.slug)}>{r.nome}</button>)}</div>
          </Cartao>
        </div>
      </div>
    </form>
  );
}

function Cartao({ icone, titulo, extra, children }: { icone: ReactNode; titulo: string; extra?: ReactNode; children: ReactNode }) {
  return <section className={s.cartao}><div className={s.cartaoTopo}><h2><span aria-hidden>{icone}</span> {titulo}</h2>{extra}</div>{children}</section>;
}
function Campo({ id, rotulo, obrigatorio, children }: { id: string; rotulo: string; obrigatorio?: boolean; children: ReactNode }) {
  return <div className={s.campo}><label htmlFor={id}>{rotulo}{obrigatorio && <span aria-hidden> *</span>}</label>{children}</div>;
}
