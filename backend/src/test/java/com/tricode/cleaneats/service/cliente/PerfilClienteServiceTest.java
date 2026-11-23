package com.tricode.cleaneats.service.cliente;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/** Tela 22: IMC calculado no backend (CE-12). */
class PerfilClienteServiceTest {

    @Test
    void imcDoBrenoEh24Virgula6() {
        assertEquals(new BigDecimal("24.6"), PerfilClienteService.imc(new BigDecimal("78"), new BigDecimal("178")));
    }

    @Test
    void imcSemPesoOuAlturaEhNulo() {
        assertNull(PerfilClienteService.imc(null, new BigDecimal("178")));
        assertNull(PerfilClienteService.imc(new BigDecimal("78"), null));
    }
}
