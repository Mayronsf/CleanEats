package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.service.nutri.PlanoNutriService.PlanoForm;
import com.tricode.cleaneats.service.nutri.PlanoNutriService.RefeicaoForm;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Telas 30/31 (CE-19): o plano só aceita pratos aprovados, dia e tipo válidos. */
class PlanoNutriServiceTest {

    private static final UUID APROVADO = UUID.randomUUID();
    private static final UUID REJEITADO = UUID.randomUUID();

    private static PlanoForm plano(RefeicaoForm... r) { return new PlanoForm(List.of(r)); }

    @Test
    void aceitaPratoAprovadoELimpaObservacao() {
        var limpas = PlanoNutriService.validar(plano(new RefeicaoForm(1, "ALMOCO", APROVADO, "  sem molho  ")), Set.of(APROVADO));
        assertEquals("sem molho", limpas.get(0).observacao());
    }

    @Test
    void recusaPratoNaoAprovado() {
        var e = assertThrows(IllegalArgumentException.class,
                () -> PlanoNutriService.validar(plano(new RefeicaoForm(1, "ALMOCO", REJEITADO, null)), Set.of(APROVADO)));
        assertEquals("Só pratos aprovados podem entrar no plano", e.getMessage());
    }

    @Test
    void recusaDiaETipoInvalidos() {
        assertThrows(IllegalArgumentException.class,
                () -> PlanoNutriService.validar(plano(new RefeicaoForm(8, "ALMOCO", APROVADO, null)), Set.of(APROVADO)));
        assertThrows(IllegalArgumentException.class,
                () -> PlanoNutriService.validar(plano(new RefeicaoForm(1, "BRUNCH", APROVADO, null)), Set.of(APROVADO)));
    }

    @Test
    void recusaDuasRefeicoesNoMesmoHorario() {
        assertThrows(IllegalArgumentException.class, () -> PlanoNutriService.validar(
                plano(new RefeicaoForm(2, "JANTAR", APROVADO, null), new RefeicaoForm(2, "JANTAR", APROVADO, null)), Set.of(APROVADO)));
    }

    @Test
    void semanaComecaNaSegunda() {
        assertEquals(LocalDate.of(2026, 11, 23), PlanoNutriService.segundaDaSemana(LocalDate.of(2026, 11, 29)));
        assertEquals(LocalDate.of(2026, 11, 23), PlanoNutriService.segundaDaSemana(LocalDate.of(2026, 11, 23)));
    }

    @Test
    void diaDaSemanaConverteParaOBanco() {
        assertEquals(1, PlanoNutriService.diaParaBanco(1)); // segunda
        assertEquals(0, PlanoNutriService.diaParaBanco(7)); // domingo
        assertEquals(7, PlanoNutriService.diaDoBanco(0));
        assertEquals(6, PlanoNutriService.diaDoBanco(6));
    }

    @Test
    void faixaDeProteina() {
        assertEquals(30, CatalogoNutriService.converterProteina("30-"));
        assertEquals(30, CatalogoNutriService.converterProteina("alta"));
        assertNull(CatalogoNutriService.converterProteina(""));
    }
}
