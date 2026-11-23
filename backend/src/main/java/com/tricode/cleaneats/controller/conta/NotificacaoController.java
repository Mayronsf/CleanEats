package com.tricode.cleaneats.controller.conta;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.Notificacao;
import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.repository.NotificacaoRepository;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** Central de notificações (CE-13) — sino da navbar do cliente e da sidebar dos painéis. Dono: sessão principal. */
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    public record NotificacaoDto(UUID id, TipoNotificacao tipo, String titulo, String corpo, String link, boolean lida, OffsetDateTime criadoEm) {
        static NotificacaoDto de(Notificacao n) {
            return new NotificacaoDto(n.getId(), n.getTipo(), n.getTitulo(), n.getCorpo(), n.getLink(), n.getLidaEm() != null, n.getCriadoEm());
        }
    }

    private final NotificacaoRepository repositorio;

    public NotificacaoController(NotificacaoRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public PaginaDto<NotificacaoDto> listar(@RequestParam(defaultValue = "0") int pagina,
                                           @RequestParam(defaultValue = "10") int tamanho) {
        var page = repositorio.findByIdUsuarioOrderByCriadoEmDesc(UsuarioLogado.id(), PageRequest.of(pagina, Math.min(tamanho, 50)));
        return PaginaDto.de(page, NotificacaoDto::de);
    }

    @GetMapping("/nao-lidas")
    public Map<String, Long> contarNaoLidas() {
        return Map.of("total", repositorio.countByIdUsuarioAndLidaEmIsNull(UsuarioLogado.id()));
    }

    @PatchMapping("/{id}/leitura")
    @Transactional
    public NotificacaoDto marcarComoLida(@PathVariable UUID id) {
        var n = repositorio.findById(id)
                .filter(x -> x.getIdUsuario().equals(UsuarioLogado.id()))   // só a própria notificação
                .orElseThrow(() -> new RecursoNaoEncontradoException("NOTIFICACAO", "Notificação não encontrada"));
        n.marcarComoLida();
        return NotificacaoDto.de(n);
    }

    @PatchMapping("/leitura")
    @Transactional
    public ResponseEntity<Map<String, Integer>> marcarTodasComoLidas() {
        int total = repositorio.marcarTodasComoLidas(UsuarioLogado.id());
        return ResponseEntity.ok(Map.of("atualizadas", total));
    }
}
