import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, Check, Heart, ImagePlus, Leaf, Plus, Ruler, Smile, Star, Tag, Thermometer, Truck, X, ShieldCheck, Sprout, Package,
  Sparkles, Zap, ThumbsUp, Repeat, Wallet, Flame,
} from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { buscarContextoAvaliacao, enviarAvaliacao, enviarFotoAvaliacao, type NovaAvaliacao } from '../../../services/cliente';
import s from './AvaliarPage.module.css';

const ROTULO_NOTA = ['', 'Muito ruim', 'Ruim', 'Ok', 'Muito bom', 'Excelente!'];
const DICA_NOTA = ['', 'Conte o que deu errado: o restaurante vê a moderação', 'Seu feedback ajuda o restaurante a melhorar', 'Diga o que faltou pra ser ótimo',
  'Sua avaliação ajuda outros clientes a escolher', 'Sua avaliação ajuda outros clientes a escolher'];
const CRITERIOS = [
  { chave: 'notaSabor', nome: 'Sabor', icone: Smile },
  { chave: 'notaApresentacao', nome: 'Apresentação', icone: Sprout },
  { chave: 'notaPorcao', nome: 'Porção', icone: Ruler },
  { chave: 'notaEntrega', nome: 'Entrega', icone: Truck },
  { chave: 'notaTemperatura', nome: 'Temperatura', icone: Thermometer },
] as const;
const ICONE_TAG: Record<string, typeof Star> = {
  'Bem temperado': Flame, 'Ingredientes frescos': Leaf, 'Macros corretos': BarChart3, 'Boa apresentação': Sparkles, 'Embalagem boa': Package,
  'Entrega rápida': Zap, 'Vale o preço': Wallet, Repetiria: Repeat, Recomendaria: ThumbsUp,
};
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
type Criterio = (typeof CRITERIOS)[number]['chave'];

