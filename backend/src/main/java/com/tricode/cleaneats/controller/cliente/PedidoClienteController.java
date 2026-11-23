package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.PedidoClienteService;
import com.tricode.cleaneats.service.cliente.PedidoClienteService.PedidoCriado;
import com.tricode.cleaneats.service.cliente.PedidoClienteService.PedidoReq;
import com.tricode.cleaneats.service.cliente.PedidoClienteService.Previa;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Checkout (tela 16): POST /api/pedidos/previa (não grava) e POST /api/pedidos (confirma — CE-9). Dono: frente A. */
@RestController
@RequestMapping("/api/pedidos")
public class PedidoClienteController {

    private final PedidoClienteService servico;

    public PedidoClienteController(PedidoClienteService servico) {
        this.servico = servico;
    }

    @PostMapping("/previa")
    public Previa previa(@RequestBody PedidoReq req) {
        return servico.previa(UsuarioLogado.id(), req);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PedidoCriado confirmar(@RequestBody PedidoReq req) {
        return servico.confirmar(UsuarioLogado.id(), req);
    }
}
