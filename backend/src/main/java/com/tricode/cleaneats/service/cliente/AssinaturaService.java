package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.domain.Assinatura;
import com.tricode.cleaneats.domain.Enums.CicloCobranca;
import com.tricode.cleaneats.domain.Enums.StatusAssinatura;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.Fatura;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.repository.AssinaturaRepository;
import com.tricode.cleaneats.repository.FaturaRepository;
import com.tricode.cleaneats.repository.UsuarioRepository;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.Tema;
import com.tricode.cleaneats.service.RelatorioTabelaPdf;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Minha assinatura (tela 23, CE-15/CE-16). Cobrança SIMULADA: aprova na hora e gera a fatura PAGA;
 * o tier do usuário muda na mesma transação. Pro/Premium sem nutri → vincula a nutri aprovada com menos
 * clientes e abre triagem AGUARDANDO (contrato com a frente B). Dono: frente A.
 */
@Service
public class AssinaturaService {

    public record UsoDto(int nutribotMes, int limiteNutribotDia, int mensagensNutriSemana, BigDecimal descontoMes,
                         int percentualDesconto, LocalDate semanaPlano) {}
    public record FaturaDto(UUID id, String referencia, BigDecimal valor, String status, LocalDate vencimento,
                            OffsetDateTime pagaEm, String tier, String ciclo, String formaPagamento) {}
    public record NutriDto(UUID id, String nome, String crn, List<String> especialidades, BigDecimal notaMedia, String avatarUrl) {}
    public record AssinaturaDto(String tier, String status, String ciclo, BigDecimal valor, String formaPagamento,
                                OffsetDateTime membroDesde, OffsetDateTime inicioEm, OffsetDateTime renovacaoEm,
                                OffsetDateTime encerraEm, OffsetDateTime pausadaAte, BigDecimal totalEconomizado,
                                UsoDto uso, List<FaturaDto> faturas, NutriDto nutricionista) {}
    public record AssinarReq(String tier, String ciclo, String formaPagamento, UUID idNutricionista) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final Set<StatusAssinatura> VIGENTES =
            Set.of(StatusAssinatura.TRIAL, StatusAssinatura.ATIVA, StatusAssinatura.PAUSADA, StatusAssinatura.CANCELADA);
    static final int DIAS_PAUSA = 30;

    private final JdbcClient jdbc;
    private final AssinaturaRepository assinaturas;
    private final FaturaRepository faturas;
    private final UsuarioRepository usuarios;
    private final NotificacaoService notificacoes;

    public AssinaturaService(JdbcClient jdbc, AssinaturaRepository assinaturas, FaturaRepository faturas,
                             UsuarioRepository usuarios, NotificacaoService notificacoes) {
        this.jdbc = jdbc; this.assinaturas = assinaturas; this.faturas = faturas;
        this.usuarios = usuarios; this.notificacoes = notificacoes;
    }

    /** Assinatura vigente, já aplicando as transições por data (cancelada vencida → Free; pausa vencida → ativa). */
    @Transactional
    public Optional<Assinatura> vigente(UUID idUsuario) {
        var agora = OffsetDateTime.now();
        var atual = assinaturas.findFirstByIdUsuarioAndStatusInOrderByInicioEmDesc(idUsuario, VIGENTES);
        if (atual.isEmpty()) return atual;
        var a = atual.get();
        if (a.expirou(agora)) {
            a.expirar();
            definirTier(idUsuario, TierAssinatura.FREE);
            return Optional.empty();
        }
        if (a.getStatus() == StatusAssinatura.PAUSADA && a.getPausadaAte() != null && !agora.isBefore(a.getPausadaAte())) {
            a.retomar(agora);
        }
        return atual;
    }

