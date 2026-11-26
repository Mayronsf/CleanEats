package com.tricode.cleaneats.controller.restaurante;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.restaurante.GestaoRestauranteService;
import com.tricode.cleaneats.service.restaurante.GestaoRestauranteService.AnalyticsDto;
import com.tricode.cleaneats.service.restaurante.GestaoRestauranteService.Arquivo;
import com.tricode.cleaneats.service.restaurante.GestaoRestauranteService.FinanceiroDto;
import com.tricode.cleaneats.service.restaurante.GestaoRestauranteService.RelatorioGerado;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Analytics (41), Financeiro (42) e Relatórios (43) do restaurante. Dono: frente C. */
@RestController
@RequestMapping("/api/painel-restaurante")
public class GestaoRestauranteController {

    private final GestaoRestauranteService servico;

    public GestaoRestauranteController(GestaoRestauranteService servico) {
        this.servico = servico;
    }

    @GetMapping("/analytics")
    public AnalyticsDto analytics(@RequestParam(defaultValue = "7") int dias) { return servico.analytics(UsuarioLogado.id(), dias); }

    @GetMapping("/financeiro")
    public FinanceiroDto financeiro(@RequestParam(required = false) String mes) { return servico.financeiro(UsuarioLogado.id(), mes); }

    @GetMapping("/financeiro/csv")
    public ResponseEntity<byte[]> financeiroCsv(@RequestParam(required = false) String mes) { return baixar(servico.financeiroCsv(UsuarioLogado.id(), mes)); }

    @GetMapping("/financeiro/pdf")
    public ResponseEntity<byte[]> financeiroPdf(@RequestParam(required = false) String mes) { return baixar(servico.financeiroPdf(UsuarioLogado.id(), mes)); }

    @GetMapping("/relatorios")
    public List<RelatorioGerado> historico() { return servico.historico(UsuarioLogado.id()); }

    /** Gera e registra no histórico. ?registrar=false só baixa de novo (botão "Baixar" do histórico). */
    @GetMapping("/relatorios/{tipo}")
    public ResponseEntity<byte[]> gerar(@PathVariable String tipo, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
                                        @RequestParam(defaultValue = "PDF") String formato, @RequestParam(defaultValue = "true") boolean registrar) {
        return baixar(servico.gerar(UsuarioLogado.id(), tipo, inicio, fim, formato, registrar));
    }

    private static ResponseEntity<byte[]> baixar(Arquivo a) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(a.nome(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentType(MediaType.parseMediaType(a.tipoConteudo()))
                .body(a.conteudo());
    }
}
