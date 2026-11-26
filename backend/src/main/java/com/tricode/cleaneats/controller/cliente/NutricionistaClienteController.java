package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.NutricionistaClienteService;
import com.tricode.cleaneats.service.cliente.NutricionistaClienteService.CatalogoNutrisDto;
import com.tricode.cleaneats.service.cliente.NutricionistaClienteService.NutricionistaCardDto;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Descoberta e escolha de nutricionistas pelo cliente (público para explorar; escolher exige Pro/Premium). */
@RestController
@RequestMapping("/api/nutricionistas")
public class NutricionistaClienteController {

    private final NutricionistaClienteService servico;

    public NutricionistaClienteController(NutricionistaClienteService servico) {
        this.servico = servico;
    }

    @GetMapping
    public CatalogoNutrisDto listar(
            @RequestParam(required = false) String especialidade,
            @RequestParam(required = false) String ordenar) {
        return servico.listar(UsuarioLogado.idOpcional(), especialidade, ordenar);
    }

    @PutMapping("/{id}/escolher")
    public NutricionistaCardDto escolher(@PathVariable UUID id) {
        return servico.escolher(UsuarioLogado.id(), id);
    }
}