    @Transactional
    public AssinaturaDto consultar(UUID idUsuario) {
        var a = vigente(idUsuario).orElse(null);
        var tier = a != null ? a.getTier() : TierAssinatura.FREE;
        var membroDesde = jdbc.sql("select min(inicio_em) from assinatura where id_usuario = :u")
                .param("u", idUsuario).query(OffsetDateTime.class).optional().orElse(null);
        var economia = jdbc.sql("""
                select coalesce(sum(desconto), 0) as total,
                       coalesce(sum(desconto) filter (where criado_em >= date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife'), 0) as mes
                from pedido where id_usuario = :u and status <> 'CANCELADO'""")
                .param("u", idUsuario).query((rs, i) -> new BigDecimal[]{rs.getBigDecimal("total"), rs.getBigDecimal("mes")}).single();
        int nutribotMes = jdbc.sql("""
                select count(*) from mensagem_chatbot m join conversa_chatbot c on c.id = m.id_conversa_chatbot
                where c.id_usuario = :u and m.autor = 'USUARIO'
                  and m.criado_em >= date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife'""")
                .param("u", idUsuario).query(Integer.class).single();
        int mensagensNutri = jdbc.sql("""
                select count(*) from mensagem m join conversa c on c.id = m.id_conversa
                where c.id_cliente = :u and m.id_autor = :u
                  and m.criado_em >= date_trunc('week', now() at time zone 'America/Recife') at time zone 'America/Recife'""")
                .param("u", idUsuario).query(Integer.class).single();
        var semanaPlano = jdbc.sql("select semana_inicio from plano_alimentar where id_usuario = :u and ativo order by semana_inicio desc limit 1")
                .param("u", idUsuario).query(LocalDate.class).optional().orElse(null);
        var nutri = jdbc.sql("""
                select n.id, u.nome, n.crn, n.especialidades, n.nota_media, u.avatar_url
                from perfil_cliente pc join nutricionista n on n.id = pc.id_nutricionista
                join usuario u on u.id = n.id_usuario where pc.id_usuario = :u""")
                .param("u", idUsuario).query((rs, i) -> new NutriDto(
                        rs.getObject("id", UUID.class),
                        rs.getString("nome"),
                        rs.getString("crn"),
                        CatalogoService.textos(rs.getArray("especialidades")),
                        rs.getBigDecimal("nota_media"),
                        rs.getString("avatar_url")
                )).optional().orElse(null);
        var listaFaturas = jdbc.sql("""
                select f.id, f.referencia, f.valor, f.status, f.vencimento, f.paga_em, a.id_tier, a.ciclo, a.forma_pagamento
                from fatura f join assinatura a on a.id = f.id_assinatura
                where a.id_usuario = :u order by f.vencimento desc, f.criado_em desc limit 12""")
                .param("u", idUsuario)
                .query((rs, i) -> new FaturaDto(rs.getObject("id", UUID.class), rs.getString("referencia"), rs.getBigDecimal("valor"),
                        rs.getString("status"), rs.getObject("vencimento", LocalDate.class), rs.getObject("paga_em", OffsetDateTime.class),
                        rs.getString("id_tier"), rs.getString("ciclo"), rs.getString("forma_pagamento")))
                .list();
        var uso = new UsoDto(nutribotMes, tier.getLimiteDiarioNutriBot(), mensagensNutri, economia[1],
                tier.getDescontoPedidoPercentual(), semanaPlano);
        if (a == null) {
            return new AssinaturaDto("FREE", "FREE", null, BigDecimal.ZERO, null, membroDesde, null, null, null, null,
                    economia[0], uso, listaFaturas, nutri);
        }
        return new AssinaturaDto(a.getTier().name(), a.getStatus().name(), a.getCiclo().name(), a.getValor(), a.getFormaPagamento(),
                membroDesde, a.getInicioEm(), a.getRenovacaoEm(), a.getEncerraEm(), a.getPausadaAte(), economia[0], uso, listaFaturas, nutri);
    }

    /** Assina ou troca de plano (upgrade, downgrade ou ciclo). Pagamento simulado: aprovado na hora. */
    @Transactional
    public AssinaturaDto assinar(UUID idUsuario, AssinarReq req) {
        var tier = lerEnum(TierAssinatura.class, req.tier(), "Plano inválido");
        var ciclo = req.ciclo() == null ? CicloCobranca.MENSAL : lerEnum(CicloCobranca.class, req.ciclo(), "Ciclo inválido");
        var forma = req.formaPagamento() == null ? "CARTAO" : req.formaPagamento();
        if (tier == TierAssinatura.FREE) throw new IllegalArgumentException("Para voltar ao Free, cancele a assinatura atual");
        exigirCliente(idUsuario);

        var atual = vigente(idUsuario);
        if (atual.isPresent()) {
            var a = atual.get();
            if (a.getTier() == tier && a.getCiclo() == ciclo && a.getStatus() != StatusAssinatura.CANCELADA) {
                throw new IllegalArgumentException("Você já está no plano " + nomeTier(tier) + " " + (ciclo == CicloCobranca.ANUAL ? "anual" : "mensal"));
            }
            a.substituir();
            assinaturas.saveAndFlush(a);
        }
        var nova = new Assinatura(idUsuario, tier, ciclo);
        nova.setFormaPagamento(forma);
        nova = assinaturas.save(nova);
        faturas.save(Fatura.pagaAgora(nova.getId(), LocalDate.now(FUSO).format(DateTimeFormatter.ofPattern("MM/yyyy")), nova.getValor()));
        definirTier(idUsuario, tier);
        if (tier.temNutricionistaDedicado()) vincularNutricionista(idUsuario, req.idNutricionista());

        var anterior = atual.map(Assinatura::getTier).orElse(TierAssinatura.FREE);
        notificacoes.notificar(idUsuario, TipoNotificacao.ASSINATURA,
                (tier.ordinal() >= anterior.ordinal() ? "Bem-vindo ao plano " : "Plano alterado para ") + nomeTier(tier),
                "Pagamento aprovado. Os benefícios já estão ativos na sua conta.", "/app/assinatura");
        return consultar(idUsuario);
    }

