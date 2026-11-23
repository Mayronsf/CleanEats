package com.tricode.cleaneats.dto.cliente;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** DTOs do catálogo do cliente (telas 10–14). Dono: frente A. */
public final class CatalogoDtos {
    private CatalogoDtos() {}

    public record MacrosDto(Integer calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras) {}

    public record RestauranteMiniDto(UUID id, String nome, String sigla, Integer tempoEntregaMin, Integer tempoEntregaMax, BigDecimal taxaEntrega) {}

    public record PratoDto(UUID id, String nome, String descricao, String categoria, String imagemUrl, BigDecimal preco,
                           Integer porcaoG, MacrosDto macros, BigDecimal nota, int totalAvaliacoes, boolean aprovadoPorNutri,
                           List<String> objetivos, RestauranteMiniDto restaurante, boolean favorito, boolean doObjetivo) {}

    public record IngredienteDto(String nome, String quantidade, String preparo) {}

    public record AvaliacaoPublicaDto(UUID id, String autor, int nota, String comentario, List<String> tags, OffsetDateTime data) {}

    public record PratoDetalheDto(PratoDto prato, Integer sodioMg, List<IngredienteDto> ingredientes, List<String> compativelCom,
                                  List<AvaliacaoPublicaDto> avaliacoes, List<PratoDto> similares) {}

    public record CategoriaDto(String nome, long total) {}
}
