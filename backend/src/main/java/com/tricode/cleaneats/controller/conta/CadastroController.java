package com.tricode.cleaneats.controller.conta;

import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import com.tricode.cleaneats.domain.MetasIniciais;
import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.repository.RestricaoAlimentarRepository;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.conta.CadastroClienteService;
import com.tricode.cleaneats.service.conta.CadastroClienteService.DadosCliente;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Cadastro (CE-2) — etapa 3 do cliente e dados de apoio da tela 05. Dono: sessão principal. */
@RestController
@RequestMapping("/api")
public class CadastroController {

    public record CadastroClienteRequest(
            @NotBlank @Size(max = 120) String nome,
            @Size(max = 20) String telefone,
            @NotNull ObjetivoNutricional objetivo,
            List<@NotBlank String> restricoes,
            @NotNull @DecimalMin("30") @DecimalMax("300") BigDecimal pesoKg,
            @NotNull @DecimalMin("100") @DecimalMax("230") BigDecimal alturaCm,
            @NotNull @Min(14) @Max(110) Integer idade,
            @NotNull OffsetDateTime aceiteTermosEm) {}

    public record RestricaoDto(String slug, String nome) {}

    private final CadastroClienteService cadastroClienteService;
    private final RestricaoAlimentarRepository restricaoRepository;

    public CadastroController(CadastroClienteService cadastroClienteService, RestricaoAlimentarRepository restricaoRepository) {
        this.cadastroClienteService = cadastroClienteService;
        this.restricaoRepository = restricaoRepository;
    }

    @PostMapping("/cadastro/cliente")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDto cadastrarCliente(@Valid @RequestBody CadastroClienteRequest req) {
        return cadastroClienteService.cadastrar(UsuarioLogado.id(), UsuarioLogado.email(), new DadosCliente(
                req.nome(), req.telefone(), req.objetivo(), req.restricoes(), req.pesoKg(), req.alturaCm(), req.idade(), req.aceiteTermosEm()));
    }

    /** Metas iniciais por objetivo (preview "Seu plano inicial" da tela 05). */
    @GetMapping("/cadastro/metas-iniciais")
    public Map<ObjetivoNutricional, MetasIniciais> metasIniciais() {
        var mapa = new LinkedHashMap<ObjetivoNutricional, MetasIniciais>();
        Arrays.stream(ObjetivoNutricional.values()).forEach(o -> mapa.put(o, MetasIniciais.para(o)));
        return mapa;
    }

    /** Catálogo público de restrições (telas 05, 22, filtros do marketplace). */
    @GetMapping("/restricoes")
    public List<RestricaoDto> restricoes() {
        return restricaoRepository.findAllByOrderByIdAsc().stream().map(r -> new RestricaoDto(r.getSlug(), r.getNome())).toList();
    }
}
