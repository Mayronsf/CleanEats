package com.tricode.cleaneats.service.admin;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/** Admin: CNPJ (cadastro 07 / curadoria) e nota recalculada ao publicar avaliação (CE-11). */
class AdminServiceTest {

    @Test
    void cnpjComDigitosVerificadores() {
        assertTrue(AdminService.cnpjValido("11.222.333/0001-81"));
        assertTrue(AdminService.cnpjValido("11222333000181"));
        assertFalse(AdminService.cnpjValido("11222333000182"));
        assertFalse(AdminService.cnpjValido("11111111111111"));
        assertFalse(AdminService.cnpjValido("123"));
    }

    @Test
    void publicarAvaliacaoAtualizaAMedia() {
        assertEquals(new BigDecimal("4.9"), AdminService.mediaIncremental(new BigDecimal("4.9"), 312, BigDecimal.valueOf(5)));
        assertEquals(new BigDecimal("4.0"), AdminService.mediaIncremental(new BigDecimal("5.0"), 1, BigDecimal.valueOf(3)));
        assertEquals(new BigDecimal("2.0"), AdminService.mediaIncremental(BigDecimal.ZERO, 0, BigDecimal.valueOf(2)));
    }
}
