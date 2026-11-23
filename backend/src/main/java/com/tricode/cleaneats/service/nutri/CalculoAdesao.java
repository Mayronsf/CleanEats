package com.tricode.cleaneats.service.nutri;

/** Cálculo puro da adesão: refeições pedidas divididas pelas refeições planejadas. */
public final class CalculoAdesao {
    private CalculoAdesao() {}

    public static Integer percentual(int pedidas, int planejadas) {
        if (planejadas <= 0) return null;
        if (pedidas < 0 || pedidas > planejadas) throw new IllegalArgumentException("A quantidade de refeições pedidas é inválida");
        return (int) Math.round(pedidas * 100.0 / planejadas);
    }
}
