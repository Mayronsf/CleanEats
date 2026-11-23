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

    /** Filtros da tela 11 (todos opcionais). Faixas no formato "min-max" ou "min-" (ex.: "25-40", "40-"). */
    public record Filtros(String busca, String selo, List<String> proteinaFaixas, List<String> caloriaFaixas,
                          BigDecimal precoMin, BigDecimal precoMax, List<UUID> restaurantes, BigDecimal notaMin,
                          String objetivo, String ordenar, boolean somenteFavoritos, boolean respeitarRestricoes) {
        public static Filtros vazio() {
            return new Filtros(null, null, null, null, null, null, null, null, null, null, false, true);
        }
    }

    public record Faixa(String faixa, long total) {}
    public record RestauranteFaceta(UUID id, String nome, long total) {}
    public record Facetas(long total, BigDecimal precoMin, BigDecimal precoMax, List<Faixa> calorias, List<Faixa> proteinas,
                          List<RestauranteFaceta> restaurantes, long nota45, long nota40) {}

    private static String compat(String slug) {
        return "exists (select 1 from marmita_compatibilidade mc join restricao_alimentar ra on ra.id = mc.id_restricao "
                + "where mc.id_marmita = m.id and ra.slug = '" + slug + "')";
    }

    /** Selos da barra de categorias da tela 11 (mistura macro e restrição, como no protótipo). */
    private static final Map<String, String> SELOS = Map.of(
            "alta-proteina", "m.proteinas >= 30",
            "vegano", compat("vegano"),
            "sem-gluten", compat("sem-gluten"),
            "low-carb", "(" + compat("low-carb") + " or m.carboidratos <= 20)",
            "sem-lactose", compat("sem-lactose"),
            "pescetariano", "(m.nome ~* '(salm[aã]o|til[aá]pia|peixe|atum|camar[aã]o)' or " + compat("vegetariano") + ")");

    private static final String SELECT_PRATO = """
            select m.id, m.nome, m.descricao, m.categoria, m.imagem_url, m.preco, m.porcao_g, m.calorias, m.proteinas,
                   m.carboidratos, m.gorduras, m.fibras, m.nota_media, m.total_avaliacoes, m.aprovado_por_nutri, m.objetivos,
                   r.id as r_id, r.nome as r_nome, r.sigla as r_sigla, r.tempo_entrega_min, r.tempo_entrega_max, r.taxa_entrega,
                   %s as favorito, %s as do_objetivo
            from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante
            """;

    private static final String FAVORITO = "exists (select 1 from favorito fv where fv.id_usuario = :u and fv.id_marmita = m.id)";

    private final JdbcClient jdbc;

    public CatalogoService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Monta o WHERE. Sem a lateral: só aprovados, restrições, favoritos, busca e selo (base das contagens). */
    private String where(Filtros f, UUID idUsuario, Map<String, Object> params, boolean comLateral) {
        var w = new StringBuilder(" where m.status_prato = 'APROVADO'");
        if (idUsuario != null) {
            params.put("u", idUsuario);
            if (f.respeitarRestricoes()) {
                // CE-10: só pratos compatíveis com TODAS as restrições do cliente
                w.append(" and not exists (select 1 from cliente_restricao cr where cr.id_usuario = :u and not exists (")
                 .append("select 1 from marmita_compatibilidade mc where mc.id_marmita = m.id and mc.id_restricao = cr.id_restricao))");
            }
            if (f.somenteFavoritos()) w.append(" and ").append(FAVORITO);
        }
        if (f.busca() != null && !f.busca().isBlank()) {
            w.append(" and (m.nome ilike :busca or m.descricao ilike :busca or m.categoria ilike :busca or r.nome ilike :busca)");
            params.put("busca", "%" + f.busca().trim() + "%");
        }
        if (f.selo() != null && SELOS.containsKey(f.selo())) w.append(" and ").append(SELOS.get(f.selo()));
        if (!comLateral) return w.toString();
        faixas(w, "m.proteinas", f.proteinaFaixas(), "pf", params);
        faixas(w, "m.calorias", f.caloriaFaixas(), "cf", params);
        if (f.precoMin() != null) { w.append(" and m.preco >= :precoMin"); params.put("precoMin", f.precoMin()); }
        if (f.precoMax() != null) { w.append(" and m.preco <= :precoMax"); params.put("precoMax", f.precoMax()); }
        if (f.restaurantes() != null && !f.restaurantes().isEmpty()) { w.append(" and m.id_restaurante in (:rests)"); params.put("rests", f.restaurantes()); }
        if (f.notaMin() != null) { w.append(" and m.nota_media >= :notaMin"); params.put("notaMin", f.notaMin()); }
        return w.toString();
    }

    /** "25-40" → coluna >= 25 and coluna < 40; "40-" → coluna >= 40. Várias faixas = OU. */
    private static void faixas(StringBuilder w, String coluna, List<String> lista, String prefixo, Map<String, Object> params) {
        if (lista == null || lista.isEmpty()) return;
        var ou = new ArrayList<String>();
        int i = 0;
        for (String fx : lista) {
            var partes = fx.split("-", -1);
            try {
                var min = new BigDecimal(partes[0].trim());
                String cond = coluna + " >= :" + prefixo + "min" + i;
                params.put(prefixo + "min" + i, min);
                if (partes.length > 1 && !partes[1].isBlank()) {
                    cond += " and " + coluna + " < :" + prefixo + "max" + i;
                    params.put(prefixo + "max" + i, new BigDecimal(partes[1].trim()));
                }
                ou.add("(" + cond + ")");
                i++;
            } catch (NumberFormatException ignorada) { /* faixa inválida: ignora */ }
        }
        if (!ou.isEmpty()) w.append(" and (").append(String.join(" or ", ou)).append(")");
    }

    public PaginaDto<PratoDto> listar(Filtros f, UUID idUsuario, int pagina, int tamanho) {
        var params = new HashMap<String, Object>();
        String where = where(f, idUsuario, params, true);
        String objetivo = f.objetivo();
        if (idUsuario != null && objetivo == null) {
            objetivo = jdbc.sql("select objetivo_nutricional from perfil_cliente where id_usuario = :u")
                    .param("u", idUsuario).query(String.class).optional().orElse(null);
        }
        String doObjetivo = "false";
        if (objetivo != null) { doObjetivo = "(:objetivo = any(m.objetivos))"; params.put("objetivo", objetivo); }
        String favorito = idUsuario != null ? FAVORITO : "false";

        boolean relevancia = f.ordenar() == null || f.ordenar().isBlank() || f.ordenar().equals("relevancia");
        String ordem = switch (relevancia ? "" : f.ordenar()) {
            case "preco_asc" -> "m.preco asc";
            case "preco_desc" -> "m.preco desc";
            case "proteina" -> "m.proteinas desc";
            case "calorias" -> "m.calorias asc";
            case "nota" -> "m.nota_media desc, m.total_avaliacoes desc";
            default -> "m.total_avaliacoes desc";
        };
        // CE-4: em "mais relevantes", o objetivo do cliente prioriza (pratos do objetivo primeiro), sem esconder os demais
        String orderBy = " order by " + (objetivo != null && relevancia ? "(:objetivo = any(m.objetivos)) desc, " : "") + ordem + ", m.nome, m.id";

        long total = jdbc.sql("select count(*) from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante" + where)
                .params(params).query(Long.class).single();
        int tam = Math.max(1, Math.min(tamanho, 48));
        params.put("lim", tam);
        params.put("off", pagina * tam);
        var itens = jdbc.sql(SELECT_PRATO.formatted(favorito, doObjetivo) + where + orderBy + " limit :lim offset :off")
                .params(params).query((rs, n) -> prato(rs)).list();
        return new PaginaDto<>(itens, pagina, (int) Math.ceil(total / (double) tam), total);
    }

    /** Contagens da lateral da tela 11, calculadas sobre a base (restrições, busca e selo). */
    public Facetas facetas(Filtros f, UUID idUsuario) {
        var params = new HashMap<String, Object>();
        String from = " from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante" + where(f, idUsuario, params, false);
        record Geral(long total, BigDecimal pmin, BigDecimal pmax, long n45, long n40) {}
        var g = jdbc.sql("select count(*) as total, min(m.preco) as pmin, max(m.preco) as pmax, "
                        + "count(*) filter (where m.nota_media >= 4.5) as n45, count(*) filter (where m.nota_media >= 4.0) as n40" + from)
                .params(params).query((rs, n) -> new Geral(rs.getLong("total"), rs.getBigDecimal("pmin"), rs.getBigDecimal("pmax"),
                        rs.getLong("n45"), rs.getLong("n40"))).single();
        var kcal = jdbc.sql("select count(*) filter (where m.calorias >= 250 and m.calorias < 400) as a, "
                        + "count(*) filter (where m.calorias >= 400 and m.calorias < 550) as b, count(*) filter (where m.calorias >= 550) as c" + from)
                .params(params).query((rs, n) -> List.of(new Faixa("250-400", rs.getLong("a")), new Faixa("400-550", rs.getLong("b")),
                        new Faixa("550-", rs.getLong("c")))).single();
        var prot = jdbc.sql("select count(*) filter (where m.proteinas >= 15 and m.proteinas < 25) as a, "
                        + "count(*) filter (where m.proteinas >= 25 and m.proteinas < 40) as b, count(*) filter (where m.proteinas >= 40) as c" + from)
                .params(params).query((rs, n) -> List.of(new Faixa("15-25", rs.getLong("a")), new Faixa("25-40", rs.getLong("b")),
                        new Faixa("40-", rs.getLong("c")))).single();
        var rests = jdbc.sql("select r.id, r.nome, count(*) as total" + from + " group by r.id, r.nome order by count(*) desc, r.nome")
                .params(params).query((rs, n) -> new RestauranteFaceta(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getLong("total")))
                .list();
        return new Facetas(g.total(), g.pmin(), g.pmax(), kcal, prot, rests, g.n45(), g.n40());
    }

    /** "Você também vai gostar" (tela 12): mesma categoria primeiro, depois os mais bem avaliados; um por nome. */
    private List<PratoDto> similares(PratoDto base, UUID idUsuario) {
        var params = new HashMap<String, Object>();
        String w = where(Filtros.vazio(), idUsuario, params, false) + " and m.id <> :id and m.nome <> :nome";
        params.put("cat", base.categoria());
        params.put("id", base.id());
        params.put("nome", base.nome());
        String sql = "select * from (select distinct on (x.nome) * from (" + SELECT_PRATO.formatted(idUsuario != null ? FAVORITO : "false", "false")
                + w + ") x order by x.nome, x.total_avaliacoes desc) y order by (y.categoria = :cat) desc, y.nota_media desc, y.total_avaliacoes desc limit 4";
        return jdbc.sql(sql).params(params).query((rs, n) -> prato(rs)).list();
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
                select a.id, u.nome, u.avatar_url, a.nota, a.comentario, a.tags, a.data_avaliacao, p.codigo
                from avaliacao a join usuario u on u.id = a.id_usuario join pedido p on p.id = a.id_pedido
                where a.id_marmita = :id and a.status_moderacao = 'PUBLICADA'
                order by a.data_avaliacao desc limit 6""").param("id", id)
                .query((rs, n) -> new AvaliacaoPublicaDto(rs.getObject("id", UUID.class), abreviar(rs.getString("nome")), rs.getString("avatar_url"),
                        rs.getInt("nota"), rs.getString("comentario"), textos(rs.getArray("tags")),
                        rs.getObject("data_avaliacao", java.time.OffsetDateTime.class), rs.getString("codigo")))
                .list();
        var restaurante = jdbc.sql("select cidade, nota_media, total_avaliacoes, logo_url from restaurante where id = :r")
                .param("r", prato.restaurante().id())
                .query((rs, n) -> new RestauranteDetalheDto(rs.getString("cidade"), rs.getBigDecimal("nota_media"), rs.getInt("total_avaliacoes"),
                        rs.getString("logo_url")))
                .single();
        return new PratoDetalheDto(prato, sodio, ingredientes, compativel, avaliacoes, similares(prato, idUsuario), restaurante);
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
