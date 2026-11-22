package com.tricode.cleaneats.controller;

import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.service.UsuarioService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    /** Conta logada + perfil: o front usa para redirecionar à home do perfil (CE-1). */
    @GetMapping("/me")
    public UsuarioDto buscarUsuarioAtual(@AuthenticationPrincipal Jwt jwt) {
        return usuarioService.buscarUsuarioAtual(UUID.fromString(jwt.getSubject()));
    }
}
