package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;

/**
 * Metas diárias iniciais do cliente por objetivo (tela 05, "Seu plano inicial").
 * Valores definidos na própria tela; a nutricionista ajusta na triagem (Pro/Premium).
 */
public record MetasIniciais(int calorias, int proteinas, int carboidratos, int gorduras, int fibras) {

    public static MetasIniciais para(ObjetivoNutricional objetivo) {
        return switch (objetivo) {
            case EMAGRECIMENTO -> new MetasIniciais(1800, 130, 180, 60, 30);
            case GANHO_MASSA -> new MetasIniciais(2200, 140, 240, 70, 30);
            case EQUILIBRIO -> new MetasIniciais(2000, 100, 250, 65, 30);
        };
    }

    /** Água: 35 ml por kg (regra de bolso; a nutri ajusta). */
    public static int aguaMl(java.math.BigDecimal pesoKg) {
        return pesoKg == null ? 2000 : pesoKg.multiply(java.math.BigDecimal.valueOf(35)).intValue();
    }

    /** Classificação do IMC exibida na tela 05 (OMS). */
    public static String classificarImc(java.math.BigDecimal imc) {
        if (imc == null) return null;
        double v = imc.doubleValue();
        if (v < 18.5) return "abaixo do peso";
        if (v < 25) return "peso normal";
        if (v < 30) return "sobrepeso";
        return "obesidade";
    }
}
