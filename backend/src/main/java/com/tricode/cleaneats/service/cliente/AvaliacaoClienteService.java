package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import com.tricode.cleaneats.service.SupabaseServicoClient;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Avaliar pedido (tela 20, CE-11): só pedido ENTREGUE do próprio cliente, uma avaliação por prato do pedido.
 * Nasce PENDENTE e só aparece na tela 12 depois da moderação no /admin/avaliacoes (frente C). Dono: frente A.
 */
@Service
public class AvaliacaoClienteService {

    /** Tags da tela 20 ("O que mais gostou?"). */
    public static final List<String> TAGS = List.of("Bem temperado", "Ingredientes frescos", "Macros corretos", "Boa apresentação",
            "Embalagem boa", "Entrega rápida", "Vale o preço", "Repetiria", "Recomendaria");

    public record ItemAvaliavel(UUID idMarmita, String nome, String imagemUrl, boolean avaliado) {}
    public record ContextoDto(UUID idPedido, String codigo, String status, OffsetDateTime entregueEm, String restaurante,
                              List<ItemAvaliavel> itens, List<String> tags) {}
    public record AvaliarReq(UUID idMarmita, Integer nota, Integer notaSabor, Integer notaApresentacao, Integer notaPorcao,
                             Integer notaEntrega, Integer notaTemperatura, List<String> tags, String comentario,
                             List<String> fotos, Boolean anonima) {}
    public record AvaliacaoCriada(UUID id, String statusModeracao) {}

    private final JdbcClient jdbc;
    private final NotificacaoService notificacoes;
    private final SupabaseServicoClient supabase;
    private final String prefixoFotos;

    public AvaliacaoClienteService(JdbcClient jdbc, NotificacaoService notificacoes, SupabaseServicoClient supabase,
                                   @org.springframework.beans.factory.annotation.Value("${cleaneats.supabase.url}") String url) {
        this.jdbc = jdbc; this.notificacoes = notificacoes; this.supabase = supabase;
        this.prefixoFotos = url.replaceAll("/$", "") + "/storage/v1/object/public/avaliacoes/";
    }

    public ContextoDto contexto(UUID idUsuario, UUID idPedido) {
        var pedido = jdbc.sql("""
                select p.id, p.codigo, p.status, p.entregue_em, r.nome from pedido p join restaurante r on r.id = p.id_restaurante
                where p.id = :p and p.id_usuario = :u""")
                .param("p", idPedido).param("u", idUsuario)
                .query((rs, i) -> new Object[]{rs.getString("codigo"), rs.getString("status"), rs.getObject("entregue_em", OffsetDateTime.class), rs.getString("nome")})
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));
        var itens = jdbc.sql("""
                select distinct on (i.id_marmita) i.id_marmita, i.nome, m.imagem_url,
                       exists(select 1 from avaliacao a where a.id_pedido = i.id_pedido and a.id_marmita = i.id_marmita) as avaliado
                from item_pedido i left join marmita m on m.id = i.id_marmita
                where i.id_pedido = :p and i.id_marmita is not null order by i.id_marmita""")
                .param("p", idPedido)
                .query((rs, i) -> new ItemAvaliavel(rs.getObject("id_marmita", UUID.class), rs.getString("nome"), rs.getString("imagem_url"), rs.getBoolean("avaliado")))
                .list();
        return new ContextoDto(idPedido, (String) pedido[0], (String) pedido[1], (OffsetDateTime) pedido[2], (String) pedido[3], itens, TAGS);
    }

    @Transactional
    public AvaliacaoCriada avaliar(UUID idUsuario, UUID idPedido, AvaliarReq r) {
        var ctx = contexto(idUsuario, idPedido);
        if (!"ENTREGUE".equals(ctx.status())) throw new IllegalArgumentException("Só dá pra avaliar depois que o pedido for entregue");
        var item = ctx.itens().stream().filter(x -> x.idMarmita().equals(r.idMarmita())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Esse prato não faz parte do pedido"));
        if (item.avaliado()) throw new IllegalArgumentException("Você já avaliou esse prato neste pedido");
        exigirNota(r.nota(), "Dê uma nota geral de 1 a 5", true);
        for (var n : new Integer[]{r.notaSabor(), r.notaApresentacao(), r.notaPorcao(), r.notaEntrega(), r.notaTemperatura()}) exigirNota(n, "Notas por critério vão de 1 a 5", false);
        var tags = r.tags() == null ? List.<String>of() : r.tags().stream().distinct().toList();
        if (!TAGS.containsAll(tags)) throw new IllegalArgumentException("Tag inválida");
        var comentario = r.comentario() == null || r.comentario().isBlank() ? null : r.comentario().trim();
        if (comentario != null && comentario.length() > 500) throw new IllegalArgumentException("O comentário pode ter no máximo 500 caracteres");
        var fotos = r.fotos() == null ? List.<String>of() : r.fotos();
        if (fotos.size() > 4) throw new IllegalArgumentException("Envie no máximo 4 fotos");
        if (fotos.stream().anyMatch(f -> !f.startsWith(prefixoFotos + idUsuario + "/"))) throw new IllegalArgumentException("Foto inválida");

        UUID id;
        try {
            id = jdbc.sql("""
                    insert into avaliacao (id_pedido, id_marmita, id_usuario, nota, nota_sabor, nota_apresentacao, nota_porcao, nota_entrega,
                                           nota_temperatura, comentario, tags, fotos, anonima)
                    values (:p, :m, :u, :nota, :sabor, :apres, :porcao, :entrega, :temp, :coment, cast(:tags as text[]), cast(:fotos as text[]), :anon)
                    returning id""")
                    .param("p", idPedido).param("m", r.idMarmita()).param("u", idUsuario).param("nota", r.nota())
                    .param("sabor", r.notaSabor()).param("apres", r.notaApresentacao()).param("porcao", r.notaPorcao())
                    .param("entrega", r.notaEntrega()).param("temp", r.notaTemperatura()).param("coment", comentario)
                    .param("tags", arrayPg(tags)).param("fotos", arrayPg(fotos)).param("anon", Boolean.TRUE.equals(r.anonima()))
                    .query(UUID.class).single();
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("Você já avaliou esse prato neste pedido");
        }
        var admins = jdbc.sql("select id from usuario where perfil = 'ADMIN' and anonimizado_em is null").query(UUID.class).list();
        for (var admin : admins) {
            notificacoes.notificar(admin, TipoNotificacao.SISTEMA, "Avaliação para moderar",
                    "Nota " + r.nota() + " para " + item.nome() + " (pedido " + ctx.codigo() + ").", "/admin/avaliacoes");
        }
        return new AvaliacaoCriada(id, "PENDENTE");
    }

    /** Foto da avaliação: vai para o bucket público avaliacoes/<usuário>/. */
    public String enviarFoto(UUID idUsuario, MultipartFile arquivo) {
        return supabase.enviarImagem("avaliacoes", idUsuario.toString(), arquivo);
    }

    private static void exigirNota(Integer n, String erro, boolean obrigatoria) {
        if (n == null) { if (obrigatoria) throw new IllegalArgumentException(erro); return; }
        if (n < 1 || n > 5) throw new IllegalArgumentException(erro);
    }

    /** Literal de array do Postgres: {"a","b"} com aspas escapadas. */
    static String arrayPg(List<String> valores) {
        var sb = new StringJoiner(",", "{", "}");
        for (var v : valores) sb.add("\"" + v.replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
        return sb.toString();
    }
}
