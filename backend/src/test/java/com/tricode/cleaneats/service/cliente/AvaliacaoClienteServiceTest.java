package com.tricode.cleaneats.service.cliente;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Tela 20: tags e fotos viram array do Postgres sem quebrar com aspas/vírgulas. */
class AvaliacaoClienteServiceTest {

    @Test
    void montaArrayComAspasEscapadas() {
        assertEquals("{\"Bem temperado\",\"a \\\"b\\\", c\"}", AvaliacaoClienteService.arrayPg(List.of("Bem temperado", "a \"b\", c")));
    }

    @Test
    void arrayVazio() {
        assertEquals("{}", AvaliacaoClienteService.arrayPg(List.of()));
    }
}
