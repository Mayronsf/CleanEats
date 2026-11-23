package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.StatusPedido;
import com.tricode.cleaneats.repository.PedidoRepository;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Painel do restaurante — dashboard (tela 36) e fila de pedidos (tela 37, CE-14). As mudanças de status passam por
 * {@code Pedido.mudarStatus} (transições validadas); o histórico é gravado pela trigger do banco e o cliente vê na hora
 * (tela 18, Realtime) e recebe notificação. Dono: frente C.
 */
@Service
public class PainelPedidosService {

    public record RestauranteDto(UUID id, String nome, String sigla, String logoUrl, String statusAprovacao, String motivoRejeicao) {}
    public record ItemDto(String nome, int quantidade, String observacao) {}
    public record PedidoCard(UUID id, String codigo, String cliente, String status, BigDecimal total, OffsetDateTime criadoEm,
                             List<ItemDto> itens, String observacao, String motivoRecusa, String entregador, OffsetDateTime previsaoEntregaEm,
                             OffsetDateTime agendadoPara) {}
    public record Metricas(long pedidosMes, long pedidosMesAnterior, BigDecimal receitaMes, BigDecimal receitaMesAnterior,
                           BigDecimal notaMedia, long avaliacoesMes, Integer tempoPreparoMin, Integer tempoPreparoAnterior) {}
    public record ResumoDto(RestauranteDto restaurante, long emAndamento, long novosUltimos15Min, long novos, Metricas metricas, List<PedidoCard> recentes) {}
    public record FilaDto(List<PedidoCard> pedidos, Map<String, Long> contagens) {}
    public record MudarStatusReq(String acao, String motivo) {}

    /** Abas da tela 37 → status. "TODOS" = pedidos de hoje + qualquer pedido ainda em aberto. */
    static final Map<String, List<String>> ABAS = Map.of(
            "NOVOS", List.of("NOVO"),
            "PREPARANDO", List.of("ACEITO", "PREPARANDO"),
            "PRONTOS", List.of("PRONTO", "A_CAMINHO"),
            "ENTREGUES", List.of("ENTREGUE"),
            "ENCERRADOS", List.of("RECUSADO", "CANCELADO"));
    static final List<String> ABERTOS = List.of("NOVO", "ACEITO", "PREPARANDO", "PRONTO", "A_CAMINHO");
    private static final String[] ENTREGADORES = {"Ricardo Alves", "Juliana Matos", "Pedro Henrique", "Camila Rocha", "Diego Ferraz"};

    private final JdbcClient jdbc;
    private final PedidoRepository pedidos;
    private final NotificacaoService notificacoes;
    private final int segundosAteEntregar;

    public PainelPedidosService(JdbcClient jdbc, PedidoRepository pedidos, NotificacaoService notificacoes,
                                @Value("${cleaneats.entrega.segundos-ate-entregar:40}") int segundosAteEntregar) {
        this.jdbc = jdbc; this.pedidos = pedidos; this.notificacoes = notificacoes; this.segundosAteEntregar = segundosAteEntregar;
    }

