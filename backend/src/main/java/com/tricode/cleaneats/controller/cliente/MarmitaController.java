package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.CategoriaDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.PratoDetalheDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.PratoDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.CatalogoService;
import com.tricode.cleaneats.service.cliente.CatalogoService.Filtros;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Marketplace (tela 11), detalhe (12) e favoritos. GET é público; logado, aplica perfil do cliente. Dono: frente A. */
@RestController
@RequestMapping("/api")
public class MarmitaController {

    private final CatalogoService catalogo;

    public MarmitaController(CatalogoService catalogo) {
        this.catalogo = catalogo;
    }

    @GetMapping("/marmitas")
    public PaginaDto<PratoDto> listar(@RequestParam(required = false) String busca,
                                      @RequestParam(required = false) String selo,
                                      @RequestParam(required = false) List<String> proteina,
                                      @RequestParam(required = false) List<String> calorias,
                                      @RequestParam(required = false) BigDecimal precoMin,
                                      @RequestParam(required = false) BigDecimal precoMax,
                                      @RequestParam(required = false) List<UUID> restaurante,
                                      @RequestParam(required = false) BigDecimal notaMin,
                                      @RequestParam(required = false) String objetivo,
                                      @RequestParam(required = false) String ordenar,
                                      @RequestParam(defaultValue = "false") boolean favoritos,
                                      @RequestParam(defaultValue = "true") boolean restricoes,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "12") int tamanho) {
        var filtros = new Filtros(busca, selo, proteina, calorias, precoMin, precoMax, restaurante, notaMin,
                objetivo, ordenar, favoritos, restricoes);
        return catalogo.listar(filtros, UsuarioLogado.idOpcional(), Math.max(0, pagina), tamanho);
    }

    /** Contagens da lateral (tela 11). */
    @GetMapping("/marmitas/facetas")
    public CatalogoService.Facetas facetas(@RequestParam(required = false) String busca, @RequestParam(required = false) String selo,
                                           @RequestParam(defaultValue = "false") boolean favoritos,
                                           @RequestParam(defaultValue = "true") boolean restricoes) {
        var f = new Filtros(busca, selo, null, null, null, null, null, null, null, null, favoritos, restricoes);
        return catalogo.facetas(f, UsuarioLogado.idOpcional());
    }

    @GetMapping("/marmitas/categorias")
    public List<CategoriaDto> categorias() {
        return catalogo.categorias(UsuarioLogado.idOpcional());
    }

    @GetMapping("/marmitas/{id}")
    public PratoDetalheDto detalhe(@PathVariable UUID id) {
        return catalogo.detalhe(id, UsuarioLogado.idOpcional());
    }

    @GetMapping("/favoritos")
    public Map<String, List<UUID>> favoritos() {
        return Map.of("ids", catalogo.idsFavoritos(UsuarioLogado.id()));
    }

    @PostMapping("/favoritos/{idMarmita}")
    public ResponseEntity<Void> favoritar(@PathVariable UUID idMarmita) {
        catalogo.favoritar(UsuarioLogado.id(), idMarmita);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/favoritos/{idMarmita}")
    public ResponseEntity<Void> desfavoritar(@PathVariable UUID idMarmita) {
        catalogo.desfavoritar(UsuarioLogado.id(), idMarmita);
        return ResponseEntity.noContent().build();
    }
}
