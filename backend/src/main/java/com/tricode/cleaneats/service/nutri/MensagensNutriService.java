package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.service.NotificacaoService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Conversas entre a nutricionista e seus clientes (tela 33). */
@Service
public class MensagensNutriService {

    public record MensagemDto(UUID id, UUID idAutor, String texto, OffsetDateTime criadoEm, OffsetDateTime lidaEm) {}
    public record ConversaLinha(UUID idConversa, UUID idCliente, String nome, String avatarUrl, String tier,
                                String ultimaMensagem, OffsetDateTime ultimaMensagemEm, long naoLidas) {}
    public record ConversaDto(UUID idConversa, UUID idCliente, String nome, String avatarUrl, String tier,
                              List<MensagemDto> mensagens) {}

    private final JdbcClient jdbc;
    private final NutriContexto contexto;
    private final NotificacaoService notificacoes;

    public MensagensNutriService(JdbcClient jdbc, NutriContexto contexto, NotificacaoService notificacoes) {
        this.jdbc = jdbc;
        this.contexto = contexto;
        this.notificacoes = notificacoes;
    }

    public List<ConversaLinha> listar(UUID idUsuarioNutri, String busca) {
        var nutri = contexto.atual(idUsuarioNutri);
        var termo = busca == null ? "" : busca.trim();
        return jdbc.sql("""
                select c.id as id_conversa, c.id_cliente, u.nome, u.avatar_url, u.id_tier,
                       ult.texto as ultima_mensagem, ult.criado_em as ultima_mensagem_em,
                       (select count(*) from mensagem nao_lida
                         where nao_lida.id_conversa = c.id and nao_lida.id_autor = c.id_cliente and nao_lida.lida_em is null) as nao_lidas
                from conversa c
                join usuario u on u.id = c.id_cliente
                left join lateral (
                  select m.texto, m.criado_em from mensagem m where m.id_conversa = c.id
                  order by m.criado_em desc limit 1
                ) ult on true
                where c.id_nutricionista = :n and (:busca = '' or u.nome ilike '%' || :busca || '%')
                order by coalesce(ult.criado_em, c.criado_em) desc, u.nome
                """)
                .param("n", nutri.id()).param("busca", termo)
                .query((rs, i) -> new ConversaLinha(rs.getObject("id_conversa", UUID.class), rs.getObject("id_cliente", UUID.class),
                        rs.getString("nome"), rs.getString("avatar_url"), rs.getString("id_tier"), rs.getString("ultima_mensagem"),
                        rs.getObject("ultima_mensagem_em", OffsetDateTime.class), rs.getLong("nao_lidas")))
                .list();
    }

    /** Carrega as mensagens e marca como lidas apenas as que foram enviadas pelo cliente. */
    @Transactional
    public List<MensagemDto> mensagens(UUID idUsuarioNutri, UUID idConversa) {
        var nutri = contexto.atual(idUsuarioNutri);
        var cliente = clienteDaConversa(nutri.id(), idConversa);
        jdbc.sql("update mensagem set lida_em = now() where id_conversa = :c and id_autor = :cliente and lida_em is null")
                .param("c", idConversa).param("cliente", cliente).update();
        return jdbc.sql("""
                select id, id_autor, texto, criado_em, lida_em from mensagem
                where id_conversa = :c order by criado_em desc limit 100
                """).param("c", idConversa)
                .query((rs, i) -> new MensagemDto(rs.getObject("id", UUID.class), rs.getObject("id_autor", UUID.class),
                        rs.getString("texto"), rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("lida_em", OffsetDateTime.class)))
                .list().reversed();
    }

    @Transactional
    public MensagemDto enviar(UUID idUsuarioNutri, UUID idConversa, String texto) {
        var conteudo = validarTexto(texto);
        var nutri = contexto.atual(idUsuarioNutri);
        var idCliente = clienteDaConversa(nutri.id(), idConversa);
        var idMensagem = jdbc.sql("insert into mensagem (id_conversa, id_autor, texto) values (:c, :autor, :texto) returning id")
                .param("c", idConversa).param("autor", nutri.idUsuario()).param("texto", conteudo).query(UUID.class).single();
        notificacoes.notificar(idCliente, TipoNotificacao.NUTRICIONISTA, "Nova mensagem da sua nutricionista",
                conteudo.length() > 120 ? conteudo.substring(0, 117) + "…" : conteudo, "/app/nutribot?nutri=1");
        return jdbc.sql("select id, id_autor, texto, criado_em, lida_em from mensagem where id = :id").param("id", idMensagem)
                .query((rs, i) -> new MensagemDto(rs.getObject("id", UUID.class), rs.getObject("id_autor", UUID.class),
                        rs.getString("texto"), rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("lida_em", OffsetDateTime.class))).single();
    }

    @Transactional
    public ConversaDto abrirOuCriar(UUID idUsuarioNutri, UUID idCliente) {
        var nutri = contexto.atual(idUsuarioNutri);
        contexto.exigirCliente(nutri.id(), idCliente);
        var idConversa = jdbc.sql("""
                insert into conversa (id_cliente, id_nutricionista) values (:cliente, :nutri)
                on conflict (id_cliente, id_nutricionista) do update set id_cliente = excluded.id_cliente returning id
                """).param("cliente", idCliente).param("nutri", nutri.id()).query(UUID.class).single();
        var cliente = jdbc.sql("select nome, avatar_url, id_tier from usuario where id = :id").param("id", idCliente)
                .query((rs, i) -> new Object[]{rs.getString("nome"), rs.getString("avatar_url"), rs.getString("id_tier")}).single();
        return new ConversaDto(idConversa, idCliente, (String) cliente[0], (String) cliente[1], (String) cliente[2], List.of());
    }

    static String validarTexto(String texto) {
        var conteudo = texto == null ? "" : texto.trim();
        if (conteudo.isEmpty()) throw new IllegalArgumentException("Escreva sua mensagem");
        if (conteudo.length() > 4000) throw new IllegalArgumentException("A mensagem pode ter no máximo 4.000 caracteres");
        return conteudo;
    }

    static boolean mensagemNaoLidaDoCliente(UUID idAutor, UUID idCliente, OffsetDateTime lidaEm) {
        return idAutor != null && idAutor.equals(idCliente) && lidaEm == null;
    }

    private UUID clienteDaConversa(UUID idNutricionista, UUID idConversa) {
        return jdbc.sql("select id_cliente from conversa where id = :c and id_nutricionista = :n")
                .param("c", idConversa).param("n", idNutricionista).query(UUID.class).optional()
                .orElseThrow(() -> new com.tricode.cleaneats.service.RecursoNaoEncontradoException("CONVERSA", "Conversa não encontrada"));
    }
}
