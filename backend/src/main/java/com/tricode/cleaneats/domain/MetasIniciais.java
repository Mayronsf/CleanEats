package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.NivelAtividade;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Cálculo metabólico basal (Mifflin-St Jeor) e distribuição de macronutrientes por protocolo:
 * - EMAGRECIMENTO -> Cutting (déficit calórico controlado)
 * - GANHO_MASSA   -> Bulking (superávit calórico limpo)
 * - EQUILIBRIO    -> Manutenção (normocalórica)
 */
public record MetasIniciais(int calorias, int proteinas, int carboidratos, int gorduras, int fibras) {

    public record CalculoMetabolico(
            int tmb,
            int get,
            int ajusteKcal,
            String protocolo,
            String descricaoProtocolo,
            int calorias,
            int proteinas,
            int carboidratos,
            int gorduras,
            int fibras,
            int aguaMl
    ) {
        public MetasIniciais paraMetas() {
            return new MetasIniciais(calorias, proteinas, carboidratos, gorduras, fibras);
        }
    }

    /** Fallback estático (quando ainda não há dados físicos informados). */
    public static MetasIniciais para(ObjetivoNutricional objetivo) {
        return switch (objetivo) {
            case EMAGRECIMENTO -> new MetasIniciais(1800, 130, 180, 60, 30);
            case GANHO_MASSA -> new MetasIniciais(2200, 140, 240, 70, 30);
            case EQUILIBRIO -> new MetasIniciais(2000, 100, 250, 65, 30);
        };
    }

    /** Fator de atividade física (PAL) aplicado sobre a TMB para obter o GET. */
    public static double fatorAtividade(NivelAtividade nivel) {
        if (nivel == null) return 1.55;
        return switch (nivel) {
            case SEDENTARIO -> 1.20;
            case LEVE -> 1.375;
            case MODERADO -> 1.55;
            case INTENSO -> 1.725;
            case ATLETA -> 1.90;
        };
    }

