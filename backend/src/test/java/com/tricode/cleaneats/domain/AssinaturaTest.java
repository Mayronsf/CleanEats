package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.CicloCobranca;
import com.tricode.cleaneats.domain.Enums.StatusAssinatura;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Tela 23 / CE-16: cancelar, reativar, pausar, retomar e forma de pagamento. */
class AssinaturaTest {

    private Assinatura pro() { return new Assinatura(UUID.randomUUID(), TierAssinatura.PRO, CicloCobranca.MENSAL); }

    @Test
    void reativarDesfazOCancelamentoAntesDoFimDoPeriodo() {
        var a = pro();
        a.cancelar();
        a.reativar(OffsetDateTime.now());
        assertEquals(StatusAssinatura.ATIVA, a.getStatus());
        assertNull(a.getEncerraEm());
    }

    @Test
    void naoReativaDepoisQueOPeriodoPagoTerminou() {
        var a = pro();
        var encerra = a.cancelar();
        assertThrows(IllegalArgumentException.class, () -> a.reativar(encerra.plusDays(1)));
    }

    @Test
    void retomarAntesDoFimDaPausaAdiaSoPelosDiasPausados() {
        var a = pro();
        var renovacao = a.getRenovacaoEm();
        var agora = OffsetDateTime.now();
        a.pausar(agora.plusDays(30));
        a.retomar(agora.plusDays(10));
        assertEquals(StatusAssinatura.ATIVA, a.getStatus());
        assertEquals(renovacao.plusDays(10).toEpochSecond(), a.getRenovacaoEm().toEpochSecond(), 1);
    }

    @Test
    void formaDePagamentoSoAceitaPixOuCartao() {
        var a = pro();
        a.setFormaPagamento("PIX");
        assertEquals("PIX", a.getFormaPagamento());
        assertThrows(IllegalArgumentException.class, () -> a.setFormaPagamento("BOLETO"));
    }

    @Test
    void valorAnualVemDoTier() {
        assertEquals(TierAssinatura.PRO.getPrecoAnual(), new Assinatura(UUID.randomUUID(), TierAssinatura.PRO, CicloCobranca.ANUAL).getValor());
    }
}
