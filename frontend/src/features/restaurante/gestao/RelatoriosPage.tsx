import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ClipboardList, DollarSign, Download, FileText, Gauge, Star, Users } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { baixarArquivo, buscarRelatorios, type RelatorioGerado, type TipoRelatorio } from '../../../services/restaurante';
import s from './Gestao.module.css';

const TIPOS: { tipo: TipoRelatorio; titulo: string; descricao: string; formato: 'PDF'; icone: typeof FileText; tom: string }[] = [
  { tipo: 'VENDAS', titulo: 'Relatório de vendas', descricao: 'Detalhamento por prato, categoria e período com volume e receita.', formato: 'PDF', icone: BarChart3, tom: 'coral' },
  { tipo: 'FINANCEIRO', titulo: 'Relatório financeiro', descricao: 'Receita bruta/líquida e comissões por semana.', formato: 'PDF', icone: DollarSign, tom: 'verde' },
  { tipo: 'AVALIACOES', titulo: 'Relatório de avaliações', descricao: 'Notas por prato e comentários publicados.', formato: 'PDF', icone: Star, tom: 'azul' },
  { tipo: 'CLIENTES', titulo: 'Relatório de clientes', descricao: 'Clientes, frequência de compra e recorrência.', formato: 'PDF', icone: Users, tom: 'laranja' },
  { tipo: 'CARDAPIO', titulo: 'Relatório de cardápio', descricao: 'Performance por prato, status e itens sem venda.', formato: 'PDF', icone: ClipboardList, tom: 'coral' },
  { tipo: 'OPERACIONAL', titulo: 'Relatório operacional', descricao: 'Tempo médio de preparo, cancelamentos e picos por dia.', formato: 'PDF', icone: Gauge, tom: 'verde' },
];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const br = (s: string) => s.slice(0, 10).split('-').reverse().join('/');

/** Tela 43 — Relatórios: PDF/CSV gerados no backend por período, com histórico para baixar de novo. */
export default function RelatoriosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const hoje = new Date();
  const [inicio, setInicio] = useState(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [fim, setFim] = useState(iso(hoje));
  const [tipoTopo, setTipoTopo] = useState<TipoRelatorio | 'TODOS'>('TODOS');
  const historico = useQuery({ queryKey: ['restaurante', 'relatorios'], queryFn: buscarRelatorios });
  const gerar = useMutation({
    mutationFn: async ({ tipo, formato, de, ate, registrar }: { tipo: TipoRelatorio; formato: 'PDF' | 'CSV'; de: string; ate: string; registrar: boolean }) =>
      baixarArquivo(`/painel-restaurante/relatorios/${tipo}?inicio=${de}&fim=${ate}&formato=${formato}&registrar=${registrar}`, `${tipo.toLowerCase()}.${formato.toLowerCase()}`),
    onSuccess: (_, v) => { toast(`${TIPOS.find((t) => t.tipo === v.tipo)!.titulo} baixado.`, 'sucesso'); void qc.invalidateQueries({ queryKey: ['restaurante', 'relatorios'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível gerar o relatório.', 'erro'),
  });
  const periodoInvalido = !inicio || !fim || fim < inicio;
  const gerarTipo = (t: (typeof TIPOS)[number]) => gerar.mutate({ tipo: t.tipo, formato: t.formato, de: inicio, ate: fim, registrar: true });
  const nomeHistorico = (r: RelatorioGerado) => {
    const t = TIPOS.find((x) => x.tipo === r.tipo)!.titulo.replace('Relatório de ', '').replace('Relatório ', '');
    const [a, m] = r.inicio.split('-');
    return `${t[0]!.toUpperCase()}${t.slice(1)} — ${r.inicio.slice(0, 7) === r.fim.slice(0, 7) ? `${MESES[Number(m) - 1]} ${a}` : `${br(r.inicio)} a ${br(r.fim)}`}`;
  };

  return (
    <div className={s.pagina}>
      <header className={s.topo}><div><h1 className={s.titulo}>Relatórios</h1><p className={s.sub}>Gere e exporte relatórios detalhados do seu restaurante</p></div></header>
      <div className={s.filtrosRelatorio}>
        <label><span className="sr-only">Data inicial</span><input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} /></label>
        <label><span className="sr-only">Data final</span><input type="date" value={fim} min={inicio} max={iso(hoje)} onChange={(e) => setFim(e.target.value)} /></label>
        <select className={s.seletor} value={tipoTopo} onChange={(e) => setTipoTopo(e.target.value as TipoRelatorio | 'TODOS')} aria-label="Tipo de relatório">
          <option value="TODOS">Todos os tipos</option>{TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.titulo}</option>)}
        </select>
        <button type="button" className={s.botao} disabled={periodoInvalido || tipoTopo === 'TODOS' || gerar.isPending} title={tipoTopo === 'TODOS' ? 'Escolha um tipo ou use os cartões abaixo' : undefined}
          onClick={() => tipoTopo !== 'TODOS' && gerarTipo(TIPOS.find((t) => t.tipo === tipoTopo)!)}><FileText size={16} aria-hidden /> {gerar.isPending ? 'Gerando…' : 'Gerar relatório'}</button>
      </div>
      <section className={s.cartao} aria-labelledby="tipos">
        <h2 id="tipos" className={s.cartaoTitulo}>Tipos de relatório</h2><p className={s.cartaoSub}>Clique para gerar com o período selecionado</p>
        <div className={s.tipos}>
          {TIPOS.filter((t) => tipoTopo === 'TODOS' || t.tipo === tipoTopo).map((t) => (
            <button key={t.tipo} type="button" className={s.tipoCartao} onClick={() => gerarTipo(t)} disabled={periodoInvalido || gerar.isPending}>
              <span className={`${s.icone} ${s[t.tom]}`} aria-hidden><t.icone size={20} /></span><strong>{t.titulo}</strong><small>{t.descricao}</small>
              <span className={s.gerar}><Download size={14} aria-hidden /> Gerar {t.formato}</span>
            </button>
          ))}
        </div>
      </section>
      <section className={s.cartao} aria-labelledby="historico">
        <h2 id="historico" className={s.cartaoTitulo}>Histórico de relatórios</h2><p className={s.cartaoSub}>Relatórios gerados anteriormente</p>
        {historico.isError ? <ErroCarregamento onTentarNovamente={() => historico.refetch()} /> : !historico.data ? <Skeleton altura={160} raio={16} /> :
          historico.data.length === 0 ? <EmptyState compacto titulo="Nenhum relatório gerado ainda" descricao="Os relatórios que você gerar aparecem aqui para baixar de novo." /> : (
            <table className={s.tabela}><thead><tr><th>Relatório</th><th>Período</th><th>Gerado em</th><th>Formato</th><th><span className="sr-only">Ação</span></th></tr></thead>
              <tbody>{historico.data.map((r) => (
                <tr key={r.id}><td><b>{nomeHistorico(r)}</b></td><td>{br(r.inicio).slice(0, 5)} — {br(r.fim).slice(0, 5)}</td><td>{new Date(r.geradoEm).toLocaleDateString('pt-BR')}</td>
                  <td><span className={s.formato}>PDF</span></td>
                  <td><button type="button" className={s.botaoClaro} onClick={() => gerar.mutate({ tipo: r.tipo, formato: 'PDF', de: r.inicio, ate: r.fim, registrar: false })} disabled={gerar.isPending}><Download size={14} aria-hidden /> Baixar PDF</button></td></tr>
              ))}</tbody></table>
          )}
      </section>
    </div>
  );
}
