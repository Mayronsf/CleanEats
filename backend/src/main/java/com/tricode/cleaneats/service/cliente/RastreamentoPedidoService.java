package com.tricode.cleaneats.service.cliente;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.StatusPedido;
import com.tricode.cleaneats.repository.PedidoRepository;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * API de Rastreamento e Telemetria de Entrega (Tela 18):
 * - Fornece rota real pelas ruas (via OSRM com cache em memória por pedido e fallback curvo suave)
 * - Geocodifica o endereço do cliente (Nominatim com fallback determinístico por cidade)
 * - Simula em tempo real a posição GPS do entregador (lat/lng, velocidade, distância restante e ETA)
 * - Permite avançar etapas no modo demonstração (POST /simular-avanco) para ensaios/apresentações.
 */
@Service
public class RastreamentoPedidoService {

    public record PontoDto(double lat, double lng) {}
    public record LocalDto(double lat, double lng, String nome, String detalhe) {}
    public record EntregadorDto(String nome, String veiculo, String placa, double nota, int entregas) {}
    public record PosicaoDto(double lat, double lng, double progresso, int velocidadeKmh, double anguloGraus) {}
    public record RastreamentoDto(
            UUID idPedido,
            String codigo,
            String status,
            String fonteRota,            // OSRM | FALLBACK
            LocalDto origem,
            LocalDto destino,
            EntregadorDto entregador,
            PosicaoDto posicaoAtual,
            BigDecimal distanciaTotalKm,
            BigDecimal distanciaRestanteKm,
            int etaMinutos,
            List<PontoDto> rota,
            OffsetDateTime atualizadoEm
    ) {}

    private record RotaCache(LocalDto origem, LocalDto destino, List<PontoDto> pontos, double distanciaKm, String fonte) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");

    /** Coordenadas reais dos restaurantes parceiros em Vitória de Santo Antão - PE. */
    static final Map<String, double[]> COORDS_RESTAURANTES = Map.of(
            "Sabor Natural", new double[]{-8.116169, -35.270785},   // Vitória Park Shopping · Redenção
            "Verde Vida", new double[]{-8.116282, -35.292347},      // Praça da Matriz · Matriz
            "Mar & Terra", new double[]{-8.120137, -35.295750},     // Av. Mariana Amália · Centro
            "FitFood", new double[]{-8.118306, -35.290311},         // Rua do Estudante (UNIFACOL) · Universitário
            "Açaí Club", new double[]{-8.114345, -35.281293},       // Av. Henrique de Holanda · Redenção
            "Rota Proteica", new double[]{-8.118237, -35.312249},   // Rua Eurico Valois · Maués
            "Raízes Fit", new double[]{-8.113530, -35.292649}       // Av. Silva Jardim · Matriz
    );

    /** Pontos residenciais reais em Vitória de Santo Antão - PE para fallback determinístico. */
    private static final double[][] PONTOS_DESTINO_VITORIA = {
            {-8.116215, -35.294658}, // Rua Melo Verçosa · Centro
            {-8.111612, -35.291116}, // Rua Queiroz Pedroso · Bela Vista
            {-8.118306, -35.290311}, // Rua do Estudante · Universitário
            {-8.123500, -35.297200}, // Livramento
            {-8.114950, -35.283800}, // Redenção
            {-8.117900, -35.308500}, // Maués
            {-8.113530, -35.292649}  // Av. Silva Jardim · Matriz
    };

    private static final String[] ENTREGADORES = {
            "Carlos Eduardo", "Lucas Ferreira", "Gabriel Santos", "Matheus Lima", "João Pedro"
    };

    /** Motos com placas no padrão Mercosul brasileiro (LLLNLNN — 3 letras, 1 número, 1 letra, 2 números). */
    static final String[][] VEICULOS = {
            {"Honda CG 160 Fan · Preta", "PEQ4B82"},
            {"Yamaha Fazer 150 · Azul", "PEX9D14"},
            {"Honda Biz 125 · Vermelha", "PER2F67"},
            {"Yamaha Factor 150 · Azul", "PEK7H31"},
            {"Honda Pop 110i · Vermelha", "QYA3C58"},
            {"Honda CG 160 Start · Prata", "RZA8M24"}
    };

