package com.tricode.cleaneats.service.cliente;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.models.beta.AnthropicBeta;
import com.anthropic.models.beta.messages.BetaOutputConfig;
import com.anthropic.models.beta.messages.BetaRawMessageStreamEvent;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.service.ServicoExternoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Consumer;

/**
 * NutriBot (tela 25, CE-8 / CE-21): assistente com IA (Claude) que responde com base nos dados REAIS do cliente —
 * perfil e metas, plano do dia montado pela nutri, consumo de hoje, pedidos de hoje e restrições. O contexto é montado
 * a cada pergunta e guardado em mensagem_chatbot.contexto (auditoria). Não prescreve nem monta dieta.
 * Limite por tier: Free bloqueado, Basic 5/dia, Pro/Premium ilimitado. Dono: frente A.
 */
@Service
public class NutriBotService {

    private static final Logger log = LoggerFactory.getLogger(NutriBotService.class);

    public record RefeicaoHoje(String horario, String tipo, String prato, String restaurante, int calorias, BigDecimal proteinas, boolean consumida, String observacao) {}
    public record PedidoHoje(String codigo, String status, String itens, int calorias) {}
    public record ContextoDto(String nome, String tier, String objetivo, AcompanhamentoService.Nutrientes metas, AcompanhamentoService.Nutrientes consumo,
                              int caloriasRestantes, BigDecimal proteinaRestante, List<String> restricoes, String observacoesAlimentares,
                              List<RefeicaoHoje> refeicoesHoje, List<PedidoHoje> pedidosHoje, String proximaRefeicao, String nutricionista) {}
    public record LimiteDto(boolean disponivel, int porDia, int usadasHoje, String motivo) {}
    public record ConversaDto(UUID id, String titulo, String previa, OffsetDateTime atualizadaEm) {}
    public record MensagemDto(UUID id, String autor, String texto, OffsetDateTime criadoEm) {}
    public record EstadoDto(ContextoDto contexto, LimiteDto limite, List<ConversaDto> conversas, List<String> sugestoes) {}

    /** Perguntas prontas (chips da tela 25). */
    static final List<String> SUGESTOES = List.of("Posso comer pizza hoje?", "Como tão meus macros?", "Tô com fome, o que como?",
            "Sugestões pré-treino", "Quanto falta de proteína hoje?");

    static final String INSTRUCOES = """
            Você é o NutriBot, assistente de alimentação do app CleanEats (Recife, Brasil). Fale em português do Brasil, \
            de forma próxima e direta, como um amigo que entende de nutrição.

            Como responder:
            - Respostas curtas: no máximo 3 parágrafos curtos ou uma lista de até 5 itens. Sem títulos.
            - Use os NÚMEROS REAIS do contexto abaixo (kcal consumidas e restantes, proteína que falta, próxima refeição do plano, \
            pedidos de hoje). Nunca invente dados que não estão no contexto; se faltar informação, diga o que falta.
            - Ao sugerir comida, prefira as refeições do plano de hoje e os pratos já citados no contexto.
            - Respeite as restrições alimentares do cliente sempre.

            Limites (importante):
            - Você NÃO prescreve, NÃO monta dieta, NÃO muda metas e NÃO substitui a nutricionista. Para ajustes no plano, \
            sintomas, doenças, gestação, medicamentos ou suplementação, oriente a falar com a nutricionista pelo botão \
            "Conversar com a nutri" (ou a assinar um plano com nutricionista, se o cliente não tiver).
            - Também tira dúvidas sobre o app (pedidos, assinatura, plano alimentar, avaliações).
            - Se a pergunta não for sobre alimentação, saúde ou o app, responda em uma frase que só ajuda com isso.""";

    private final JdbcClient jdbc;
    private final AcompanhamentoService acompanhamento;
    private final ObjectMapper json;
    private final String chave;
    private final String modelo;
    private volatile AnthropicClient cliente;

