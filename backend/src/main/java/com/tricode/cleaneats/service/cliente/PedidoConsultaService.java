package com.tricode.cleaneats.service.cliente;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.ConsumoDiario;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.StatusPedido;
import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.PratoDto;
import com.tricode.cleaneats.repository.ConsumoDiarioRepository;
import com.tricode.cleaneats.repository.PedidoRepository;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

/** Pedidos do cliente: detalhe + timeline (telas 17/18), cancelamento, histórico (19) e "pedir novamente". Dono: frente A. */
@Service
public class PedidoConsultaService {

    public record ItemDto(UUID idMarmita, String nome, int quantidade, BigDecimal precoUnitario, int calorias, BigDecimal proteinas,
                          BigDecimal carboidratos, BigDecimal gorduras, String imagemUrl, String observacao) {}
    public record EventoDto(String status, OffsetDateTime em) {}
    public record EnderecoResumo(String apelido, String logradouro, String numero, String complemento, String bairro, String cidade, String uf) {}
    public record RestauranteResumo(UUID id, String nome, String sigla, String telefone, int tempoEntregaMin, int tempoEntregaMax) {}
    public record PedidoDetalhe(UUID id, String codigo, String status, OffsetDateTime criadoEm, OffsetDateTime agendadoPara,
                                OffsetDateTime previsaoEntregaEm, OffsetDateTime entregueEm, String entregadorNome, String formaPagamento,
                                BigDecimal subtotal, BigDecimal desconto, BigDecimal taxaEntrega, BigDecimal total, String cupom,
                                String observacao, String motivoRecusa, boolean avaliado, boolean podeCancelar,
                                int calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras,
                                RestauranteResumo restaurante, EnderecoResumo endereco, List<ItemDto> itens, List<EventoDto> historico) {}

    public record PedidoResumo(UUID id, String codigo, String status, OffsetDateTime criadoEm, UUID idRestaurante, String restaurante,
                               String sigla, String itens, int quantidadeItens, int calorias, BigDecimal proteinas, BigDecimal carboidratos,
                               BigDecimal total, boolean avaliado, Integer notaDada, String motivo, List<String> imagens) {}
    public record MesDto(String mes, long pedidos, BigDecimal total) {}
    public record ResumoHistorico(long total, long esteMes, BigDecimal gastoTotal, BigDecimal gastoMes, long kcalTotal,
                                  BigDecimal notaMedia, long avaliacoesDadas, long andamento, long entregues, long cancelados,
                                  List<MesDto> meses) {}
    public record ItemRepetir(PratoDto prato, int quantidade, String observacao) {}
    public record Repetir(List<ItemRepetir> itens, List<String> indisponiveis) {}

    private static final Set<String> CANCELAVEIS = Set.of("NOVO", "ACEITO", "PREPARANDO");

    private final JdbcClient jdbc;
    private final PedidoRepository pedidos;
    private final ConsumoDiarioRepository consumos;
    private final NotificacaoService notificacoes;
    private final ObjectMapper json;

    public PedidoConsultaService(JdbcClient jdbc, PedidoRepository pedidos, ConsumoDiarioRepository consumos,
                                 NotificacaoService notificacoes, ObjectMapper json) {
        this.jdbc = jdbc; this.pedidos = pedidos; this.consumos = consumos; this.notificacoes = notificacoes; this.json = json;
    }

