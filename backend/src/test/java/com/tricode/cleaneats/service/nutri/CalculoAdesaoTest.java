package com.tricode.cleaneats.service.nutri;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculoAdesaoTest {
    @Test void calculaPercentualArredondado() { assertEquals(67, CalculoAdesao.percentual(2, 3)); }
    @Test void semRefeicoesPlanejadasNaoTemAdesao() { assertNull(CalculoAdesao.percentual(0, 0)); }
    @Test void rejeitaContagemInvalida() { assertThrows(IllegalArgumentException.class, () -> CalculoAdesao.percentual(4, 3)); }
}
