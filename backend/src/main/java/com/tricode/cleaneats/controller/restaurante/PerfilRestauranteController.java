package com.tricode.cleaneats.controller.restaurante;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService;
import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService.CadastroReq;
import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService.PerfilDto;
import com.tricode.cleaneats.service.restaurante.PerfilRestauranteService.PerfilForm;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Cadastro (07) e perfil (44) do restaurante. Dono: frente C. */
@RestController
@RequestMapping("/api")
public class PerfilRestauranteController {

    private final PerfilRestauranteService servico;

    public PerfilRestauranteController(PerfilRestauranteService servico) {
        this.servico = servico;
    }

    @GetMapping("/painel-restaurante/perfil")
    public PerfilDto consultar() { return servico.consultar(UsuarioLogado.id()); }

    @PutMapping("/painel-restaurante/perfil")
    public PerfilDto salvar(@RequestBody PerfilForm form) { return servico.salvar(UsuarioLogado.id(), form); }

    @PostMapping(path = "/painel-restaurante/perfil/imagem", consumes = "multipart/form-data")
    public Map<String, String> imagem(@RequestParam("arquivo") MultipartFile arquivo) { return Map.of("url", servico.enviarImagem(UsuarioLogado.id(), arquivo)); }

    /** Tela 07: conta autenticada no Supabase, ainda sem perfil. */
    @PostMapping("/cadastro/restaurante")
    @ResponseStatus(HttpStatus.CREATED)
    public PerfilDto cadastrar(@RequestBody CadastroReq req) { return servico.cadastrar(UsuarioLogado.id(), UsuarioLogado.email(), req); }

    @PostMapping(path = "/cadastro/restaurante/logo", consumes = "multipart/form-data")
    public Map<String, String> logo(@RequestParam("arquivo") MultipartFile arquivo) { return Map.of("url", servico.enviarImagem(UsuarioLogado.id(), arquivo)); }

    @GetMapping("/cadastro/restaurante/cozinhas")
    public List<String> cozinhas() { return PerfilRestauranteService.COZINHAS; }
}
