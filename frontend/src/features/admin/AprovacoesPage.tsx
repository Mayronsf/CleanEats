import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, Store, UserCheck, UtensilsCrossed, X } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../design-system';
import { formatarData, formatarMoeda, formatarNumero } from '../../lib/formato';
import { ErroApi } from '../../services/api';
import { avaliarCadastro, buscarAprovacoes, type TipoAprovacao } from '../../services/admin';
import { DecisaoDialog } from './DecisaoDialog';
import s from './Admin.module.css';

const ABAS: { valor: TipoAprovacao; rotulo: string; icone: typeof Store }[] = [
  { valor: 'pratos', rotulo: 'Pratos', icone: UtensilsCrossed }, { valor: 'nutricionistas', rotulo: 'Nutricionistas (CRN)', icone: UserCheck },
  { valor: 'restaurantes', rotulo: 'Restaurantes (CNPJ)', icone: Store },
];
const SUGESTOES: Record<TipoAprovacao, string[]> = {
  pratos: ['Informação nutricional incompleta', 'Calorias não batem com os macros', 'Foto não corresponde ao prato', 'Alérgenos não informados'],
  nutricionistas: ['CRN não encontrado no conselho regional', 'CRN de outra UF', 'Dados pessoais divergentes do CRN'],
  restaurantes: ['CNPJ inválido ou inativo', 'Endereço fora da área atendida', 'Documentação incompleta'],
};
const CNPJ = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

