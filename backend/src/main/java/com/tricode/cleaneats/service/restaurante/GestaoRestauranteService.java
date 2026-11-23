package com.tricode.cleaneats.service.restaurante;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Gestão do restaurante: Analytics (41), Financeiro com exportação CSV (42, CE-17) e Relatórios em PDF/CSV (43).
 * Tudo agregado no backend a partir dos pedidos, avaliações e repasses. Dono: frente C.
 */
@Service
public class GestaoRestauranteService {

    public record Comparado(BigDecimal atual, BigDecimal anterior) {}
    public record PontoDia(String rotulo, LocalDate data, long pedidos, BigDecimal receita) {}
    public record TopPrato(String nome, long pedidos, BigDecimal receita) {}
    public record AnalyticsDto(int dias, Comparado pedidos, Comparado faturamento, Comparado nota, Comparado recompra, List<PontoDia> serie,
                               List<TopPrato> topPratos, Map<Integer, Long> distribuicao, long totalAvaliacoes) {}
    public record MesValor(String mes, BigDecimal liquido) {}
    public record Transacao(String tipo, String descricao, LocalDate data, BigDecimal valor, String status) {}
    public record FinanceiroDto(String mes, BigDecimal comissaoPercentual, BigDecimal bruto, BigDecimal brutoAnterior, BigDecimal comissao,
                                BigDecimal liquido, BigDecimal jaPago, List<MesValor> meses, List<Transacao> transacoes,
                                String chavePix, String tipoChavePix, String titularPix, List<String> mesesDisponiveis) {}
    public record RelatorioGerado(UUID id, String tipo, String formato, LocalDate inicio, LocalDate fim, OffsetDateTime geradoEm) {}
    public record Arquivo(String nome, String tipoConteudo, byte[] conteudo) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final String[] DIAS = {"Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"};
    private static final String[] MESES = {"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"};
    static final Map<String, String> TIPOS = new LinkedHashMap<>(Map.of(
            "VENDAS", "Relatório de vendas", "FINANCEIRO", "Relatório financeiro", "AVALIACOES", "Relatório de avaliações",
            "CLIENTES", "Relatório de clientes", "CARDAPIO", "Relatório de cardápio", "OPERACIONAL", "Relatório operacional"));

    private final JdbcClient jdbc;
    private final PainelPedidosService painel;

    public GestaoRestauranteService(JdbcClient jdbc, PainelPedidosService painel) {
        this.jdbc = jdbc; this.painel = painel;
    }

    // ---------- 41 · Analytics ----------

