package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.*;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

/**
 * Catálogo do marketplace (CE-4, CE-6, CE-10): só pratos APROVADOS de restaurantes públicos (CE-5).
 * Para cliente logado: restrições escondem pratos incompatíveis e o objetivo prioriza a ordenação.
 * Dono: frente A.
 */
@Service
public class CatalogoService {

    /** Filtros da tela 11 (todos opcionais). */
    public record Filtros(String busca, List<String> categorias, Integer proteinaMin, Integer caloriasMax,
                          BigDecimal precoMin, BigDecimal precoMax, UUID idRestaurante, BigDecimal notaMin,
                          String objetivo, String ordenar, boolean somenteFavoritos, boolean respeitarRestricoes) {}

    private static final String SELECT_PRATO = """
            select m.id, m.nome, m.descricao, m.categoria, m.imagem_url, m.preco, m.porcao_g, m.calorias, m.proteinas,
                   m.carboidratos, m.gorduras, m.fibras, m.nota_media, m.total_avaliacoes, m.aprovado_por_nutri, m.objetivos,
                   r.id as r_id, r.nome as r_nome, r.sigla as r_sigla, r.tempo_entrega_min, r.tempo_entrega_max, r.taxa_entrega,
                   %s as favorito, %s as do_objetivo
            from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante
            """;

    private final JdbcClient jdbc;

    public CatalogoService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public PaginaDto<PratoDto> listar(Filtros f, UUID idUsuario, int pagina, int tamanho) {
        var params = new HashMap<String, Object>();
        var where = new StringBuilder(" where m.status_prato = 'APROVADO'");
        String objetivo = f.objetivo();
        if (idUsuario != null) {
            params.put("u", idUsuario);
            if (objetivo == null) {
                objetivo = jdbc.sql("select objetivo_nutricional from perfil_cliente where id_usuario = :u")
                        .param("u", idUsuario).query(String.class).optional().orElse(null);
            }
            if (f.respeitarRestricoes()) {
                // CE-10: só pratos compatíveis com TODAS as restrições do cliente
                where.append(" and not exists (select 1 from cliente_restricao cr where cr.id_usuario = :u and not exists ("
                        + "select 1 from marmita_compatibilidade mc where mc.id_marmita = m.id and mc.id_restricao = cr.id_restricao))");
            }
            if (f.somenteFavoritos()) where.append(" and exists (select 1 from favorito fv where fv.id_usuario = :u and fv.id_marmita = m.id)");
        }
        if (f.busca() != null && !f.busca().isBlank()) {
            where.append(" and (m.nome ilike :busca or m.descricao ilike :busca or m.categoria ilike :busca or r.nome ilike :busca)");
            params.put("busca", "%" + f.busca().trim() + "%");
        }
        if (f.categorias() != null && !f.categorias().isEmpty()) {
            where.append(" and m.categoria in (:categorias)");
            params.put("categorias", f.categorias());
        }
        if (f.proteinaMin() != null) { where.append(" and m.proteinas >= :protMin"); params.put("protMin", f.proteinaMin()); }
        if (f.caloriasMax() != null) { where.append(" and m.calorias <= :kcalMax"); params.put("kcalMax", f.caloriasMax()); }
        if (f.precoMin() != null) { where.append(" and m.preco >= :precoMin"); params.put("precoMin", f.precoMin()); }
        if (f.precoMax() != null) { where.append(" and m.preco <= :precoMax"); params.put("precoMax", f.precoMax()); }
        if (f.idRestaurante() != null) { where.append(" and m.id_restaurante = :rest"); params.put("rest", f.idRestaurante()); }
        if (f.notaMin() != null) { where.append(" and m.nota_media >= :notaMin"); params.put("notaMin", f.notaMin()); }

        String doObjetivo = "false";
        if (objetivo != null) { doObjetivo = "(:objetivo = any(m.objetivos))"; params.put("objetivo", objetivo); }
        String favorito = idUsuario != null ? "exists (select 1 from favorito fv where fv.id_usuario = :u and fv.id_marmita = m.id)" : "false";

        String ordem = switch (f.ordenar() == null ? "" : f.ordenar()) {
            case "preco_asc" -> "m.preco asc";
            case "preco_desc" -> "m.preco desc";
            case "proteina" -> "m.proteinas desc";
            case "calorias" -> "m.calorias asc";
            case "nota" -> "m.nota_media desc, m.total_avaliacoes desc";
            default -> "m.total_avaliacoes desc";   // relevância
        };
        // CE-4: o objetivo do cliente prioriza (pratos do objetivo primeiro), sem esconder os demais
        String orderBy = " order by " + (objetivo != null ? "(:objetivo = any(m.objetivos)) desc, " : "") + ordem + ", m.nome, m.id";

        long total = jdbc.sql("select count(*) from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante" + where)
                .params(params).query(Long.class).single();
        int tam = Math.max(1, Math.min(tamanho, 48));
        params.put("lim", tam);
        params.put("off", pagina * tam);
        var itens = jdbc.sql(SELECT_PRATO.formatted(favorito, doObjetivo) + where + orderBy + " limit :lim offset :off")
                .params(params).query((rs, n) -> prato(rs)).list();
        return new PaginaDto<>(itens, pagina, (int) Math.ceil(total / (double) tam), total);
    }

