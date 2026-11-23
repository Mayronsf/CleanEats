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
                                      @RequestParam(required = false) List<String> categoria,
                                      @RequestParam(required = false) Integer proteinaMin,
                                      @RequestParam(required = false) Integer caloriasMax,
                                      @RequestParam(required = false) BigDecimal precoMin,
                                      @RequestParam(required = false) BigDecimal precoMax,
                                      @RequestParam(required = false) UUID idRestaurante,
                                      @RequestParam(required = false) BigDecimal notaMin,
                                      @RequestParam(required = false) String objetivo,
                                      @RequestParam(required = false) String ordenar,
                                      @RequestParam(defaultValue = "false") boolean favoritos,
                                      @RequestParam(defaultValue = "true") boolean restricoes,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "12") int tamanho) {
        var filtros = new Filtros(busca, categoria, proteinaMin, caloriasMax, precoMin, precoMax, idRestaurante, notaMin,
                objetivo, ordenar, favoritos, restricoes);
        return catalogo.listar(filtros, UsuarioLogado.idOpcional(), Math.max(0, pagina), tamanho);
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
