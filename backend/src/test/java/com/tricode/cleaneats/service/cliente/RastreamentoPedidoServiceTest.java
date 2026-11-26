package com.tricode.cleaneats.service.cliente;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class RastreamentoPedidoServiceTest {

    @Test
    void interpolaPosicaoEVelocidadeAoLongoDaRota() {
        var rota = RastreamentoPedidoService.rotaCurvaFallback(new double[]{-8.1185, -34.8995}, new double[]{-8.0525, -34.9041});
        assertTrue(rota.size() >= 30);

        var inicio = RastreamentoPedidoService.interpolar(rota, 0.0, false);
        assertEquals(0, inicio.velocidadeKmh());
        assertEquals(-8.1185, inicio.lat(), 0.0001);

        var meio = RastreamentoPedidoService.interpolar(rota, 0.5, true);
        assertTrue(meio.velocidadeKmh() > 0);
        assertEquals(0.5, meio.progresso(), 0.01);

        var fim = RastreamentoPedidoService.interpolar(rota, 1.0, false);
        assertEquals(-8.0525, fim.lat(), 0.0001);
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
