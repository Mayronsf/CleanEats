import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Eye, FileText, History, Send } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { baixarPrescricao, buscarClientesElegiveis, buscarPreviaPrescricao, emitirPrescricao } from '../../../services/nutri/prescricoes';
import s from './Prescricoes.module.css';

const valor = (n: number | null, unidade = '') => n == null ? '—' : `${new Intl.NumberFormat('pt-BR').format(n)}${unidade}`;
const meta = (nome: string, n: number | null, unidade: string) => <div className={s.meta} key={nome}><b>{valor(n, unidade)}</b><small>{nome}</small></div>;

export default function PrescricaoNovaPage() {
  const [params, setParams] = useSearchParams();
  const [observacoes, setObservacoes] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const clientes = useQuery({ queryKey: ['nutri','prescricoes','clientes'], queryFn: buscarClientesElegiveis });
  const idCliente = params.get('cliente') ?? '';
  useEffect(() => { if (!idCliente && clientes.data?.length) setParams({ cliente: clientes.data[0]!.id }, { replace: true }); }, [idCliente, clientes.data, setParams]);
  const previa = useQuery({ queryKey: ['nutri','prescricoes','previa',idCliente], queryFn: () => buscarPreviaPrescricao(idCliente), enabled: Boolean(idCliente) });
  const emitir = useMutation({ mutationFn: () => emitirPrescricao(idCliente, observacoes), onSuccess: async (r) => {
    toast(r.mensagem, r.emailEnviado ? 'sucesso' : 'info');
    await qc.invalidateQueries({ queryKey: ['nutri','prescricoes','historico'] });
    try { await baixarPrescricao(r.id); } catch (e) { toast(e instanceof ErroApi ? e.message : 'Prescrição emitida, mas não foi possível abrir o PDF.', 'erro'); }
  }, onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível emitir a prescrição.', 'erro') });
  const baixar = useMutation({ mutationFn: () => emitirPrescricao(idCliente, observacoes), onSuccess: async (r) => { try { await baixarPrescricao(r.id); toast('PDF gerado e pronto para baixar.', 'sucesso'); } catch { toast('Prescrição emitida, mas não foi possível abrir o PDF.', 'erro'); } }, onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível gerar o PDF.', 'erro') });
  const p = previa.data;
  const erro = clientes.error ?? previa.error;

  return <main className={s.pagina}>
    <header className={s.topo}><div><h1 className={s.titulo}>Nova prescrição</h1><p className={s.sub}>Documento nutricional formal · gerado em PDF assinado</p></div>
      <div className={s.acoes}><Link className={s.secundario} to="/nutri/prescricoes"><History size={16} aria-hidden /> Histórico</Link></div>
    </header>
    {erro ? <ErroCarregamento mensagem={erro instanceof ErroApi ? erro.message : undefined} onTentarNovamente={() => { void clientes.refetch(); void previa.refetch(); }} /> : !clientes.data ? <Skeleton altura={400} raio={18} /> : clientes.data.length === 0 ? <EmptyState icone={<FileText size={26} aria-hidden />} titulo="Nenhum cliente vinculado" descricao="Os clientes vinculados à sua conta aparecerão aqui." /> : <>
      <section className={`${s.painel} ${s.cliente}`}>
        <div><div className={s.rotulo}>Cliente</div><div className={s.clienteNome}>{p?.nome ?? 'Selecione um cliente'}</div>{p && <span className={`${s.tier} ${p.premium ? s.premium : ''}`}>{p.tier}</span>}</div>
        <div className={s.acoes}><label htmlFor="cliente-prescricao">Trocar cliente</label><select id="cliente-prescricao" value={idCliente} onChange={(e) => setParams(e.target.value ? { cliente: e.target.value } : {})}>
          {clientes.data.map(c => <option key={c.id} value={c.id}>{c.nome} · {c.tier}</option>)}
        </select>{idCliente && <Link className={s.secundario} to={`/nutri/clientes/${idCliente}`}><Eye size={15} aria-hidden /> Ver perfil</Link>}</div>
      </section>
      {!p ? <Skeleton altura={440} raio={18} /> : <div className={s.grade}>
        <div className={s.campos}>
          <section className={s.painel}><h2>Diagnóstico e objetivo</h2><p className={s.nota}>Conduta clínica e meta da prescrição</p>
            <div className={s.campo}><label htmlFor="objetivo">Objetivo nutricional</label><input id="objetivo" value={p.objetivo ?? 'Não informado'} readOnly /></div>
          </section>
          <section className={s.painel}><h2>Metas nutricionais diárias</h2><p className={s.nota}>Valores usados no plano alimentar</p>
            <div className={s.metas}>{meta('Calorias',p.calorias,' kcal')}{meta('Proteínas',p.proteinas,' g')}{meta('Carboidratos',p.carboidratos,' g')}{meta('Gorduras',p.gorduras,' g')}{meta('Fibras',p.fibras,' g')}{meta('Hidratação',p.aguaMl,' ml')}</div>
          </section>
          <section className={s.painel}><h2>Plano alimentar ativo</h2><p className={s.nota}>Refeições e pratos incluídos no documento</p>
            {!p.planoAtivo ? <div className={s.aviso}>Monte o plano antes de prescrever. Este cliente ainda não tem um plano alimentar ativo.</div> : p.refeicoes.length === 0 ? <p className={s.nota}>O plano ativo ainda não tem refeições cadastradas.</p> : <div className={s.lista}>{p.refeicoes.map((r,i)=><div className={s.refeicao} key={`${r.dia}-${r.tipo}-${i}`}><div><b>{r.dia} · {r.tipo.replaceAll('_',' ').toLowerCase()}</b><br/><span>{r.prato}</span></div>{r.observacao && <small>{r.observacao}</small>}</div>)}</div>}
          </section>
          <section className={s.painel}><h2>Recomendações ao paciente</h2><p className={s.nota}>Orientações que aparecem na prescrição final</p>
            <div className={s.campo}><label htmlFor="observacoes">Observações adicionais</label><textarea id="observacoes" maxLength={4000} value={observacoes} onChange={(e)=>setObservacoes(e.target.value)} placeholder="Inclua orientações para este paciente…"/><small className={s.nota}>{observacoes.length}/4.000 caracteres</small></div>
          </section>
        </div>
        <aside className={s.painel} aria-label="Pré-visualização da prescrição"><strong>Pré-visualização</strong><p className={s.nota}>Atualizada com os dados do cliente e plano</p>
          <div className={s.painel}><h2>Prescrição Nutricional</h2><p className={s.nota}>Paciente</p><b>{p.nome}</b><p>{p.pesoKg ? `${valor(p.pesoKg,' kg')} · ` : ''}{p.alturaCm ? valor(p.alturaCm,' cm') : ''}</p>
            <hr/><p className={s.nota}>Metas diárias</p><div className={s.metas}>{meta('Calorias',p.calorias,' kcal')}{meta('Proteína',p.proteinas,' g')}{meta('Carbo',p.carboidratos,' g')}{meta('Gordura',p.gorduras,' g')}</div>
            <hr/><p className={s.nota}>Plano ativo · {p.refeicoes.length} refeições</p><p>{p.refeicoes.slice(0,3).map(r=>r.prato).join(' · ') || 'Sem refeições cadastradas'}</p>
            {observacoes && <><hr/><p className={s.nota}>Recomendações</p><p>{observacoes}</p></>}
            <div className={s.assinatura}><b>{p.nomeNutri}</b><br/>Nutricionista · {p.crn}</div>
          </div>
          {!p.premium && <p className={s.aviso}>A prescrição digital está disponível somente para clientes Premium. Este cliente está no plano {p.tier}.</p>}
          <div className={s.barra}><button className={s.secundario} type="button" disabled={!p.premium || !p.planoAtivo || baixar.isPending} onClick={()=>baixar.mutate()}><Download size={15} aria-hidden/> Baixar PDF</button>
            <button className={s.botao} type="button" disabled={!p.premium || !p.planoAtivo || emitir.isPending} onClick={()=>emitir.mutate()}><Send size={15} aria-hidden/> {emitir.isPending?'Emitindo…':'Emitir e enviar'}</button></div>
          {!p.premium && <small className={s.nota}>Disponível somente para clientes Premium.</small>}
          {p.premium && !p.planoAtivo && <small className={s.nota}>Monte o plano antes de prescrever.</small>}
        </aside>
      </div>}
    </>}
    <Link to="/nutri" className={s.secundario}><ArrowLeft size={15} aria-hidden/> Voltar ao painel</Link>
  </main>;
}
