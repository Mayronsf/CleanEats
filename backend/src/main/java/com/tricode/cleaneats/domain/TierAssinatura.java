package com.tricode.cleaneats.domain;

import java.math.BigDecimal;

/**
 * Tiers de assinatura (CE-15) — preços da tela 09.
 * Anual = 20% de desconto sobre o mensal, cobrado de uma vez.
 */
public enum TierAssinatura {
    FREE(new BigDecimal("0.00"), new BigDecimal("0.00"), 0, 0, false, false),
    BASIC(new BigDecimal("29.90"), new BigDecimal("286.80"), 0, 5, false, false),
    PRO(new BigDecimal("59.90"), new BigDecimal("574.80"), 5, -1, true, false),
    PREMIUM(new BigDecimal("89.90"), new BigDecimal("862.80"), 15, -1, true, true);

    /** Valor de limite que significa "ilimitado". */
    public static final int ILIMITADO = -1;

    private final BigDecimal precoMensal;
    private final BigDecimal precoAnual;
    private final int descontoPedidoPercentual;
    private final int limiteDiarioNutriBot;
    private final boolean nutricionistaDedicado;
    private final boolean prescricaoDigital;

    TierAssinatura(BigDecimal precoMensal, BigDecimal precoAnual, int descontoPedidoPercentual,
                   int limiteDiarioNutriBot, boolean nutricionistaDedicado, boolean prescricaoDigital) {
        this.precoMensal = precoMensal;
        this.precoAnual = precoAnual;
        this.descontoPedidoPercentual = descontoPedidoPercentual;
        this.limiteDiarioNutriBot = limiteDiarioNutriBot;
        this.nutricionistaDedicado = nutricionistaDedicado;
        this.prescricaoDigital = prescricaoDigital;
    }

    public BigDecimal getPrecoMensal() { return precoMensal; }
    public BigDecimal getPrecoAnual() { return precoAnual; }
    public int getDescontoPedidoPercentual() { return descontoPedidoPercentual; }
    public int getLimiteDiarioNutriBot() { return limiteDiarioNutriBot; }
    public boolean temNutricionistaDedicado() { return nutricionistaDedicado; }
    public boolean temPrescricaoDigital() { return prescricaoDigital; }

    public boolean nutriBotDisponivel() { return limiteDiarioNutriBot != 0; }

    public boolean podePerguntarAoNutriBot(int perguntasHoje) {
        return limiteDiarioNutriBot == ILIMITADO || perguntasHoje < limiteDiarioNutriBot;
    }
}
