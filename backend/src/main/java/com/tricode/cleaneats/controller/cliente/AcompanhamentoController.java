package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.AcompanhamentoService;
import com.tricode.cleaneats.service.cliente.AcompanhamentoService.ConsumoDto;
import com.tricode.cleaneats.service.cliente.AcompanhamentoService.PlanoDto;
import com.tricode.cleaneats.service.cliente.AcompanhamentoService.ResumoDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Home do cliente (tela 10) e Meu plano (tela 24): consumo do dia, plano ativo e resumo. Dono: frente A. */
@RestController
@RequestMapping("/api")
public class AcompanhamentoController {

    private final AcompanhamentoService servico;

    public AcompanhamentoController(AcompanhamentoService servico) {
        this.servico = servico;
    }

    @GetMapping("/consumo-diario")
    public ConsumoDto consumo(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return servico.consumo(UsuarioLogado.id(), data != null ? data : AcompanhamentoService.hoje());
    }

    @PostMapping("/consumo-diario/agua")
    public ConsumoDto agua(@RequestBody java.util.Map<String, Integer> corpo) {
        return servico.registrarAgua(UsuarioLogado.id(), corpo.getOrDefault("ml", 0));
    }

    /** 204 quando a nutricionista ainda não montou o plano (a tela mostra o estado vazio). */
    @GetMapping("/plano-alimentar")
    public ResponseEntity<PlanoDto> plano() {
        return servico.planoAtivo(UsuarioLogado.id()).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/cliente/resumo")
    public ResumoDto resumo() {
        return servico.resumo(UsuarioLogado.id());
    }
}