    public PedidoDetalhe detalhe(UUID idUsuario, UUID idPedido) {
        record Cab(UUID id, String codigo, String status, OffsetDateTime criado, OffsetDateTime agendado, OffsetDateTime previsao,
                   OffsetDateTime entregue, String entregador, String forma, BigDecimal subtotal, BigDecimal desconto, BigDecimal taxa,
                   BigDecimal total, String cupom, String obs, String motivo, boolean avaliado, RestauranteResumo rest, EnderecoResumo end) {}
        var c = jdbc.sql("""
                select p.*, cu.codigo as cupom_codigo,
                       exists (select 1 from avaliacao a where a.id_pedido = p.id) as avaliado,
                       r.nome as r_nome, r.sigla, r.telefone, r.tempo_entrega_min, r.tempo_entrega_max,
                       e.apelido, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf
                from pedido p join restaurante r on r.id = p.id_restaurante
                left join endereco e on e.id = p.id_endereco left join cupom cu on cu.id = p.id_cupom
                where p.id = :id and p.id_usuario = :u""")
                .param("id", idPedido).param("u", idUsuario)
                .query((rs, n) -> new Cab(rs.getObject("id", UUID.class), rs.getString("codigo"), rs.getString("status"),
                        rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("agendado_para", OffsetDateTime.class),
                        rs.getObject("previsao_entrega_em", OffsetDateTime.class), rs.getObject("entregue_em", OffsetDateTime.class),
                        rs.getString("entregador_nome"), rs.getString("forma_pagamento"), rs.getBigDecimal("subtotal"), rs.getBigDecimal("desconto"),
                        rs.getBigDecimal("taxa_entrega"), rs.getBigDecimal("total"), rs.getString("cupom_codigo"), rs.getString("observacao"),
                        rs.getString("motivo_recusa"), rs.getBoolean("avaliado"),
                        new RestauranteResumo(rs.getObject("id_restaurante", UUID.class), rs.getString("r_nome"), rs.getString("sigla"),
                                rs.getString("telefone"), rs.getInt("tempo_entrega_min"), rs.getInt("tempo_entrega_max")),
                        rs.getString("logradouro") == null ? null : new EnderecoResumo(rs.getString("apelido"), rs.getString("logradouro"),
                                rs.getString("numero"), rs.getString("complemento"), rs.getString("bairro"), rs.getString("cidade"), rs.getString("uf"))))
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));
        var itens = jdbc.sql("""
                select i.id_marmita, i.nome, i.quantidade, i.preco_unitario, i.calorias, i.proteinas, i.carboidratos, i.gorduras,
                       m.imagem_url, i.personalizacao ->> 'observacao' as observacao
                from item_pedido i left join marmita m on m.id = i.id_marmita where i.id_pedido = :id order by i.nome""")
                .param("id", idPedido)
                .query((rs, n) -> new ItemDto(rs.getObject("id_marmita", UUID.class), rs.getString("nome"), rs.getInt("quantidade"),
                        rs.getBigDecimal("preco_unitario"), rs.getInt("calorias"), rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"),
                        rs.getBigDecimal("gorduras"), rs.getString("imagem_url"), rs.getString("observacao")))
                .list();
        var historico = jdbc.sql("select status, em from historico_status_pedido where id_pedido = :id order by em, id")
                .param("id", idPedido).query((rs, n) -> new EventoDto(rs.getString("status"), rs.getObject("em", OffsetDateTime.class))).list();
        int kcal = itens.stream().mapToInt(i -> i.calorias() * i.quantidade()).sum();
        return new PedidoDetalhe(c.id(), c.codigo(), c.status(), c.criado(), c.agendado(), c.previsao(), c.entregue(), c.entregador(), c.forma(),
                c.subtotal(), c.desconto(), c.taxa(), c.total(), c.cupom(), c.obs(), c.motivo(), c.avaliado(), CANCELAVEIS.contains(c.status()),
                kcal, soma(itens, ItemDto::proteinas), soma(itens, ItemDto::carboidratos), soma(itens, ItemDto::gorduras),
                c.rest(), c.end(), itens, historico);
    }

    private static BigDecimal soma(List<ItemDto> itens, java.util.function.Function<ItemDto, BigDecimal> f) {
        return itens.stream().map(i -> f.apply(i).multiply(BigDecimal.valueOf(i.quantidade()))).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Cancela (só NOVO, ACEITO ou PREPARANDO), devolve os macros do consumo do dia e avisa o restaurante. Reembolso SIMULADO. */
    @Transactional
    public PedidoDetalhe cancelar(UUID idUsuario, UUID idPedido, String motivo) {
        var pedido = pedidos.findById(idPedido).filter(p -> p.getIdUsuario().equals(idUsuario))
                .orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));
        if (!CANCELAVEIS.contains(pedido.getStatus().name())) {
            throw new IllegalArgumentException(pedido.getStatus() == StatusPedido.PRONTO || pedido.getStatus() == StatusPedido.A_CAMINHO
                    ? "O pedido já saiu da cozinha e não pode mais ser cancelado. Fale com o suporte."
                    : "Este pedido não pode ser cancelado.");
        }
        pedido.mudarStatus(StatusPedido.CANCELADO);
        pedido.setMotivoRecusa(motivo == null || motivo.isBlank() ? "Cancelado pelo cliente" : motivo.trim());
        LocalDate dia = (pedido.getAgendadoPara() != null ? pedido.getAgendadoPara() : pedido.getConfirmadoEm())
                .atZoneSameInstant(AcompanhamentoService.FUSO).toLocalDate();
        consumos.findByIdUsuarioAndData(idUsuario, dia).ifPresent(c -> subtrair(c, pedido));
        String codigo = jdbc.sql("select codigo from pedido where id = :id").param("id", idPedido).query(String.class).single();
        UUID dono = jdbc.sql("select id_usuario from restaurante where id = :r").param("r", pedido.getIdRestaurante()).query(UUID.class).single();
        notificacoes.notificar(dono, TipoNotificacao.PEDIDO, "Pedido " + codigo + " cancelado", "O cliente cancelou o pedido.", "/restaurante/pedidos");
        pedidos.flush();
        return detalhe(idUsuario, idPedido);
    }

    private void subtrair(ConsumoDiario c, com.tricode.cleaneats.domain.Pedido p) {
        int kcal = 0;
        BigDecimal pr = BigDecimal.ZERO, ca = BigDecimal.ZERO, go = BigDecimal.ZERO;
        for (var i : p.getItens()) {
            var q = BigDecimal.valueOf(i.getQuantidade());
            kcal += i.getCalorias() * i.getQuantidade();
            pr = pr.add(i.getProteinas().multiply(q)); ca = ca.add(i.getCarboidratos().multiply(q)); go = go.add(i.getGorduras().multiply(q));
        }
        jdbc.sql("""
                update consumo_diario set calorias = greatest(calorias - :k, 0), proteinas = greatest(proteinas - :p, 0),
                       carboidratos = greatest(carboidratos - :c, 0), gorduras = greatest(gorduras - :g, 0) where id = :id""")
                .param("k", kcal).param("p", pr).param("c", ca).param("g", go).param("id", c.getId()).update();
    }

    public PaginaDto<PedidoResumo> historico(UUID idUsuario, String status, String periodo, String ordenar, int pagina, int tamanho) {
        var params = new HashMap<String, Object>();
        params.put("u", idUsuario);
        var w = new StringBuilder(" where p.id_usuario = :u");
        switch (status == null ? "" : status) {
            case "andamento" -> w.append(" and p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO')");
            case "entregues" -> w.append(" and p.status = 'ENTREGUE'");
            case "cancelados" -> w.append(" and p.status in ('CANCELADO','RECUSADO')");
            default -> { }
        }
        switch (periodo == null ? "" : periodo) {
            case "7d" -> w.append(" and p.criado_em >= now() - interval '7 days'");
            case "30d" -> w.append(" and p.criado_em >= now() - interval '30 days'");
            case "mes" -> w.append(" and date_trunc('month', p.criado_em at time zone 'America/Recife') = date_trunc('month', now() at time zone 'America/Recife')");
            case "ano" -> w.append(" and date_trunc('year', p.criado_em at time zone 'America/Recife') = date_trunc('year', now() at time zone 'America/Recife')");
            default -> { }
        }
        String ordem = switch (ordenar == null ? "" : ordenar) {
            case "antigos" -> "p.criado_em asc";
            case "maior" -> "p.total desc, p.criado_em desc";
            case "menor" -> "p.total asc, p.criado_em desc";
            default -> "p.criado_em desc";
        };
        long total = jdbc.sql("select count(*) from pedido p" + w).params(params).query(Long.class).single();
        int tam = Math.max(1, Math.min(tamanho, 30));
        params.put("lim", tam);
        params.put("off", pagina * tam);
        var itens = jdbc.sql("""
                select p.id, p.codigo, p.status, p.criado_em, p.total, p.motivo_recusa, r.id as r_id, r.nome as r_nome, r.sigla,
                       exists (select 1 from avaliacao a where a.id_pedido = p.id) as avaliado,
                       (select max(a.nota) from avaliacao a where a.id_pedido = p.id) as nota_dada,
                       (select string_agg(case when i.quantidade > 1 then i.nome || ' (' || i.quantidade || 'x)' else i.nome end, ' + ' order by i.nome)
                          from item_pedido i where i.id_pedido = p.id) as itens,
                       (select coalesce(sum(i.quantidade), 0) from item_pedido i where i.id_pedido = p.id) as qtd,
                       (select coalesce(sum(i.calorias * i.quantidade), 0) from item_pedido i where i.id_pedido = p.id) as kcal,
                       (select coalesce(sum(i.proteinas * i.quantidade), 0) from item_pedido i where i.id_pedido = p.id) as prot,
                       (select coalesce(sum(i.carboidratos * i.quantidade), 0) from item_pedido i where i.id_pedido = p.id) as carb,
                       (select array_agg(m.imagem_url order by i.nome) from item_pedido i join marmita m on m.id = i.id_marmita where i.id_pedido = p.id and m.imagem_url is not null) as imagens
                from pedido p join restaurante r on r.id = p.id_restaurante""" + w + " order by " + ordem + " limit :lim offset :off")
                .params(params)
                .query((rs, n) -> new PedidoResumo(rs.getObject("id", UUID.class), rs.getString("codigo"), rs.getString("status"),
                        rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("r_id", UUID.class), rs.getString("r_nome"), rs.getString("sigla"),
                        rs.getString("itens"), rs.getInt("qtd"), rs.getInt("kcal"), rs.getBigDecimal("prot"), rs.getBigDecimal("carb"),
                        rs.getBigDecimal("total"), rs.getBoolean("avaliado"), (Integer) rs.getObject("nota_dada"), rs.getString("motivo_recusa"),
                        CatalogoService.textos(rs.getArray("imagens"))))
                .list();
        return new PaginaDto<>(itens, pagina, (int) Math.ceil(total / (double) tam), total);
    }

    public ResumoHistorico resumo(UUID idUsuario) {
        var meses = jdbc.sql("""
                select to_char(p.criado_em at time zone 'America/Recife', 'YYYY-MM') as mes, count(*) as n, sum(p.total) filter (where p.status not in ('CANCELADO','RECUSADO')) as t
                from pedido p where p.id_usuario = :u group by 1 order by 1 desc""").param("u", idUsuario)
                .query((rs, n) -> new MesDto(rs.getString("mes"), rs.getLong("n"), Optional.ofNullable(rs.getBigDecimal("t")).orElse(BigDecimal.ZERO))).list();
        return jdbc.sql("""
                select count(*) as total,
                       count(*) filter (where date_trunc('month', p.criado_em at time zone 'America/Recife') = date_trunc('month', now() at time zone 'America/Recife')) as mes,
                       coalesce(sum(p.total) filter (where p.status not in ('CANCELADO','RECUSADO')), 0) as gasto,
                       coalesce(sum(p.total) filter (where p.status not in ('CANCELADO','RECUSADO') and date_trunc('month', p.criado_em at time zone 'America/Recife') = date_trunc('month', now() at time zone 'America/Recife')), 0) as gasto_mes,
                       (select coalesce(sum(i.calorias * i.quantidade), 0) from item_pedido i join pedido x on x.id = i.id_pedido where x.id_usuario = :u and x.status = 'ENTREGUE') as kcal,
                       (select round(avg(a.nota), 1) from avaliacao a where a.id_usuario = :u) as nota,
                       (select count(*) from avaliacao a where a.id_usuario = :u) as avaliacoes,
                       count(*) filter (where p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO')) as andamento,
                       count(*) filter (where p.status = 'ENTREGUE') as entregues,
                       count(*) filter (where p.status in ('CANCELADO','RECUSADO')) as cancelados
                from pedido p where p.id_usuario = :u""").param("u", idUsuario)
                .query((rs, n) -> new ResumoHistorico(rs.getLong("total"), rs.getLong("mes"), rs.getBigDecimal("gasto"), rs.getBigDecimal("gasto_mes"),
                        rs.getLong("kcal"), rs.getBigDecimal("nota"), rs.getLong("avaliacoes"), rs.getLong("andamento"), rs.getLong("entregues"),
                        rs.getLong("cancelados"), meses))
                .single();
    }

    /** "Pedir novamente": devolve os pratos ainda disponíveis com as quantidades (o front monta o carrinho). */
    public Repetir repetir(UUID idUsuario, UUID idPedido) {
        var d = detalhe(idUsuario, idPedido);
        var itens = new ArrayList<ItemRepetir>();
        var indisponiveis = new ArrayList<String>();
        for (var i : d.itens()) {
            if (i.idMarmita() == null) { indisponiveis.add(i.nome()); continue; }
            var prato = jdbc.sql("""
                    select m.id, m.nome, m.descricao, m.categoria, m.imagem_url, m.preco, m.porcao_g, m.calorias, m.proteinas,
                           m.carboidratos, m.gorduras, m.fibras, m.nota_media, m.total_avaliacoes, m.aprovado_por_nutri, m.objetivos,
                           r.id as r_id, r.nome as r_nome, r.sigla as r_sigla, r.tempo_entrega_min, r.tempo_entrega_max, r.taxa_entrega,
                           false as favorito, false as do_objetivo
                    from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante
                    where m.id = :m and m.status_prato = 'APROVADO'""").param("m", i.idMarmita())
                    .query((rs, n) -> CatalogoService.prato(rs)).optional();
            if (prato.isPresent()) itens.add(new ItemRepetir(prato.get(), i.quantidade(), i.observacao()));
            else indisponiveis.add(i.nome());
        }
        return new Repetir(itens, indisponiveis);
    }
}
