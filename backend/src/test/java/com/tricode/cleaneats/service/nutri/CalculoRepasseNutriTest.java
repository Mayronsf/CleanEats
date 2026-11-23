package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.domain.CalculoFinanceiro;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CalculoRepasseNutriTest {
    @Test void calculaSessentaPorCentoDaMensalidade(){
        assertEquals(new BigDecimal("35.94"),CalculoFinanceiro.calcularRepasseNutricionista(new BigDecimal("59.90")));
    }
}
