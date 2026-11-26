package com.tricode.cleaneats.service.cliente;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class RastreamentoPedidoServiceTest {

    @Test
    void interpolaPosicaoEVelocidadeAoLongoDaRota() {
        var rota = RastreamentoPedidoService.rotaCurvaFallback(new double[]{-8.116169, -35.270785}, new double[]{-8.116215, -35.294658});
        assertTrue(rota.size() >= 30);

        var inicio = RastreamentoPedidoService.interpolar(rota, 0.0, false);
        assertEquals(0, inicio.velocidadeKmh());
        assertEquals(-8.116169, inicio.lat(), 0.0001);

        var meio = RastreamentoPedidoService.interpolar(rota, 0.5, true);
        assertTrue(meio.velocidadeKmh() > 0);
        assertEquals(0.5, meio.progresso(), 0.01);

        var fim = RastreamentoPedidoService.interpolar(rota, 1.0, false);
        assertEquals(-8.116215, fim.lat(), 0.0001);
    }

    @Test
    void placasSeguemPadraoMercosulERestaurantesFicamEmVitoriaDeSantoAntao() {
        for (String[] v : RastreamentoPedidoService.VEICULOS) {
            assertTrue(v[1].matches("^[A-Z]{3}[0-9][A-Z][0-9]{2}$"), "Placa fora do padrão Mercosul: " + v[1]);
        }
        RastreamentoPedidoService.COORDS_RESTAURANTES.forEach((nome, coord) -> {
            assertTrue(coord[0] < -8.08 && coord[0] > -8.16, "Latitude fora de Vitória de Santo Antão para " + nome);
            assertTrue(coord[1] < -35.24 && coord[1] > -35.34, "Longitude fora de Vitória de Santo Antão para " + nome);
        });
    }

    @Test
    void calculaProgressoEEtaPorStatus() {
        var agora = OffsetDateTime.now();
        assertEquals(0.0, RastreamentoPedidoService.calcularProgresso("PREPARANDO", null, null, agora));
        assertEquals(1.0, RastreamentoPedidoService.calcularProgresso("ENTREGUE", null, null, agora));
        double emRota = RastreamentoPedidoService.calcularProgresso("A_CAMINHO", agora.minusSeconds(20), agora.plusSeconds(20), agora);
        assertTrue(emRota >= 0.45 && emRota <= 0.55);
        assertEquals(0, RastreamentoPedidoService.calcularEtaMinutos("ENTREGUE", null, 35, 1.0, agora));
        assertTrue(RastreamentoPedidoService.calcularEtaMinutos("A_CAMINHO", agora.plusSeconds(120), 35, 0.5, agora) >= 1);
    }
}
