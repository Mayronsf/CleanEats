package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.AvaliacaoClienteService;
import com.tricode.cleaneats.service.cliente.AvaliacaoClienteService.AvaliacaoCriada;
import com.tricode.cleaneats.service.cliente.AvaliacaoClienteService.AvaliarReq;
import com.tricode.cleaneats.service.cliente.AvaliacaoClienteService.ContextoDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/** Avaliar pedido (tela 20, CE-11). Dono: frente A. */
@RestController
@RequestMapping("/api")
public class AvaliacaoClienteController {

    private final AvaliacaoClienteService servico;

    public AvaliacaoClienteController(AvaliacaoClienteService servico) {
        this.servico = servico;
    }

    @GetMapping("/pedidos/{id}/avaliacao")
    public ContextoDto contexto(@PathVariable UUID id) { return servico.contexto(UsuarioLogado.id(), id); }

    @PostMapping("/pedidos/{id}/avaliacoes")
    @ResponseStatus(HttpStatus.CREATED)
    public AvaliacaoCriada avaliar(@PathVariable UUID id, @RequestBody AvaliarReq req) { return servico.avaliar(UsuarioLogado.id(), id, req); }

    @PostMapping(path = "/avaliacoes/fotos", consumes = "multipart/form-data")
    public Map<String, String> foto(@RequestParam("arquivo") MultipartFile arquivo) {
        return Map.of("url", servico.enviarFoto(UsuarioLogado.id(), arquivo));
    }
}