    private final JdbcClient jdbc;
    private final PedidoRepository pedidos;
    private final NotificacaoService notificacoes;
    private final ObjectMapper json;
    private final RestClient http;
    private final int segundosAteEntregar;
    private final ConcurrentHashMap<UUID, RotaCache> cacheRotas = new ConcurrentHashMap<>();

    public RastreamentoPedidoService(
            JdbcClient jdbc,
            PedidoRepository pedidos,
            NotificacaoService notificacoes,
            ObjectMapper json,
            @Value("${cleaneats.entrega.segundos-ate-entregar:40}") int segundosAteEntregar) {
        this.jdbc = jdbc;
        this.pedidos = pedidos;
        this.notificacoes = notificacoes;
        this.json = json;
        this.http = RestClient.builder().build();
        this.segundosAteEntregar = Math.max(15, segundosAteEntregar);
    }

    public RastreamentoDto consultar(UUID idUsuario, UUID idPedido) {
        record DadosPedido(
                UUID id, String codigo, String status, OffsetDateTime criadoEm, OffsetDateTime previsaoEm,
                String entregadorNome, String restNome, String restBairro, String restCidade,
                BigDecimal restLat, BigDecimal restLng,
                String endLogradouro, String endNumero, String endBairro, String endCidade, String endUf,
                int tempoEntregaMin
        ) {}

        var p = jdbc.sql("""
                select p.id, p.codigo, p.status, p.criado_em, p.previsao_entrega_em, p.entregador_nome,
                       r.nome as r_nome, r.bairro as r_bairro, r.cidade as r_cidade, r.latitude as r_lat, r.longitude as r_lng,
                       r.tempo_entrega_min,
                       e.logradouro, e.numero, e.bairro, e.cidade, e.uf
                from pedido p
                join restaurante r on r.id = p.id_restaurante
                left join endereco e on e.id = p.id_endereco
                where p.id = :id and p.id_usuario = :u""")
                .param("id", idPedido).param("u", idUsuario)
                .query((rs, i) -> new DadosPedido(
                        rs.getObject("id", UUID.class),
                        rs.getString("codigo"),
                        rs.getString("status"),
                        rs.getObject("criado_em", OffsetDateTime.class),
                        rs.getObject("previsao_entrega_em", OffsetDateTime.class),
                        rs.getString("entregador_nome"),
                        rs.getString("r_nome"),
                        rs.getString("r_bairro"),
                        rs.getString("r_cidade"),
                        rs.getBigDecimal("r_lat"),
                        rs.getBigDecimal("r_lng"),
                        rs.getString("logradouro"),
                        rs.getString("numero"),
                        rs.getString("bairro"),
                        rs.getString("cidade"),
                        rs.getString("uf"),
                        rs.getInt("tempo_entrega_min")
                ))
                .optional()
                .orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));

        var rotaCache = cacheRotas.computeIfAbsent(idPedido, ignored -> montarRota(
                idPedido, p.restNome(), p.restBairro(), p.restCidade(), p.restLat(), p.restLng(),
                p.endLogradouro(), p.endNumero(), p.endBairro(), p.endCidade(), p.endUf()
        ));

        OffsetDateTime saidaEm = jdbc.sql("select min(em) from historico_status_pedido where id_pedido = :id and status = 'A_CAMINHO'")
                .param("id", idPedido).query(OffsetDateTime.class).optional().orElse(null);

        var agora = OffsetDateTime.now(FUSO);
        double progresso = calcularProgresso(p.status(), saidaEm, p.previsaoEm(), agora);
        var pos = interpolar(rotaCache.pontos(), progresso, "A_CAMINHO".equals(p.status()));

        double distTotal = rotaCache.distanciaKm();
        double distRestante = "ENTREGUE".equals(p.status()) ? 0.0 : Math.max(0.0, distTotal * (1.0 - progresso));
        int etaMin = calcularEtaMinutos(p.status(), p.previsaoEm(), p.tempoEntregaMin(), progresso, agora);

        EntregadorDto entregador = null;
        if (p.entregadorNome() != null && !p.entregadorNome().isBlank()) {
            int hash = Math.abs(idPedido.hashCode());
            String[] v = VEICULOS[hash % VEICULOS.length];
            double nota = 4.8 + ((hash % 3) * 0.1);
            int entregas = 640 + (hash % 1800);
            entregador = new EntregadorDto(p.entregadorNome(), v[0], v[1], Math.min(5.0, Math.round(nota * 10.0) / 10.0), entregas);
        }

        return new RastreamentoDto(
                p.id(), p.codigo(), p.status(), rotaCache.fonte(),
                rotaCache.origem(), rotaCache.destino(), entregador, pos,
                BigDecimal.valueOf(distTotal).setScale(1, RoundingMode.HALF_UP),
                BigDecimal.valueOf(distRestante).setScale(1, RoundingMode.HALF_UP),
                etaMin, rotaCache.pontos(), agora
        );
    }

    /**
     * Simula o avanço para a próxima etapa do fluxo de entrega (modo demonstração):
     * NOVO -> ACEITO -> PREPARANDO -> PRONTO -> A_CAMINHO -> ENTREGUE.
     */
    @Transactional
    public RastreamentoDto simularProximaEtapa(UUID idUsuario, UUID idPedido) {
        var pedido = pedidos.findById(idPedido)
                .filter(p -> p.getIdUsuario().equals(idUsuario))
                .orElseThrow(() -> new RecursoNaoEncontradoException("PEDIDO", "Pedido não encontrado"));

        StatusPedido proximo = switch (pedido.getStatus()) {
            case NOVO -> StatusPedido.ACEITO;
            case ACEITO -> StatusPedido.PREPARANDO;
            case PREPARANDO -> StatusPedido.PRONTO;
            case PRONTO -> StatusPedido.A_CAMINHO;
            case A_CAMINHO -> StatusPedido.ENTREGUE;
            default -> throw new IllegalArgumentException("Este pedido já foi finalizado.");
        };

        pedido.mudarStatus(proximo);
        if (proximo == StatusPedido.A_CAMINHO) {
            if (pedido.getEntregadorNome() == null || pedido.getEntregadorNome().isBlank()) {
                pedido.setEntregadorNome(ENTREGADORES[Math.abs(idPedido.hashCode()) % ENTREGADORES.length]);
            }
            pedido.setPrevisaoEntregaEm(OffsetDateTime.now().plusSeconds(segundosAteEntregar));
        }
        pedidos.saveAndFlush(pedido);

        String codigo = jdbc.sql("select codigo from pedido where id = :id").param("id", idPedido).query(String.class).single();
        String msg = switch (proximo) {
            case ACEITO -> "O restaurante aceitou seu pedido.";
            case PREPARANDO -> "Sua marmita entrou em preparo.";
            case PRONTO -> "Pedido embalado! Chamando o entregador.";
            case A_CAMINHO -> pedido.getEntregadorNome() + " saiu para entrega.";
            case ENTREGUE -> "Pedido entregue. Bom apetite!";
            default -> "Status atualizado.";
        };
        notificacoes.notificar(idUsuario, TipoNotificacao.PEDIDO, "Pedido " + codigo + " atualizado", msg, "/app/pedidos/" + idPedido);
        return consultar(idUsuario, idPedido);
    }

    // ---------- Roteamento OSRM + Geocodificação Nominatim + Telemetria ----------

    private RotaCache montarRota(UUID idPedido, String restNome, String restBairro, String restCidade,
                                 BigDecimal restLat, BigDecimal restLng,
                                 String logradouro, String numero, String bairro, String cidade, String uf) {
        String cidadeRest = (restCidade == null || restCidade.isBlank()) ? "Vitória de Santo Antão" : restCidade.trim();
        String cidadeEfetiva = (cidade == null || cidade.isBlank()) ? cidadeRest : cidade.trim();
        double[] coordOrig = resolverOrigem(restNome, restLat, restLng);
        double[] coordDest = resolverDestino(idPedido, coordOrig, logradouro, numero, bairro, cidadeEfetiva, uf);

        String detOrig = restBairro != null ? restBairro + " · " + cidadeRest : cidadeRest;
        String detDest = logradouro != null ? logradouro + (numero != null ? ", " + numero : "") + (bairro != null ? " · " + bairro : "") : cidadeEfetiva;
        var origem = new LocalDto(coordOrig[0], coordOrig[1], restNome, detOrig);
        var destino = new LocalDto(coordDest[0], coordDest[1], "Sua casa", detDest);

        // Tenta rota real pelas ruas no OSRM público (gratuito)
        try {
            String url = String.format(Locale.ROOT,
                    "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
                    coordOrig[1], coordOrig[0], coordDest[1], coordDest[0]);
            String resp = http.get().uri(url).retrieve().body(String.class);
            JsonNode root = json.readTree(resp);
            JsonNode rotaNode = root.path("routes").path(0);
            JsonNode coords = rotaNode.path("geometry").path("coordinates");
            if (coords.isArray() && coords.size() >= 2) {
                var pts = new ArrayList<PontoDto>(coords.size());
                for (JsonNode c : coords) {
                    pts.add(new PontoDto(c.get(1).asDouble(), c.get(0).asDouble()));
                }
                double distKm = rotaNode.path("distance").asDouble(0) / 1000.0;
                if (distKm <= 0.05) distKm = distanciaKm(coordOrig[0], coordOrig[1], coordDest[0], coordDest[1]) * 1.25;
                return new RotaCache(origem, destino, pts, distKm, "OSRM");
            }
        } catch (Exception ignored) { }

        var ptsFallback = rotaCurvaFallback(coordOrig, coordDest);
        double distKm = Math.max(0.8, distanciaKm(coordOrig[0], coordOrig[1], coordDest[0], coordDest[1]) * 1.28);
        return new RotaCache(origem, destino, ptsFallback, distKm, "FALLBACK");
    }

    private double[] resolverOrigem(String restNome, BigDecimal restLat, BigDecimal restLng) {
        if (restLat != null && restLng != null) {
            return new double[]{restLat.doubleValue(), restLng.doubleValue()};
        }
        return COORDS_RESTAURANTES.getOrDefault(restNome, new double[]{-8.116282, -35.292347});
    }

    private double[] resolverDestino(UUID idPedido, double[] origem, String logradouro, String numero, String bairro, String cidade, String uf) {
        String ufEfetiva = (uf == null || uf.isBlank()) ? "PE" : uf.trim();
        if (logradouro != null && !logradouro.isBlank()) {
            List<String> tentativas = new ArrayList<>();
            tentativas.add(logradouro + (numero != null && !numero.isBlank() ? " " + numero : "")
                    + (bairro != null && !bairro.isBlank() ? ", " + bairro : "")
                    + ", " + cidade + ", " + ufEfetiva + ", Brasil");
            tentativas.add(logradouro + ", " + cidade + ", " + ufEfetiva + ", Brasil");
            if (bairro != null && !bairro.isBlank()) {
                tentativas.add(bairro + ", " + cidade + ", " + ufEfetiva + ", Brasil");
            }
            for (String busca : tentativas) {
                double[] achado = geocodificarNominatim(busca, origem);
                if (achado != null) return achado;
            }
        }

        int h = Math.abs((idPedido.toString() + Objects.toString(logradouro, "")).hashCode());
        for (int offset = 0; offset < PONTOS_DESTINO_VITORIA.length; offset++) {
            double[] candidato = PONTOS_DESTINO_VITORIA[(h + offset) % PONTOS_DESTINO_VITORIA.length];
            if (distanciaKm(origem[0], origem[1], candidato[0], candidato[1]) >= 0.45) {
                return candidato;
            }
        }
        return new double[]{origem[0] - 0.0065, origem[1] - 0.0085};
    }

    private double[] geocodificarNominatim(String busca, double[] origem) {
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q="
                    + URLEncoder.encode(busca, StandardCharsets.UTF_8);
            String resp = http.get().uri(url)
                    .header("User-Agent", "CleanEats-API/1.0 (academico@cleaneats.app)")
                    .retrieve().body(String.class);
            JsonNode arr = json.readTree(resp);
            if (arr.isArray() && !arr.isEmpty()) {
                double lat = Double.parseDouble(arr.get(0).path("lat").asText());
                double lng = Double.parseDouble(arr.get(0).path("lon").asText());
                double dist = distanciaKm(origem[0], origem[1], lat, lng);
                if (dist >= 0.15 && dist <= 35.0) {
                    return new double[]{lat, lng};
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    static List<PontoDto> rotaCurvaFallback(double[] a, double[] b) {
        var pontos = new ArrayList<PontoDto>(37);
        double midLat = (a[0] + b[0]) / 2.0 + 0.0045;
        double midLng = (a[1] + b[1]) / 2.0 - 0.0035;
        for (int i = 0; i <= 36; i++) {
            double t = i / 36.0;
            double u = 1.0 - t;
            pontos.add(new PontoDto(
                    u * u * a[0] + 2 * u * t * midLat + t * t * b[0],
                    u * u * a[1] + 2 * u * t * midLng + t * t * b[1]
            ));
        }
        return pontos;
    }

    static double calcularProgresso(String status, OffsetDateTime saidaEm, OffsetDateTime previsaoEm, OffsetDateTime agora) {
        if ("ENTREGUE".equals(status)) return 1.0;
        if ("PRONTO".equals(status)) return 0.03;
        if (!"A_CAMINHO".equals(status)) return 0.0;

        OffsetDateTime ini = saidaEm != null ? saidaEm : agora.minusSeconds(5);
        OffsetDateTime fim = previsaoEm != null ? previsaoEm : ini.plusSeconds(40);
        long duracaoMs = Math.max(15_000L, Duration.between(ini, fim).toMillis());
        long decorridoMs = Duration.between(ini, agora).toMillis();
        double bruto = (double) decorridoMs / duracaoMs;
        return Math.max(0.08, Math.min(0.96, bruto));
    }

    static PosicaoDto interpolar(List<PontoDto> pontos, double progresso, boolean emMovimento) {
        if (pontos.isEmpty()) return new PosicaoDto(-8.1185, -34.8995, 0, 0, 0);
        if (pontos.size() == 1) return new PosicaoDto(pontos.get(0).lat(), pontos.get(0).lng(), progresso, 0, 0);
        double clamped = Math.max(0.0, Math.min(1.0, progresso));
        double idxF = clamped * (pontos.size() - 1);
        int i = Math.min(pontos.size() - 2, (int) Math.floor(idxF));
        double frac = idxF - i;
        var p0 = pontos.get(i);
        var p1 = pontos.get(i + 1);
        double lat = p0.lat() + (p1.lat() - p0.lat()) * frac;
        double lng = p0.lng() + (p1.lng() - p0.lng()) * frac;
        double angulo = Math.toDegrees(Math.atan2(p1.lng() - p0.lng(), p1.lat() - p0.lat()));
        int velocidade = emMovimento ? (int) Math.round(28 + 8 * Math.sin(clamped * Math.PI * 3)) : 0;
        return new PosicaoDto(lat, lng, Math.round(clamped * 1000.0) / 1000.0, velocidade, Math.round(angulo));
    }

    static int calcularEtaMinutos(String status, OffsetDateTime previsaoEm, int tempoBaseMin, double progresso, OffsetDateTime agora) {
        if ("ENTREGUE".equals(status) || "CANCELADO".equals(status) || "RECUSADO".equals(status)) return 0;
        if ("A_CAMINHO".equals(status) && previsaoEm != null) {
            long segs = Math.max(0, Duration.between(agora, previsaoEm).getSeconds());
            return (int) Math.max(1, Math.ceil(segs / 60.0));
        }
        return switch (status) {
            case "PRONTO" -> 6;
            case "PREPARANDO" -> Math.max(12, tempoBaseMin / 2);
            case "ACEITO" -> Math.max(18, (int) Math.round(tempoBaseMin * 0.8));
            default -> Math.max(25, tempoBaseMin);
        };
    }

    static double distanciaKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371.0 * 2.0 * Math.atan2(Math.sqrt(x), Math.sqrt(1.0 - x));
    }
}