    /** Categorias com contagem (chips da tela 11), já respeitando as restrições do cliente. */
    public List<CategoriaDto> categorias(UUID idUsuario) {
        String filtro = idUsuario == null ? "" : " and not exists (select 1 from cliente_restricao cr where cr.id_usuario = :u and not exists ("
                + "select 1 from marmita_compatibilidade mc where mc.id_marmita = m.id and mc.id_restricao = cr.id_restricao))";
        var q = jdbc.sql("select m.categoria, count(*) as total from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante "
                + "where m.status_prato = 'APROVADO'" + filtro + " group by m.categoria order by count(*) desc, m.categoria");
        if (idUsuario != null) q = q.param("u", idUsuario);
        return q.query((rs, n) -> new CategoriaDto(rs.getString("categoria"), rs.getLong("total"))).list();
    }

    public PratoDetalheDto detalhe(UUID id, UUID idUsuario) {
        var params = new HashMap<String, Object>();
        params.put("id", id);
        String favorito = "false";
        String doObjetivo = "false";
        if (idUsuario != null) {
            params.put("u", idUsuario);
            favorito = "exists (select 1 from favorito fv where fv.id_usuario = :u and fv.id_marmita = m.id)";
            doObjetivo = "coalesce((select pc.objetivo_nutricional = any(m.objetivos) from perfil_cliente pc where pc.id_usuario = :u), false)";
        }
        var prato = jdbc.sql(SELECT_PRATO.formatted(favorito, doObjetivo) + " where m.id = :id and m.status_prato = 'APROVADO'")
                .params(params).query((rs, n) -> prato(rs)).optional()
                .orElseThrow(() -> new RecursoNaoEncontradoException("MARMITA", "Prato não encontrado ou indisponível"));
        Integer sodio = jdbc.sql("select sodio_mg from marmita where id = :id").param("id", id).query(Integer.class).optional().orElse(null);
        var ingredientes = jdbc.sql("select nome, quantidade, preparo from ingrediente_marmita where id_marmita = :id order by ordem, nome")
                .param("id", id).query((rs, n) -> new IngredienteDto(rs.getString("nome"), rs.getString("quantidade"), rs.getString("preparo"))).list();
        var compativel = jdbc.sql("""
                select ra.nome from marmita_compatibilidade mc join restricao_alimentar ra on ra.id = mc.id_restricao
                where mc.id_marmita = :id order by ra.id""").param("id", id).query(String.class).list();
        var avaliacoes = jdbc.sql("""
                select a.id, u.nome, a.nota, a.comentario, a.tags, a.data_avaliacao
                from avaliacao a join usuario u on u.id = a.id_usuario
                where a.id_marmita = :id and a.status_moderacao = 'PUBLICADA'
                order by a.data_avaliacao desc limit 10""").param("id", id)
                .query((rs, n) -> new AvaliacaoPublicaDto(rs.getObject("id", UUID.class), abreviar(rs.getString("nome")), rs.getInt("nota"),
                        rs.getString("comentario"), textos(rs.getArray("tags")), rs.getObject("data_avaliacao", java.time.OffsetDateTime.class)))
                .list();
        var filtros = new Filtros(null, List.of(prato.categoria()), null, null, null, null, null, null, null, "nota", false, idUsuario != null);
        var similares = listar(filtros, idUsuario, 0, 5).itens().stream().filter(p -> !p.id().equals(id)).limit(4).toList();
        return new PratoDetalheDto(prato, sodio, ingredientes, compativel, avaliacoes, similares);
    }

    @Transactional
    public void favoritar(UUID idUsuario, UUID idMarmita) {
        int existe = jdbc.sql("select count(*) from marmita where id = :id and status_prato = 'APROVADO'").param("id", idMarmita).query(Integer.class).single();
        if (existe == 0) throw new RecursoNaoEncontradoException("MARMITA", "Prato não encontrado");
        jdbc.sql("insert into favorito (id_usuario, id_marmita) values (:u, :m) on conflict do nothing")
                .param("u", idUsuario).param("m", idMarmita).update();
    }

    @Transactional
    public void desfavoritar(UUID idUsuario, UUID idMarmita) {
        jdbc.sql("delete from favorito where id_usuario = :u and id_marmita = :m").param("u", idUsuario).param("m", idMarmita).update();
    }

    public List<UUID> idsFavoritos(UUID idUsuario) {
        return jdbc.sql("select id_marmita from favorito where id_usuario = :u order by criado_em desc").param("u", idUsuario).query(UUID.class).list();
    }

    static PratoDto prato(ResultSet rs) throws SQLException {
        return new PratoDto(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("descricao"), rs.getString("categoria"),
                rs.getString("imagem_url"), rs.getBigDecimal("preco"), (Integer) rs.getObject("porcao_g"),
                new MacrosDto((Integer) rs.getObject("calorias"), rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"),
                        rs.getBigDecimal("gorduras"), rs.getBigDecimal("fibras")),
                rs.getBigDecimal("nota_media"), rs.getInt("total_avaliacoes"), rs.getBoolean("aprovado_por_nutri"), textos(rs.getArray("objetivos")),
                new RestauranteMiniDto(rs.getObject("r_id", UUID.class), rs.getString("r_nome"), rs.getString("r_sigla"),
                        (Integer) rs.getObject("tempo_entrega_min"), (Integer) rs.getObject("tempo_entrega_max"), rs.getBigDecimal("taxa_entrega")),
                rs.getBoolean("favorito"), rs.getBoolean("do_objetivo"));
    }

    static List<String> textos(Array a) throws SQLException {
        return a == null ? List.of() : Arrays.asList((String[]) a.getArray());
    }

    /** "Marina Souza" → "Marina S." (privacidade nas avaliações públicas). */
    static String abreviar(String nome) {
        if (nome == null || nome.isBlank()) return "Cliente";
        var partes = nome.trim().split("\\s+");
        return partes.length == 1 ? partes[0] : partes[0] + " " + partes[partes.length - 1].charAt(0) + ".";
    }
}
