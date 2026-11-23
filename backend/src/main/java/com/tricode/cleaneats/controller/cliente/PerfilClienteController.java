package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.PerfilClienteService;
import com.tricode.cleaneats.service.cliente.PerfilClienteService.AtualizarPerfilReq;
import com.tricode.cleaneats.service.cliente.PerfilClienteService.EstatisticasDto;
import com.tricode.cleaneats.service.cliente.PerfilClienteService.PerfilDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** Perfil do cliente (telas 21 e 22, CE-12). Dono: frente A. */
@RestController
@RequestMapping("/api/perfil")
public class PerfilClienteController {

    private final PerfilClienteService servico;

    public PerfilClienteController(PerfilClienteService servico) {
        this.servico = servico;
    }

    @GetMapping
    public PerfilDto consultar() { return servico.consultar(UsuarioLogado.id()); }

    @PutMapping
    public PerfilDto atualizar(@RequestBody AtualizarPerfilReq req) { return servico.atualizar(UsuarioLogado.id(), req); }

    @GetMapping("/estatisticas")
    public EstatisticasDto estatisticas() { return servico.estatisticas(UsuarioLogado.id()); }

    @PostMapping(path = "/avatar", consumes = "multipart/form-data")
    public PerfilDto avatar(@RequestParam("arquivo") MultipartFile arquivo) { return servico.enviarFoto(UsuarioLogado.id(), arquivo, false); }

    @DeleteMapping("/avatar")
    public PerfilDto removerAvatar() { return servico.removerFoto(UsuarioLogado.id()); }

    @PostMapping(path = "/capa", consumes = "multipart/form-data")
    public PerfilDto capa(@RequestParam("arquivo") MultipartFile arquivo) { return servico.enviarFoto(UsuarioLogado.id(), arquivo, true); }

    @PutMapping("/preferencias-notificacao")
    public Map<String, Boolean> preferencias(@RequestBody Map<String, Boolean> prefs) {
        return servico.salvarPreferencias(UsuarioLogado.id(), prefs);
    }

    /** LGPD: anonimiza e bloqueia o login. O front faz signOut em seguida. */
    @DeleteMapping
    public ResponseEntity<Void> excluir() {
        servico.excluirConta(UsuarioLogado.id());
        return ResponseEntity.noContent().build();
    }
}
