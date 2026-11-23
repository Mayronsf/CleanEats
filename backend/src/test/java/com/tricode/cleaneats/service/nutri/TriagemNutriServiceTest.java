package com.tricode.cleaneats.service.nutri;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TriagemNutriServiceTest {
    private TriagemNutriService.Metas metas(Integer kcal, Integer proteinas, Integer agua) {
        return new TriagemNutriService.Metas(kcal, proteinas, 200, 70, 30, agua, "Observações");
    }

    @Test void aceitaLimitesDeCaloriasAguaEMacros() {
        assertDoesNotThrow(() -> TriagemNutriService.validar(metas(800, 0, 500)));
        assertDoesNotThrow(() -> TriagemNutriService.validar(metas(6000, 300, 6000)));
    }

    @Test void rejeitaCaloriasForaDoIntervalo() {
        assertThrows(IllegalArgumentException.class, () -> TriagemNutriService.validar(metas(799, 100, 2000)));
        assertThrows(IllegalArgumentException.class, () -> TriagemNutriService.validar(metas(6001, 100, 2000)));
    }

    @Test void rejeitaMacroNegativoEAguaForaDoIntervalo() {
        assertThrows(IllegalArgumentException.class, () -> TriagemNutriService.validar(metas(2000, -1, 2000)));
        assertThrows(IllegalArgumentException.class, () -> TriagemNutriService.validar(metas(2000, 100, 499)));
        assertThrows(IllegalArgumentException.class, () -> TriagemNutriService.validar(metas(2000, 100, 6001)));
    }
}
