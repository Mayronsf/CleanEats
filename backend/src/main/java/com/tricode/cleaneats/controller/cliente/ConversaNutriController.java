package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.ConversaNutriService;
import com.tricode.cleaneats.service.cliente.ConversaNutriService.ConversaDto;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Chat do cliente com a nutricionista vinculada ("Conversar com a nutri"). Dono: frente A. */
@RestController
@RequestMapping("/api/conversas/nutri")
public class ConversaNutriController {

    private final ConversaNutriService servico;

    public ConversaNutriController(ConversaNutriService servico) {
        this.servico = servico;
    }

    @GetMapping
    public ConversaDto consultar() { return servico.consultar(UsuarioLogado.id()); }

    @PostMapping("/mensagens")
    public ConversaDto enviar(@RequestBody Map<String, String> corpo) { return servico.enviar(UsuarioLogado.id(), corpo.get("texto")); }
}