    /** CE-16: cancela mantendo os benefícios até o fim do período pago. */
    @Transactional
    public AssinaturaDto cancelar(UUID idUsuario) {
        var a = exigirVigente(idUsuario);
        if (a.getStatus() == StatusAssinatura.PAUSADA) a.retomar(OffsetDateTime.now());
        var encerra = a.cancelar();
        notificacoes.notificar(idUsuario, TipoNotificacao.ASSINATURA, "Assinatura cancelada",
                "Você mantém os benefícios do plano " + nomeTier(a.getTier()) + " até "
                        + encerra.atZoneSameInstant(FUSO).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ". Depois, sua conta volta ao Free sem perder histórico.",
                "/app/assinatura");
        return consultar(idUsuario);
    }

    @Transactional
    public AssinaturaDto reativar(UUID idUsuario) {
        exigirVigente(idUsuario).reativar(OffsetDateTime.now());
        return consultar(idUsuario);
    }

    @Transactional
    public AssinaturaDto pausar(UUID idUsuario) {
        var a = exigirVigente(idUsuario);
        a.pausar(OffsetDateTime.now().plusDays(DIAS_PAUSA));
        return consultar(idUsuario);
    }

    @Transactional
    public AssinaturaDto retomar(UUID idUsuario) {
        exigirVigente(idUsuario).retomar(OffsetDateTime.now());
        return consultar(idUsuario);
    }

    @Transactional
    public AssinaturaDto trocarFormaPagamento(UUID idUsuario, String forma) {
        exigirVigente(idUsuario).setFormaPagamento(forma);
        return consultar(idUsuario);
    }

    /** Extrato de faturas da assinatura do cliente em PDF estilizado CleanEats. */
    @Transactional
    public byte[] faturasPdf(UUID idUsuario) {
        var dto = consultar(idUsuario);
        var nomeCliente = jdbc.sql("select nome from usuario where id = :u").param("u", idUsuario)
                .query(String.class).optional().orElse("Cliente CleanEats");
        var fmtData = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        var nf = java.text.NumberFormat.getNumberInstance(java.util.Locale.forLanguageTag("pt-BR"));
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);

        long pagas = dto.faturas().stream().filter(f -> "PAGA".equals(f.status())).count();
        var kpis = List.of(
                "Plano atual: " + nomeTier(TierAssinatura.valueOf(dto.tier())),
                "Faturas pagas: " + pagas,
                "Total economizado: R$ " + nf.format(dto.totalEconomizado() == null ? BigDecimal.ZERO : dto.totalEconomizado())
        );
        var cab = List.of("Referência", "Vencimento", "Plano", "Ciclo", "Pagamento", "Status", "Valor (R$)");
        var linhas = dto.faturas().stream().map(f -> List.of(
                f.referencia(),
                f.vencimento() == null ? "—" : f.vencimento().format(fmtData),
                nomeTier(TierAssinatura.valueOf(f.tier())),
                "ANUAL".equals(f.ciclo()) ? "Anual" : "Mensal",
                "PIX".equals(f.formaPagamento()) ? "PIX" : "Cartão",
                "PAGA".equals(f.status()) ? "Paga" : f.status(),
                nf.format(f.valor() == null ? BigDecimal.ZERO : f.valor())
        )).toList();

