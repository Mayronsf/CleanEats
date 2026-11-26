package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.PagamentoService;
import com.tricode.cleaneats.service.PagamentoService.CobrancaPixDto;
import com.tricode.cleaneats.service.PagamentoService.CriarPixReq;
import com.tricode.cleaneats.service.PagamentoService.StatusPixDto;
import org.springframework.web.bind.annotation.*;

/** Gateway de pagamento PIX (Mercado Pago + fallback demonstração). */
@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {

    private final PagamentoService servico;

    public PagamentoController(PagamentoService servico) {
        this.servico = servico;
    }

    @PostMapping("/pix")
    public CobrancaPixDto criarPix(@RequestBody CriarPixReq req) {
        return servico.criarCobrancaPix(UsuarioLogado.id(), UsuarioLogado.email(), req);
    }

    @GetMapping("/pix/{id}/status")
    public StatusPixDto statusPix(@PathVariable String id) {
        return servico.consultarStatus(UsuarioLogado.id(), id);
    }

    @PostMapping("/pix/{id}/confirmar-demo")
    public StatusPixDto confirmarDemo(@PathVariable String id) {
        return servico.confirmarDemo(UsuarioLogado.id(), id);
    }
}
