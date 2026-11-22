package com.tricode.cleaneats.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * Fluxo do pedido (CE-14):
 * NOVO -> ACEITO/RECUSADO -> PREPARANDO -> PRONTO -> A_CAMINHO -> ENTREGUE (+ CANCELADO).
 */
public enum StatusPedido {
    NOVO, ACEITO, RECUSADO, PREPARANDO, PRONTO, A_CAMINHO, ENTREGUE, CANCELADO;

    public Set<StatusPedido> proximosPermitidos() {
        return switch (this) {
            case NOVO -> EnumSet.of(ACEITO, RECUSADO, CANCELADO);
            case ACEITO -> EnumSet.of(PREPARANDO, CANCELADO);
            case PREPARANDO -> EnumSet.of(PRONTO, CANCELADO);
            case PRONTO -> EnumSet.of(A_CAMINHO);
            case A_CAMINHO -> EnumSet.of(ENTREGUE);
            case ENTREGUE, RECUSADO, CANCELADO -> EnumSet.noneOf(StatusPedido.class);
        };
    }

    public boolean podeIrPara(StatusPedido destino) {
        return proximosPermitidos().contains(destino);
    }

    public boolean isFinal() {
        return proximosPermitidos().isEmpty();
    }
}