    public NutriBotService(JdbcClient jdbc, AcompanhamentoService acompanhamento, ObjectMapper json,
                           @Value("${cleaneats.nutribot.api-key:}") String chave,
                           @Value("${cleaneats.nutribot.modelo:claude-sonnet-5-5}") String modelo) {
        this.jdbc = jdbc; this.acompanhamento = acompanhamento; this.json = json; this.chave = chave; this.modelo = modelo;
    }

    public EstadoDto estado(UUID idUsuario) {
        return new EstadoDto(contexto(idUsuario), limite(idUsuario), conversas(idUsuario), SUGESTOES);
    }

    public List<ConversaDto> conversas(UUID idUsuario) {
        return jdbc.sql("""
                select c.id,
                       (select texto from mensagem_chatbot m where m.id_conversa_chatbot = c.id and m.autor = 'USUARIO' order by criado_em limit 1) as titulo,
                       (select texto from mensagem_chatbot m where m.id_conversa_chatbot = c.id and m.autor = 'BOT' order by criado_em desc limit 1) as previa,
                       coalesce((select max(criado_em) from mensagem_chatbot m where m.id_conversa_chatbot = c.id), c.criado_em) as atualizada
                from conversa_chatbot c where c.id_usuario = :u order by atualizada desc limit 30""")
                .param("u", idUsuario)
                .query((rs, i) -> new ConversaDto(rs.getObject("id", UUID.class), cortar(rs.getString("titulo"), 60),
                        cortar(rs.getString("previa"), 80), rs.getObject("atualizada", OffsetDateTime.class)))
                .list().stream().filter(c -> c.titulo() != null).toList();
    }

    public List<MensagemDto> mensagens(UUID idUsuario, UUID idConversa) {
        exigirConversa(idUsuario, idConversa);
        return jdbc.sql("select id, autor, texto, criado_em from mensagem_chatbot where id_conversa_chatbot = :c order by criado_em")
                .param("c", idConversa)
                .query((rs, i) -> new MensagemDto(rs.getObject("id", UUID.class), rs.getString("autor"), rs.getString("texto"),
                        rs.getObject("criado_em", OffsetDateTime.class))).list();
    }

    public void excluirConversa(UUID idUsuario, UUID idConversa) {
        exigirConversa(idUsuario, idConversa);
        jdbc.sql("delete from conversa_chatbot where id = :c").param("c", idConversa).update();
    }

    public LimiteDto limite(UUID idUsuario) {
        var tierTexto = jdbc.sql("select id_tier from usuario where id = :u").param("u", idUsuario).query(String.class).single();
        var tier = TierAssinatura.valueOf(tierTexto);
        int usadas = jdbc.sql("""
                select count(*) from mensagem_chatbot m join conversa_chatbot c on c.id = m.id_conversa_chatbot
                where c.id_usuario = :u and m.autor = 'USUARIO'
                  and (m.criado_em at time zone 'America/Recife')::date = (now() at time zone 'America/Recife')::date""")
                .param("u", idUsuario).query(Integer.class).single();
        if (!tier.nutriBotDisponivel()) {
            return new LimiteDto(false, 0, usadas, "O NutriBot está disponível a partir do plano Basic.");
        }
        boolean pode = tier.podePerguntarAoNutriBot(usadas);
        return new LimiteDto(pode, tier.getLimiteDiarioNutriBot(), usadas,
                pode ? null : "Você usou as " + tier.getLimiteDiarioNutriBot() + " perguntas de hoje do plano Basic. No Pro o NutriBot é ilimitado.");
    }

