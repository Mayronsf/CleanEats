package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

/**
 * Catálogo da nutricionista (tela 31; CE-19): só pratos APROVADOS de restaurantes aprovados, com filtros de busca,
 * restaurante, categoria, proteína mínima e restrição compatível. É dele que o editor de plano (tela 30) escolhe os pratos.
 * Dono: frente B.
 */
@Service
public class CatalogoNutriService {

    public record Macros(int calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras) {}
    public record RestauranteResumo(UUID id, String nome, String sigla) {}
    public record Prato(UUID id, String nome, String categoria, String imagemUrl, BigDecimal preco, int calorias, BigDecimal proteinas,
                        BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras, Macros macros, RestauranteResumo restaurante,
                        List<String> compatibilidades) {}
    public record Filtros(String busca, UUID restaurante, String categoria, Integer proteinaMinima, String restricao, int pagina, int tamanho) {}

    /** Proteína mínima (g) do filtro "Alta proteína" da tela 31. */
    static final int ALTA_PROTEINA_G = 30;

    private final JdbcClient jdbc;
    private final NutriContexto ctx;

    public CatalogoNutriService(JdbcClient jdbc, NutriContexto ctx) {
        this.jdbc = jdbc; this.ctx = ctx;
    }

    /** Converte o parâmetro "proteina" da tela ("30-" = 30 g ou mais) em gramas mínimas. */
    public static Integer converterProteina(String proteina) {
        if (proteina == null || proteina.isBlank()) return null;
        var faixa = proteina.split(",")[0].trim();
        if (faixa.equalsIgnoreCase("alta")) return ALTA_PROTEINA_G;
        var numero = faixa.replaceAll("[^0-9].*$", "");
        if (numero.isEmpty()) throw new IllegalArgumentException("Faixa de proteína inválida");
        return Integer.parseInt(numero);
    }

    public PaginaDto<Prato> listar(UUID idUsuario, Filtros f) {
        ctx.atual(idUsuario); // só nutricionista com cadastro
        int tamanho = Math.min(Math.max(f.tamanho(), 1), 50);
        int pagina = Math.max(f.pagina(), 0);
        var busca = f.busca() == null || f.busca().isBlank() ? null : "%" + f.busca().trim().toLowerCase(Locale.ROOT) + "%";
        var categoria = f.categoria() == null || f.categoria().isBlank() ? null : f.categoria().trim();
        var restricao = f.restricao() == null || f.restricao().isBlank() ? null : f.restricao().trim().toLowerCase(Locale.ROOT);

        var where = """
                where m.status_prato = 'APROVADO' and r.status_aprovacao = 'APROVADO'
                  and (cast(:busca as text) is null or lower(m.nome) like cast(:busca as text) or lower(r.nome) like cast(:busca as text))
                  and (cast(:restaurante as uuid) is null or m.id_restaurante = cast(:restaurante as uuid))
                  and (cast(:categoria as text) is null or m.categoria = cast(:categoria as text))
                  and (cast(:proteina as integer) is null or m.proteinas >= cast(:proteina as integer))
                  and (cast(:restricao as text) is null or exists (
                        select 1 from marmita_compatibilidade mc join restricao_alimentar ra on ra.id = mc.id_restricao
                        where mc.id_marmita = m.id and (lower(ra.slug) = cast(:restricao as text) or lower(ra.nome) = cast(:restricao as text))))
                """;
        Map<String, Object> p = new HashMap<>();
        p.put("busca", busca);
        p.put("restaurante", f.restaurante());
        p.put("categoria", categoria);
        p.put("proteina", f.proteinaMinima());
        p.put("restricao", restricao);

        long total = jdbc.sql("select count(*) from marmita m join restaurante r on r.id = m.id_restaurante\n" + where)
                .params(p).query(Long.class).single();
        p.put("limite", tamanho);
        p.put("offset", pagina * tamanho);
        var itens = jdbc.sql("""
                select m.id, m.nome, m.categoria, m.imagem_url, m.preco, coalesce(m.calorias, 0) calorias,
                       coalesce(m.proteinas, 0) proteinas, coalesce(m.carboidratos, 0) carboidratos, coalesce(m.gorduras, 0) gorduras, m.fibras,
                       r.id id_restaurante, r.nome restaurante, r.sigla,
                       array(select ra.nome from marmita_compatibilidade mc join restricao_alimentar ra on ra.id = mc.id_restricao
                             where mc.id_marmita = m.id order by ra.nome) compatibilidades
                from marmita m join restaurante r on r.id = m.id_restaurante
                """ + where + " order by m.proteinas desc nulls last, m.nome limit :limite offset :offset")
                .params(p).query((rs, i) -> prato(rs)).list();
        int totalPaginas = (int) Math.ceil(total / (double) tamanho);
        return new PaginaDto<>(itens, pagina, totalPaginas, total);
    }

    /** Busca pratos aprovados por id (usado pelo editor de plano para validar e montar a resposta). */
    public Map<UUID, Prato> aprovadosPorId(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        var lista = jdbc.sql("""
                select m.id, m.nome, m.categoria, m.imagem_url, m.preco, coalesce(m.calorias, 0) calorias,
                       coalesce(m.proteinas, 0) proteinas, coalesce(m.carboidratos, 0) carboidratos, coalesce(m.gorduras, 0) gorduras, m.fibras,
                       r.id id_restaurante, r.nome restaurante, r.sigla,
                       array(select ra.nome from marmita_compatibilidade mc join restricao_alimentar ra on ra.id = mc.id_restricao
                             where mc.id_marmita = m.id order by ra.nome) compatibilidades
                from marmita m join restaurante r on r.id = m.id_restaurante
                where m.id in (:ids) and m.status_prato = 'APROVADO' and r.status_aprovacao = 'APROVADO'""")
                .param("ids", ids).query((rs, i) -> prato(rs)).list();
        var mapa = new HashMap<UUID, Prato>();
        lista.forEach(pr -> mapa.put(pr.id(), pr));
        return mapa;
    }

    static Prato prato(ResultSet rs) throws SQLException {
        var macros = new Macros(rs.getInt("calorias"), rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"),
                rs.getBigDecimal("gorduras"), rs.getBigDecimal("fibras"));
        Array arr = rs.getArray("compatibilidades");
        List<String> compat = arr == null ? List.of() : List.of((String[]) arr.getArray());
        return new Prato(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("categoria"), rs.getString("imagem_url"),
                rs.getBigDecimal("preco"), macros.calorias(), macros.proteinas(), macros.carboidratos(), macros.gorduras(), macros.fibras(),
                macros, new RestauranteResumo(rs.getObject("id_restaurante", UUID.class), rs.getString("restaurante"), rs.getString("sigla")),
                compat);
    }
}
