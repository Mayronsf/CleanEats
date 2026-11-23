package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.CatalogoNutriService;
import com.tricode.cleaneats.service.nutri.CatalogoNutriService.Filtros;
import com.tricode.cleaneats.service.nutri.CatalogoNutriService.Prato;
import com.tricode.cleaneats.service.nutri.PlanoNutriService;
import com.tricode.cleaneats.service.nutri.PlanoNutriService.Plano;
import com.tricode.cleaneats.service.nutri.PlanoNutriService.PlanoForm;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Catálogo da nutri (tela 31) e editor de plano alimentar (tela 30). Dono: frente B. */
@RestController
@RequestMapping("/api/nutri")
public class PlanoNutriController {

    private final CatalogoNutriService catalogo;
    private final PlanoNutriService planos;

    public PlanoNutriController(CatalogoNutriService catalogo, PlanoNutriService planos) {
        this.catalogo = catalogo; this.planos = planos;
    }

    @GetMapping("/catalogo")
    public PaginaDto<Prato> catalogo(@RequestParam(required = false) String busca,
                                     @RequestParam(required = false) UUID restaurante,
                                     @RequestParam(required = false) String categoria,
                                     @RequestParam(required = false) String proteina,
                                     @RequestParam(required = false) String restricao,
                                     @RequestParam(defaultValue = "0") int pagina,
                                     @RequestParam(defaultValue = "12") int tamanho) {
        return catalogo.listar(UsuarioLogado.id(),
                new Filtros(busca, restaurante, categoria, CatalogoNutriService.converterProteina(proteina), restricao, pagina, tamanho));
    }

    @GetMapping("/clientes/{id}/plano")
    public Plano plano(@PathVariable UUID id) { return planos.consultar(UsuarioLogado.id(), id); }

    @PutMapping("/clientes/{id}/plano")
    public Plano salvar(@PathVariable UUID id, @RequestBody PlanoForm form) { return planos.salvar(UsuarioLogado.id(), id, form); }
}
