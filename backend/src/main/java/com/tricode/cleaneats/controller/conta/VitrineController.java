package com.tricode.cleaneats.controller.conta;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** GET /api/vitrine — dados públicos da landing (tela 01): pratos em destaque e números da plataforma. Dono: sessão principal. */
@RestController
@RequestMapping("/api/vitrine")
public class VitrineController {

    public record PratoDestaque(UUID id, String nome, String categoria, String imagemUrl, String restaurante, String cidade,
                                BigDecimal preco, Integer calorias, BigDecimal proteinas, BigDecimal carboidratos,
                                BigDecimal fibras, BigDecimal notaMedia) {}
    public record Numeros(long usuarios, long restaurantes, long nutricionistas, BigDecimal notaMedia, long avaliacoes) {}
    public record Vitrine(List<PratoDestaque> destaques, Numeros numeros) {}

    private final JdbcClient jdbc;

    public VitrineController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Vitrine vitrine() {
        var destaques = jdbc.sql("""
                select distinct on (m.nome) m.id, m.nome, m.categoria, m.imagem_url, r.nome as restaurante, r.cidade, m.preco,
                       m.calorias, m.proteinas, m.carboidratos, m.fibras, m.nota_media, m.total_avaliacoes
                from marmita m join vw_restaurante_publico r on r.id = m.id_restaurante
                where m.status_prato = 'APROVADO' and m.imagem_url is not null
                order by m.nome, m.total_avaliacoes desc""")
                .query((rs, n) -> new Object[]{ new PratoDestaque(
                        rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("categoria"), rs.getString("imagem_url"),
                        rs.getString("restaurante"), rs.getString("cidade"), rs.getBigDecimal("preco"), (Integer) rs.getObject("calorias"),
                        rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"), rs.getBigDecimal("fibras"), rs.getBigDecimal("nota_media")),
                        rs.getInt("total_avaliacoes") })
                .list().stream()
                .sorted((a, b) -> Integer.compare((int) b[1], (int) a[1]))
                .limit(4)
                .map(o -> (PratoDestaque) o[0])
                .toList();

        var numeros = jdbc.sql("""
                select (select count(*) from usuario where perfil = 'CLIENTE' and anonimizado_em is null) as usuarios,
                       (select count(*) from vw_restaurante_publico) as restaurantes,
                       (select count(*) from nutricionista where status_aprovacao = 'APROVADO') as nutricionistas,
                       (select round(avg(nota_media), 1) from restaurante where status_aprovacao = 'APROVADO' and nota_media > 0) as nota,
                       (select coalesce(sum(total_avaliacoes), 0) from marmita where status_prato = 'APROVADO') as avaliacoes""")
                .query((rs, n) -> new Numeros(rs.getLong("usuarios"), rs.getLong("restaurantes"), rs.getLong("nutricionistas"),
                        rs.getBigDecimal("nota"), rs.getLong("avaliacoes")))
                .single();
        return new Vitrine(destaques, numeros);
    }
}
