package com.tricode.cleaneats.service.nutri;

import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CadastroNutriServiceTest {
    private CadastroNutriService.DadosCadastro dados(String crn) {
        return new CadastroNutriService.DadosCadastro("Ana Souza", crn, List.of("Nutrição Clínica"), 5,
                "Nutricionista com experiência em acompanhamento individual e planos alimentares acessíveis para diferentes rotinas.",
                List.of(new CadastroNutriService.Disponibilidade(1, "09:00", "18:00")), OffsetDateTime.now());
    }

    @Test void aceitaCrnNoFormatoRegional() {
        assertDoesNotThrow(() -> CadastroNutriService.validar(dados("CRN-6 PE 12345/P")));
        assertDoesNotThrow(() -> CadastroNutriService.validar(dados("CRN-11 CE 7/A")));
    }

    @Test void rejeitaCrnForaDoFormato() {
        for (String crn : List.of("12345/P", "CRN-6 12345/P", "CRN-12 PE 12345/P", "CRN-6 pe 12345/P", "CRN-6 PE 12345/PP"))
            assertThrows(IllegalArgumentException.class, () -> CadastroNutriService.validar(dados(crn)), crn);
    }
}
