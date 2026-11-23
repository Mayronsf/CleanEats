package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService.ComponenteDto;
import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService.Selecao;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/** Tela 15: preço e macros do monte sua marmita calculados no backend. */
class MonteSuaMarmitaServiceTest {

    private static final UUID R = UUID.randomUUID();
    private final Map<UUID, ComponenteDto> porId = new HashMap<>();
    private final UUID frango = add("PROTEINA", "Frango Grelhado", 248, "35", "0", "6", "0", "19.90", false);
    private final UUID batata = add("CARBOIDRATO", "Batata Doce", 138, "2", "32", "0", "4", "5.00", true);
    private final UUID brocolis = add("VEGETAL", "Brócolis no vapor", 35, "3", "6", "0", "3", "0", false);
    private final UUID salada = add("VEGETAL", "Salada de folhas", 20, "1", "3", "0", "2", "0", false);
    private final UUID cenoura = add("VEGETAL", "Cenoura ralada", 22, "0", "5", "0", "1.5", "0", false);
    private final UUID ovo = add("ADICIONAL", "Ovo cozido", 70, "6", "1", "5", "0", "2.00", false);

    private UUID add(String cat, String nome, int kcal, String p, String c, String g, String f, String preco, boolean tamanho) {
        var id = UUID.randomUUID();
        porId.put(id, new ComponenteDto(id, cat, nome, 100, kcal, new BigDecimal(p), new BigDecimal(c), new BigDecimal(g), new BigDecimal(f),
                new BigDecimal(preco), tamanho, null));
        return id;
    }

    @Test
    void marmitaDaTelaCusta26e90() {
        var r = MonteSuaMarmitaService.calcular(new Selecao(frango, batata, "M", List.of(brocolis, salada), List.of(ovo)), porId, R);
        assertEquals(new BigDecimal("26.90"), r.preco());
        assertEquals(248 + 138 + 35 + 20 + 70, r.calorias());
        assertEquals(new BigDecimal("47.0"), r.proteinas());
        assertEquals("MONTE_SUA_MARMITA", r.personalizacao().get("tipo"));
    }

    @Test
    void tamanhoDoCarboidratoMudaPorcaoEPreco() {
        var p = MonteSuaMarmitaService.calcular(new Selecao(frango, batata, "P", List.of(), List.of()), porId, R);
        var g = MonteSuaMarmitaService.calcular(new Selecao(frango, batata, "G", List.of(), List.of()), porId, R);
        assertEquals(new BigDecimal("23.90"), p.preco());
        assertEquals(new BigDecimal("26.90"), g.preco());
        assertEquals(new BigDecimal("16.0"), p.carboidratos());
        assertEquals(new BigDecimal("48.0"), g.carboidratos());
    }

    @Test
    void exigeProteinaECarboidrato() {
        assertThrows(IllegalArgumentException.class, () -> MonteSuaMarmitaService.calcular(new Selecao(null, batata, "M", null, null), porId, R));
        assertThrows(IllegalArgumentException.class, () -> MonteSuaMarmitaService.calcular(new Selecao(frango, frango, "M", null, null), porId, R));
    }

    @Test
    void limitaVegetaisEAdicionais() {
        assertThrows(IllegalArgumentException.class,
                () -> MonteSuaMarmitaService.calcular(new Selecao(frango, batata, "M", List.of(brocolis, salada, cenoura), List.of()), porId, R));
        assertThrows(IllegalArgumentException.class,
                () -> MonteSuaMarmitaService.calcular(new Selecao(frango, batata, "M", List.of(ovo), List.of()), porId, R));
    }

    @Test
    void selecaoVindaDoCarrinho() {
        var s = MonteSuaMarmitaService.selecaoDe(Map.of("proteina", frango.toString(), "carboidrato", batata.toString(), "tamanho", "G",
                "vegetais", List.of(brocolis.toString()), "adicionais", List.of()));
        assertEquals("G", s.tamanho());
        assertEquals(List.of(brocolis), s.vegetais());
        assertThrows(IllegalArgumentException.class, () -> MonteSuaMarmitaService.selecaoDe(Map.of("proteina", "x")));
    }
}