    public AnalyticsDto analytics(UUID idUsuario, int dias) {
        if (!Set.of(7, 30, 90).contains(dias)) throw new IllegalArgumentException("Período inválido");
        var r = painel.restaurante(idUsuario).id();
        var hoje = LocalDate.now(FUSO);
        var ini = hoje.minusDays(dias - 1L);
        var iniAnt = ini.minusDays(dias);
        var tot = jdbc.sql("""
                select count(*) filter (where d >= :ini) p, count(*) filter (where d < :ini) pa,
                       coalesce(sum(v) filter (where d >= :ini), 0) f, coalesce(sum(v) filter (where d < :ini), 0) fa
                from (select (criado_em at time zone 'America/Recife')::date d, subtotal - desconto v from pedido
                      where id_restaurante = :r and status not in ('CANCELADO','RECUSADO')
                        and (criado_em at time zone 'America/Recife')::date between :iniAnt and :hoje) x""")
                .param("r", r).param("ini", ini).param("iniAnt", iniAnt).param("hoje", hoje)
                .query((rs, i) -> new BigDecimal[]{rs.getBigDecimal(1), rs.getBigDecimal(2), rs.getBigDecimal(3), rs.getBigDecimal(4)}).single();
        var notas = jdbc.sql("""
                select avg(a.nota) filter (where a.data_avaliacao >= :ini) n, avg(a.nota) filter (where a.data_avaliacao < :ini) na
                from avaliacao a join pedido p on p.id = a.id_pedido
                where p.id_restaurante = :r and a.status_moderacao = 'PUBLICADA' and a.data_avaliacao >= :iniAnt""")
                .param("r", r).param("ini", ini.atStartOfDay(FUSO).toOffsetDateTime()).param("iniAnt", iniAnt.atStartOfDay(FUSO).toOffsetDateTime())
                .query((rs, i) -> new BigDecimal[]{escala(rs.getBigDecimal(1)), escala(rs.getBigDecimal(2))}).single();
        var recompra = new BigDecimal[]{recompra(r, ini, hoje), recompra(r, iniAnt, ini.minusDays(1))};
        var serie = new ArrayList<PontoDia>();
        var porDia = jdbc.sql("""
                select (criado_em at time zone 'America/Recife')::date d, count(*), sum(subtotal - desconto) from pedido
                where id_restaurante = :r and status not in ('CANCELADO','RECUSADO') and (criado_em at time zone 'America/Recife')::date between :ini and :hoje
                group by 1""").param("r", r).param("ini", ini).param("hoje", hoje)
                .query((rs, i) -> Map.entry(rs.getObject(1, LocalDate.class), new Object[]{rs.getLong(2), rs.getBigDecimal(3)})).list();
        var mapa = new HashMap<LocalDate, Object[]>();
        porDia.forEach(e -> mapa.put(e.getKey(), e.getValue()));
        if (dias == 90) {
            for (var semana = ini; !semana.isAfter(hoje); semana = semana.plusDays(7)) {
                long p = 0; BigDecimal v = BigDecimal.ZERO;
                for (int k = 0; k < 7 && !semana.plusDays(k).isAfter(hoje); k++) {
                    var o = mapa.get(semana.plusDays(k));
                    if (o != null) { p += (long) o[0]; v = v.add((BigDecimal) o[1]); }
                }
                serie.add(new PontoDia(semana.getDayOfMonth() + "/" + MESES[semana.getMonthValue() - 1], semana, p, v));
            }
        } else {
            for (var d = ini; !d.isAfter(hoje); d = d.plusDays(1)) {
                var o = mapa.get(d);
                serie.add(new PontoDia(dias == 7 ? DIAS[d.getDayOfWeek().getValue() % 7] : String.valueOf(d.getDayOfMonth()), d,
                        o == null ? 0 : (long) o[0], o == null ? BigDecimal.ZERO : (BigDecimal) o[1]));
            }
        }
        var top = jdbc.sql("""
                select i.nome, sum(i.quantidade) q, sum(i.quantidade * i.preco_unitario) v from item_pedido i join pedido p on p.id = i.id_pedido
                where p.id_restaurante = :r and p.status not in ('CANCELADO','RECUSADO') and (p.criado_em at time zone 'America/Recife')::date between :ini and :hoje
                group by i.nome order by q desc, v desc limit 5""").param("r", r).param("ini", ini).param("hoje", hoje)
                .query((rs, i) -> new TopPrato(rs.getString(1), rs.getLong(2), rs.getBigDecimal(3))).list();
        var dist = new LinkedHashMap<Integer, Long>();
        for (int k = 5; k >= 1; k--) dist.put(k, 0L);
        jdbc.sql("""
                select a.nota, count(*) from avaliacao a join pedido p on p.id = a.id_pedido
                where p.id_restaurante = :r and a.status_moderacao = 'PUBLICADA' group by 1""").param("r", r)
                .query((rs, i) -> Map.entry(rs.getInt(1), rs.getLong(2))).list().forEach(e -> dist.put(e.getKey(), e.getValue()));
        return new AnalyticsDto(dias, new Comparado(tot[0], tot[1]), new Comparado(tot[2], tot[3]), new Comparado(notas[0], notas[1]),
                new Comparado(recompra[0], recompra[1]), serie, top, dist, dist.values().stream().mapToLong(Long::longValue).sum());
    }

    /** % dos clientes do período que já tinham comprado antes dele. */
    private BigDecimal recompra(UUID r, LocalDate ini, LocalDate fim) {
        return jdbc.sql("""
                with c as (select distinct id_usuario from pedido where id_restaurante = :r and status <> 'CANCELADO'
                           and (criado_em at time zone 'America/Recife')::date between :ini and :fim)
                select case when count(*) = 0 then null else round(100.0 * count(*) filter (where exists (
                         select 1 from pedido p where p.id_restaurante = :r and p.id_usuario = c.id_usuario and p.status <> 'CANCELADO'
                           and (p.criado_em at time zone 'America/Recife')::date < :ini)) / count(*), 0) end from c""")
                .param("r", r).param("ini", ini).param("fim", fim).query(BigDecimal.class).optional().orElse(null);
    }

