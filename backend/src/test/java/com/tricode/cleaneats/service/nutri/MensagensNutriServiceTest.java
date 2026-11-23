package com.tricode.cleaneats.service.nutri;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MensagensNutriServiceTest {

    @Test
    void validaMensagemVaziaENaoAceitaMaisDeQuatroMilCaracteres() {
        assertThrows(IllegalArgumentException.class, () -> MensagensNutriService.validarTexto("  \n "));
        assertThrows(IllegalArgumentException.class, () -> MensagensNutriService.validarTexto("a".repeat(4001)));
        assertEquals("a".repeat(4000), MensagensNutriService.validarTexto("a".repeat(4000)));
    }

    @Test
    void somenteMensagemDoClienteSemDataDeLeituraContaComoNaoLida() {
        var cliente = UUID.randomUUID();
        var nutricionista = UUID.randomUUID();

        assertTrue(MensagensNutriService.mensagemNaoLidaDoCliente(cliente, cliente, null));
        assertFalse(MensagensNutriService.mensagemNaoLidaDoCliente(nutricionista, cliente, null));
        assertFalse(MensagensNutriService.mensagemNaoLidaDoCliente(cliente, cliente, OffsetDateTime.now()));
    }
}
