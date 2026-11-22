package com.tricode.cleaneats.controller.conta;

import com.tricode.cleaneats.domain.ContatoSuporte;
import com.tricode.cleaneats.repository.ContatoSuporteRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** POST /api/contatos-suporte — aberto também a visitantes (cadastro). A fila é lida em /api/admin/**. */
@RestController
@RequestMapping("/api/contatos-suporte")
public class ContatoSuporteController {

    public record NovoContato(@NotBlank @Email @Size(max = 200) String email,
                              @NotBlank @Size(max = 200) String assunto,
                              @NotBlank @Size(min = 5, max = 4000) String mensagem) {}

    private final ContatoSuporteRepository repositorio;

    public ContatoSuporteController(ContatoSuporteRepository repositorio) {
        this.repositorio = repositorio;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> registrar(@Valid @RequestBody NovoContato dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID idUsuario = auth instanceof JwtAuthenticationToken jwt ? UUID.fromString(jwt.getToken().getSubject()) : null;
        var salvo = repositorio.save(new ContatoSuporte(idUsuario, dto.email(), dto.assunto(), dto.mensagem()));
        return Map.of("id", salvo.getId(), "mensagem", "Recebemos sua mensagem.");
    }
}