        return RelatorioTabelaPdf.gerar(
                Tema.PADRAO,
                nomeCliente,
                "Área do Cliente · Assinatura",
                "Histórico de Faturas",
                "Últimas " + dto.faturas().size() + " faturas",
                "CleanEats · Extrato de Assinatura · " + nomeCliente,
                kpis, cab, linhas, false
        );
    }

    // ---------- internos ----------

    private Assinatura exigirVigente(UUID idUsuario) {
        return vigente(idUsuario).orElseThrow(() -> new IllegalArgumentException("Você está no plano Free: não há assinatura para alterar"));
    }

    private void exigirCliente(UUID idUsuario) {
        var perfil = jdbc.sql("select perfil from usuario where id = :u").param("u", idUsuario).query(String.class).optional().orElse(null);
        if (!"CLIENTE".equals(perfil)) throw new IllegalArgumentException("Os planos de assinatura são para contas de cliente");
    }

    private void definirTier(UUID idUsuario, TierAssinatura tier) {
        var u = usuarios.findById(idUsuario).orElseThrow();
        u.setTier(tier);
        usuarios.save(u);
    }

    /**
     * Pro/Premium: vincula o nutricionista escolhido pelo cliente (se informado e com vaga) ou,
     * caso contrário, distribui automaticamente para o nutricionista aprovado com vaga disponível,
     * menor carga de pacientes e melhor avaliação, abrindo a triagem (AGUARDANDO).
     */
    private void vincularNutricionista(UUID idUsuario, UUID idDesejado) {
        UUID idNutriAtual = jdbc.sql("select id_nutricionista from perfil_cliente where id_usuario = :u")
                .param("u", idUsuario).query(UUID.class).optional().orElse(null);

        UUID idNutri = null;
        UUID idUsuarioNutri = null;

        if (idDesejado != null) {
            if (idDesejado.equals(idNutriAtual)) return;
            var escolhido = jdbc.sql("""
                    select n.id, n.id_usuario, coalesce(n.max_clientes, 30) as max_c,
                           (select count(*) from perfil_cliente pc where pc.id_nutricionista = n.id) as ativos
                    from nutricionista n
                    where n.id = :id and n.status_aprovacao = 'APROVADO'""")
                    .param("id", idDesejado)
                    .query((rs, i) -> new Object[]{
                            rs.getObject("id", UUID.class),
                            rs.getObject("id_usuario", UUID.class),
                            rs.getInt("max_c"),
                            rs.getInt("ativos")
                    }).optional()
                    .orElseThrow(() -> new IllegalArgumentException("O nutricionista escolhido não está disponível."));
            if ((int) escolhido[3] >= (int) escolhido[2]) {
                throw new IllegalArgumentException("Este nutricionista está com a agenda cheia no momento. Escolha outro profissional.");
            }
            idNutri = (UUID) escolhido[0];
            idUsuarioNutri = (UUID) escolhido[1];
        } else {
            if (idNutriAtual != null) return;
            var auto = jdbc.sql("""
                    select n.id, n.id_usuario from nutricionista n
                    where n.status_aprovacao = 'APROVADO'
                    order by
                      case when (select count(*) from perfil_cliente pc where pc.id_nutricionista = n.id) < coalesce(n.max_clientes, 30) then 0 else 1 end,
                      (select count(*) from perfil_cliente pc where pc.id_nutricionista = n.id) asc,
                      n.nota_media desc
                    limit 1""")
                    .query((rs, i) -> new UUID[]{rs.getObject("id", UUID.class), rs.getObject("id_usuario", UUID.class)}).optional();
            if (auto.isEmpty()) return;
            idNutri = auto.get()[0];
            idUsuarioNutri = auto.get()[1];
        }

        jdbc.sql("update perfil_cliente set id_nutricionista = :n where id_usuario = :u")
                .param("n", idNutri).param("u", idUsuario).update();
        jdbc.sql("""
                insert into triagem (id_cliente, id_nutricionista)
                select :u, :n where not exists (
                  select 1 from triagem where id_cliente = :u and id_nutricionista = :n and status <> 'CONCLUIDA')""")
                .param("u", idUsuario).param("n", idNutri).update();
        var nomeCliente = jdbc.sql("select nome from usuario where id = :u").param("u", idUsuario).query(String.class).single();
        notificacoes.notificar(idUsuarioNutri, TipoNotificacao.NUTRICIONISTA, "Nova triagem aguardando",
                nomeCliente + (idDesejado != null ? " escolheu você ao assinar o plano e aguarda triagem." : " assinou um plano com nutricionista e foi vinculado a você."),
                "/nutri/triagens");
    }

    static String nomeTier(TierAssinatura t) {
        return switch (t) { case FREE -> "Free"; case BASIC -> "Basic"; case PRO -> "Pro"; case PREMIUM -> "Premium"; };
    }

    private static <E extends Enum<E>> E lerEnum(Class<E> tipo, String valor, String erro) {
        try { return Enum.valueOf(tipo, valor); } catch (RuntimeException e) { throw new IllegalArgumentException(erro); }
    }
}