    /** Contexto real do cliente (lido do banco a cada pergunta). */
    public ContextoDto contexto(UUID idUsuario) {
        var hoje = AcompanhamentoService.hoje();
        var perfil = jdbc.sql("""
                select u.nome, u.id_tier, pc.objetivo_nutricional, pc.observacoes_alimentares, nu.nome as nutri
                from usuario u join perfil_cliente pc on pc.id_usuario = u.id
                left join nutricionista n on n.id = pc.id_nutricionista left join usuario nu on nu.id = n.id_usuario
                where u.id = :u""").param("u", idUsuario)
                .query((rs, i) -> new String[]{rs.getString("nome"), rs.getString("id_tier"), rs.getString("objetivo_nutricional"),
                        rs.getString("observacoes_alimentares"), rs.getString("nutri")}).single();
        var consumo = acompanhamento.consumo(idUsuario, hoje);
        var restricoes = jdbc.sql("""
                select r.nome from restricao_alimentar r join cliente_restricao c on c.id_restricao = r.id where c.id_usuario = :u order by r.id""")
                .param("u", idUsuario).query(String.class).list();
        var refeicoes = acompanhamento.planoAtivo(idUsuario).map(p -> p.refeicoes().stream().filter(r -> hoje.equals(r.data()))
                .map(r -> new RefeicaoHoje(r.horario() == null ? null : r.horario().toString().substring(0, 5), r.tipo(), r.prato().nome(),
                        r.prato().restaurante() == null ? null : r.prato().restaurante().nome(),
                        r.prato().macros().calorias() == null ? 0 : r.prato().macros().calorias(), r.prato().macros().proteinas(), r.consumida(), r.observacao()))
                .toList()).orElse(List.of());
        var pedidos = jdbc.sql("""
                select p.codigo, p.status, string_agg(i.quantidade || 'x ' || i.nome, ', ') as itens, coalesce(sum(i.calorias * i.quantidade), 0) as kcal
                from pedido p join item_pedido i on i.id_pedido = p.id
                where p.id_usuario = :u and (p.criado_em at time zone 'America/Recife')::date = :hoje and p.status <> 'CANCELADO'
                group by p.id order by p.criado_em""")
                .param("u", idUsuario).param("hoje", hoje)
                .query((rs, i) -> new PedidoHoje(rs.getString("codigo"), rs.getString("status"), rs.getString("itens"), rs.getInt("kcal"))).list();
        var agora = LocalTime.now(AcompanhamentoService.FUSO);
        var proxima = refeicoes.stream().filter(r -> !r.consumida() && r.horario() != null && LocalTime.parse(r.horario()).isAfter(agora.minusMinutes(60)))
                .findFirst().map(r -> rotuloRefeicao(r.tipo()) + " " + r.horario() + " · " + r.prato()).orElse(null);
        var metas = consumo.metas();
        var c = consumo.consumo();
        return new ContextoDto(perfil[0], perfil[1], perfil[2], metas, c, Math.max(0, metas.calorias() - c.calorias()),
                metas.proteinas() == null ? null : metas.proteinas().subtract(c.proteinas()).max(BigDecimal.ZERO),
                restricoes, perfil[3], refeicoes, pedidos, proxima, perfil[4]);
    }

