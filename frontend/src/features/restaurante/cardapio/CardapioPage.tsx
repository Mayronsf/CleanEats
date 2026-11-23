import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Search, Send, UtensilsCrossed } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda, formatarNumero } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { alternarPausaPrato, buscarCardapio, reenviarPrato, ROTULO_STATUS_PRATO, type StatusPrato } from '../../../services/restaurante';
import s from './CardapioPage.module.css';

const POR_PAGINA = 8;
const FILTROS_STATUS: { valor: StatusPrato | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos status' }, { valor: 'APROVADO', rotulo: 'Ativo' }, { valor: 'PAUSADO', rotulo: 'Pausado' },
  { valor: 'EM_ANALISE', rotulo: 'Em análise' }, { valor: 'REJEITADO', rotulo: 'Rejeitado' }, { valor: 'RASCUNHO', rotulo: 'Rascunho' },
];

/** Tela 38 — Cardápio do restaurante: busca, filtros, editar, pausar/reativar e reenviar rejeitado (CE-3). */
export default function CardapioPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const cardapio = useQuery({ queryKey: ['restaurante', 'cardapio'], queryFn: buscarCardapio });
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [status, setStatus] = useState<StatusPrato | ''>('');
  const [pagina, setPagina] = useState(1);

  const acao = useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: 'pausa' | 'reenvio' }) => (tipo === 'pausa' ? alternarPausaPrato(id) : reenviarPrato(id)),
    onSuccess: (r) => { toast(r.mensagem, 'sucesso'); void qc.invalidateQueries({ queryKey: ['restaurante'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível atualizar o prato.', 'erro'),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (cardapio.data?.pratos ?? []).filter((p) => (!termo || p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo))
      && (!categoria || p.categoria === categoria) && (!status || p.status === status));
  }, [cardapio.data, busca, categoria, status]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const categoriasDoRestaurante = [...new Set((cardapio.data?.pratos ?? []).map((p) => p.categoria))].sort();

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div>
          <h1 className={s.titulo}>Cardápio</h1>
          <p className={s.sub}>{cardapio.data ? `${cardapio.data.total} pratos cadastrados · ${cardapio.data.ativos} ativos` : 'Carregando…'}</p>
        </div>
        <Link to="/restaurante/cardapio/novo" className={s.novo}><Plus size={16} aria-hidden /> Novo prato</Link>
      </header>

      <div className={s.filtros}>
        <label className={s.busca}><Search size={18} aria-hidden /><span className="sr-only">Buscar prato</span>
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar prato…" /></label>
        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPagina(1); }} aria-label="Filtrar por categoria">
          <option value="">Todas categorias</option>{categoriasDoRestaurante.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as StatusPrato | ''); setPagina(1); }} aria-label="Filtrar por status">
          {FILTROS_STATUS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
        </select>
      </div>

      {cardapio.isError ? <ErroCarregamento onTentarNovamente={() => cardapio.refetch()} /> : !cardapio.data ? <Skeleton altura={480} raio={22} /> :
        filtrados.length === 0 ? <EmptyState icone={<UtensilsCrossed size={28} aria-hidden />} titulo={cardapio.data.total ? 'Nenhum prato com esses filtros' : 'Seu cardápio está vazio'}
          descricao={cardapio.data.total ? 'Ajuste a busca ou os filtros.' : 'Cadastre o primeiro prato com a ficha nutricional para enviar à curadoria.'}
          acao={cardapio.data.total ? undefined : { rotulo: 'Cadastrar prato', onClick: () => navegar('/restaurante/cardapio/novo') }} /> : (
          <div className={s.tabela}>
            <table>
              <thead><tr><th>Prato</th><th>Preço</th><th>Calorias</th><th>Pedidos</th><th>Status</th><th><span className="sr-only">Ações</span>Ações</th></tr></thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.id} className={p.status === 'PAUSADO' ? s.apagado : undefined}>
                    <td><div className={s.prato}><span className={s.foto}>{p.imagemUrl ? <img src={p.imagemUrl} alt="" loading="lazy" /> : <UtensilsCrossed size={18} aria-hidden />}</span>
                      <span><strong>{p.nome}</strong><small>{[p.categoria, ...p.tags].join(' · ')}</small></span></div></td>
                    <td className={s.forte}>{formatarMoeda(Number(p.preco))}</td>
                    <td>{p.calorias != null ? `${formatarNumero(p.calorias)} kcal` : '—'}</td>
                    <td>{formatarNumero(p.pedidos)}</td>
                    <td><span className={`${s.status} ${s[`st${p.status}`] ?? ''}`} title={p.motivoRejeicao ?? undefined}>{ROTULO_STATUS_PRATO[p.status]}</span></td>
                    <td><div className={s.acoes}>
                      <Link to={`/restaurante/cardapio/${p.id}/editar`} className={s.icone} aria-label={`Editar ${p.nome}`}><Pencil size={15} aria-hidden /></Link>
                      {(p.status === 'APROVADO' || p.status === 'PAUSADO') && (
                        <button type="button" className={s.icone} onClick={() => acao.mutate({ id: p.id, tipo: 'pausa' })} disabled={acao.isPending}
                          aria-label={p.status === 'PAUSADO' ? `Reativar ${p.nome}` : `Pausar ${p.nome}`} title={p.status === 'PAUSADO' ? 'Reativar no marketplace' : 'Pausar (sai do marketplace)'}>
                          {p.status === 'PAUSADO' ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}</button>
                      )}
                      {(p.status === 'REJEITADO' || p.status === 'RASCUNHO') && p.calorias != null && (
                        <button type="button" className={s.icone} onClick={() => acao.mutate({ id: p.id, tipo: 'reenvio' })} disabled={acao.isPending}
                          aria-label={`Enviar ${p.nome} para análise`} title="Enviar para a curadoria"><Send size={15} aria-hidden /></button>
                      )}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.rodape}>
              <span>Mostrando {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length} pratos</span>
              {totalPaginas > 1 && <div className={s.paginas}>{Array.from({ length: totalPaginas }, (_, i) => (
                <button key={i} type="button" className={paginaAtual === i + 1 ? s.paginaAtiva : undefined} onClick={() => setPagina(i + 1)} aria-current={paginaAtual === i + 1 ? 'page' : undefined}>{i + 1}</button>
              ))}</div>}
            </div>
          </div>
        )}
    </div>
  );
}
