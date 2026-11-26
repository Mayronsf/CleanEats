package com.tricode.cleaneats.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
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

    public record ConfigGatewayDto(String modo, String publicKey) {}

    public record CriarCartaoReq(
            BigDecimal valor,
            String descricao,
            String referencia,
            String token,            // Token gerado pelo MercadoPago.js v2 quando publicKey está ativo
            String paymentMethodId,  // visa | master | elo | amex | hipercard
            Integer parcelas,        // 1..3
            String ultimos4,         // Últimos 4 dígitos (exibição / modo demo)
            String titular,          // Nome impresso no cartão
            String cpf,              // CPF do titular (11 dígitos)
            String validade,         // MM/AA
            String cvv               // Usado apenas para validação no modo demonstração (em produção vai no token MP)
    ) {}

    public record PagamentoCartaoDto(
            String id,
            String modo,             // MERCADO_PAGO | SIMULADO
            String status,           // APROVADO | PENDENTE | REJEITADO
            String detalheStatus,    // Mensagem amigável (ex.: "accredited", "Pagamento aprovado")
            BigDecimal valor,
            int parcelas,
            String bandeira,
            String ultimos4,
            String codigoAutorizacao,
            OffsetDateTime pagoEm
    ) {}

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
    private final String publicKey;
    private final String chavePixDemo;
    private final ConcurrentHashMap<String, CobrancaDemo> cobrancasDemo = new ConcurrentHashMap<>();

    @Autowired
    public PagamentoService(
            ObjectMapper json,
            @Value("${cleaneats.pagamento.mercadopago-access-token:}") String accessToken,
            @Value("${cleaneats.pagamento.mercadopago-public-key:}") String publicKey,
            @Value("${cleaneats.pagamento.chave-pix-demo:pagamentos@cleaneats.com.br}") String chavePixDemo) {
        this.http = RestClient.builder().baseUrl("https://api.mercadopago.com").build();
        this.json = json;
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.publicKey = publicKey == null ? "" : publicKey.trim();
        this.chavePixDemo = chavePixDemo == null || chavePixDemo.isBlank() ? "pagamentos@cleaneats.com.br" : chavePixDemo.trim();
    }

    public PagamentoService(ObjectMapper json, String accessToken, String chavePixDemo) {
        this(json, accessToken, "", chavePixDemo);
    }

    public boolean mercadoPagoAtivo() {
        return !accessToken.isBlank();
    }

    public ConfigGatewayDto configuracao() {
        boolean mpCartao = mercadoPagoAtivo() && !publicKey.isBlank();
        return new ConfigGatewayDto(mpCartao ? "MERCADO_PAGO" : (mercadoPagoAtivo() ? "MERCADO_PAGO_PIX" : "SIMULADO"),
                mpCartao ? publicKey : null);
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

    /**
     * Processa pagamento no cartão de crédito via API do Mercado Pago (/v1/payments) quando
     * MERCADOPAGO_ACCESS_TOKEN e token estiverem configurados; no ambiente acadêmico (sem token),
     * valida os campos e retorna autorização simulada (inclusive recusa controlada se titular tiver RECUSAR ou CVV 000).
     */
    public PagamentoCartaoDto processarCartao(UUID idUsuario, String email, CriarCartaoReq req) {
        if (req == null || req.valor() == null || req.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Informe um valor válido para o pagamento no cartão.");
        }
        var valor = req.valor().setScale(2, RoundingMode.HALF_UP);
        int parcelas = req.parcelas() == null ? 1 : Math.max(1, Math.min(3, req.parcelas()));
        String bandeira = (req.paymentMethodId() == null || req.paymentMethodId().isBlank())
                ? "visa" : req.paymentMethodId().trim().toLowerCase(Locale.ROOT);
        String cpfLimpo = req.cpf() == null ? "" : req.cpf().replaceAll("\\D", "");
        if (cpfLimpo.length() != 11) {
            throw new IllegalArgumentException("Informe um CPF válido com 11 dígitos.");
        }
        String ultimos4 = req.ultimos4() == null ? "0000" : req.ultimos4().replaceAll("\\D", "");
        if (ultimos4.length() > 4) ultimos4 = ultimos4.substring(ultimos4.length() - 4);
        String descricao = (req.descricao() == null || req.descricao().isBlank()) ? "CleanEats · Pedido" : req.descricao().trim();
        if (descricao.length() > 140) descricao = descricao.substring(0, 140);

        // Produção / Sandbox Mercado Pago real quando access token e card token estiverem presentes
        if (mercadoPagoAtivo() && req.token() != null && !req.token().isBlank()) {
            return cobrarCartaoNoMercadoPago(email, valor, descricao, req.referencia(), req.token().trim(), bandeira, parcelas, cpfLimpo, ultimos4);
        }

        // Modo demonstração acadêmica: valida titular, validade e CVV
        String titular = req.titular() == null ? "" : req.titular().trim();
        if (titular.length() < 3) {
            throw new IllegalArgumentException("Informe o nome impresso no cartão.");
        }
        if (req.validade() == null || !req.validade().matches("^(0[1-9]|1[0-2])/\\d{2}$")) {
            throw new IllegalArgumentException("Validade inválida. Use o formato MM/AA.");
        }
        String cvv = req.cvv() == null ? "" : req.cvv().replaceAll("\\D", "");
        if (cvv.length() < 3 || cvv.length() > 4) {
            throw new IllegalArgumentException("Informe o código de segurança (3 ou 4 dígitos).");
        }

        String idDemo = "mp-card-" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        // Permite demonstrar cenário de cartão recusado digitando "RECUSAR" no nome ou CVV "000"
        if (titular.toUpperCase(Locale.ROOT).contains("RECUSAR") || "000".equals(cvv)) {
            return new PagamentoCartaoDto(
                    idDemo, "SIMULADO", "REJEITADO",
                    traduzirDetalheMercadoPago("cc_rejected_other_reason"),
                    valor, parcelas, bandeira, ultimos4, null, null
            );
        }

        String aut = "AUTH-" + idDemo.substring(8, 14).toUpperCase(Locale.ROOT);
        return new PagamentoCartaoDto(
                idDemo, "SIMULADO", "APROVADO",
                "Pagamento aprovado no cartão",
                valor, parcelas, bandeira, ultimos4, aut, OffsetDateTime.now(FUSO)
        );
    }

    private PagamentoCartaoDto cobrarCartaoNoMercadoPago(
            String email, BigDecimal valor, String descricao, String referencia,
            String token, String bandeira, int parcelas, String cpfLimpo, String ultimos4) {
        try {
            var corpo = new LinkedHashMap<String, Object>();
            corpo.put("transaction_amount", valor);
            corpo.put("token", token);
            corpo.put("description", descricao);
            corpo.put("installments", parcelas);
            corpo.put("payment_method_id", bandeira);
            if (referencia != null && !referencia.isBlank()) {
                corpo.put("external_reference", referencia.trim());
            }
            corpo.put("payer", Map.of(
                    "email", (email == null || email.isBlank()) ? "cliente@cleaneats.app" : email,
                    "identification", Map.of("type", "CPF", "number", cpfLimpo)
            ));

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
            String status = mapearStatusMercadoPago(root.path("status").asText("rejected"));
            String detail = traduzirDetalheMercadoPago(root.path("status_detail").asText(""));
            String aut = root.path("authorization_code").asText(null);
            String last4 = root.path("card").path("last_four_digits").asText(ultimos4);
            OffsetDateTime pagoEm = "APROVADO".equals(status) ? OffsetDateTime.now(FUSO) : null;
            return new PagamentoCartaoDto(id, "MERCADO_PAGO", status, detail, valor, parcelas, bandeira, last4, aut, pagoEm);
        } catch (Exception e) {
            throw new ServicoExternoException("Não foi possível processar o cartão no Mercado Pago agora. Verifique os dados e tente novamente.", e);
        }
    }

    static String traduzirDetalheMercadoPago(String detail) {
        return switch (detail == null ? "" : detail.toLowerCase(Locale.ROOT)) {
            case "accredited" -> "Pagamento aprovado pelo Mercado Pago";
            case "pending_contingency", "pending_review_manual" -> "Pagamento em análise pelo banco emissor";
            case "cc_rejected_insufficient_amount" -> "Saldo ou limite insuficiente no cartão.";
            case "cc_rejected_bad_filled_security_code" -> "Código de segurança (CVV) incorreto.";
            case "cc_rejected_bad_filled_date" -> "Data de validade do cartão incorreta.";
            case "cc_rejected_bad_filled_card_number" -> "Número do cartão inválido.";
            case "cc_rejected_call_for_authorize" -> "Autorize a compra junto ao banco emissor do cartão.";
            case "cc_rejected_high_risk" -> "Pagamento recusado por segurança. Tente outro cartão ou Pix.";
            default -> "Pagamento recusado pela operadora. Revise os dados ou use Pix.";
        };
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
