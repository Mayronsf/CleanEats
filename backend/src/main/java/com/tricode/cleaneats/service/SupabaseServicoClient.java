package com.tricode.cleaneats.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Chamadas ao Supabase com a chave de serviço (só no servidor): upload no Storage e administração do Auth.
 * Compartilhado (sessão principal) — frente A usa para avatar/capa e exclusão de conta; frente C para fotos de prato.
 */
@Service
public class SupabaseServicoClient {

    private static final Set<String> TIPOS = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAXIMO = 5L * 1024 * 1024;

    private final String url;
    private final String chave;
    private final RestClient http;

    public SupabaseServicoClient(@Value("${cleaneats.supabase.url}") String url,
                                 @Value("${cleaneats.supabase-servico.service-role-key:}") String chave) {
        this.url = url.replaceAll("/$", "");
        this.chave = chave;
        this.http = RestClient.builder().baseUrl(this.url)
                .defaultHeader("apikey", chave).defaultHeader("Authorization", "Bearer " + chave).build();
    }

    /** Envia uma imagem para um bucket público e devolve a URL pública. Valida tipo e tamanho (5 MB). */
    public String enviarImagem(String bucket, String pasta, MultipartFile arquivo) {
        exigirChave();
        if (arquivo == null || arquivo.isEmpty()) throw new IllegalArgumentException("Escolha uma imagem");
        if (!TIPOS.contains(arquivo.getContentType())) throw new IllegalArgumentException("Use uma imagem JPG, PNG, WEBP ou GIF");
        if (arquivo.getSize() > MAXIMO) throw new IllegalArgumentException("A imagem pode ter no máximo 5 MB");
        var extensao = switch (arquivo.getContentType()) {
            case "image/png" -> "png"; case "image/webp" -> "webp"; case "image/gif" -> "gif"; default -> "jpg";
        };
        var caminho = pasta + "/" + UUID.randomUUID() + "." + extensao;
        try {
            http.post().uri("/storage/v1/object/" + bucket + "/" + caminho)
                    .contentType(MediaType.parseMediaType(arquivo.getContentType()))
                    .header("x-upsert", "true").header("cache-control", "max-age=31536000")
                    .body(arquivo.getBytes()).retrieve().toBodilessEntity();
        } catch (IOException | RestClientException e) {
            throw new ServicoExternoException("Não foi possível enviar a imagem agora. Tente de novo.", e);
        }
        return url + "/storage/v1/object/public/" + bucket + "/" + caminho;
    }

    /**
     * LGPD: impede novo login da conta excluída sem apagar o histórico (pedidos dos restaurantes, faturas).
     * Troca o e-mail do Auth por um anônimo e bane o usuário por tempo indeterminado.
     */
    public void bloquearUsuarioAuth(UUID idUsuario, String emailAnonimo) {
        exigirChave();
        try {
            http.put().uri("/auth/v1/admin/users/{id}", idUsuario).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("email", emailAnonimo, "ban_duration", "876000h", "user_metadata", Map.of("anonimizado", true)))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            throw new ServicoExternoException("Não foi possível excluir a conta agora. Tente de novo.", e);
        }
    }

    private void exigirChave() {
        if (chave == null || chave.isBlank()) throw new ServicoExternoException("SUPABASE_SERVICE_ROLE_KEY não configurada no backend/.env");
    }
}
