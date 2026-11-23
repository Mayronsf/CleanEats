package com.tricode.cleaneats.controller.admin;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.admin.AdminService;
import com.tricode.cleaneats.service.admin.AdminService.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin (/admin*). Protegido por perfil ADMIN no SecurityConfig. Dono: frente C. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService servico;

    public AdminController(AdminService servico) {
        this.servico = servico;
    }

    @GetMapping("/aprovacoes")
    public AprovacoesDto aprovacoes(@RequestParam(defaultValue = "true") boolean pendentes) { return servico.aprovacoes(pendentes); }

    @PostMapping("/nutricionistas/{id}/avaliacao")
    public ResponseEntity<Void> nutri(@PathVariable UUID id, @RequestBody DecisaoReq d) { servico.avaliarNutricionista(UsuarioLogado.id(), id, d); return ResponseEntity.noContent().build(); }

    @PostMapping("/restaurantes/{id}/avaliacao")
    public ResponseEntity<Void> restaurante(@PathVariable UUID id, @RequestBody DecisaoReq d) { servico.avaliarRestaurante(UsuarioLogado.id(), id, d); return ResponseEntity.noContent().build(); }

    @PostMapping("/pratos/{id}/avaliacao")
    public ResponseEntity<Void> prato(@PathVariable UUID id, @RequestBody DecisaoReq d) { servico.avaliarPrato(UsuarioLogado.id(), id, d); return ResponseEntity.noContent().build(); }

    @GetMapping("/avaliacoes")
    public Map<String, Object> avaliacoes(@RequestParam(required = false) String status) {
        return Map.of("avaliacoes", servico.avaliacoes(status), "contagens", servico.contagemAvaliacoes());
    }

    @PostMapping("/avaliacoes/{id}/moderacao")
    public ResponseEntity<Void> moderar(@PathVariable UUID id, @RequestBody DecisaoReq d) { servico.moderar(id, d); return ResponseEntity.noContent().build(); }

    @GetMapping("/contatos")
    public List<ContatoDto> contatos(@RequestParam(defaultValue = "true") boolean abertos) { return servico.contatos(abertos); }

    @PatchMapping("/contatos/{id}")
    public ResponseEntity<Void> responder(@PathVariable UUID id, @RequestBody Map<String, Boolean> corpo) {
        servico.marcarRespondido(id, Boolean.TRUE.equals(corpo.get("respondido")));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/plataforma")
    public PlataformaDto plataforma() { return servico.plataforma(); }

    @PutMapping("/restaurantes/{id}/comissao")
    public RestauranteAdmin comissao(@PathVariable UUID id, @RequestBody Map<String, BigDecimal> corpo) { return servico.definirComissao(id, corpo.get("percentual")); }

    /** CE-16 SIMULADO. Corpo opcional: { ate: "aaaa-mm-dd" } (padrão: daqui a 1 mês). */
    @PostMapping("/assinaturas/simular-renovacao")
    public RenovacaoResultado simular(@RequestBody(required = false) Map<String, String> corpo) {
        var ate = corpo == null || corpo.get("ate") == null || corpo.get("ate").isBlank() ? null : LocalDate.parse(corpo.get("ate"));
        return servico.simularRenovacao(ate);
    }
}