    // ---------- 42 · Financeiro ----------

    public FinanceiroDto financeiro(UUID idUsuario, String mesTexto) {
        var rest = painel.restaurante(idUsuario).id();
        var mes = mesTexto == null || mesTexto.isBlank() ? YearMonth.now(FUSO) : YearMonth.parse(mesTexto);
        var ini = mes.atDay(1); var fim = mes.atEndOfMonth();
        var soma = somaMes(rest, ini, fim);
        var anterior = somaMes(rest, mes.minusMonths(1).atDay(1), mes.minusMonths(1).atEndOfMonth());
        var pago = jdbc.sql("""
                select coalesce(sum(valor_liquido), 0) from repasse where id_restaurante = :r and status = 'PAGO'
                  and (pago_em at time zone 'America/Recife')::date between :ini and :fim""").param("r", rest).param("ini", ini).param("fim", fim)
                .query(BigDecimal.class).single();
        var meses = new ArrayList<MesValor>();
        for (int k = 5; k >= 0; k--) {
            var m = mes.minusMonths(k);
            var s = somaMes(rest, m.atDay(1), m.atEndOfMonth());
            meses.add(new MesValor(MESES[m.getMonthValue() - 1], s[0].subtract(s[1])));
        }
        var transacoes = new ArrayList<Transacao>();
        jdbc.sql("""
                select periodo_inicio, periodo_fim, valor_liquido, valor_comissao, status, coalesce((pago_em at time zone 'America/Recife')::date, previsto_para) as data,
                       extract(week from periodo_inicio)::int as semana
                from repasse where id_restaurante = :r and periodo_inicio <= :fim order by periodo_inicio desc limit 6""").param("r", rest).param("fim", fim)
                .query((rs, i) -> new Object[]{rs.getObject("periodo_inicio", LocalDate.class), rs.getBigDecimal("valor_liquido"), rs.getBigDecimal("valor_comissao"),
                        rs.getString("status"), rs.getObject("data", LocalDate.class), rs.getInt("semana")})
                .list().forEach(o -> {
                    transacoes.add(new Transacao("ENTRADA", "Repasse semanal #" + o[5], (LocalDate) o[4], (BigDecimal) o[1], "PAGO".equals(o[3]) ? "Pago" : "Pendente"));
                    transacoes.add(new Transacao("SAIDA", "Comissão semana " + o[5], (LocalDate) o[4], ((BigDecimal) o[2]).negate(), "Retido"));
                });
        var pix = jdbc.sql("select comissao_percentual, chave_pix, tipo_chave_pix, titular_pix from restaurante where id = :r").param("r", rest)
                .query((rs, i) -> new Object[]{rs.getBigDecimal(1), rs.getString(2), rs.getString(3), rs.getString(4)}).single();
        var disponiveis = jdbc.sql("""
                select distinct to_char(date_trunc('month', criado_em at time zone 'America/Recife'), 'YYYY-MM') m from pedido
                where id_restaurante = :r order by 1 desc limit 12""").param("r", rest).query(String.class).list();
        return new FinanceiroDto(mes.toString(), (BigDecimal) pix[0], soma[0], anterior[0], soma[1], soma[0].subtract(soma[1]), pago, meses, transacoes,
                (String) pix[1], (String) pix[2], (String) pix[3], disponiveis);
    }

    /** [bruto (produtos − descontos), comissão congelada nos pedidos] dos pedidos entregues no intervalo. */
    private BigDecimal[] somaMes(UUID r, LocalDate ini, LocalDate fim) {
        return jdbc.sql("""
                select coalesce(sum(subtotal - desconto), 0), coalesce(sum(valor_comissao), 0) from pedido
                where id_restaurante = :r and status = 'ENTREGUE' and (criado_em at time zone 'America/Recife')::date between :ini and :fim""")
                .param("r", r).param("ini", ini).param("fim", fim).query((rs, i) -> new BigDecimal[]{rs.getBigDecimal(1), rs.getBigDecimal(2)}).single();
    }

