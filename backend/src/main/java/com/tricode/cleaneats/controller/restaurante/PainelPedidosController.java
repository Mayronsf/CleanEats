package com.tricode.cleaneats.controller.restaurante;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.restaurante.PainelPedidosService;
import com.tricode.cleaneats.service.restaurante.PainelPedidosService.FilaDto;
import com.tricode.cleaneats.service.restaurante.PainelPedidosService.MudarStatusReq;
import com.tricode.cleaneats.service.restaurante.PainelPedidosService.PedidoCard;
import com.tricode.cleaneats.service.restaurante.PainelPedidosService.ResumoDto;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Painel do restaurante: dashboard (36) e pedidos (37). Protegido por perfil RESTAURANTE no SecurityConfig. Dono: frente C. */
@RestController
@RequestMapping("/api/painel-restaurante")
public class PainelPedidosController {

    private final PainelPedidosService servico;

    public PainelPedidosController(PainelPedidosService servico) {
        this.servico = servico;
    }

    @GetMapping("/resumo")
    public ResumoDto resumo() { return servico.resumo(UsuarioLogado.id()); }

    @GetMapping("/pedidos")
    public FilaDto pedidos(@RequestParam(required = false) String aba) { return servico.fila(UsuarioLogado.id(), aba); }

    /** Corpo: { acao: ACEITAR | RECUSAR | PRONTO | RETIRADA, motivo? }. */
    @PatchMapping("/pedidos/{id}/status")
    public PedidoCard mudarStatus(@PathVariable UUID id, @RequestBody MudarStatusReq req) {
        return servico.mudarStatus(UsuarioLogado.id(), id, req);
    }
}
