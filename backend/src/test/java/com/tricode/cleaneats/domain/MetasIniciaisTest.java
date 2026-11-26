package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.NivelAtividade;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MetasIniciaisTest {

    @Test
    void calculaTmbMifflinStJeorHomemBulking() {
        // Homem, 78kg, 178cm, 28 anos, MODERADO (1.55)
        // TMB = 10*78 + 6.25*178 - 5*28 + 5 = 780 + 1112.5 - 140 + 5 = 1757.5 -> 1758
        // GET = 1758 * 1.55 = 2724.9 -> 2725
        // Bulking: +12% = +327 -> ~3050 kcal
        var c = MetasIniciais.calcular(
                ObjetivoNutricional.GANHO_MASSA,
                new BigDecimal("78"), new BigDecimal("178"), 28, "M", NivelAtividade.MODERADO);

        assertEquals(1758, c.tmb());
        assertEquals(2725, c.get());
        assertTrue(c.ajusteKcal() >= 250 && c.ajusteKcal() <= 450, "Superávit controlado de bulking");
        assertTrue(c.calorias() > c.get());
        assertEquals("Bulking (Superávit calórico)", c.protocolo());
        assertTrue(c.proteinas() >= 130 && c.proteinas() <= 160);
        assertEquals(3100, c.aguaMl()); // 78 * 40 = 3120 -> arredondado de 50 em 50 = 3100
    }

    @Test
    void calculaTmbMifflinStJeorMulherCutting() {
        // Mulher, 64kg, 165cm, 30 anos, LEVE (1.375)
        // TMB = 640 + 1031.25 - 150 - 161 = 1360.25 -> 1360
        // GET = 1360 * 1.375 = 1870
        // Cutting: -20% = -374 -> ~1500 kcal (>= piso seguro 1200)
        var c = MetasIniciais.calcular(
                ObjetivoNutricional.EMAGRECIMENTO,
                new BigDecimal("64"), new BigDecimal("165"), 30, "F", NivelAtividade.LEVE);

        assertEquals(1360, c.tmb());
        assertEquals(1870, c.get());
        assertTrue(c.ajusteKcal() <= -300 && c.ajusteKcal() >= -550, "Déficit controlado de cutting");
        assertTrue(c.calorias() >= 1200 && c.calorias() < c.get());
        assertEquals("Cutting (Déficit calórico)", c.protocolo());
        assertTrue(c.proteinas() >= 110, "Proteína elevada no cutting para preservar massa magra");
    }

    @Test
    void respeitaPisoSeguroCaloricoNoCutting() {
        var c = MetasIniciais.calcular(
                ObjetivoNutricional.EMAGRECIMENTO,
                new BigDecimal("48"), new BigDecimal("155"), 45, "F", NivelAtividade.SEDENTARIO);
        assertTrue(c.calorias() >= 1200, "Nunca prescrever abaixo de 1200 kcal para mulher");
    }

    @Test
    void manutencaoFicaProximaAoGet() {
        var c = MetasIniciais.calcular(
                ObjetivoNutricional.EQUILIBRIO,
                new BigDecimal("70"), new BigDecimal("172"), 25, "O", NivelAtividade.MODERADO);
        assertEquals("Manutenção (Normocalórica)", c.protocolo());
        assertTrue(Math.abs(c.calorias() - c.get()) <= 10);
    }
}
