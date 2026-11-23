package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService.Horario;
import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService.PerfilForm;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Telas 07/44: validação do cadastro do restaurante. */
class PerfilRestauranteServiceTest {

    private PerfilForm form(String cnpj, String descricao, List<Horario> horarios) {
        return new PerfilForm("Grãos & Cia", null, cnpj, "(81) 99999-0000", "Marmitas integrais", descricao, "52020-020", "Rua do Espinheiro", "410", null,
                "Espinheiro", "Recife", "PE", List.of("Integral"), horarios, 30, 45, null, null, null, null, null, null, null);
    }
    private static final String DESC = "a".repeat(120);
    private static final List<Horario> SEG = List.of(new Horario(1, true, "08:00", "22:00"));

    @Test
    void cadastroValido() { assertDoesNotThrow(() -> PerfilRestauranteService.validar(form("11.222.333/0001-81", DESC, SEG), true)); }

    @Test
    void cnpjInvalido() { assertThrows(IllegalArgumentException.class, () -> PerfilRestauranteService.validar(form("11.222.333/0001-82", DESC, SEG), true)); }

    @Test
    void descricaoCurtaSoBloqueiaNoCadastro() {
        assertThrows(IllegalArgumentException.class, () -> PerfilRestauranteService.validar(form("11222333000181", "curta", SEG), true));
        assertDoesNotThrow(() -> PerfilRestauranteService.validar(form("11222333000181", "curta", SEG), false));
    }

    @Test
    void horarioFechandoAntesDeAbrir() {
        assertThrows(IllegalArgumentException.class, () -> PerfilRestauranteService.validar(form("11222333000181", DESC, List.of(new Horario(1, true, "22:00", "08:00"))), true));
        assertThrows(IllegalArgumentException.class, () -> PerfilRestauranteService.validar(form("11222333000181", DESC, List.of(new Horario(1, false, "08:00", "22:00"))), true));
    }

    @Test
    void sigla() {
        assertEquals("GC", PerfilRestauranteService.sigla("Grãos & Cia"));
        assertEquals("SN", PerfilRestauranteService.sigla("Sabor Natural"));
        assertEquals("VE", PerfilRestauranteService.sigla("Verdura"));
    }
}
