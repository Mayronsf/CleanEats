package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.service.cliente.AcompanhamentoService.Nutrientes;
import com.tricode.cleaneats.service.cliente.NutriBotService.ContextoDto;
import com.tricode.cleaneats.service.cliente.NutriBotService.PedidoHoje;
import com.tricode.cleaneats.service.cliente.NutriBotService.RefeicaoHoje;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Tela 25: o prompt carrega os números reais do dia; limite por tier. */
class NutriBotServiceTest {

    private ContextoDto contexto(int consumidas, List<PedidoHoje> pedidos) {
        var metas = new Nutrientes(2200, new BigDecimal("140"), new BigDecimal("240"), new BigDecimal("70"), new BigDecimal("30"), 2500);
        var consumo = new Nutrientes(consumidas, new BigDecimal("86"), new BigDecimal("142"), new BigDecimal("42"), new BigDecimal("18"), 1400);
        return new ContextoDto("Breno Filho", "PRO", "GANHO_MASSA", metas, consumo, 2200 - consumidas, new BigDecimal("54"),
                List.of("Sem lactose"), null,
                List.of(new RefeicaoHoje("15:30", "LANCHE_TARDE", "Açaí Proteico", "Açaí Club", 350, new BigDecimal("25"), false, "Pré-treino")),
                pedidos, "Lanche 15:30 · Açaí Proteico", "Dra. Ana Souza");
    }

    @Test
    void promptTemNumerosReaisDoDia() {
        var p = NutriBotService.contextoParaPrompt(contexto(1247, List.of()));
        assertTrue(p.contains("Breno"));
        assertTrue(p.contains("Consumido hoje: 1247 kcal"));
        assertTrue(p.contains("Restam hoje: 953 kcal e 54 g"));
        assertTrue(p.contains("Sem lactose"));
        assertTrue(p.contains("Açaí Proteico") && p.contains("pendente"));
        assertTrue(p.contains("Pedidos de hoje: nenhum"));
    }

    @Test
    void depoisDeUmPedidoOContextoMuda() {
        var antes = NutriBotService.contextoParaPrompt(contexto(1247, List.of()));
        var depois = NutriBotService.contextoParaPrompt(contexto(1759, List.of(new PedidoHoje("CE-4901", "NOVO", "1x Salmão com Quinoa", 512))));
        assertNotEquals(antes, depois);
        assertTrue(depois.contains("Restam hoje: 441 kcal"));
        assertTrue(depois.contains("CE-4901"));
    }

    @Test
    void limitePorTier() {
        assertFalse(TierAssinatura.FREE.nutriBotDisponivel());
        assertTrue(TierAssinatura.BASIC.podePerguntarAoNutriBot(4));
        assertFalse(TierAssinatura.BASIC.podePerguntarAoNutriBot(5));
        assertTrue(TierAssinatura.PRO.podePerguntarAoNutriBot(500));
    }
}