/** /admin — Curadoria: aprovar/rejeitar pratos (ficha), nutricionistas (CRN) e restaurantes (CNPJ), com motivo (CE-3, CE-18). */
export default function AprovacoesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useSearchParams();
  const aba = (busca.get('aba') as TipoAprovacao) ?? 'pratos';
  const dados = useQuery({ queryKey: ['admin', 'aprovacoes'], queryFn: buscarAprovacoes, refetchInterval: 30_000 });
  const [rejeitar, setRejeitar] = useState<{ tipo: TipoAprovacao; id: string; nome: string } | null>(null);
  const decidir = useMutation({
    mutationFn: ({ tipo, id, aprovado, motivo }: { tipo: TipoAprovacao; id: string; nome: string; aprovado: boolean; motivo?: string }) => avaliarCadastro(tipo, id, aprovado, motivo),
    onSuccess: (_, v) => { setRejeitar(null); toast(`${v.nome} ${v.aprovado ? 'aprovado' : 'rejeitado'}. O responsável foi notificado.`, 'sucesso'); void qc.invalidateQueries({ queryKey: ['admin'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível registrar a decisão.', 'erro'),
  });
  const d = dados.data;
  const qtd = (t: TipoAprovacao) => (d ? d[t].length : 0);
  const aprovar = (tipo: TipoAprovacao, id: string, nome: string) => decidir.mutate({ tipo, id, nome, aprovado: true });
  const Botoes = ({ tipo, id, nome }: { tipo: TipoAprovacao; id: string; nome: string }) => (
    <div className={s.acoes}>
      <button type="button" className={s.botaoClaro} onClick={() => setRejeitar({ tipo, id, nome })} disabled={decidir.isPending}><X size={14} aria-hidden /> Rejeitar</button>
      <button type="button" className={s.botaoPrimario} onClick={() => aprovar(tipo, id, nome)} disabled={decidir.isPending}><Check size={14} aria-hidden /> Aprovar</button>
    </div>
  );

  return (
    <div className={s.pagina}>
      <header className={s.topo}><div><h1 className={s.titulo}>Aprovações</h1><p className={s.sub}>Curadoria de pratos, nutricionistas e restaurantes antes de aparecerem para os clientes</p></div></header>
      <div className={s.abas} role="tablist" aria-label="Tipo de aprovação">
        {ABAS.map((a) => (
          <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor} className={aba === a.valor ? s.abaAtiva : undefined} onClick={() => setBusca({ aba: a.valor }, { replace: true })}>
            <a.icone size={15} aria-hidden /> {a.rotulo} <span>{d ? qtd(a.valor) : '·'}</span>
          </button>
        ))}
      </div>
      {dados.isError ? <ErroCarregamento mensagem={dados.error instanceof ErroApi ? dados.error.message : undefined} onTentarNovamente={() => dados.refetch()} />
        : !d ? <Skeleton altura={320} raio={20} />
          : qtd(aba) === 0 ? <EmptyState icone={<CheckCircle2 size={28} aria-hidden />} titulo="Fila zerada" descricao="Nada esperando aprovação nesta categoria." /> : (
            <div className={s.lista}>
              {aba === 'pratos' && d.pratos.map((p) => (
                <article key={p.id} className={s.item}>
                  <span className={s.miniatura}>{p.imagemUrl ? <img src={p.imagemUrl} alt="" /> : <UtensilsCrossed size={22} aria-hidden />}</span>
                  <div className={s.itemCorpo}>
                    <h2>{p.nome} <small>· {p.restaurante}</small></h2>
                    <p className={s.meta}>{p.categoria} · {formatarMoeda(Number(p.preco))}{p.porcaoG ? ` · ${p.porcaoG} g` : ''}{p.enviadoEm ? ` · enviado em ${formatarData(p.enviadoEm)}` : ''}</p>
                    <p className={s.macros}><b>{p.calorias != null ? formatarNumero(p.calorias) : '—'} kcal</b> · P {p.proteinas ?? '—'} g · C {p.carboidratos ?? '—'} g · G {p.gorduras ?? '—'} g</p>
                    {!p.macrosCoerentes && <p className={s.alerta}><AlertTriangle size={14} aria-hidden /> Calorias fora do esperado pelos macros (±25%)</p>}
                    {p.ingredientes.length > 0 && <p className={s.meta}>Ingredientes: {p.ingredientes.join(', ')}</p>}
                    {p.alergenos.length > 0 && <p className={s.meta}>Alérgenos: {p.alergenos.join(', ')}</p>}
                  </div>
                  <Botoes tipo="pratos" id={p.id} nome={p.nome} />
                </article>
              ))}
              {aba === 'nutricionistas' && d.nutricionistas.map((n) => (
                <article key={n.id} className={s.item}>
                  <span className={s.miniatura}><UserCheck size={22} aria-hidden /></span>
                  <div className={s.itemCorpo}>
                    <h2>{n.nome} <small>· {n.email}</small></h2>
                    <p className={s.macros}><b>{n.crn}</b> · UF {n.uf}{n.anosExperiencia != null ? ` · ${n.anosExperiencia} anos de experiência` : ''}</p>
                    <p className={s.meta}>{n.especialidades.join(' · ')}</p>
                    {n.bio && <p className={s.texto}>{n.bio}</p>}
                    <p className={s.meta}>Cadastro em {formatarData(n.criadoEm)} · confira o CRN no site do conselho regional antes de aprovar</p>
                  </div>
                  <Botoes tipo="nutricionistas" id={n.id} nome={n.nome} />
                </article>
              ))}
              {aba === 'restaurantes' && d.restaurantes.map((r) => (
                <article key={r.id} className={s.item}>
                  <span className={s.miniatura}><Store size={22} aria-hidden /></span>
                  <div className={s.itemCorpo}>
                    <h2>{r.nome} <small>· {r.dono} ({r.email})</small></h2>
                    <p className={s.macros}><b>CNPJ {CNPJ(r.cnpj)}</b> <span className={r.cnpjValido ? s.ok : s.ruim}>{r.cnpjValido ? 'dígitos válidos' : 'dígitos inválidos'}</span></p>
                    <p className={s.meta}>{r.cozinhas.join(' · ')} · {r.endereco}</p>
                    <p className={s.meta}>Cadastro em {formatarData(r.criadoEm)}</p>
                  </div>
                  <Botoes tipo="restaurantes" id={r.id} nome={r.nome} />
                </article>
              ))}
            </div>
          )}
      <DecisaoDialog aberto={!!rejeitar} titulo={`Rejeitar ${rejeitar?.nome ?? ''}?`} sugestoes={rejeitar ? SUGESTOES[rejeitar.tipo] : []} carregando={decidir.isPending}
        onFechar={() => setRejeitar(null)} onConfirmar={(motivo) => rejeitar && decidir.mutate({ ...rejeitar, aprovado: false, motivo })} />
    </div>
  );
}
