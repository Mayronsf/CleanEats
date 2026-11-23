package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.MensagensNutriService;
import com.tricode.cleaneats.service.nutri.MensagensNutriService.ConversaDto;
import com.tricode.cleaneats.service.nutri.MensagensNutriService.ConversaLinha;
import com.tricode.cleaneats.service.nutri.MensagensNutriService.MensagemDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Conversas da nutricionista com seus clientes (tela 33). */
@RestController
@RequestMapping("/api/nutri/conversas")
public class MensagensNutriController {

    private final MensagensNutriService servico;

    public MensagensNutriController(MensagensNutriService servico) { this.servico = servico; }

    @GetMapping
    public List<ConversaLinha> listar(@RequestParam(required = false) String busca) {
        return servico.listar(UsuarioLogado.id(), busca);
    }

    @GetMapping("/{idConversa}/mensagens")
    public List<MensagemDto> mensagens(@PathVariable UUID idConversa) {
        return servico.mensagens(UsuarioLogado.id(), idConversa);
    }

    @PostMapping("/{idConversa}/mensagens")
    @ResponseStatus(HttpStatus.CREATED)
    public MensagemDto enviar(@PathVariable UUID idConversa, @RequestBody Map<String, String> corpo) {
        return servico.enviar(UsuarioLogado.id(), idConversa, corpo.get("texto"));
    }

    @PostMapping("/cliente/{idCliente}")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversaDto abrirOuCriar(@PathVariable UUID idCliente) {
        return servico.abrirOuCriar(UsuarioLogado.id(), idCliente);
    }
}
