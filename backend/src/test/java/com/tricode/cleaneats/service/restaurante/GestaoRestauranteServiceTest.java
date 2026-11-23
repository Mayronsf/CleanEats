package com.tricode.cleaneats.service.restaurante;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Tela 42/43: CSV abre no Excel (BOM, ;) e não executa fórmulas vindas de dados de usuário. */
class GestaoRestauranteServiceTest {

    @Test
    void csvComBomSeparadorEAspas() {
        var csv = new String(GestaoRestauranteService.csv(List.of("Prato", "Receita"), List.of(List.of("Bowl \"Fit\"", "32,90"))), StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("﻿\"Prato\";\"Receita\"\r\n"));
        assertTrue(csv.contains("\"Bowl \"\"Fit\"\"\";\"32,90\""));
    }

    @Test
    void celulaQueComecaComIgualNaoViraFormula() {
        var csv = new String(GestaoRestauranteService.csv(List.of("Cliente"), List.of(List.of("=HYPERLINK(\"x\")"))), StandardCharsets.UTF_8);
        assertTrue(csv.contains("\"'=HYPERLINK"));
    }
}
