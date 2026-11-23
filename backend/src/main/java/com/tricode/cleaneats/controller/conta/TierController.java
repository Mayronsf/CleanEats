package com.tricode.cleaneats.controller.conta;

import com.tricode.cleaneats.domain.Tier;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.repository.TierRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/** GET /api/tiers — planos e benefícios (telas 09, 23). Público. Dono: sessão principal. */
@RestController
@RequestMapping("/api/tiers")
public class TierController {

    public record TierDto(TierAssinatura codigo, String nome, BigDecimal precoMensal, BigDecimal precoAnual,
                          BigDecimal descontoPedido, int limiteNutribotDia, boolean nutricionistaDedicado,
                          boolean prescricaoDigital, BigDecimal entregaGratisAcima) {
        static TierDto de(Tier t) {
            return new TierDto(t.getId(), t.getNome(), t.getPrecoMensal(), t.getPrecoAnual(), t.getDescontoPedido(),
                    t.getLimiteNutribotDia(), t.getNutricionistaDedicado(), t.getPrescricaoDigital(), t.getEntregaGratisAcima());
        }
    }

    private final TierRepository tierRepository;

    public TierController(TierRepository tierRepository) {
        this.tierRepository = tierRepository;
    }

    @GetMapping
    public List<TierDto> listar() {
        return tierRepository.findAllByOrderByOrdemAsc().stream().map(TierDto::de).toList();
    }
}
