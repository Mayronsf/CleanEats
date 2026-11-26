package com.tricode.cleaneats.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gateway de pagamento PIX com suporte nativo à API do Mercado Pago (/v1/payments).
 * Quando MERCADOPAGO_ACCESS_TOKEN está configurado, gera cobrança PIX real (QR Code + polling de status).
 * Sem o token (ambiente acadêmico/demo), gera BR Code EMVCo válido (CRC16-CCITT) com confirmação simulada.
 */
@Service
public class PagamentoService {

    public record CriarPixReq(BigDecimal valor, String descricao, String referencia) {}

    public record CobrancaPixDto(
            String id,
            String modo,          // MERCADO_PAGO | SIMULADO
            String status,        // PENDENTE | APROVADO | REJEITADO | EXPIRADO
            BigDecimal valor,
            String qrCode,        // Pix Copia e Cola (EMVCo BR Code)
            String qrCodeBase64,  // PNG base64 quando retornado pelo Mercado Pago
            String ticketUrl,     // Link do comprovante Mercado Pago (opcional)
            OffsetDateTime expiraEm
    ) {}

    public record StatusPixDto(String id, String modo, String status, OffsetDateTime pagoEm) {}

    private record CobrancaDemo(String id, UUID idUsuario, BigDecimal valor, OffsetDateTime expiraEm,
                                String status, OffsetDateTime pagoEm) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final int MINUTOS_EXPIRACAO = 5;

    private final RestClient http;
    private final ObjectMapper json;
    private final String accessToken;
    private final String chavePixDemo;
    private final ConcurrentHashMap<String, CobrancaDemo> cobrancasDemo = new ConcurrentHashMap<>();

    public PagamentoService(
            ObjectMapper json,
            @Value("${cleaneats.pagamento.mercadopago-access-token:}") String accessToken,
            @Value("${cleaneats.pagamento.chave-pix-demo:pagamentos@cleaneats.com.br}") String chavePixDemo) {
        this.http = RestClient.builder().baseUrl("https://api.mercadopago.com").build();
        this.json = json;
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.chavePixDemo = chavePixDemo == null || chavePixDemo.isBlank() ? "pagamentos@cleaneats.com.br" : chavePixDemo.trim();
    }

    public boolean mercadoPagoAtivo() {
        return !accessToken.isBlank();
    }

    public CobrancaPixDto criarCobrancaPix(UUID idUsuario, String email, CriarPixReq req) {
        if (req == null || req.valor() == null || req.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Informe um valor válido para gerar o Pix");
        }
        var valor = req.valor().setScale(2, RoundingMode.HALF_UP);
        var descricao = (req.descricao() == null || req.descricao().isBlank())
                ? "CleanEats · Pedido"
                : req.descricao().trim();
        if (descricao.length() > 140) descricao = descricao.substring(0, 140);
        var expiraEm = OffsetDateTime.now(FUSO).plusMinutes(MINUTOS_EXPIRACAO);

        if (mercadoPagoAtivo()) {
            return criarNoMercadoPago(email, valor, descricao, req.referencia(), expiraEm);
        }

        limparExpiradas();
        String id = "sim-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String txid = "CE" + id.substring(4, 14).toUpperCase(Locale.ROOT);
        String brCode = gerarBrCodePix(chavePixDemo, "CLEANEATS TRICODE", "RECIFE", valor, txid);
        cobrancasDemo.put(id, new CobrancaDemo(id, idUsuario, valor, expiraEm, "PENDENTE", null));
        return new CobrancaPixDto(id, "SIMULADO", "PENDENTE", valor, brCode, null, null, expiraEm);
    }

    public StatusPixDto consultarStatus(UUID idUsuario, String idPagamento) {
        if (idPagamento == null || idPagamento.isBlank()) {
            throw new IllegalArgumentException("Identificador de pagamento inválido");
        }
        if (!idPagamento.startsWith("sim-") && mercadoPagoAtivo()) {
            return consultarNoMercadoPago(idPagamento);
        }
        var demo = cobrancasDemo.get(idPagamento);
        if (demo == null || !demo.idUsuario().equals(idUsuario)) {
            throw new RecursoNaoEncontradoException("PAGAMENTO", "Cobrança Pix não encontrada");
        }
        if ("PENDENTE".equals(demo.status()) && OffsetDateTime.now(FUSO).isAfter(demo.expiraEm())) {
            var expirada = new CobrancaDemo(demo.id(), demo.idUsuario(), demo.valor(), demo.expiraEm(), "EXPIRADO", null);
            cobrancasDemo.put(idPagamento, expirada);
            return new StatusPixDto(idPagamento, "SIMULADO", "EXPIRADO", null);
        }
        return new StatusPixDto(idPagamento, "SIMULADO", demo.status(), demo.pagoEm());
    }

