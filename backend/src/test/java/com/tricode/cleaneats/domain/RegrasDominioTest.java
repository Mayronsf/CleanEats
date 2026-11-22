package com.tricode.cleaneats.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class RegrasDominioTest {

    @Test
    void fluxoDoPedidoSegueAOrdemDoCe14() {
        assertTrue(StatusPedido.NOVO.podeIrPara(StatusPedido.ACEITO));
        assertTrue(StatusPedido.NOVO.podeIrPara(StatusPedido.RECUSADO));
        assertTrue(StatusPedido.ACEITO.podeIrPara(StatusPedido.PREPARANDO));
        assertTrue(StatusPedido.PREPARANDO.podeIrPara(StatusPedido.PRONTO));
        assertTrue(StatusPedido.PRONTO.podeIrPara(StatusPedido.A_CAMINHO));
        assertTrue(StatusPedido.A_CAMINHO.podeIrPara(StatusPedido.ENTREGUE));
    }

    @Test
    void naoPermitePularEtapasNemVoltar() {
        assertFalse(StatusPedido.NOVO.podeIrPara(StatusPedido.ENTREGUE));
        assertFalse(StatusPedido.PRONTO.podeIrPara(StatusPedido.PREPARANDO));
        assertFalse(StatusPedido.A_CAMINHO.podeIrPara(StatusPedido.CANCELADO));
        assertTrue(StatusPedido.ENTREGUE.isFinal());
        assertTrue(StatusPedido.CANCELADO.isFinal());
        assertTrue(StatusPedido.RECUSADO.isFinal());
    }

    @Test
    void comissaoPadraoEOitoPorCento() {
        // 24,90 x 8% = 1,992 -> 1,99
        assertEquals(new BigDecimal("1.99"), CalculoFinanceiro.calcularComissao(new BigDecimal("24.90"), null));
        assertEquals(new BigDecimal("22.91"), CalculoFinanceiro.calcularValorLiquido(new BigDecimal("24.90"), null));
    }

    @Test
    void comissaoConfiguravelPorRestaurante() {
        assertEquals(new BigDecimal("10.00"), CalculoFinanceiro.calcularComissao(new BigDecimal("100.00"), new BigDecimal("10")));
        assertThrows(IllegalArgumentException.class,
                () -> CalculoFinanceiro.calcularComissao(BigDecimal.TEN, new BigDecimal("120")));
    }

    @Test
    void precosDosTiersSeguemATela09() {
        assertEquals(new BigDecimal("29.90"), TierAssinatura.BASIC.getPrecoMensal());
        assertEquals(new BigDecimal("574.80"), TierAssinatura.PRO.getPrecoAnual());
        // a tela 09 mostra o anual como "R$ 23,90/mês" (= 286,80 / 12): ~20% abaixo do mensal
        assertEquals(new BigDecimal("23.90"), TierAssinatura.BASIC.getPrecoAnual().divide(new BigDecimal("12")));
        assertEquals(new BigDecimal("47.90"), TierAssinatura.PRO.getPrecoAnual().divide(new BigDecimal("12")));
        assertEquals(new BigDecimal("71.90"), TierAssinatura.PREMIUM.getPrecoAnual().divide(new BigDecimal("12")));
    }

    @Test
    void beneficiosPorTier() {
        assertFalse(TierAssinatura.FREE.nutriBotDisponivel());
        assertTrue(TierAssinatura.BASIC.podePerguntarAoNutriBot(4));
        assertFalse(TierAssinatura.BASIC.podePerguntarAoNutriBot(5));
        assertTrue(TierAssinatura.PRO.podePerguntarAoNutriBot(500));
        assertTrue(TierAssinatura.PRO.temNutricionistaDedicado());
        assertFalse(TierAssinatura.PRO.temPrescricaoDigital());
        assertTrue(TierAssinatura.PREMIUM.temPrescricaoDigital());
        assertEquals(new BigDecimal("85.00"), CalculoFinanceiro.aplicarDescontoTier(new BigDecimal("100.00"), TierAssinatura.PREMIUM));
    }

    @Test
    void repasseDaNutricionistaESessentaPorCento() {
        assertEquals(new BigDecimal("35.94"), CalculoFinanceiro.calcularRepasseNutricionista(TierAssinatura.PRO.getPrecoMensal()));
    }
}
