package com.tricode.cleaneats.service;

import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import com.tricode.cleaneats.domain.MetasIniciais;
import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.domain.Usuario;
import com.tricode.cleaneats.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CadastroTest {

    private final UsuarioRepository repo = mock(UsuarioRepository.class);
    private final UsuarioService service = new UsuarioService(repo);

    @Test
    void criaContaComPerfilEAceite() {
        UUID id = UUID.randomUUID();
        when(repo.existsById(id)).thenReturn(false);
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        var dto = service.criarConta(id, "marina@cleaneats.test", " Marina Lima ", null, PerfilUsuario.CLIENTE, OffsetDateTime.now());
        assertEquals("Marina Lima", dto.nome());
        assertEquals(PerfilUsuario.CLIENTE, dto.perfil());
    }

    @Test
    void umPerfilPorConta() {
        UUID id = UUID.randomUUID();
        when(repo.existsById(id)).thenReturn(true);
        assertThrows(IllegalArgumentException.class,
                () -> service.criarConta(id, "x@cleaneats.test", "X", null, PerfilUsuario.CLIENTE, OffsetDateTime.now()));
        verify(repo, never()).save(any());
    }

    @Test
    void exigeAceiteENaoPermiteAdmin() {
        UUID id = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class,
                () -> service.criarConta(id, "x@cleaneats.test", "X", null, PerfilUsuario.CLIENTE, null));
        assertThrows(IllegalArgumentException.class,
                () -> service.criarConta(id, "x@cleaneats.test", "X", null, PerfilUsuario.ADMIN, OffsetDateTime.now()));
    }

    @Test
    void metasIniciaisDaTela05() {
        assertEquals(new MetasIniciais(2200, 140, 240, 70, 30), MetasIniciais.para(ObjetivoNutricional.GANHO_MASSA));
        assertEquals(1800, MetasIniciais.para(ObjetivoNutricional.EMAGRECIMENTO).calorias());
        assertEquals(100, MetasIniciais.para(ObjetivoNutricional.EQUILIBRIO).proteinas());
        assertEquals("peso normal", MetasIniciais.classificarImc(new BigDecimal("24.6")));
        assertEquals("sobrepeso", MetasIniciais.classificarImc(new BigDecimal("27")));
        assertEquals(2730, MetasIniciais.aguaMl(new BigDecimal("78")));
    }
}
