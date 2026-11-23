package com.tricode.cleaneats.service.nutri;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Envio da prescrição pelo endpoint HTTP do Resend. */
@Service
public class EmailService {
    private final String chave, remetente, redirecionar;
    private final RestClient http = RestClient.builder().baseUrl("https://api.resend.com").build();

    public EmailService(@Value("${cleaneats.email.resend-api-key:}") String chave,
                        @Value("${cleaneats.email.remetente:CleanEats <onboarding@resend.dev>}") String remetente,
                        @Value("${cleaneats.email.redirecionar-para:}") String redirecionar) {
        this.chave = chave; this.remetente = remetente; this.redirecionar = redirecionar;
    }

    public boolean enviar(String destinatarioOriginal, String nomeCliente, byte[] pdf) {
        if (chave == null || chave.isBlank()) return false;
        var destino = redirecionar == null || redirecionar.isBlank() ? destinatarioOriginal : redirecionar;
        var corpo = "Olá, " + nomeCliente + "! Sua prescrição nutricional está anexada."
                + (destino.equals(destinatarioOriginal) ? "" : " Destinatário original: " + destinatarioOriginal + ".");
        var requisicao = Map.of("from", remetente, "to", List.of(destino), "subject", "Sua prescrição nutricional CleanEats",
                "text", corpo, "attachments", List.of(Map.of("filename", "prescricao-nutricional.pdf", "content", Base64.getEncoder().encodeToString(pdf))));
        http.post().uri("/emails").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + chave).body(requisicao).retrieve().toBodilessEntity();
        return true;
    }
}