    public static NivelAtividade lerNivel(String nivel) {
        if (nivel == null || nivel.isBlank()) return NivelAtividade.MODERADO;
        try {
            return NivelAtividade.valueOf(nivel.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return NivelAtividade.MODERADO;
        }
    }

    /**
     * Calcula TMB (Mifflin-St Jeor), GET (TMB * fator de atividade), ajuste de Cutting/Bulking/Manutenção
     * e macros em g/kg com fechamento calórico (4 kcal/g proteína, 4 kcal/g carboidrato, 9 kcal/g gordura).
     */
    public static CalculoMetabolico calcular(
            ObjetivoNutricional objetivo,
            BigDecimal pesoKg,
            BigDecimal alturaCm,
            Integer idade,
            String sexo,
            NivelAtividade nivelAtividade
    ) {
        ObjetivoNutricional obj = objetivo == null ? ObjetivoNutricional.EQUILIBRIO : objetivo;
        NivelAtividade nivel = nivelAtividade == null ? NivelAtividade.MODERADO : nivelAtividade;

        // Se faltarem dados físicos básicos, retorna referência padrão coerente com o objetivo
        if (pesoKg == null || alturaCm == null || idade == null
                || pesoKg.doubleValue() < 20 || alturaCm.doubleValue() < 80 || idade < 13) {
            var base = para(obj);
            int tmbRef = 1650;
            int getRef = 2000;
            return new CalculoMetabolico(
                    tmbRef, getRef, base.calorias() - getRef,
                    nomeProtocolo(obj), descricaoProtocolo(obj),
                    base.calorias(), base.proteinas(), base.carboidratos(), base.gorduras(), base.fibras(),
                    aguaMl(pesoKg, obj, nivel)
            );
        }

        double peso = pesoKg.doubleValue();
        double altura = alturaCm.doubleValue();
        String s = sexo == null ? "" : sexo.trim().toUpperCase(Locale.ROOT);

        // Equação de Mifflin-St Jeor (1990)
        double constanteSexo = switch (s) {
            case "M" -> 5.0;
            case "F" -> -161.0;
            default -> -78.0; // média neutra quando sexo não informado ou "O"
        };
        int tmb = (int) Math.round(10.0 * peso + 6.25 * altura - 5.0 * idade + constanteSexo);
        int get = (int) Math.round(tmb * fatorAtividade(nivel));

        int pisoSeguro = switch (s) {
            case "M" -> 1500;
            case "F" -> 1200;
            default -> 1350;
        };

        int caloriasAlvo;
        switch (obj) {
            case EMAGRECIMENTO -> {
                // Cutting: déficit de 20% sobre o GET, limitado entre 300 e 550 kcal/dia
                int deficit = (int) Math.round(Math.max(300.0, Math.min(550.0, get * 0.20)));
                caloriasAlvo = Math.max(pisoSeguro, arredondarDezena(get - deficit));
            }
            case GANHO_MASSA -> {
                // Bulking limpo: superávit de 12% sobre o GET, limitado entre 250 e 450 kcal/dia
                int superavit = (int) Math.round(Math.max(250.0, Math.min(450.0, get * 0.12)));
                caloriasAlvo = arredondarDezena(get + superavit);
            }
            case EQUILIBRIO -> caloriasAlvo = arredondarDezena(get);
            default -> caloriasAlvo = arredondarDezena(get);
        }
        int ajusteKcal = caloriasAlvo - get;

        // Distribuição de macros (g/kg) calibrada para cada protocolo
        double protPorKg = switch (obj) {
            case EMAGRECIMENTO -> 2.0; // alta proteína no cutting para preservar massa magra
            case GANHO_MASSA -> 1.8;   // síntese muscular no bulking
            case EQUILIBRIO -> 1.5;    // manutenção equilibrada
        };
        double gordPorKg = switch (obj) {
            case EMAGRECIMENTO -> 0.8;
            case GANHO_MASSA, EQUILIBRIO -> 0.9;
        };

        int proteinas = (int) Math.round(peso * protPorKg);
        // Garante que proteína fique dentro de faixa fisiológica saudável (15% a 40% das calorias)
        int protMin = (int) Math.round((caloriasAlvo * 0.15) / 4.0);
        int protMax = (int) Math.round((caloriasAlvo * 0.40) / 4.0);
        proteinas = Math.max(protMin, Math.min(protMax, proteinas));

        int gorduras = (int) Math.round(peso * gordPorKg);
        int gordMin = (int) Math.round((caloriasAlvo * 0.20) / 9.0);
        int gordMax = (int) Math.round((caloriasAlvo * 0.32) / 9.0);
        gorduras = Math.max(gordMin, Math.min(gordMax, gorduras));

        int kcalRestantes = caloriasAlvo - (proteinas * 4) - (gorduras * 9);
        int carboidratos = Math.max(70, (int) Math.round(kcalRestantes / 4.0));

        // Fibras (DRI: 14g a cada 1.000 kcal, mínimo 25g)
        int fibras = Math.max(obj == ObjetivoNutricional.GANHO_MASSA ? 28 : 25,
                (int) Math.round((caloriasAlvo / 1000.0) * 14.0));

        return new CalculoMetabolico(
                tmb, get, ajusteKcal,
                nomeProtocolo(obj), descricaoProtocolo(obj),
                caloriasAlvo, proteinas, carboidratos, gorduras, fibras,
                aguaMl(pesoKg, obj, nivel)
        );
    }

    public static String nomeProtocolo(ObjetivoNutricional obj) {
        return switch (obj) {
            case EMAGRECIMENTO -> "Cutting (Déficit calórico)";
            case GANHO_MASSA -> "Bulking (Superávit calórico)";
            case EQUILIBRIO -> "Manutenção (Normocalórica)";
        };
    }

    public static String descricaoProtocolo(ObjetivoNutricional obj) {
        return switch (obj) {
            case EMAGRECIMENTO -> "Déficit calórico controlado (~20% abaixo do GET) com proteína elevada (2,0 g/kg) para preservar massa magra.";
            case GANHO_MASSA -> "Superávit calórico limpo (~12% acima do GET) com carboidratos altos e 1,8 g/kg de proteína para hipertrofia.";
            case EQUILIBRIO -> "Ingestão normocalórica igual ao seu gasto energético total (GET) para manter peso e saúde metabólica.";
        };
    }

    /** Água: 35 ml/kg (padrão) ou 40 ml/kg em bulking / treinos intensos. */
    public static int aguaMl(BigDecimal pesoKg) {
        return pesoKg == null ? 2000 : pesoKg.multiply(BigDecimal.valueOf(35)).intValue();
    }

    public static int aguaMl(BigDecimal pesoKg, ObjetivoNutricional objetivo, NivelAtividade nivel) {
        if (pesoKg == null) return 2000;
        int mlPorKg = (objetivo == ObjetivoNutricional.GANHO_MASSA
                || nivel == NivelAtividade.INTENSO
                || nivel == NivelAtividade.ATLETA) ? 40 : 35;
        return arredondarCinquenta(pesoKg.multiply(BigDecimal.valueOf(mlPorKg)).intValue());
    }

    private static int arredondarDezena(int v) {
        return ((v + 5) / 10) * 10;
    }

    private static int arredondarCinquenta(int v) {
        return ((v + 25) / 50) * 50;
    }

    /** Classificação do IMC exibida na tela 05 (OMS). */
    public static String classificarImc(BigDecimal imc) {
        if (imc == null) return null;
        double v = imc.doubleValue();
        if (v < 18.5) return "abaixo do peso";
        if (v < 25) return "peso normal";
        if (v < 30) return "sobrepeso";
        return "obesidade";
    }
}