    /** CE-17: CSV dos pedidos do mês com bruto, comissão e líquido (separador ; e BOM para abrir no Excel). */
    public Arquivo financeiroCsv(UUID idUsuario, String mesTexto) {
        var rest = painel.restaurante(idUsuario);
        var mes = mesTexto == null || mesTexto.isBlank() ? YearMonth.now(FUSO) : YearMonth.parse(mesTexto);
        var linhas = jdbc.sql("""
                select p.codigo, (p.criado_em at time zone 'America/Recife') as quando, p.status, p.forma_pagamento, p.subtotal, p.desconto,
                       p.subtotal - p.desconto as bruto, p.comissao_percentual, p.valor_comissao, p.subtotal - p.desconto - p.valor_comissao as liquido
                from pedido p where p.id_restaurante = :r and (p.criado_em at time zone 'America/Recife')::date between :ini and :fim order by p.criado_em""")
                .param("r", rest.id()).param("ini", mes.atDay(1)).param("fim", mes.atEndOfMonth())
                .query((rs, i) -> List.of(rs.getString(1), rs.getTimestamp(2).toLocalDateTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                        rs.getString(3), rs.getString(4), br(rs.getBigDecimal(5)), br(rs.getBigDecimal(6)), br(rs.getBigDecimal(7)),
                        br(rs.getBigDecimal(8)), br(rs.getBigDecimal(9)), br(rs.getBigDecimal(10)))).list();
        var csv = csv(List.of("Pedido", "Data", "Status", "Pagamento", "Subtotal", "Desconto", "Bruto", "Comissão (%)", "Comissão (R$)", "Líquido"), linhas);
        return new Arquivo("financeiro-" + mes + ".csv", "text/csv; charset=utf-8", csv);
    }

    // ---------- 43 · Relatórios ----------

    public List<RelatorioGerado> historico(UUID idUsuario) {
        var r = painel.restaurante(idUsuario).id();
        return jdbc.sql("select id, tipo, formato, inicio, fim, gerado_em from relatorio_gerado where id_restaurante = :r order by gerado_em desc limit 20")
                .param("r", r).query((rs, i) -> new RelatorioGerado(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                        rs.getObject(4, LocalDate.class), rs.getObject(5, LocalDate.class), rs.getObject(6, OffsetDateTime.class))).list();
    }

    public Arquivo gerar(UUID idUsuario, String tipo, LocalDate inicio, LocalDate fim, String formato, boolean registrar) {
        var t = tipo == null ? "" : tipo.toUpperCase(Locale.ROOT);
        if (!TIPOS.containsKey(t)) throw new IllegalArgumentException("Tipo de relatório inválido");
        var f = formato == null ? "PDF" : formato.toUpperCase(Locale.ROOT);
        if (!Set.of("PDF", "CSV").contains(f)) throw new IllegalArgumentException("Formato inválido");
        if (inicio == null || fim == null || fim.isBefore(inicio)) throw new IllegalArgumentException("Período inválido");
        if (inicio.plusYears(1).isBefore(fim)) throw new IllegalArgumentException("O período pode ter no máximo 1 ano");
        var rest = painel.restaurante(idUsuario);
        var dados = dados(rest.id(), t, inicio, fim);
        if (registrar) {
            jdbc.sql("insert into relatorio_gerado (id_restaurante, tipo, formato, inicio, fim) values (:r, :t, :f, :i, :e)")
                    .param("r", rest.id()).param("t", t).param("f", f).param("i", inicio).param("e", fim).update();
        }
        var nome = t.toLowerCase(Locale.ROOT) + "-" + inicio + "-a-" + fim;
        return "CSV".equals(f) ? new Arquivo(nome + ".csv", "text/csv; charset=utf-8", csv(dados.cabecalho(), dados.linhas()))
                : new Arquivo(nome + ".pdf", "application/pdf", pdf(rest.nome(), TIPOS.get(t), inicio, fim, dados));
    }

    record Tabela(List<String> resumo, List<String> cabecalho, List<List<String>> linhas) {}

