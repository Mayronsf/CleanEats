import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Percent, Save } from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../design-system';
import { formatarMoeda, formatarNumero } from '../../lib/formato';
import { ErroApi } from '../../services/api';
import { buscarPlataforma, definirComissao, simularRenovacao, type Renovacao, type RestauranteAdmin } from '../../services/admin';
import s from './Admin.module.css';

const diaIso = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const daquiUmMes = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); };

/** /admin/restaurantes — Comissão por restaurante (CE-17) e "Simular renovação" das assinaturas (CE-16, SIMULADO). */
export default function PlataformaAdminPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const dados = useQuery({ queryKey: ['admin', 'plataforma'], queryFn: buscarPlataforma });
  const [ate, setAte] = useState(daquiUmMes());
  const [resultado, setResultado] = useState<Renovacao | null>(null);
  const simular = useMutation({
    mutationFn: () => simularRenovacao(ate),
    onSuccess: (r) => { setResultado(r); toast(`Simulação até ${diaIso(r.dataSimulada)}: ${r.renovadas} renovadas, ${r.expiradas} expiradas.`, 'sucesso'); void qc.invalidateQueries({ queryKey: ['admin', 'plataforma'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível simular.', 'erro'),
  });

  if (dados.isError) return <ErroCarregamento onTentarNovamente={() => dados.refetch()} />;
  if (!dados.data) return <div className={s.pagina}><Skeleton altura={140} raio={20} /><div style={{ height: 20 }} /><Skeleton altura={380} raio={20} /></div>;
  const a = dados.data.assinaturas;

  return (
    <div className={s.pagina}>
      <header className={s.topo}><div><h1 className={s.titulo}>Comissões e assinaturas</h1><p className={s.sub}>Comissão por restaurante (vale para os próximos pedidos) e ciclo das assinaturas</p></div></header>
      <ul className={s.cartoes}>
        <li><strong>{formatarNumero(a.ativas)}</strong><span>Assinaturas ativas</span></li>
        <li><strong>{formatarMoeda(Number(a.receitaMensal))}</strong><span>Receita recorrente mensal</span></li>
        <li><strong>{formatarNumero(a.canceladas)}</strong><span>Canceladas (até o fim do período)</span></li>
        <li><strong>{formatarNumero(a.pausadas)}</strong><span>Pausadas</span></li>
      </ul>

      <section className={s.painel} aria-labelledby="renovacao">
        <div className={s.painelTopo}><CalendarClock size={20} aria-hidden /><div><h2 id="renovacao">Simular renovação</h2><p className={s.meta}>Avança o calendário das assinaturas até a data: renova as ativas vencidas (fatura paga simulada), encerra as canceladas e retoma as pausadas.</p></div></div>
        <div className={s.linhaForm}>
          <label htmlFor="ate" className={s.rotulo}>Simular até</label>
          <input id="ate" type="date" value={ate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAte(e.target.value)} />
          <button type="button" className={s.botaoPrimario} onClick={() => simular.mutate()} disabled={simular.isPending || !ate}>{simular.isPending ? 'Simulando…' : 'Simular renovação'}</button>
        </div>
        {resultado && <p className={s.resultado} role="status">Até {diaIso(resultado.dataSimulada)}: <b>{resultado.renovadas}</b> renovadas ({formatarMoeda(Number(resultado.faturado))} faturados), <b>{resultado.expiradas}</b> voltaram ao Free, <b>{resultado.retomadas}</b> retomadas.</p>}
      </section>

      <section className={s.painel} aria-labelledby="comissoes">
        <div className={s.painelTopo}><Percent size={20} aria-hidden /><div><h2 id="comissoes">Comissão por restaurante</h2><p className={s.meta}>Padrão 8%. A comissão fica congelada em cada pedido no momento da compra.</p></div></div>
        <div className={s.tabela}><table>
          <thead><tr><th>Restaurante</th><th>Status</th><th>Pedidos no mês</th><th>Vendas no mês</th><th>Comissão no mês</th><th>Comissão (%)</th></tr></thead>
          <tbody>{dados.data.restaurantes.map((r) => <LinhaComissao key={r.id} r={r} />)}</tbody>
        </table></div>
      </section>
    </div>
  );
}

function LinhaComissao({ r }: { r: RestauranteAdmin }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [valor, setValor] = useState(String(Number(r.comissaoPercentual)).replace('.', ','));
  useEffect(() => { setValor(String(Number(r.comissaoPercentual)).replace('.', ',')); }, [r.comissaoPercentual]);
  const numero = Number(valor.replace(',', '.'));
  const mudou = !Number.isNaN(numero) && numero !== Number(r.comissaoPercentual);
  const salvar = useMutation({
    mutationFn: () => definirComissao(r.id, numero),
    onSuccess: () => { toast(`Comissão de ${r.nome} atualizada para ${valor}%.`, 'sucesso'); void qc.invalidateQueries({ queryKey: ['admin', 'plataforma'] }); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível salvar.', 'erro'),
  });
  return (
    <tr>
      <td><b>{r.nome}</b></td>
      <td><span className={`${s.selo} ${r.status === 'APROVADO' ? s.ok : r.status === 'PENDENTE' ? s.pendente : s.ruim}`}>{r.status === 'APROVADO' ? 'Aprovado' : r.status === 'PENDENTE' ? 'Pendente' : 'Rejeitado'}</span></td>
      <td>{formatarNumero(r.pedidosMes)}</td>
      <td>{formatarMoeda(Number(r.vendasMes))}</td>
      <td>{formatarMoeda(Number(r.comissaoMes))}</td>
      <td><div className={s.comissao}>
        <input value={valor} inputMode="decimal" onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} aria-label={`Comissão de ${r.nome} em %`} />
        <button type="button" className={s.botaoIcone} onClick={() => salvar.mutate()} disabled={!mudou || salvar.isPending} aria-label={`Salvar comissão de ${r.nome}`}><Save size={15} aria-hidden /></button>
      </div></td>
    </tr>
  );
}