/** Tela 20 — Avaliar pedido (CE-11): nota, critérios, tags, comentário, fotos e anonimato. Vai para moderação antes de publicar. */
export default function AvaliarPage() {
  const { id = '' } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const ctx = useQuery({ queryKey: ['cliente', 'avaliacao', id], queryFn: () => buscarContextoAvaliacao(id) });
  const [idMarmita, setIdMarmita] = useState<string | null>(busca.get('prato'));
  const [nota, setNota] = useState(0);
  const [criterios, setCriterios] = useState<Record<Criterio, number>>({ notaSabor: 0, notaApresentacao: 0, notaPorcao: 0, notaEntrega: 0, notaTemperatura: 0 });
  const [tags, setTags] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [anonima, setAnonima] = useState(false);
  const entradaFoto = useRef<HTMLInputElement>(null);
  const fechar = () => navegar('/app/pedidos');

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const pendentes = ctx.data?.itens.filter((i) => !i.avaliado) ?? [];
  const item = ctx.data?.itens.find((i) => i.idMarmita === idMarmita) ?? pendentes[0];

  const foto = useMutation({
    mutationFn: enviarFotoAvaliacao,
    onSuccess: (r) => setFotos((f) => [...f, r.url]),
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a foto.', 'erro'),
  });
  const publicar = useMutation({
    mutationFn: (a: NovaAvaliacao) => enviarAvaliacao(id, a),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cliente', 'historico'] });
      void qc.invalidateQueries({ queryKey: ['cliente', 'avaliacao', id] });
      void qc.invalidateQueries({ queryKey: ['cliente', 'perfil', 'estatisticas'] });
      const restantes = pendentes.filter((p) => p.idMarmita !== item?.idMarmita);
      toast('Avaliação enviada! Ela aparece no prato depois da revisão.', 'sucesso');
      if (restantes.length) {
        setIdMarmita(restantes[0]!.idMarmita); setNota(0); setTags([]); setComentario(''); setFotos([]);
        setCriterios({ notaSabor: 0, notaApresentacao: 0, notaPorcao: 0, notaEntrega: criterios.notaEntrega, notaTemperatura: 0 });
      } else fechar();
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a avaliação.', 'erro'),
  });

  const aoEscolherFoto = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) foto.mutate(f); };
  const enviar = () => {
    if (!item || !nota) return;
    const n = (v: number) => (v > 0 ? v : null);
    publicar.mutate({
      idMarmita: item.idMarmita, nota, notaSabor: n(criterios.notaSabor), notaApresentacao: n(criterios.notaApresentacao), notaPorcao: n(criterios.notaPorcao),
      notaEntrega: n(criterios.notaEntrega), notaTemperatura: n(criterios.notaTemperatura), tags, comentario: comentario.trim() || null, fotos, anonima,
    });
  };

  let corpo;
  if (ctx.isError) corpo = <div className={s.corpo}><ErroCarregamento mensagem={ctx.error instanceof ErroApi ? ctx.error.message : undefined} onTentarNovamente={() => ctx.refetch()} /></div>;
  else if (!ctx.data) corpo = <div className={s.corpo}><Skeleton altura={140} raio={20} /><div style={{ height: 16 }} /><Skeleton altura={320} raio={20} /></div>;
  else if (ctx.data.status !== 'ENTREGUE') corpo = <Aviso titulo="Esse pedido ainda não foi entregue" texto="A avaliação libera quando o pedido chega até você." onFechar={fechar} />;
  else if (!item || pendentes.length === 0) corpo = <Aviso titulo="Tudo avaliado por aqui" texto="Você já avaliou todos os pratos deste pedido. Obrigado!" onFechar={fechar} ok />;
  else {
    const d = ctx.data.entregueEm ? new Date(ctx.data.entregueEm) : null;
    const [primeira, ...resto] = item.nome.split(' ');
    corpo = <>
      <header className={s.topo}>
        <span className={s.foto}>{item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <Package size={32} aria-hidden />}</span>
        <div>
          <span className={s.selo}><Star size={14} aria-hidden /> Como foi?</span>
          <h1 id="avaliar-titulo" className={s.titulo}>Avalie seu <span className="script">{primeira}</span><br />{resto.join(' ')}</h1>
          <p className={s.meta}>{ctx.data.restaurante}{d ? ` · ${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}` : ''} <code className={s.codigo}>#{ctx.data.codigo}</code></p>
        </div>
      </header>
      <div className={s.corpo}>
        {pendentes.length > 1 && (
          <div className={s.pratos} role="tablist" aria-label="Prato do pedido">
            {ctx.data.itens.map((i) => (
              <button key={i.idMarmita} type="button" role="tab" aria-selected={i.idMarmita === item.idMarmita} disabled={i.avaliado}
                className={i.idMarmita === item.idMarmita ? s.pratoAtivo : undefined} onClick={() => setIdMarmita(i.idMarmita)}>
                {i.avaliado && <Check size={12} aria-hidden />} {i.nome}
              </button>
            ))}
          </div>
        )}

        <fieldset className={s.bloco}>
          <legend className={s.rotulo}><Star size={16} aria-hidden /> Nota geral <span className={s.obrigatorio}>*</span></legend>
          <div className={s.estrelasGrandes} role="radiogroup" aria-label="Nota geral">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={nota === v} aria-label={`${v} ${v === 1 ? 'estrela' : 'estrelas'}`}
                className={v <= nota ? s.estrelaAtiva : undefined} onClick={() => setNota(v)}><Star size={18} aria-hidden /></button>
            ))}
          </div>
          {nota > 0 && <div className={s.feedback} role="status"><Star size={18} aria-hidden /><div><strong>{ROTULO_NOTA[nota]}</strong><small>{DICA_NOTA[nota]}</small></div></div>}
        </fieldset>

        <fieldset className={s.bloco}>
          <legend className={s.rotulo}><BarChart3 size={16} aria-hidden /> Avalie por critério (opcional)</legend>
          <ul className={s.criterios}>
            {CRITERIOS.map((c) => (
              <li key={c.chave}>
                <span className={s.criterioNome}><c.icone size={16} aria-hidden /> {c.nome}</span>
                <span className={s.estrelas} role="radiogroup" aria-label={c.nome}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={criterios[c.chave] === v} aria-label={`${c.nome}: ${v}`}
                      className={v <= criterios[c.chave] ? s.estrelaAtiva : undefined}
                      onClick={() => setCriterios({ ...criterios, [c.chave]: criterios[c.chave] === v ? 0 : v })}><Star size={20} aria-hidden /></button>
                  ))}
                </span>
                <span className={s.criterioValor}>{criterios[c.chave] ? `${criterios[c.chave]}/5` : '—'}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className={s.bloco}>
          <legend className={s.rotulo}><Tag size={16} aria-hidden /> O que mais gostou? (escolha quantas quiser)</legend>
          <div className={s.tags}>
            {ctx.data.tags.map((t) => {
              const Icone = ICONE_TAG[t] ?? Heart;
              const ativa = tags.includes(t);
              return (
                <button key={t} type="button" aria-pressed={ativa} className={ativa ? s.tagAtiva : undefined} onClick={() => setTags(ativa ? tags.filter((x) => x !== t) : [...tags, t])}>
                  {ativa ? <Check size={14} aria-hidden /> : <Icone size={14} aria-hidden />} {t}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className={s.bloco}>
          <label htmlFor="comentario" className={s.rotulo}>Comentário (opcional)</label>
          <textarea id="comentario" className={s.comentario} rows={4} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte como estava o prato: sabor, porção, se chegou quentinho…" />
          <small className={s.contador}>{comentario.length} / 500</small>
        </div>

        <div className={s.bloco}>
          <p className={s.rotulo}><ImagePlus size={16} aria-hidden /> Adicione fotos do seu pedido (opcional)</p>
          <ul className={s.fotos}>
            {fotos.map((f) => (
              <li key={f}><img src={f} alt="Foto da avaliação" /><button type="button" onClick={() => setFotos(fotos.filter((x) => x !== f))} aria-label="Remover foto"><X size={14} aria-hidden /></button></li>
            ))}
            {fotos.length < 4 && (
              <li><button type="button" className={s.addFoto} onClick={() => entradaFoto.current?.click()} disabled={foto.isPending}>
                <Plus size={20} aria-hidden /><span>{foto.isPending ? 'Enviando…' : fotos.length ? 'Adicionar mais' : 'Adicionar foto'}</span>
              </button></li>
            )}
          </ul>
          <input ref={entradaFoto} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={aoEscolherFoto} />
        </div>

        <label className={s.anonimo}>
          <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} />
          <span><strong>Avaliar como anônimo</strong><small>Seu nome e foto não aparecerão na avaliação pública</small></span>
        </label>
        <p className={s.moderacao}><ShieldCheck size={14} aria-hidden /> Sua avaliação será revisada antes da publicação</p>
      </div>
      <footer className={s.rodape}>
        <button type="button" className={s.pular} onClick={fechar}>Pular por agora</button>
        <button type="button" className={s.publicar} onClick={enviar} disabled={!nota || publicar.isPending}>
          {publicar.isPending ? 'Enviando…' : 'Publicar avaliação'} <Check size={16} aria-hidden />
        </button>
      </footer>
    </>;
  }

  return (
    <div className={s.fundo}>
      <section className={s.modal} role="dialog" aria-modal="true" aria-labelledby="avaliar-titulo">
        <button type="button" className={s.fechar} onClick={fechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
        {corpo}
      </section>
    </div>
  );
}

function Aviso({ titulo, texto, onFechar, ok }: { titulo: string; texto: string; onFechar: () => void; ok?: boolean }) {
  return (
    <div className={s.aviso}>
      <span className={ok ? s.avisoOk : s.avisoIcone} aria-hidden>{ok ? <Check size={28} /> : <Truck size={28} />}</span>
      <h1 id="avaliar-titulo">{titulo}</h1>
      <p>{texto}</p>
      <button type="button" className={s.publicar} onClick={onFechar}>Voltar aos pedidos</button>
    </div>
  );
}