    /**
     * Pergunta com resposta em streaming. Chama {@code aoTexto} a cada trecho, {@code aoFim} com a conversa e a mensagem salva,
     * {@code aoErro} com uma mensagem amigável. Se a IA falhar, a pergunta não conta no limite (é apagada).
     */
    public void perguntar(UUID idUsuario, UUID idConversa, String pergunta, Consumer<String> aoTexto,
                          java.util.function.BiConsumer<UUID, MensagemDto> aoFim, Consumer<String> aoErro) {
        var texto = pergunta == null ? "" : pergunta.trim();
        if (texto.isEmpty()) throw new IllegalArgumentException("Escreva sua pergunta");
        if (texto.length() > 1000) throw new IllegalArgumentException("A pergunta pode ter no máximo 1.000 caracteres");
        var limite = limite(idUsuario);
        if (!limite.disponivel()) throw new IllegalArgumentException(limite.motivo());
        var api = cliente();

        boolean novaConversa = idConversa == null;
        UUID conversa = novaConversa
                ? jdbc.sql("insert into conversa_chatbot (id_usuario) values (:u) returning id").param("u", idUsuario).query(UUID.class).single()
                : exigirConversa(idUsuario, idConversa);
        var historico = novaConversa ? List.<MensagemDto>of() : mensagens(idUsuario, conversa);
        var contexto = contexto(idUsuario);
        String snapshot;
        try { snapshot = json.writeValueAsString(contexto); } catch (Exception e) { snapshot = "{}"; }
        UUID idPergunta = jdbc.sql("""
                insert into mensagem_chatbot (id_conversa_chatbot, autor, texto, contexto) values (:c, 'USUARIO', :t, cast(:ctx as jsonb)) returning id""")
                .param("c", conversa).param("t", texto).param("ctx", snapshot).query(UUID.class).single();

        var params = MessageCreateParams.builder()
                .model(modelo)
                .maxTokens(4096L)
                .system(INSTRUCOES + "\n\n" + contextoParaPrompt(contexto))
                .outputConfig(BetaOutputConfig.builder().effort(BetaOutputConfig.Effort.LOW).build())
                .addBeta(AnthropicBeta.SERVER_SIDE_FALLBACK_2026_07_01)
                .fallbacksDefault();
        for (var m : historico.subList(Math.max(0, historico.size() - 20), historico.size())) {
            if ("USUARIO".equals(m.autor())) params.addUserMessage(m.texto()); else params.addAssistantMessage(m.texto());
        }
        params.addUserMessage(texto);

        var resposta = new StringBuilder();
        String motivoParada = null;
        try (StreamResponse<BetaRawMessageStreamEvent> stream = api.beta().messages().createStreaming(params.build())) {
            var it = stream.stream().iterator();
            while (it.hasNext()) {
                var evento = it.next();
                var delta = evento.contentBlockDelta().flatMap(d -> d.delta().text()).map(t -> t.text());
                if (delta.isPresent()) { resposta.append(delta.get()); aoTexto.accept(delta.get()); }
                var parada = evento.messageDelta().flatMap(d -> d.delta().stopReason());
                if (parada.isPresent()) motivoParada = parada.get().toString();
            }
        } catch (RuntimeException e) {
            log.warn("NutriBot falhou: {}", e.getMessage());
            apagarPergunta(idPergunta, conversa, novaConversa);
            aoErro.accept("NutriBot indisponível agora, tente de novo em instantes.");
            return;
        }
        if ("refusal".equalsIgnoreCase(motivoParada)) {
            var aviso = "Não consigo ajudar com isso por aqui. Para orientação específica, fale com sua nutricionista pelo botão \"Conversar com a nutri\".";
            if (resposta.isEmpty()) aoTexto.accept(aviso); else aoTexto.accept("\n\n" + aviso);
            resposta.append(resposta.isEmpty() ? aviso : "\n\n" + aviso);
        }
        if (resposta.isEmpty()) {
            apagarPergunta(idPergunta, conversa, novaConversa);
            aoErro.accept("O NutriBot não conseguiu responder. Tente reformular a pergunta.");
            return;
        }
        var salva = jdbc.sql("insert into mensagem_chatbot (id_conversa_chatbot, autor, texto) values (:c, 'BOT', :t) returning id, criado_em")
                .param("c", conversa).param("t", resposta.toString())
                .query((rs, i) -> new MensagemDto(rs.getObject("id", UUID.class), "BOT", resposta.toString(), rs.getObject("criado_em", OffsetDateTime.class)))
                .single();
        aoFim.accept(conversa, salva);
    }

