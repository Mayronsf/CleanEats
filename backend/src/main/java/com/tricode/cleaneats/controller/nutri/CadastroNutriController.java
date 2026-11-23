package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.CadastroNutriService;
import com.tricode.cleaneats.service.nutri.CadastroNutriService.DadosCadastro;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Cadastro autenticado da nutricionista sem perfil prévio. */
@RestController
@RequestMapping("/api/cadastro/nutricionista")
public class CadastroNutriController {
    private final CadastroNutriService servico;
    public CadastroNutriController(CadastroNutriService servico) { this.servico = servico; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDto cadastrar(@RequestBody DadosCadastro dados) {
        return servico.cadastrar(UsuarioLogado.id(), UsuarioLogado.email(), dados);
    }
}
