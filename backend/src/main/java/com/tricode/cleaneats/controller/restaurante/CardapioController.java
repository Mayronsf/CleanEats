package com.tricode.cleaneats.controller.restaurante;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.restaurante.CardapioService;
import com.tricode.cleaneats.service.restaurante.CardapioService.CardapioDto;
import com.tricode.cleaneats.service.restaurante.CardapioService.PratoDetalhe;
import com.tricode.cleaneats.service.restaurante.CardapioService.PratoForm;
import com.tricode.cleaneats.service.restaurante.CardapioService.SalvarResultado;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Cardápio do restaurante (telas 38, 39, 40; CE-3). Dono: frente C. */
@RestController
@RequestMapping("/api/painel-restaurante/pratos")
public class CardapioController {

    private final CardapioService servico;

    public CardapioController(CardapioService servico) {
        this.servico = servico;
    }

    @GetMapping
    public CardapioDto listar() { return servico.listar(UsuarioLogado.id()); }

    @GetMapping("/alergenos")
    public List<String> alergenos() { return CardapioService.ALERGENOS; }

    @GetMapping("/{id}")
    public PratoDetalhe detalhe(@PathVariable UUID id) { return servico.detalhe(UsuarioLogado.id(), id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SalvarResultado criar(@RequestBody PratoForm form) { return servico.salvar(UsuarioLogado.id(), null, form); }

    @PutMapping("/{id}")
    public SalvarResultado editar(@PathVariable UUID id, @RequestBody PratoForm form) { return servico.salvar(UsuarioLogado.id(), id, form); }

    @PostMapping("/{id}/pausa")
    public SalvarResultado pausa(@PathVariable UUID id) { return servico.alternarPausa(UsuarioLogado.id(), id); }

    @PostMapping("/{id}/reenvio")
    public SalvarResultado reenviar(@PathVariable UUID id) { return servico.reenviar(UsuarioLogado.id(), id); }

    @PostMapping(path = "/foto", consumes = "multipart/form-data")
    public Map<String, String> foto(@RequestParam("arquivo") MultipartFile arquivo) { return Map.of("url", servico.enviarFoto(UsuarioLogado.id(), arquivo)); }
}