    /** Contexto em texto para o prompt de sistema. Testável. */
    static String contextoParaPrompt(ContextoDto c) {
        var sb = new StringBuilder("CONTEXTO ATUAL DO CLIENTE (dados reais do app, hoje):\n");
        sb.append("- Nome: ").append(primeiroNome(c.nome())).append(" · plano ").append(c.tier()).append(" · objetivo: ").append(rotuloObjetivo(c.objetivo())).append('\n');
        var m = c.metas(); var k = c.consumo();
        sb.append("- Metas do dia: ").append(m.calorias()).append(" kcal, ").append(n(m.proteinas())).append(" g proteína, ")
                .append(n(m.carboidratos())).append(" g carboidrato, ").append(n(m.gorduras())).append(" g gordura, água ").append(m.aguaMl()).append(" ml\n");
        sb.append("- Consumido hoje: ").append(k.calorias()).append(" kcal, ").append(n(k.proteinas())).append(" g proteína, ")
                .append(n(k.carboidratos())).append(" g carboidrato, ").append(n(k.gorduras())).append(" g gordura, água ").append(k.aguaMl()).append(" ml\n");
        sb.append("- Restam hoje: ").append(c.caloriasRestantes()).append(" kcal e ").append(n(c.proteinaRestante())).append(" g de proteína\n");
        sb.append("- Restrições: ").append(c.restricoes().isEmpty() ? "nenhuma" : String.join(", ", c.restricoes())).append('\n');
        if (c.observacoesAlimentares() != null) sb.append("- Observações do cliente: ").append(c.observacoesAlimentares()).append('\n');
        sb.append("- Nutricionista: ").append(c.nutricionista() == null ? "nenhuma (plano sem nutri)" : c.nutricionista()).append('\n');
        if (c.refeicoesHoje().isEmpty()) sb.append("- Plano alimentar de hoje: sem plano montado pela nutri\n");
        else {
            sb.append("- Plano alimentar de hoje (montado pela nutri):\n");
            for (var r : c.refeicoesHoje()) {
                sb.append("  · ").append(r.horario()).append(' ').append(rotuloRefeicao(r.tipo())).append(": ").append(r.prato())
                        .append(" (").append(r.calorias()).append(" kcal, ").append(n(r.proteinas())).append(" g prot)")
                        .append(r.consumida() ? " — JÁ CONSUMIDA" : " — pendente");
                if (r.observacao() != null) sb.append(" · nota da nutri: ").append(r.observacao());
                sb.append('\n');
            }
        }
        if (c.proximaRefeicao() != null) sb.append("- Próxima refeição do plano: ").append(c.proximaRefeicao()).append('\n');
        if (c.pedidosHoje().isEmpty()) sb.append("- Pedidos de hoje: nenhum\n");
        else for (var p : c.pedidosHoje()) sb.append("- Pedido ").append(p.codigo()).append(" (").append(p.status()).append("): ").append(p.itens())
                .append(" · ").append(p.calorias()).append(" kcal\n");
        return sb.toString();
    }

    // ---------- auxiliares ----------

    private AnthropicClient cliente() {
        if (chave == null || chave.isBlank()) throw new ServicoExternoException("NutriBot indisponível: a chave da IA não está configurada no servidor.");
        var c = cliente;
        if (c == null) {
            synchronized (this) {
                if (cliente == null) cliente = AnthropicOkHttpClient.builder().apiKey(chave).build();
                c = cliente;
            }
        }
        return c;
    }

    private UUID exigirConversa(UUID idUsuario, UUID idConversa) {
        return jdbc.sql("select id from conversa_chatbot where id = :c and id_usuario = :u").param("c", idConversa).param("u", idUsuario)
                .query(UUID.class).optional().orElseThrow(() -> new IllegalArgumentException("Conversa não encontrada"));
    }

    private void apagarPergunta(UUID idPergunta, UUID conversa, boolean novaConversa) {
        jdbc.sql("delete from mensagem_chatbot where id = :m").param("m", idPergunta).update();
        if (novaConversa) jdbc.sql("delete from conversa_chatbot where id = :c").param("c", conversa).update();
    }

    private static String n(BigDecimal v) { return v == null ? "?" : v.setScale(0, java.math.RoundingMode.HALF_UP).toPlainString(); }
    private static String cortar(String s, int max) { return s == null || s.length() <= max ? s : s.substring(0, max - 1).trim() + "…"; }
    private static String primeiroNome(String nome) { return nome == null ? "cliente" : nome.trim().split("\\s+")[0]; }

    static String rotuloObjetivo(String o) {
        return switch (o == null ? "" : o) { case "EMAGRECIMENTO" -> "emagrecimento"; case "GANHO_MASSA" -> "ganho de massa"; default -> "dieta equilibrada"; };
    }

    static String rotuloRefeicao(String t) {
        return switch (t == null ? "" : t) {
            case "CAFE_DA_MANHA" -> "Café da manhã"; case "LANCHE_MANHA" -> "Lanche da manhã"; case "ALMOCO" -> "Almoço";
            case "LANCHE_TARDE" -> "Lanche"; case "JANTAR" -> "Jantar"; case "CEIA" -> "Ceia"; default -> "Refeição";
        };
    }
}
