package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.service.NotificacaoService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Chat do cliente com a nutricionista vinculada (botão "Conversar com a nutri" das telas 21, 24 e 25).
 * Usa as tabelas conversa/mensagem — o lado da nutri é a tela 33 (frente B). Dono: frente A.
 */
@Service
public class ConversaNutriService {

    public record NutriDto(String nome, String crn, String avatarUrl) {}
    public record MensagemDto(UUID id, boolean minha, String texto, OffsetDateTime criadoEm, OffsetDateTime lidaEm) {}
    public record ConversaDto(NutriDto nutricionista, List<MensagemDto> mensagens) {}

    private final JdbcClient jdbc;
    private final NotificacaoService notificacoes;

    public ConversaNutriService(JdbcClient jdbc, NotificacaoService notificacoes) {
        this.jdbc = jdbc; this.notificacoes = notificacoes;
    }

    /** Conversa com a nutri vinculada (vazia se ainda não houver mensagens). Marca como lidas as mensagens da nutri. */
    @Transactional
    public ConversaDto consultar(UUID idUsuario) {
        var nutri = nutriDoCliente(idUsuario);
        var idConversa = jdbc.sql("select id from conversa where id_cliente = :u and id_nutricionista = :n")
                .param("u", idUsuario).param("n", nutri.id()).query(UUID.class).optional().orElse(null);
        if (idConversa == null) return new ConversaDto(nutri.dto(), List.of());
        jdbc.sql("update mensagem set lida_em = now() where id_conversa = :c and id_autor <> :u and lida_em is null")
                .param("c", idConversa).param("u", idUsuario).update();
        var mensagens = jdbc.sql("""
                select id, id_autor, texto, criado_em, lida_em from mensagem where id_conversa = :c order by criado_em desc limit 100""")
                .param("c", idConversa)
                .query((rs, i) -> new MensagemDto(rs.getObject("id", UUID.class), idUsuario.equals(rs.getObject("id_autor", UUID.class)),
                        rs.getString("texto"), rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("lida_em", OffsetDateTime.class)))
                .list().reversed();
        return new ConversaDto(nutri.dto(), mensagens);
    }

    @Transactional
    public ConversaDto enviar(UUID idUsuario, String texto) {
        var t = texto == null ? "" : texto.trim();
        if (t.isEmpty()) throw new IllegalArgumentException("Escreva sua mensagem");
        if (t.length() > 4000) throw new IllegalArgumentException("A mensagem pode ter no máximo 4.000 caracteres");
        var nutri = nutriDoCliente(idUsuario);
        var idConversa = jdbc.sql("""
                insert into conversa (id_cliente, id_nutricionista) values (:u, :n)
                on conflict (id_cliente, id_nutricionista) do update set id_cliente = excluded.id_cliente returning id""")
                .param("u", idUsuario).param("n", nutri.id()).query(UUID.class).single();
        jdbc.sql("insert into mensagem (id_conversa, id_autor, texto) values (:c, :u, :t)").param("c", idConversa).param("u", idUsuario).param("t", t).update();
        var nomeCliente = jdbc.sql("select nome from usuario where id = :u").param("u", idUsuario).query(String.class).single();
        notificacoes.notificar(nutri.idUsuario(), TipoNotificacao.NUTRICIONISTA, "Nova mensagem de " + nomeCliente,
                t.length() > 120 ? t.substring(0, 117) + "…" : t, "/nutri/mensagens");
        return consultar(idUsuario);
    }

    private record Nutri(UUID id, UUID idUsuario, NutriDto dto) {}

    private Nutri nutriDoCliente(UUID idUsuario) {
        return jdbc.sql("""
                select n.id, n.id_usuario, u.nome, n.crn, u.avatar_url from perfil_cliente pc
                join nutricionista n on n.id = pc.id_nutricionista join usuario u on u.id = n.id_usuario
                where pc.id_usuario = :u""").param("u", idUsuario)
                .query((rs, i) -> new Nutri(rs.getObject("id", UUID.class), rs.getObject("id_usuario", UUID.class),
                        new NutriDto(rs.getString("nome"), rs.getString("crn"), rs.getString("avatar_url"))))
                .optional().orElseThrow(() -> new IllegalArgumentException("Você ainda não tem nutricionista. No plano Pro ou Premium uma nutri acompanha você."));
    }
}
