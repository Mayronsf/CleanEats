package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.TriagemNutriService;
import com.tricode.cleaneats.service.nutri.TriagemNutriService.AcaoTriagem;
import com.tricode.cleaneats.service.nutri.TriagemNutriService.ListaTriagens;
import com.tricode.cleaneats.service.nutri.TriagemNutriService.Metas;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

/** Rotas da tela 27 de triagens. */
@RestController
@RequestMapping("/api/nutri/triagens")
public class TriagemNutriController {
    private final TriagemNutriService servico;
    public TriagemNutriController(TriagemNutriService servico) { this.servico = servico; }

    @GetMapping
    public ListaTriagens listar(@RequestParam(defaultValue = "AGUARDANDO") String status,
                                @RequestParam(defaultValue = "ANTIGAS") String ordenacao,
                                @RequestParam(defaultValue = "0") int pagina,
                                @RequestParam(defaultValue = "10") int limite) {
        return servico.listar(UsuarioLogado.id(), status, ordenacao, pagina, limite);
    }

    @PostMapping("/{id}/iniciar")
    public AcaoTriagem iniciar(@PathVariable UUID id) { return servico.iniciar(UsuarioLogado.id(), id); }

    @PostMapping("/{id}/concluir")
    public AcaoTriagem concluir(@PathVariable UUID id, @RequestBody Metas metas) {
        return servico.concluir(UsuarioLogado.id(), id, metas);
    }
}
