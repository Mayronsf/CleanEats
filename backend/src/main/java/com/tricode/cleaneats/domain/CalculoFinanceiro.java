package com.tricode.cleaneats.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Regras de comissão (CE-17), desconto por tier e repasse à nutricionista. */
public final class CalculoFinanceiro {

    /** Comissão padrão da plataforma por pedido entregue. */
    public static final BigDecimal COMISSAO_PADRAO_PERCENTUAL = new BigDecimal("8.00");
    /** Parte da mensalidade Pro/Premium repassada à nutricionista vinculada. */
    public static final BigDecimal REPASSE_NUTRI_PERCENTUAL = new BigDecimal("60.00");

    private static final BigDecimal CEM = new BigDecimal("100");

    private CalculoFinanceiro() {}

    public static BigDecimal calcularComissao(BigDecimal valorBruto, BigDecimal percentual) {
        BigDecimal p = percentual == null ? COMISSAO_PADRAO_PERCENTUAL : percentual;
        if (p.signum() < 0 || p.compareTo(CEM) > 0) {
            throw new IllegalArgumentException("Percentual de comissão deve estar entre 0 e 100");
        }
        return valorBruto.multiply(p).divide(CEM, 2, RoundingMode.HALF_EVEN);
    }

    public static BigDecimal calcularValorLiquido(BigDecimal valorBruto, BigDecimal percentual) {
        return valorBruto.subtract(calcularComissao(valorBruto, percentual));
    }

    public static BigDecimal calcularRepasseNutricionista(BigDecimal valorAssinatura) {
        return valorAssinatura.multiply(REPASSE_NUTRI_PERCENTUAL).divide(CEM, 2, RoundingMode.HALF_EVEN);
    }

    public static BigDecimal aplicarDescontoTier(BigDecimal subtotal, TierAssinatura tier) {
        BigDecimal desconto = subtotal.multiply(BigDecimal.valueOf(tier.getDescontoPedidoPercentual()))
                .divide(CEM, 2, RoundingMode.HALF_EVEN);
        return subtotal.subtract(desconto);
    }
}