    public StatusPixDto confirmarDemo(UUID idUsuario, String idPagamento) {
        if (idPagamento == null || !idPagamento.startsWith("sim-")) {
            throw new IllegalArgumentException("A confirmação simulada só se aplica a cobranças de demonstração");
        }
        var demo = cobrancasDemo.get(idPagamento);
        if (demo == null || !demo.idUsuario().equals(idUsuario)) {
            throw new RecursoNaoEncontradoException("PAGAMENTO", "Cobrança Pix não encontrada");
        }
        if (OffsetDateTime.now(FUSO).isAfter(demo.expiraEm())) {
            throw new IllegalArgumentException("Este QR Code Pix expirou. Gere um novo código.");
        }
        var pagoEm = OffsetDateTime.now(FUSO);
        var aprovada = new CobrancaDemo(demo.id(), demo.idUsuario(), demo.valor(), demo.expiraEm(), "APROVADO", pagoEm);
        cobrancasDemo.put(idPagamento, aprovada);
        return new StatusPixDto(idPagamento, "SIMULADO", "APROVADO", pagoEm);
    }

    // ---------- Mercado Pago REST API v1 ----------

    private CobrancaPixDto criarNoMercadoPago(String email, BigDecimal valor, String descricao, String referencia, OffsetDateTime expiraEm) {
        try {
            var corpo = new LinkedHashMap<String, Object>();
            corpo.put("transaction_amount", valor);
            corpo.put("description", descricao);
            corpo.put("payment_method_id", "pix");
            corpo.put("date_of_expiration", expiraEm.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")));
            if (referencia != null && !referencia.isBlank()) {
                corpo.put("external_reference", referencia.trim());
            }
            corpo.put("payer", Map.of("email", (email == null || email.isBlank()) ? "cliente@cleaneats.app" : email));

            String resposta = http.post()
                    .uri("/v1/payments")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(corpo)
                    .retrieve()
                    .body(String.class);

            JsonNode root = json.readTree(resposta);
            String id = root.path("id").asText();
            String status = mapearStatusMercadoPago(root.path("status").asText("pending"));
            JsonNode tx = root.path("point_of_interaction").path("transaction_data");
            String qrCode = tx.path("qr_code").asText("");
            String qrBase64 = tx.path("qr_code_base64").asText(null);
            String ticketUrl = tx.path("ticket_url").asText(null);
            return new CobrancaPixDto(id, "MERCADO_PAGO", status, valor, qrCode, qrBase64, ticketUrl, expiraEm);
        } catch (Exception e) {
            throw new ServicoExternoException("Não foi possível gerar o Pix no Mercado Pago agora. Tente novamente.", e);
        }
    }

    private StatusPixDto consultarNoMercadoPago(String idPagamento) {
        try {
            String resposta = http.get()
                    .uri("/v1/payments/{id}", idPagamento)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);
            JsonNode root = json.readTree(resposta);
            String status = mapearStatusMercadoPago(root.path("status").asText("pending"));
            OffsetDateTime pagoEm = "APROVADO".equals(status) ? OffsetDateTime.now(FUSO) : null;
            return new StatusPixDto(idPagamento, "MERCADO_PAGO", status, pagoEm);
        } catch (Exception e) {
            throw new ServicoExternoException("Não foi possível consultar o pagamento no Mercado Pago.", e);
        }
    }

    static String mapearStatusMercadoPago(String statusMp) {
        return switch (statusMp == null ? "" : statusMp.toLowerCase(Locale.ROOT)) {
            case "approved" -> "APROVADO";
            case "rejected", "cancelled", "refunded", "charged_back" -> "REJEITADO";
            default -> "PENDENTE";
        };
    }

    // ---------- EMVCo / Banco Central BR Code (PIX Copia e Cola com CRC16-CCITT) ----------

    public static String gerarBrCodePix(String chave, String recebedor, String cidade, BigDecimal valor, String txid) {
        String merchantInfo = tlv("00", "br.gov.bcb.pix") + tlv("01", chave);
        String additionalData = tlv("05", txid);
        String semCrc = tlv("00", "01")
                + tlv("26", merchantInfo)
                + tlv("52", "0000")
                + tlv("53", "986")
                + tlv("54", valor.setScale(2, RoundingMode.HALF_UP).toPlainString())
                + tlv("58", "BR")
                + tlv("59", limitar(recebedor, 25))
                + tlv("60", limitar(cidade, 15))
                + tlv("62", additionalData)
                + "6304";
        return semCrc + crc16Ccitt(semCrc);
    }

    private static String tlv(String id, String valor) {
        return id + String.format(Locale.ROOT, "%02d", valor.length()) + valor;
    }

    private static String limitar(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    static String crc16Ccitt(String payload) {
        int crc = 0xFFFF;
        for (byte b : payload.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }
        return String.format(Locale.ROOT, "%04X", crc);
    }

    private void limparExpiradas() {
        var limite = OffsetDateTime.now(FUSO).minusMinutes(30);
        cobrancasDemo.entrySet().removeIf(e -> e.getValue().expiraEm().isBefore(limite));
    }
}
