package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.domain.Marmita;
import com.tricode.cleaneats.domain.StatusPrato;
import com.tricode.cleaneats.service.restaurante.CardapioService.PratoForm;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Telas 38–40 / CE-3: validação da ficha e ciclo de status do prato. */
class CardapioServiceTest {

    private PratoForm form(Integer kcal, String p, String c, String g) {
        return new PratoForm("Bowl Proteico Frango", "Frango, quinoa e legumes", "Bowl", new BigDecimal("32.90"), 350, 15, 1, kcal,
                p == null ? null : new BigDecimal(p), c == null ? null : new BigDecimal(c), g == null ? null : new BigDecimal(g),
                null, null, List.of("GANHO_MASSA"), List.of("Ovo"), List.of(), List.of("Mais vendido"), null, null, List.of(), true);
    }

    @Test
    void fichaCoerenteEhAceita() {
        assertDoesNotThrow(() -> CardapioService.validar(form(420, "38", "42", "12")));
    }

    @Test
    void caloriasQueNaoBatemComOsMacrosSaoRecusadas() {
        var e = assertThrows(IllegalArgumentException.class, () -> CardapioService.validar(form(900, "38", "42", "12")));
        assertTrue(e.getMessage().contains("não batem"));
    }

    @Test
    void rascunhoSemFichaPodeSerSalvo() {
        assertDoesNotThrow(() -> CardapioService.validar(form(null, null, null, null)));
    }

    @Test
    void alergenoForaDaListaERecusado() {
        var f = new PratoForm("Bowl", null, "Bowl", BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null,
                List.of("Pimenta"), null, null, null, null, null, true);
        assertThrows(IllegalArgumentException.class, () -> CardapioService.validar(f));
    }

    @Test
    void cicloDoPrato() {
        var m = new Marmita(UUID.randomUUID(), "Bowl", "Bowl", BigDecimal.TEN);
        assertThrows(IllegalArgumentException.class, m::enviarParaAnalise);   // sem ficha
        m.setCalorias(420); m.setProteinas(new BigDecimal("38")); m.setCarboidratos(new BigDecimal("42")); m.setGorduras(new BigDecimal("12")); m.setPorcaoG(350);
        m.setStatusPrato(StatusPrato.RASCUNHO);
        m.enviarParaAnalise();
        assertEquals(StatusPrato.EM_ANALISE, m.getStatusPrato());
        assertThrows(IllegalArgumentException.class, m::pausar);              // só aprovado pausa
        m.avaliar(true, null, UUID.randomUUID());
        m.pausar();
        assertEquals(StatusPrato.PAUSADO, m.getStatusPrato());
        m.reativar();
        m.voltarParaAnalise();
        assertEquals(StatusPrato.EM_ANALISE, m.getStatusPrato());
    }
}
