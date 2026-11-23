package com.tricode.cleaneats.controller.conta;

import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * GET /api/fichas-tecnicas/{id} — ficha técnica nutricional pública do prato, aberta pelo QR Code da tela 12.
 * Só pratos APROVADOS. Leitura via SQL para não depender das entidades da frente C (ingredientes).
 */
@RestController
@RequestMapping("/api/fichas-tecnicas")
public class FichaTecnicaController {

    public record Ingrediente(String nome, String quantidade, String preparo) {}
    public record FichaTecnica(UUID id, String nome, String descricao, String categoria, String imagemUrl,
                               String restaurante, String cidade, Integer porcaoG, Integer calorias,
                               BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras,
                               BigDecimal fibras, Integer sodioMg, boolean aprovadoPorNutri,
                               BigDecimal notaMedia, Integer totalAvaliacoes,
                               List<Ingrediente> ingredientes, List<String> compativelCom) {}

    private final JdbcClient jdbc;

    public FichaTecnicaController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/{id}")
    public FichaTecnica buscar(@PathVariable UUID id) {
        var ingredientes = jdbc.sql("select nome, quantidade, preparo from ingrediente_marmita where id_marmita = :id order by ordem")
                .param("id", id).query(Ingrediente.class).list();
        var compativel = jdbc.sql("""
                select r.nome from marmita_compatibilidade c join restricao_alimentar r on r.id = c.id_restricao
                where c.id_marmita = :id order by r.id""").param("id", id).query(String.class).list();
        return jdbc.sql("""
                select m.id, m.nome, m.descricao, m.categoria, m.imagem_url, r.nome as restaurante, r.cidade, m.porcao_g, m.calorias,
                       m.proteinas, m.carboidratos, m.gorduras, m.fibras, m.sodio_mg, m.aprovado_por_nutri, m.nota_media, m.total_avaliacoes
                from marmita m join restaurante r on r.id = m.id_restaurante
                where m.id = :id and m.status_prato = 'APROVADO'""")
                .param("id", id)
                .query((rs, n) -> new FichaTecnica(
                        rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("descricao"), rs.getString("categoria"),
                        rs.getString("imagem_url"), rs.getString("restaurante"), rs.getString("cidade"),
                        (Integer) rs.getObject("porcao_g"), (Integer) rs.getObject("calorias"),
                        rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"), rs.getBigDecimal("gorduras"),
                        rs.getBigDecimal("fibras"), (Integer) rs.getObject("sodio_mg"), rs.getBoolean("aprovado_por_nutri"),
                        rs.getBigDecimal("nota_media"), (Integer) rs.getObject("total_avaliacoes"), ingredientes, compativel))
                .optional()
                .orElseThrow(() -> new RecursoNaoEncontradoException("FICHA_NAO_ENCONTRADA", "Prato não encontrado ou ainda não aprovado."));
    }
}