    public RestauranteDto restaurante(UUID idUsuario) {
        return jdbc.sql("select id, nome, sigla, logo_url, status_aprovacao, motivo_rejeicao from restaurante where id_usuario = :u")
                .param("u", idUsuario)
                .query((rs, i) -> new RestauranteDto(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("sigla"),
                        rs.getString("logo_url"), rs.getString("status_aprovacao"), rs.getString("motivo_rejeicao")))
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("RESTAURANTE", "Esta conta ainda não tem restaurante cadastrado"));
    }

    public ResumoDto resumo(UUID idUsuario) {
        var r = restaurante(idUsuario);
        var contagem = jdbc.sql("""
                select count(*) filter (where status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO')) as andamento,
                       count(*) filter (where status = 'NOVO') as novos,
                       count(*) filter (where status = 'NOVO' and criado_em > now() - interval '15 min') as recentes
                from pedido where id_restaurante = :r""").param("r", r.id())
                .query((rs, i) -> new long[]{rs.getLong("andamento"), rs.getLong("novos"), rs.getLong("recentes")}).single();
        var m = jdbc.sql("""
                with base as (
                  select p.*, date_trunc('month', p.criado_em at time zone 'America/Recife') as mes
                  from pedido p where p.id_restaurante = :r and p.status not in ('CANCELADO','RECUSADO')
                ), meses as (select date_trunc('month', now() at time zone 'America/Recife') as atual)
                select count(*) filter (where mes = atual) as pedidos_mes,
                       count(*) filter (where mes = atual - interval '1 month') as pedidos_ant,
                       coalesce(sum(subtotal - desconto) filter (where mes = atual), 0) as receita_mes,
                       coalesce(sum(subtotal - desconto) filter (where mes = atual - interval '1 month'), 0) as receita_ant
                from base, meses""").param("r", r.id())
                .query((rs, i) -> new Object[]{rs.getLong(1), rs.getLong(2), rs.getBigDecimal(3), rs.getBigDecimal(4)}).single();
        var nota = jdbc.sql("""
                select r.nota_media,
                       (select count(*) from avaliacao a join pedido p on p.id = a.id_pedido where p.id_restaurante = r.id
                          and a.status_moderacao = 'PUBLICADA' and a.data_avaliacao >= date_trunc('month', now())) as mes
                from restaurante r where r.id = :r""").param("r", r.id())
                .query((rs, i) -> new Object[]{rs.getBigDecimal(1), rs.getLong(2)}).single();
        var preparo = jdbc.sql("""
                with t as (
                  select date_trunc('month', a.em at time zone 'America/Recife') as mes, extract(epoch from (p2.em - a.em)) / 60 as minutos
                  from historico_status_pedido a join historico_status_pedido p2 on p2.id_pedido = a.id_pedido and p2.status = 'PRONTO'
                  join pedido p on p.id = a.id_pedido
                  where a.status = 'ACEITO' and p.id_restaurante = :r and p2.em > a.em)
                select round(avg(minutos) filter (where mes = date_trunc('month', now() at time zone 'America/Recife')))::int,
                       round(avg(minutos) filter (where mes = date_trunc('month', now() at time zone 'America/Recife') - interval '1 month'))::int
                from t""").param("r", r.id())
                .query((rs, i) -> new Integer[]{(Integer) rs.getObject(1), (Integer) rs.getObject(2)}).single();
        var recentes = cards(r.id(), "p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO')", 4);
        return new ResumoDto(r, contagem[0], contagem[2], contagem[1],
                new Metricas((long) m[0], (long) m[1], (BigDecimal) m[2], (BigDecimal) m[3], (BigDecimal) nota[0], (long) nota[1], preparo[0], preparo[1]),
                recentes);
    }

    public FilaDto fila(UUID idUsuario, String aba) {
        var r = restaurante(idUsuario);
        var base = "(p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO') or (p.criado_em at time zone 'America/Recife')::date = (now() at time zone 'America/Recife')::date)";
        var lista = cards(r.id(), base, 200);
        var contagens = new LinkedHashMap<String, Long>();
        contagens.put("TODOS", (long) lista.size());
        for (var e : List.of("NOVOS", "PREPARANDO", "PRONTOS", "ENTREGUES", "ENCERRADOS")) {
            contagens.put(e, lista.stream().filter(p -> ABAS.get(e).contains(p.status())).count());
        }
        var filtrada = aba == null || aba.isBlank() || "TODOS".equalsIgnoreCase(aba) ? lista
                : lista.stream().filter(p -> ABAS.getOrDefault(aba.toUpperCase(), List.of()).contains(p.status())).toList();
        return new FilaDto(filtrada, contagens);
    }

    /**
     * Ações da tela 37: ACEITAR (NOVO → ACEITO → PREPARANDO), RECUSAR (motivo obrigatório), PRONTO (PREPARANDO → PRONTO),
     * RETIRADA (PRONTO → A_CAMINHO com entregador simulado; o job conclui a entrega).
     */
    @Transactional
    public PedidoCard mudarStatus(UUID idUsuario, UUID idPedido, MudarStatusReq req) {
        var r = restaurante(idUsuario);
        var pedido = pedidos.findById(idPedido).filter(p -> p.getIdRestaurante().equals(r.id()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));
        var acao = req == null || req.acao() == null ? "" : req.acao().toUpperCase(Locale.ROOT);
        String titulo, corpo;
        switch (acao) {
            case "ACEITAR" -> {
                pedido.mudarStatus(StatusPedido.ACEITO);
                pedidos.saveAndFlush(pedido);
                pedido.mudarStatus(StatusPedido.PREPARANDO);
                titulo = "Pedido aceito"; corpo = r.nome() + " aceitou seu pedido e já está preparando.";
            }
            case "RECUSAR" -> {
                var motivo = req.motivo() == null ? "" : req.motivo().trim();
                if (motivo.length() < 5) throw new IllegalArgumentException("Informe o motivo da recusa (o cliente vê essa mensagem)");
                if (motivo.length() > 300) throw new IllegalArgumentException("O motivo pode ter no máximo 300 caracteres");
                pedido.mudarStatus(StatusPedido.RECUSADO);
                pedido.setMotivoRecusa(motivo);
                estornarConsumo(idPedido);
                titulo = "Pedido recusado"; corpo = r.nome() + " não pôde aceitar seu pedido: " + motivo + ". Nenhum valor foi cobrado.";
            }
            case "PRONTO" -> {
                pedido.mudarStatus(StatusPedido.PRONTO);
                titulo = "Pedido pronto"; corpo = "Seu pedido está pronto e aguardando o entregador.";
            }
            case "RETIRADA" -> {
                pedido.mudarStatus(StatusPedido.A_CAMINHO);
                pedido.setEntregadorNome(entregador(idPedido));
                pedido.setPrevisaoEntregaEm(OffsetDateTime.now().plusSeconds(segundosAteEntregar));
                titulo = "Pedido a caminho"; corpo = pedido.getEntregadorNome() + " saiu com seu pedido.";
            }
            default -> throw new IllegalArgumentException("Ação inválida");
        }
        pedidos.saveAndFlush(pedido);
        var codigo = jdbc.sql("select codigo from pedido where id = :p").param("p", idPedido).query(String.class).single();
        notificacoes.notificar(pedido.getIdUsuario(), TipoNotificacao.PEDIDO, titulo + " · " + codigo, corpo, "/app/pedidos/" + idPedido);
        return cards(r.id(), "p.id = '" + idPedido + "'", 1).get(0);
    }

    static String entregador(UUID idPedido) {
        return ENTREGADORES[Math.floorMod(idPedido.hashCode(), ENTREGADORES.length)] + " (entregador simulado)";
    }

    /** Pedido recusado não conta no consumo do dia do cliente (soma feita na confirmação, tela 17). */
    private void estornarConsumo(UUID idPedido) {
        jdbc.sql("""
                update consumo_diario c set
                  calorias = greatest(c.calorias - x.kcal, 0), proteinas = greatest(c.proteinas - x.p, 0),
                  carboidratos = greatest(c.carboidratos - x.c, 0), gorduras = greatest(c.gorduras - x.g, 0)
                from (select p.id_usuario, (coalesce(p.agendado_para, p.confirmado_em, p.criado_em) at time zone 'America/Recife')::date as dia,
                             sum(i.calorias * i.quantidade) kcal, sum(i.proteinas * i.quantidade) p, sum(i.carboidratos * i.quantidade) c,
                             sum(i.gorduras * i.quantidade) g
                      from pedido p join item_pedido i on i.id_pedido = p.id where p.id = :p group by p.id) x
                where c.id_usuario = x.id_usuario and c.data = x.dia""").param("p", idPedido).update();
    }

    private List<PedidoCard> cards(UUID idRestaurante, String filtro, int limite) {
        var linhas = jdbc.sql("""
                select p.id, p.codigo, u.nome as cliente, p.status, p.total, p.criado_em, p.observacao, p.motivo_recusa,
                       p.entregador_nome, p.previsao_entrega_em, p.agendado_para
                from pedido p join usuario u on u.id = p.id_usuario
                where p.id_restaurante = :r and %s
                order by case p.status when 'NOVO' then 0 when 'ACEITO' then 1 when 'PREPARANDO' then 1 when 'PRONTO' then 2 when 'A_CAMINHO' then 3 else 4 end,
                         p.criado_em desc limit %d""".formatted(filtro, limite))
                .param("r", idRestaurante)
                .query((rs, i) -> new Object[]{rs.getObject("id", UUID.class), rs.getString("codigo"), rs.getString("cliente"), rs.getString("status"),
                        rs.getBigDecimal("total"), rs.getObject("criado_em", OffsetDateTime.class), rs.getString("observacao"), rs.getString("motivo_recusa"),
                        rs.getString("entregador_nome"), rs.getObject("previsao_entrega_em", OffsetDateTime.class), rs.getObject("agendado_para", OffsetDateTime.class)})
                .list();
        if (linhas.isEmpty()) return List.of();
        var ids = linhas.stream().map(l -> (UUID) l[0]).toList();
        var itens = new HashMap<UUID, List<ItemDto>>();
        jdbc.sql("select id_pedido, nome, quantidade, personalizacao ->> 'observacao' as obs from item_pedido where id_pedido in (:ids) order by nome")
                .param("ids", ids)
                .query((rs, i) -> Map.entry(rs.getObject("id_pedido", UUID.class), new ItemDto(rs.getString("nome"), rs.getInt("quantidade"), rs.getString("obs"))))
                .list().forEach(e -> itens.computeIfAbsent(e.getKey(), k -> new ArrayList<>()).add(e.getValue()));
        return linhas.stream().map(l -> new PedidoCard((UUID) l[0], (String) l[1], (String) l[2], (String) l[3], (BigDecimal) l[4],
                (OffsetDateTime) l[5], itens.getOrDefault((UUID) l[0], List.of()), (String) l[6], (String) l[7], (String) l[8],
                (OffsetDateTime) l[9], (OffsetDateTime) l[10])).toList();
    }
}
