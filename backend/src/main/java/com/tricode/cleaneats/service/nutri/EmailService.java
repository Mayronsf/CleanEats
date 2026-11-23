package com.tricode.cleaneats.service.nutri;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Envio da prescrição pelo endpoint HTTP do Resend (HTML estilizado CleanEats + anexo PDF). */
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
        var notaDemo = destino.equals(destinatarioOriginal) ? "" : " (destinatário original: " + destinatarioOriginal + ")";
        var texto = "Olá, " + nomeCliente + "! Sua prescrição nutricional CleanEats está pronta e anexada em PDF." + notaDemo;
        var html = """
                <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#FAFCF7;padding:32px 16px;color:#1A2E1A;">
                  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4EAE4;border-radius:18px;overflow:hidden;">
                    <div style="background:#5BB033;padding:22px 28px;color:#FFFFFF;">
                      <strong style="font-size:20px;letter-spacing:-0.02em;">CleanEats</strong>
                      <div style="font-size:12px;opacity:0.9;margin-top:2px;">Prescrição Nutricional Digital</div>
                    </div>
                    <div style="padding:28px;">
                      <h1 style="font-size:20px;margin:0 0 12px;color:#1A2E1A;">Olá, %s!</h1>
                      <p style="font-size:14px;line-height:1.6;color:#4A5A4A;margin:0 0 16px;">
                        Sua nutricionista acabou de emitir sua <strong>prescrição nutricional oficial</strong> com suas metas diárias e plano alimentar semanal.
                      </p>
                      <p style="font-size:14px;line-height:1.6;color:#4A5A4A;margin:0 0 20px;">
                        O documento completo em PDF está anexado neste e-mail e também disponível na plataforma CleanEats.
                      </p>
                      %s
                    </div>
                    <div style="background:#F0F3EE;padding:14px 28px;font-size:12px;color:#6E7D6E;text-align:center;">
                      CleanEats · TRICODE Solutions · Alimentação saudável com transparência nutricional
                    </div>
                  </div>
                </div>
                """.formatted(
                escapar(nomeCliente),
                notaDemo.isBlank() ? "" : "<p style=\"font-size:12px;color:#7A867A;background:#EBF5FC;padding:10px 14px;border-radius:10px;margin:0;\">Modo demonstração · destinatário original: " + escapar(destinatarioOriginal) + "</p>"
        );
        var requisicao = Map.of(
                "from", remetente,
                "to", List.of(destino),
                "subject", "Sua prescrição nutricional CleanEats",
                "text", texto,
                "html", html,
                "attachments", List.of(Map.of("filename", "prescricao-nutricional-cleaneats.pdf", "content", Base64.getEncoder().encodeToString(pdf)))
        );
        http.post().uri("/emails").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + chave).body(requisicao).retrieve().toBodilessEntity();
        return true;
    }

    private static String escapar(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
