package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Base comum da frente B: resolve a nutricionista do usuário logado e garante que um cliente é dela.
 * Todo service.nutri usa isto em vez de repetir a consulta. Dono: frente B.
 */
@Component
public class NutriContexto {

    /** Nutricionista logada. {@code id} é nutricionista.id; {@code idUsuario} é usuario.id (autor de mensagens, notificações). */
    public record NutriAtual(UUID id, UUID idUsuario, String nome, String avatarUrl, String crn, String crnUf, String statusAprovacao,
                             String motivoRejeicao, String assinaturaDigitalUrl) {
        public boolean aprovada() { return "APROVADO".equals(statusAprovacao); }
    }

    private final JdbcClient jdbc;

    public NutriContexto(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public NutriAtual atual(UUID idUsuario) {
        return jdbc.sql("""
                select n.id, n.id_usuario, u.nome, u.avatar_url, n.crn, n.crn_uf, n.status_aprovacao, n.motivo_rejeicao, n.assinatura_digital_url
                from nutricionista n join usuario u on u.id = n.id_usuario where n.id_usuario = :u""")
                .param("u", idUsuario)
                .query((rs, i) -> new NutriAtual(rs.getObject("id", UUID.class), rs.getObject("id_usuario", UUID.class), rs.getString("nome"),
                        rs.getString("avatar_url"), rs.getString("crn"), rs.getString("crn_uf"), rs.getString("status_aprovacao"),
                        rs.getString("motivo_rejeicao"), rs.getString("assinatura_digital_url")))
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("NUTRICIONISTA", "Esta conta ainda não tem cadastro de nutricionista"));
    }

    /** Lança 404 se o cliente não estiver vinculado a esta nutricionista (perfil_cliente.id_nutricionista). */
    public void exigirCliente(UUID idNutricionista, UUID idCliente) {
        boolean meu = jdbc.sql("select exists(select 1 from perfil_cliente where id_usuario = :c and id_nutricionista = :n)")
                .param("c", idCliente).param("n", idNutricionista).query(Boolean.class).single();
        if (!meu) throw new RecursoNaoEncontradoException("CLIENTE", "Cliente não encontrado entre os seus clientes");
    }
}
