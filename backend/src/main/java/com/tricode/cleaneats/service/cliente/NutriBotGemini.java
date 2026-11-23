package com.tricode.cleaneats.service.cliente;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.service.ServicoExternoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Provedor alternativo do NutriBot: API do Google Gemini (camada gratuita), em streaming por SSE.
 * Ativado com NUTRIBOT_PROVEDOR=gemini e GEMINI_API_KEY no backend/.env; GEMINI_MODEL escolhe o modelo.
 * Mesmo contrato do caminho da Anthropic no NutriBotService: recebe o prompt de sistema já com o contexto real do
 * cliente, o histórico e a pergunta, e entrega o texto aos poucos.
 */
@Component
public class NutriBotGemini {

    /** Resultado de uma resposta: {@code bloqueada} quando o filtro de segurança do Gemini recusou. */
    public record Resultado(boolean bloqueada) {}

    private static final String BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final ObjectMapper json;
    private final String chave;
    /** Modelos tentados em ordem. Na camada gratuita um modelo pode ficar em "alta demanda" e o seguinte assume. */
    private final List<String> modelos;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    /** Erro antes de qualquer texto (HTTP != 200, timeout, conexão): dá para tentar o próximo modelo. */
    static final class Indisponivel extends IllegalStateException {
        Indisponivel(String msg) { super(msg); }
    }

    public NutriBotGemini(ObjectMapper json,
                          @Value("${GEMINI_API_KEY:}") String chave,
                          @Value("${GEMINI_MODELOS:gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash}") String modelos) {
        this.json = json; this.chave = chave;
        this.modelos = java.util.Arrays.stream(modelos.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public boolean configurado() { return chave != null && !chave.isBlank() && !modelos.isEmpty(); }

    /**
     * @param historico pares (autor, texto) em ordem cronológica, com autor "USUARIO" ou "BOT"
     */
    public Resultado responder(String sistema, List<Map.Entry<String, String>> historico, String pergunta, Consumer<String> aoTexto) {
        Indisponivel ultimo = null;
        for (int i = 0; i < modelos.size(); i++) {
            // Cada modelo tem 12 s para começar a responder; o último espera mais, porque não há outro depois dele.
            var espera = i == modelos.size() - 1 ? Duration.ofSeconds(45) : Duration.ofSeconds(12);
            try {
                return responder(modelos.get(i), espera, sistema, historico, pergunta, aoTexto);
            } catch (Indisponivel e) {
                ultimo = e;
            }
        }
        throw ultimo != null ? ultimo : new Indisponivel("Gemini: nenhum modelo configurado");
    }

    private Resultado responder(String modelo, Duration espera, String sistema, List<Map.Entry<String, String>> historico, String pergunta,
                                Consumer<String> aoTexto) {
        if (!configurado()) throw new ServicoExternoException("NutriBot indisponível: a chave da IA não está configurada no servidor.");
        var contents = new ArrayList<Map<String, Object>>();
        for (var m : historico) {
            contents.add(Map.of("role", "USUARIO".equals(m.getKey()) ? "user" : "model", "parts", List.of(Map.of("text", m.getValue()))));
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", pergunta))));
        var corpo = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", sistema))),
                "contents", contents,
                // Folga para o raciocínio interno dos modelos 3.x, que conta no mesmo limite e cortava a resposta com 1024.
                "generationConfig", Map.of("maxOutputTokens", 4096, "temperature", 0.6));

        HttpResponse<java.io.InputStream> resposta;
        try {
            var req = HttpRequest.newBuilder(URI.create(BASE + modelo + ":streamGenerateContent?alt=sse"))
                    .timeout(espera)
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", chave)
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo), StandardCharsets.UTF_8))
                    .build();
            resposta = http.send(req, HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServicoExternoException("NutriBot indisponível agora, tente de novo em instantes.");
        } catch (Exception e) {
            // Timeout ou falha de conexão antes de qualquer texto: também vale tentar o reserva.
            throw new Indisponivel("Gemini " + modelo + ": falha de conexão: " + e.getMessage());
        }

        try (var leitor = new BufferedReader(new InputStreamReader(resposta.body(), StandardCharsets.UTF_8))) {
            if (resposta.statusCode() != 200) {
                var erro = new StringBuilder();
                for (String l; (l = leitor.readLine()) != null && erro.length() < 600; ) erro.append(l);
                throw new Indisponivel("Gemini " + modelo + " " + resposta.statusCode() + ": " + erro);
            }
            boolean bloqueada = false;
            for (String linha; (linha = leitor.readLine()) != null; ) {
                if (!linha.startsWith("data:")) continue;
                JsonNode no = json.readTree(linha.substring(5).trim());
                if (no.path("promptFeedback").hasNonNull("blockReason")) bloqueada = true;
                for (JsonNode candidato : no.path("candidates")) {
                    for (JsonNode parte : candidato.path("content").path("parts")) {
                        if (parte.path("thought").asBoolean(false)) continue;
                        var texto = parte.path("text").asText("");
                        if (!texto.isEmpty()) aoTexto.accept(texto);
                    }
                    var fim = candidato.path("finishReason").asText("");
                    if (fim.equals("SAFETY") || fim.equals("PROHIBITED_CONTENT") || fim.equals("BLOCKLIST")) bloqueada = true;
                }
            }
            return new Resultado(bloqueada);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Gemini: falha ao ler a resposta: " + e.getMessage(), e);
        }
    }
}
