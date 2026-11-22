package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.CicloCobranca;
import com.tricode.cleaneats.domain.Enums.StatusAssinatura;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class EntidadesTest {

    private Marmita frango() {
        var m = new Marmita(UUID.randomUUID(), "Frango Grelhado Fitness", "Alta Proteína", new BigDecimal("24.90"));
        m.setPorcaoG(350); m.setCalorias(420);
        m.setProteinas(new BigDecimal("38")); m.setCarboidratos(new BigDecimal("32")); m.setGorduras(new BigDecimal("12"));
        return m;
    }

    @Test
    void pratoSemFichaNaoVaiParaAnalise() {
        var m = new Marmita(UUID.randomUUID(), "Sem ficha", "X", BigDecimal.TEN);
        assertThrows(IllegalArgumentException.class, m::enviarParaAnalise);
    }

    @Test
    void curadoriaDoPrato() {
        var m = frango();
        m.enviarParaAnalise();
        assertEquals(StatusPrato.EM_ANALISE, m.getStatusPrato());
        assertFalse(m.visivelNoMarketplace());
        assertThrows(IllegalArgumentException.class, () -> m.avaliar(false, " ", UUID.randomUUID()));
        m.avaliar(true, null, UUID.randomUUID());
        assertTrue(m.visivelNoMarketplace());
    }

    @Test
    void pedidoProPremiumAplicaDescontoEComissaoCongelada() {
        var m = frango();
        m.setStatusPrato(StatusPrato.APROVADO);
        var p = new Pedido(UUID.randomUUID(), m.getIdRestaurante());
        p.adicionarItem(ItemPedido.de(m, 2));                       // 49,80
        p.fecharValores(TierAssinatura.PRO, new BigDecimal("6.00"), null, null);
        assertEquals(new BigDecimal("49.80"), p.getSubtotal());
        assertEquals(new BigDecimal("2.49"), p.getDesconto());     // 5% Pro
        assertEquals(new BigDecimal("53.31"), p.getTotal());       // 47,31 + 6,00
        assertEquals(new BigDecimal("8.00"), p.getComissaoPercentual());
        assertEquals(new BigDecimal("3.78"), p.getValorComissao()); // 8% de 47,31

        var premium = new Pedido(UUID.randomUUID(), m.getIdRestaurante());
        premium.adicionarItem(ItemPedido.de(m, 2));
        premium.fecharValores(TierAssinatura.PREMIUM, new BigDecimal("6.00"), null, new BigDecimal("10"));
        assertEquals(0, premium.getTaxaEntrega().signum());        // entrega grátis acima de R$ 30
        assertEquals(new BigDecimal("10"), premium.getComissaoPercentual());
    }

    @Test
    void pratoNaoAprovadoNaoEntraNoPedidoNemNoPlano() {
        var m = frango();
        assertThrows(IllegalArgumentException.class, () -> ItemPedido.de(m, 1));
        var plano = new PlanoAlimentar(UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 11, 23));
        assertThrows(IllegalArgumentException.class, () -> plano.definirRefeicao((short) 1, Enums.TipoRefeicao.ALMOCO, m, null));
    }

    @Test
    void statusDoPedidoValidado() {
        var p = new Pedido(UUID.randomUUID(), UUID.randomUUID());
        assertThrows(IllegalArgumentException.class, () -> p.mudarStatus(StatusPedido.ENTREGUE));
        p.mudarStatus(StatusPedido.ACEITO);
        assertEquals(StatusPedido.ACEITO, p.getStatus());
    }

    @Test
    void cancelamentoMantemBeneficiosAteORenovacao() {
        var a = new Assinatura(UUID.randomUUID(), TierAssinatura.PRO, CicloCobranca.MENSAL);
        assertEquals(new BigDecimal("59.90"), a.getValor());
        var encerra = a.cancelar();
        assertEquals(a.getRenovacaoEm(), encerra);
        assertEquals(StatusAssinatura.CANCELADA, a.getStatus());
        assertFalse(a.expirou(encerra.minusDays(1)));
        assertTrue(a.expirou(encerra));
    }

    @Test
    void consumoDoDiaSomaOPedido() {
        var m = frango();
        m.setStatusPrato(StatusPrato.APROVADO);
        var p = new Pedido(UUID.randomUUID(), m.getIdRestaurante());
        p.adicionarItem(ItemPedido.de(m, 1));
        var c = new ConsumoDiario(p.getIdUsuario(), LocalDate.now());
        c.somar(p);
        assertEquals(420, c.getCalorias());
        assertEquals(0, new BigDecimal("38").compareTo(c.getProteinas()));
    }

    @Test
    void imcDoBreno() {
        var perfil = new PerfilCliente(UUID.randomUUID());
        perfil.setPesoKg(new BigDecimal("78")); perfil.setAlturaCm(new BigDecimal("178"));
        assertEquals(new BigDecimal("24.6"), perfil.calcularImc());
    }
}