    private Tabela dados(UUID r, String tipo, LocalDate ini, LocalDate fim) {
        var j = new Object() {
            org.springframework.jdbc.core.simple.JdbcClient.StatementSpec q(String sql) { return jdbc.sql(sql).param("r", r).param("ini", ini).param("fim", fim); }
        };
        var periodo = "(p.criado_em at time zone 'America/Recife')::date between :ini and :fim";
        return switch (tipo) {
            case "VENDAS" -> {
                List<List<String>> linhas = j.q("""
                        select i.nome, coalesce(m.categoria, 'Monte sua marmita'), sum(i.quantidade), sum(i.quantidade * i.preco_unitario)
                        from item_pedido i join pedido p on p.id = i.id_pedido left join marmita m on m.id = i.id_marmita
                        where p.id_restaurante = :r and p.status not in ('CANCELADO','RECUSADO') and %s group by 1, 2 order by 4 desc""".formatted(periodo))
                        .query((rs, i) -> List.of(rs.getString(1), rs.getString(2), String.valueOf(rs.getLong(3)), br(rs.getBigDecimal(4)))).list();
                List<String> tot = j.q("select count(*), coalesce(sum(subtotal - desconto), 0) from pedido p where id_restaurante = :r and status not in ('CANCELADO','RECUSADO') and " + periodo)
                        .query((rs, i) -> List.of("Pedidos: " + rs.getLong(1), "Faturamento: R$ " + br(rs.getBigDecimal(2)))).single();
                yield new Tabela(tot, List.of("Prato", "Categoria", "Unidades", "Receita (R$)"), linhas);
            }
            case "FINANCEIRO" -> {
                List<List<String>> linhas = j.q("""
                        select to_char(date_trunc('week', p.criado_em at time zone 'America/Recife'), 'DD/MM/YYYY'), count(*), sum(p.subtotal - p.desconto),
                               sum(p.valor_comissao), sum(p.subtotal - p.desconto - p.valor_comissao)
                        from pedido p where p.id_restaurante = :r and p.status = 'ENTREGUE' and %s group by 1, date_trunc('week', p.criado_em at time zone 'America/Recife')
                        order by date_trunc('week', p.criado_em at time zone 'America/Recife')""".formatted(periodo))
                        .query((rs, i) -> List.of("Semana de " + rs.getString(1), String.valueOf(rs.getLong(2)), br(rs.getBigDecimal(3)), br(rs.getBigDecimal(4)), br(rs.getBigDecimal(5)))).list();
                List<String> tot = j.q("select coalesce(sum(subtotal - desconto), 0), coalesce(sum(valor_comissao), 0) from pedido p where id_restaurante = :r and status = 'ENTREGUE' and " + periodo)
                        .query((rs, i) -> List.of("Bruto: R$ " + br(rs.getBigDecimal(1)), "Comissão: R$ " + br(rs.getBigDecimal(2)),
                                "Líquido: R$ " + br(rs.getBigDecimal(1).subtract(rs.getBigDecimal(2))))).single();
                yield new Tabela(tot, List.of("Período", "Pedidos", "Bruto (R$)", "Comissão (R$)", "Líquido (R$)"), linhas);
            }
            case "AVALIACOES" -> {
                List<List<String>> linhas = j.q("""
                        select to_char(a.data_avaliacao at time zone 'America/Recife', 'DD/MM/YYYY'), coalesce(m.nome, '—'), a.nota, coalesce(a.comentario, '')
                        from avaliacao a join pedido p on p.id = a.id_pedido left join marmita m on m.id = a.id_marmita
                        where p.id_restaurante = :r and a.status_moderacao = 'PUBLICADA' and (a.data_avaliacao at time zone 'America/Recife')::date between :ini and :fim
                        order by a.data_avaliacao desc""")
                        .query((rs, i) -> List.of(rs.getString(1), rs.getString(2), String.valueOf(rs.getInt(3)), rs.getString(4))).list();
                var media = linhas.stream().mapToInt(l -> Integer.parseInt(l.get(2))).average();
                yield new Tabela(List.of("Avaliações: " + linhas.size(), "Nota média: " + (media.isPresent() ? String.format(Locale.forLanguageTag("pt-BR"), "%.1f", media.getAsDouble()) : "—")),
                        List.of("Data", "Prato", "Nota", "Comentário"), linhas);
            }
            case "CLIENTES" -> {
                List<List<String>> linhas = j.q("""
                        select case when u.anonimizado_em is null then u.nome else 'Cliente removido' end, count(*), sum(p.subtotal - p.desconto),
                               to_char(max(p.criado_em) at time zone 'America/Recife', 'DD/MM/YYYY')
                        from pedido p join usuario u on u.id = p.id_usuario where p.id_restaurante = :r and p.status not in ('CANCELADO','RECUSADO') and %s
                        group by u.id, u.nome, u.anonimizado_em order by 2 desc, 3 desc""".formatted(periodo))
                        .query((rs, i) -> List.of(rs.getString(1), String.valueOf(rs.getLong(2)), br(rs.getBigDecimal(3)), rs.getString(4))).list();
                yield new Tabela(List.of("Clientes: " + linhas.size(), "Recorrentes (2+ pedidos): " + linhas.stream().filter(l -> Long.parseLong(l.get(1)) > 1).count()),
                        List.of("Cliente", "Pedidos", "Gasto (R$)", "Último pedido"), linhas);
            }
            case "CARDAPIO" -> {
                List<List<String>> linhas = j.q("""
                        select m.nome, m.status_prato, m.preco, coalesce(m.calorias::text, '—'),
                               coalesce((select sum(i.quantidade) from item_pedido i join pedido p on p.id = i.id_pedido
                                         where i.id_marmita = m.id and p.status not in ('CANCELADO','RECUSADO') and %s), 0), m.nota_media
                        from marmita m where m.id_restaurante = :r order by 5 desc, m.nome""".formatted(periodo))
                        .query((rs, i) -> List.of(rs.getString(1), rs.getString(2), br(rs.getBigDecimal(3)), rs.getString(4), String.valueOf(rs.getLong(5)), rs.getBigDecimal(6).toPlainString())).list();
                yield new Tabela(List.of("Pratos: " + linhas.size(), "Sem venda no período: " + linhas.stream().filter(l -> "0".equals(l.get(4))).count()),
                        List.of("Prato", "Status", "Preço (R$)", "Kcal", "Vendidos", "Nota"), linhas);
            }
            default -> {
                List<List<String>> linhas = j.q("""
                        select to_char((p.criado_em at time zone 'America/Recife')::date, 'DD/MM/YYYY'), count(*),
                               count(*) filter (where p.status in ('CANCELADO','RECUSADO')),
                               round(avg(extract(epoch from (pr.em - ac.em)) / 60)::numeric, 0)
                        from pedido p
                        left join lateral (select min(em) em from historico_status_pedido h where h.id_pedido = p.id and h.status = 'ACEITO') ac on true
                        left join lateral (select min(em) em from historico_status_pedido h where h.id_pedido = p.id and h.status = 'PRONTO') pr on true
                        where p.id_restaurante = :r and %s group by 1, (p.criado_em at time zone 'America/Recife')::date
                        order by (p.criado_em at time zone 'America/Recife')::date""".formatted(periodo))
                        .query((rs, i) -> List.of(rs.getString(1), String.valueOf(rs.getLong(2)), String.valueOf(rs.getLong(3)),
                                rs.getBigDecimal(4) == null ? "—" : rs.getBigDecimal(4).toPlainString())).list();
                long total = linhas.stream().mapToLong(l -> Long.parseLong(l.get(1))).sum();
                long cancel = linhas.stream().mapToLong(l -> Long.parseLong(l.get(2))).sum();
                yield new Tabela(List.of("Pedidos: " + total, "Cancelados/recusados: " + cancel + (total > 0 ? " (" + Math.round(100.0 * cancel / total) + "%)" : "")),
                        List.of("Dia", "Pedidos", "Cancelados", "Preparo médio (min)"), linhas);
            }
        };
    }

    // ---------- geração de arquivos ----------

    static byte[] csv(List<String> cabecalho, List<List<String>> linhas) {
        var sb = new StringBuilder("﻿");
        sb.append(String.join(";", cabecalho.stream().map(GestaoRestauranteService::celula).toList())).append("\r\n");
        for (var l : linhas) sb.append(String.join(";", l.stream().map(GestaoRestauranteService::celula).toList())).append("\r\n");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String celula(String v) {
        var s = v == null ? "" : v;
        if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")) s = "'" + s;   // evita fórmula no Excel
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static byte[] pdf(String restaurante, String titulo, LocalDate ini, LocalDate fim, Tabela t) {
        return RelatorioRestaurantePdf.gerar(restaurante, titulo, ini, fim, t.resumo(), t.cabecalho(), t.linhas());
    }

    private static String br(BigDecimal v) {
        var f = NumberFormat.getNumberInstance(Locale.forLanguageTag("pt-BR"));
        f.setMinimumFractionDigits(2); f.setMaximumFractionDigits(2);
        return v == null ? "0,00" : f.format(v);
    }

    private static BigDecimal escala(BigDecimal v) { return v == null ? null : v.setScale(1, RoundingMode.HALF_UP); }
}
