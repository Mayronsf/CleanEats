import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CheckCircle2, CreditCard, DollarSign, Download, Percent, ShieldMinus } from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { formatarMoeda } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import { baixarArquivo, buscarFinanceiro } from '../../../services/restaurante';
import s from './Gestao.module.css';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const nomeMes = (ym: string) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]} ${a}`; };
const dia = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const curto = (v: number) => (Math.abs(v) >= 1000 ? `R$${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : formatarMoeda(v));

/** Tela 42 — Financeiro (CE-17): bruto, comissão congelada nos pedidos, líquido, repasses e exportação CSV por mês. */
export default function FinanceiroPage() {
  const toast = useToast();
  const [mes, setMes] = useState<string | undefined>();
  const dados = useQuery({ queryKey: ['restaurante', 'financeiro', mes], queryFn: () => buscarFinanceiro(mes) });
  const exportar = useMutation({
    mutationFn: () => baixarArquivo(`/painel-restaurante/financeiro/csv?mes=${dados.data!.mes}`, `financeiro-${dados.data!.mes}.csv`),
    onSuccess: () => toast('CSV do mês baixado.', 'sucesso'),
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível exportar.', 'erro'),
  });
  const d = dados.data;
  const variacaoBruto = d && Number(d.brutoAnterior) > 0 ? Math.round(((Number(d.bruto) - Number(d.brutoAnterior)) / Number(d.brutoAnterior)) * 100) : null;
  const maxMes = Math.max(1, ...(d?.meses.map((m) => Number(m.liquido)) ?? [1]));

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <div><h1 className={s.titulo}>Financeiro</h1><p className={s.sub}>Receitas, comissões e transações do restaurante</p></div>
        <div className={s.acoesTopo}>
          <select className={s.seletor} value={d?.mes ?? ''} onChange={(e) => setMes(e.target.value)} aria-label="Mês" disabled={!d}>
            {(d?.mesesDisponiveis.includes(d.mes) ? d.mesesDisponiveis : [d?.mes ?? '', ...(d?.mesesDisponiveis ?? [])]).filter(Boolean).map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          <button type="button" className={s.botao} onClick={() => exportar.mutate()} disabled={!d || exportar.isPending}><Download size={16} aria-hidden /> {exportar.isPending ? 'Gerando…' : 'Exportar CSV'}</button>
        </div>
      </header>
      {dados.isError ? <ErroCarregamento onTentarNovamente={() => dados.refetch()} /> : !d ? <><Skeleton altura={80} raio={18} /><div style={{ height: 20 }} /><Skeleton altura={420} raio={22} /></> : <>
        <div className={s.faixa}><Percent size={20} aria-hidden /><div><strong>Comissão CleanEats</strong><small>Taxa sobre cada pedido processado na plataforma (congelada no momento do pedido)</small></div><b>{Number(d.comissaoPercentual).toLocaleString('pt-BR')}%</b></div>
        <ul className={s.metricas}>
          <li className={s.metrica}><span className={`${s.icone} ${s.verde}`} aria-hidden><DollarSign size={20} /></span><strong>{formatarMoeda(Number(d.bruto))}</strong><span className={s.rotuloMetrica}>Receita bruta</span>
            {variacaoBruto != null && <span className={`${s.variacao} ${variacaoBruto >= 0 ? s.sobe : s.desce}`}>{variacaoBruto >= 0 ? '+' : ''}{variacaoBruto}%</span>}</li>
          <li className={s.metrica}><span className={`${s.icone} ${s.coral}`} aria-hidden><ShieldMinus size={20} /></span><strong>−{formatarMoeda(Number(d.comissao))}</strong><span className={s.rotuloMetrica}>Comissão</span><small className={s.nota}>Retido pela plataforma</small></li>
          <li className={s.metrica}><span className={`${s.icone} ${s.azul}`} aria-hidden><CreditCard size={20} /></span><strong>{formatarMoeda(Number(d.liquido))}</strong><span className={s.rotuloMetrica}>Receita líquida</span><small className={s.nota}>Valor a receber</small></li>
          <li className={s.metrica}><span className={`${s.icone} ${s.verde}`} aria-hidden><CheckCircle2 size={20} /></span><strong>{formatarMoeda(Number(d.jaPago))}</strong><span className={s.rotuloMetrica}>Já pago</span><small className={s.nota}>Repasses transferidos no mês</small></li>
        </ul>
        <section className={s.cartao} aria-labelledby="mensal">
          <h2 id="mensal" className={s.cartaoTitulo}>Receita mensal</h2><p className={s.cartaoSub}>Últimos 6 meses (líquido)</p>
          <div className={s.barras} role="img" aria-label={d.meses.map((m) => `${m.mes} ${formatarMoeda(Number(m.liquido))}`).join(', ')}>
            {d.meses.map((m) => (
              <div key={m.mes} className={s.barra}><span className={s.barraValor}>{curto(Number(m.liquido))}</span>
                <span className={s.barraCorpo} style={{ height: `${Math.max(4, (Number(m.liquido) / maxMes) * 100)}%` }} /><span className={s.barraRotulo}>{m.mes}</span></div>
            ))}
          </div>
        </section>
        <section className={s.cartao} aria-labelledby="transacoes">
          <h2 id="transacoes" className={s.cartaoTitulo}>Transações recentes</h2><p className={s.cartaoSub}>Repasses semanais e comissões retidas</p>
          {d.transacoes.length === 0 ? <p className={s.cartaoSub}>Nenhum repasse ainda.</p> : (
            <table className={s.tabela}><thead><tr><th>Tipo</th><th>Descrição</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>{d.transacoes.map((t, i) => (
                <tr key={i}><td><span className={`${s.tipo} ${t.tipo === 'ENTRADA' ? s.entrada : s.saida}`} aria-label={t.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}>{t.tipo === 'ENTRADA' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}</span></td>
                  <td>{t.descricao}</td><td>{dia(t.data)}</td><td className={t.tipo === 'ENTRADA' ? s.positivo : s.negativo}>{t.tipo === 'ENTRADA' ? '+' : '−'}{formatarMoeda(Math.abs(Number(t.valor)))}</td>
                  <td><span className={`${s.selo} ${t.status === 'Pendente' ? s.seloPendente : s.seloOk}`}>{t.status}</span></td></tr>
              ))}</tbody></table>
          )}
        </section>
        <section className={s.cartao} aria-labelledby="recebimento">
          <h2 id="recebimento" className={s.cartaoTitulo}>Recebimento</h2><p className={s.cartaoSub}>Os repasses são enviados por PIX toda quarta-feira</p>
          {d.chavePix ? (
            <dl className={s.dados}><div><dt>Chave PIX</dt><dd>{d.chavePix}</dd></div><div><dt>Tipo</dt><dd>{d.tipoChavePix === 'ALEATORIA' ? 'Aleatória' : d.tipoChavePix === 'EMAIL' ? 'E-mail' : d.tipoChavePix === 'TELEFONE' ? 'Telefone' : 'CNPJ'}</dd></div><div><dt>Titular</dt><dd>{d.titularPix ?? '—'}</dd></div></dl>
          ) : <p className={s.alertaTexto}>Nenhuma chave PIX cadastrada. <Link to="/restaurante/perfil">Cadastrar no perfil</Link> para receber os repasses.</p>}
        </section>
      </>}
    </div>
  );
}
