package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.AssinaturaService;
import com.tricode.cleaneats.service.cliente.AssinaturaService.AssinarReq;
import com.tricode.cleaneats.service.cliente.AssinaturaService.AssinaturaDto;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Minha assinatura (telas 09 e 23, CE-15/CE-16). Pagamento SIMULADO. Dono: frente A. */
@RestController
@RequestMapping("/api/assinatura")
public class AssinaturaController {

    private final AssinaturaService servico;

    public AssinaturaController(AssinaturaService servico) {
        this.servico = servico;
    }

    @GetMapping
    public AssinaturaDto consultar() { return servico.consultar(UsuarioLogado.id()); }

    /** Assina ou troca de plano: { tier, ciclo, formaPagamento }. */
    @PostMapping
    public AssinaturaDto assinar(@RequestBody AssinarReq req) { return servico.assinar(UsuarioLogado.id(), req); }

    @PostMapping("/cancelamento")
    public AssinaturaDto cancelar() { return servico.cancelar(UsuarioLogado.id()); }

    @PostMapping("/reativacao")
    public AssinaturaDto reativar() { return servico.reativar(UsuarioLogado.id()); }

    @PostMapping("/pausa")
    public AssinaturaDto pausar() { return servico.pausar(UsuarioLogado.id()); }

    @PostMapping("/retomada")
    public AssinaturaDto retomar() { return servico.retomar(UsuarioLogado.id()); }

    @PatchMapping("/forma-pagamento")
    public AssinaturaDto formaPagamento(@RequestBody Map<String, String> corpo) {
        return servico.trocarFormaPagamento(UsuarioLogado.id(), corpo.get("formaPagamento"));
    }

    @GetMapping("/faturas/pdf")
    public ResponseEntity<byte[]> faturasPdf() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("cleaneats-faturas.pdf", StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentType(MediaType.APPLICATION_PDF)
                .body(servico.faturasPdf(UsuarioLogado.id()));
    }
}
