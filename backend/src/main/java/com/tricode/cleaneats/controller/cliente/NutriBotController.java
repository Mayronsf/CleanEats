package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.ServicoExternoException;
import com.tricode.cleaneats.service.cliente.NutriBotService;
import com.tricode.cleaneats.service.cliente.NutriBotService.EstadoDto;
import com.tricode.cleaneats.service.cliente.NutriBotService.MensagemDto;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * NutriBot (tela 25). A pergunta responde em streaming (Server-Sent Events):
 * eventos "texto" (trecho da resposta), "fim" ({idConversa, mensagem}) e "erro" ({mensagem}). Dono: frente A.
 */
@RestController
@RequestMapping("/api/nutribot")
public class NutriBotController {

    private final NutriBotService servico;
    private final ExecutorService execucao = Executors.newVirtualThreadPerTaskExecutor();

    public NutriBotController(NutriBotService servico) {
        this.servico = servico;
    }

    @GetMapping
    public EstadoDto estado() { return servico.estado(UsuarioLogado.id()); }

    @GetMapping("/conversas/{id}")
    public List<MensagemDto> mensagens(@PathVariable UUID id) { return servico.mensagens(UsuarioLogado.id(), id); }

    @DeleteMapping("/conversas/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        servico.excluirConversa(UsuarioLogado.id(), id);
        return ResponseEntity.noContent().build();
    }

    /** Corpo: { texto, idConversa? }. Validações (limite do plano, texto vazio) respondem 422 antes de abrir o stream. */
    @PostMapping(path = "/perguntas", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter perguntar(@RequestBody Map<String, String> corpo) {
        var idUsuario = UsuarioLogado.id();
        var idConversa = corpo.get("idConversa") == null || corpo.get("idConversa").isBlank() ? null : UUID.fromString(corpo.get("idConversa"));
        var texto = corpo.get("texto");
        var limite = servico.limite(idUsuario);
        if (!limite.disponivel()) throw new IllegalArgumentException(limite.motivo());
        if (texto == null || texto.isBlank()) throw new IllegalArgumentException("Escreva sua pergunta");

        var emissor = new SseEmitter(120_000L);
        execucao.submit(() -> {
            try {
                servico.perguntar(idUsuario, idConversa, texto,
                        trecho -> enviar(emissor, "texto", Map.of("texto", trecho)),
                        (conversa, mensagem) -> enviar(emissor, "fim", Map.of("idConversa", conversa, "mensagem", mensagem)),
                        erro -> enviar(emissor, "erro", Map.of("mensagem", erro)));
                emissor.complete();
            } catch (IllegalArgumentException | ServicoExternoException e) {
                enviar(emissor, "erro", Map.of("mensagem", e.getMessage()));
                emissor.complete();
            } catch (RuntimeException e) {
                enviar(emissor, "erro", Map.of("mensagem", "NutriBot indisponível agora, tente de novo em instantes."));
                emissor.complete();
            }
        });
        return emissor;
    }

    private static void enviar(SseEmitter emissor, String evento, Object dados) {
        try {
            emissor.send(SseEmitter.event().name(evento).data(dados, MediaType.APPLICATION_JSON));
        } catch (IOException | IllegalStateException e) {
            // cliente fechou a aba: segue gravando a resposta no banco
        }
    }
}
