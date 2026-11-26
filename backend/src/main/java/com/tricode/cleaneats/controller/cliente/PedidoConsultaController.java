package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.PedidoConsultaService;
import com.tricode.cleaneats.service.cliente.PedidoConsultaService.*;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/** Pedidos do cliente: detalhe (17/18), cancelamento, histórico (19) e pedir novamente. Só o dono do pedido acessa. Dono: frente A. */
@RestController
@RequestMapping("/api")
public class PedidoConsultaController {

    private final PedidoConsultaService servico;

    public PedidoConsultaController(PedidoConsultaService servico) {
        this.servico = servico;
    }

    @GetMapping("/pedidos/{id}")
    public PedidoDetalhe detalhe(@PathVariable UUID id) {
        return servico.detalhe(UsuarioLogado.id(), id);
    }

    @PostMapping("/pedidos/{id}/cancelamento")
    public PedidoDetalhe cancelar(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> corpo) {
        return servico.cancelar(UsuarioLogado.id(), id, corpo == null ? null : corpo.get("motivo"));
    }

    @PostMapping("/pedidos/{id}/pedir-novamente")
    public Repetir pedirNovamente(@PathVariable UUID id) {
        return servico.repetir(UsuarioLogado.id(), id);
    }

    @GetMapping("/historico-pedidos")
    public PaginaDto<PedidoResumo> historico(@RequestParam(required = false) String status, @RequestParam(required = false) String periodo,
                                             @RequestParam(required = false) String ordenar, @RequestParam(defaultValue = "0") int pagina,
                                             @RequestParam(defaultValue = "10") int tamanho) {
        return servico.historico(UsuarioLogado.id(), status, periodo, ordenar, Math.max(0, pagina), tamanho);
    }

    @GetMapping("/historico-pedidos/resumo")
    public ResumoHistorico resumo() {
        return servico.resumo(UsuarioLogado.id());
    }

    @GetMapping("/historico-pedidos/pdf")
    public ResponseEntity<byte[]> historicoPdf() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("cleaneats-historico-pedidos.pdf", StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentType(MediaType.APPLICATION_PDF)
                .body(servico.historicoPdf(UsuarioLogado.id()));
    }
}
