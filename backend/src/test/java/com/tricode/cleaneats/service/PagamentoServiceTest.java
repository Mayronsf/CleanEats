package com.tricode.cleaneats.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PagamentoServiceTest {

    private final PagamentoService service = new PagamentoService(new ObjectMapper(), "", "pagamentos@cleaneats.com.br");

    @Test
    void geraBrCodeEmvValidoEConfirmaNoModoDemo() {
        UUID usuario = UUID.randomUUID();
        var cobranca = service.criarCobrancaPix(usuario, "cliente@cleaneats.test",
                new PagamentoService.CriarPixReq(new BigDecimal("29.76"), "Pedido Verde Vida", "ref-1"));

        assertFalse(service.mercadoPagoAtivo());
        assertEquals("SIMULADO", cobranca.modo());
        assertEquals("PENDENTE", cobranca.status());
        assertTrue(cobranca.qrCode().startsWith("000201"));
        assertTrue(cobranca.qrCode().contains("br.gov.bcb.pix"));
        assertTrue(cobranca.qrCode().contains("540529.76"));
        assertTrue(cobranca.qrCode().contains("CLEANEATS TRICODE"));

        var pendente = service.consultarStatus(usuario, cobranca.id());
        assertEquals("PENDENTE", pendente.status());

        var aprovado = service.confirmarDemo(usuario, cobranca.id());
        assertEquals("APROVADO", aprovado.status());
        assertNotNull(aprovado.pagoEm());

        var consultaFinal = service.consultarStatus(usuario, cobranca.id());
        assertEquals("APROVADO", consultaFinal.status());
    }

    @Test
    void bloqueiaConsultaDeOutroUsuario() {
        UUID dono = UUID.randomUUID();
        UUID outro = UUID.randomUUID();
        var cobranca = service.criarCobrancaPix(dono, "a@test.com",
                new PagamentoService.CriarPixReq(new BigDecimal("45.00"), "Assinatura Pro", "ass-1"));

        assertThrows(RecursoNaoEncontradoException.class, () -> service.consultarStatus(outro, cobranca.id()));
        assertThrows(RecursoNaoEncontradoException.class, () -> service.confirmarDemo(outro, cobranca.id()));
    }

    @Test
    void mapeiaStatusMercadoPago() {
        assertEquals("APROVADO", PagamentoService.mapearStatusMercadoPago("approved"));
        assertEquals("PENDENTE", PagamentoService.mapearStatusMercadoPago("pending"));
        assertEquals("REJEITADO", PagamentoService.mapearStatusMercadoPago("rejected"));
    }
}
