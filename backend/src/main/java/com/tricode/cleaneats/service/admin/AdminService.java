package com.tricode.cleaneats.service.admin;

import com.tricode.cleaneats.domain.Enums.StatusAssinatura;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.Fatura;
import com.tricode.cleaneats.domain.StatusAprovacao;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.repository.*;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Admin (CE-3, CE-11, CE-16, CE-17, CE-18): curadoria de nutricionistas (CRN), restaurantes (CNPJ) e pratos; moderação de
 * avaliações; fila do "Fale conosco"; comissão por restaurante e renovação SIMULADA de assinaturas. Dono: frente C.
 */
@Service
public class AdminService {

    public record NutriPendente(UUID id, String nome, String email, String crn, String uf, List<String> especialidades, String bio,
                                Integer anosExperiencia, OffsetDateTime criadoEm, String status, String motivo) {}
    public record RestaurantePendente(UUID id, String nome, String dono, String email, String cnpj, List<String> cozinhas, String endereco,
                                      OffsetDateTime criadoEm, String status, String motivo, boolean cnpjValido) {}
    public record PratoPendente(UUID id, String nome, String restaurante, String categoria, String imagemUrl, BigDecimal preco, Integer porcaoG,
                                Integer calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras, List<String> ingredientes,
                                List<String> alergenos, OffsetDateTime enviadoEm, boolean macrosCoerentes) {}
    public record AprovacoesDto(List<NutriPendente> nutricionistas, List<RestaurantePendente> restaurantes, List<PratoPendente> pratos) {}
    public record DecisaoReq(boolean aprovado, String motivo) {}
    public record AvaliacaoAdmin(UUID id, String prato, String restaurante, String cliente, String codigoPedido, int nota, Integer notaSabor,
                                 Integer notaPorcao, Integer notaEntrega, String comentario, List<String> tags, List<String> fotos, boolean anonima,
                                 String status, OffsetDateTime data) {}
    public record ContatoDto(UUID id, String nome, String email, String assunto, String mensagem, OffsetDateTime criadoEm, OffsetDateTime respondidoEm) {}
    public record RestauranteAdmin(UUID id, String nome, String status, BigDecimal comissaoPercentual, long pedidosMes, BigDecimal vendasMes,
                                   BigDecimal comissaoMes, BigDecimal notaMedia) {}
    public record AssinaturasResumo(long ativas, long canceladas, long pausadas, BigDecimal receitaMensal) {}
    public record PlataformaDto(List<RestauranteAdmin> restaurantes, AssinaturasResumo assinaturas) {}
    public record RenovacaoResultado(LocalDate dataSimulada, int renovadas, int expiradas, int retomadas, BigDecimal faturado) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");

    private final JdbcClient jdbc;
    private final NutricionistaRepository nutricionistas;
    private final RestauranteRepository restaurantes;
    private final MarmitaRepository marmitas;
    private final AssinaturaRepository assinaturas;
    private final FaturaRepository faturas;
    private final UsuarioRepository usuarios;
    private final NotificacaoService notificacoes;

    public AdminService(JdbcClient jdbc, NutricionistaRepository nutricionistas, RestauranteRepository restaurantes, MarmitaRepository marmitas,
                        AssinaturaRepository assinaturas, FaturaRepository faturas, UsuarioRepository usuarios, NotificacaoService notificacoes) {
        this.jdbc = jdbc; this.nutricionistas = nutricionistas; this.restaurantes = restaurantes; this.marmitas = marmitas;
        this.assinaturas = assinaturas; this.faturas = faturas; this.usuarios = usuarios; this.notificacoes = notificacoes;
    }

    // ---------- Curadoria ----------

    public AprovacoesDto aprovacoes(boolean somentePendentes) {
        var filtro = somentePendentes ? "= 'PENDENTE'" : "is not null";
        var nutris = jdbc.sql("""
                select n.id, u.nome, u.email, n.crn, n.crn_uf, n.especialidades, n.bio, n.anos_experiencia, n.criado_em, n.status_aprovacao, n.motivo_rejeicao
                from nutricionista n join usuario u on u.id = n.id_usuario where n.status_aprovacao %s order by n.criado_em desc limit 50""".formatted(filtro))
                .query((rs, i) -> new NutriPendente(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"), rs.getString("crn"),
                        rs.getString("crn_uf"), textos(rs.getArray("especialidades")), rs.getString("bio"), inteiro(rs.getObject("anos_experiencia")),
                        rs.getObject("criado_em", OffsetDateTime.class), rs.getString("status_aprovacao"), rs.getString("motivo_rejeicao"))).list();
        var restos = jdbc.sql("""
                select r.id, r.nome, u.nome as dono, u.email, r.cnpj, r.tipos_cozinha, concat_ws(', ', r.logradouro, r.numero, r.bairro) as endereco,
                       r.criado_em, r.status_aprovacao, r.motivo_rejeicao
                from restaurante r join usuario u on u.id = r.id_usuario where r.status_aprovacao %s order by r.criado_em desc limit 50""".formatted(filtro))
                .query((rs, i) -> new RestaurantePendente(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("dono"), rs.getString("email"),
                        rs.getString("cnpj"), textos(rs.getArray("tipos_cozinha")), rs.getString("endereco"), rs.getObject("criado_em", OffsetDateTime.class),
                        rs.getString("status_aprovacao"), rs.getString("motivo_rejeicao"), cnpjValido(rs.getString("cnpj")))).list();
        var pratos = jdbc.sql("""
                select m.id, m.nome, r.nome as restaurante, m.categoria, m.imagem_url, m.preco, m.porcao_g, m.calorias, m.proteinas, m.carboidratos, m.gorduras,
                       m.alergenos, m.enviado_analise_em,
                       (select coalesce(array_agg(i.nome || coalesce(' (' || i.quantidade || ')', '') order by i.ordem), '{}') from ingrediente_marmita i where i.id_marmita = m.id) as ingredientes
                from marmita m join restaurante r on r.id = m.id_restaurante where m.status_prato = 'EM_ANALISE' order by m.enviado_analise_em nulls last limit 50""")
                .query((rs, i) -> {
                    var p = rs.getBigDecimal("proteinas"); var c = rs.getBigDecimal("carboidratos"); var g = rs.getBigDecimal("gorduras");
                    var kcal = inteiro(rs.getObject("calorias"));
                    boolean coerente = true;
                    if (p != null && c != null && g != null && kcal != null) {
                        var est = p.add(c).multiply(BigDecimal.valueOf(4)).add(g.multiply(BigDecimal.valueOf(9))).doubleValue();
                        coerente = est == 0 || Math.abs(est - kcal) / est <= 0.25;
                    }
                    return new PratoPendente(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("restaurante"), rs.getString("categoria"),
                            rs.getString("imagem_url"), rs.getBigDecimal("preco"), inteiro(rs.getObject("porcao_g")), kcal, p, c, g,
                            textos(rs.getArray("ingredientes")), textos(rs.getArray("alergenos")), rs.getObject("enviado_analise_em", OffsetDateTime.class), coerente);
                }).list();
        return new AprovacoesDto(nutris, restos, pratos);
    }

    @Transactional
    public void avaliarNutricionista(UUID idAdmin, UUID id, DecisaoReq d) {
        var n = nutricionistas.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("NUTRICIONISTA", "Nutricionista não encontrada"));
        n.avaliar(d.aprovado() ? StatusAprovacao.APROVADO : StatusAprovacao.REJEITADO, limpar(d.motivo()), idAdmin);
        nutricionistas.saveAndFlush(n);
        notificacoes.notificar(n.getIdUsuario(), TipoNotificacao.SISTEMA, d.aprovado() ? "CRN aprovado!" : "Cadastro não aprovado",
                d.aprovado() ? "Seu perfil foi validado. Você já aparece para os clientes Pro e Premium." : "Motivo: " + d.motivo() + ". Corrija no seu perfil e reenvie.",
                d.aprovado() ? "/nutri" : "/nutri/perfil");
    }

    @Transactional
    public void avaliarRestaurante(UUID idAdmin, UUID id, DecisaoReq d) {
        var r = restaurantes.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("RESTAURANTE", "Restaurante não encontrado"));
        r.avaliar(d.aprovado() ? StatusAprovacao.APROVADO : StatusAprovacao.REJEITADO, limpar(d.motivo()), idAdmin);
        restaurantes.saveAndFlush(r);
        notificacoes.notificar(r.getIdUsuario(), TipoNotificacao.SISTEMA, d.aprovado() ? "Restaurante aprovado!" : "Cadastro do restaurante não aprovado",
                d.aprovado() ? "Seu restaurante foi aprovado. Pratos aprovados já aparecem no marketplace." : "Motivo: " + d.motivo() + ". Corrija no perfil e reenvie.",
                d.aprovado() ? "/restaurante" : "/restaurante/perfil");
    }

    @Transactional
    public void avaliarPrato(UUID idAdmin, UUID id, DecisaoReq d) {
        var m = marmitas.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("MARMITA", "Prato não encontrado"));
        m.avaliar(d.aprovado(), limpar(d.motivo()), idAdmin);
        marmitas.saveAndFlush(m);
        var dono = jdbc.sql("select id_usuario from restaurante where id = :r").param("r", m.getIdRestaurante()).query(UUID.class).single();
        notificacoes.notificar(dono, TipoNotificacao.CARDAPIO, d.aprovado() ? "Prato aprovado: " + m.getNome() : "Prato rejeitado: " + m.getNome(),
                d.aprovado() ? "Já está no marketplace." : "Motivo: " + d.motivo() + ". Corrija e reenvie.",
                d.aprovado() ? "/restaurante/cardapio" : "/restaurante/aprovacao?aba=REJEITADO");
        if (d.aprovado()) {
            // CE-13: clientes que favoritaram pratos desse restaurante ficam sabendo do prato novo
            jdbc.sql("""
                    select distinct f.id_usuario from favorito f join marmita x on x.id = f.id_marmita
                    where x.id_restaurante = :r limit 200""").param("r", m.getIdRestaurante()).query(UUID.class).list()
                    .forEach(u -> notificacoes.notificar(u, TipoNotificacao.CARDAPIO, "Novo no cardápio: " + m.getNome(),
                            "Um restaurante que você curte tem prato novo.", "/app/marmitas/" + m.getId()));
        }
    }

    // ---------- Moderação de avaliações (CE-11) ----------

    public List<AvaliacaoAdmin> avaliacoes(String status) {
        var st = status == null || status.isBlank() ? "PENDENTE" : status.toUpperCase(Locale.ROOT);
        if (!Set.of("PENDENTE", "PUBLICADA", "REJEITADA").contains(st)) throw new IllegalArgumentException("Status inválido");
        return jdbc.sql("""
                select a.id, m.nome as prato, r.nome as restaurante, u.nome as cliente, p.codigo, a.nota, a.nota_sabor, a.nota_porcao, a.nota_entrega,
                       a.comentario, a.tags, a.fotos, a.anonima, a.status_moderacao, a.data_avaliacao
                from avaliacao a join pedido p on p.id = a.id_pedido join restaurante r on r.id = p.id_restaurante
                join usuario u on u.id = a.id_usuario left join marmita m on m.id = a.id_marmita
                where a.status_moderacao = :s order by a.data_avaliacao desc limit 100""").param("s", st)
                .query((rs, i) -> new AvaliacaoAdmin(rs.getObject("id", UUID.class), rs.getString("prato"), rs.getString("restaurante"), rs.getString("cliente"),
                        rs.getString("codigo"), rs.getInt("nota"), inteiro(rs.getObject("nota_sabor")), inteiro(rs.getObject("nota_porcao")),
                        inteiro(rs.getObject("nota_entrega")), rs.getString("comentario"), textos(rs.getArray("tags")), textos(rs.getArray("fotos")),
                        rs.getBoolean("anonima"), rs.getString("status_moderacao"), rs.getObject("data_avaliacao", OffsetDateTime.class))).list();
    }

    public Map<String, Long> contagemAvaliacoes() {
        var m = new LinkedHashMap<String, Long>();
        jdbc.sql("select status_moderacao, count(*) from avaliacao group by 1").query((rs, i) -> Map.entry(rs.getString(1), rs.getLong(2)))
                .list().forEach(e -> m.put(e.getKey(), e.getValue()));
        return m;
    }

    /** Publicar recalcula a nota do prato e do restaurante (média incremental sobre o total já publicado). */
    @Transactional
    public void moderar(UUID id, DecisaoReq d) {
        var a = jdbc.sql("""
                select a.status_moderacao, a.nota, a.id_marmita, a.id_usuario, p.id_restaurante, m.nome
                from avaliacao a join pedido p on p.id = a.id_pedido left join marmita m on m.id = a.id_marmita where a.id = :a""").param("a", id)
                .query((rs, i) -> new Object[]{rs.getString(1), rs.getInt(2), rs.getObject(3, UUID.class), rs.getObject(4, UUID.class), rs.getObject(5, UUID.class), rs.getString(6)})
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("AVALIACAO", "Avaliação não encontrada"));
        if (!"PENDENTE".equals(a[0])) throw new IllegalArgumentException("Essa avaliação já foi moderada");
        if (!d.aprovado() && (d.motivo() == null || d.motivo().isBlank())) throw new IllegalArgumentException("Informe o motivo da rejeição");
        jdbc.sql("update avaliacao set status_moderacao = :s where id = :a").param("s", d.aprovado() ? "PUBLICADA" : "REJEITADA").param("a", id).update();
        var nota = BigDecimal.valueOf((int) a[1]);
        if (d.aprovado()) {
            if (a[2] != null) atualizarNota("marmita", (UUID) a[2], nota);
            atualizarNota("restaurante", (UUID) a[4], nota);
            var dono = jdbc.sql("select id_usuario from restaurante where id = :r").param("r", a[4]).query(UUID.class).single();
            notificacoes.notificar(dono, TipoNotificacao.SISTEMA, "Nova avaliação publicada", "Nota " + a[1] + " para " + a[5] + ".", "/restaurante/analytics");
        }
        notificacoes.notificar((UUID) a[3], TipoNotificacao.SISTEMA, d.aprovado() ? "Sua avaliação foi publicada" : "Sua avaliação não foi publicada",
                d.aprovado() ? "Obrigado! Ela já aparece na página do " + a[5] + "." : "Motivo: " + d.motivo() + ".", "/app/pedidos");
    }

    static BigDecimal mediaIncremental(BigDecimal media, int total, BigDecimal nova) {
        var soma = (media == null ? BigDecimal.ZERO : media).multiply(BigDecimal.valueOf(total)).add(nova);
        return soma.divide(BigDecimal.valueOf(total + 1L), 1, RoundingMode.HALF_UP);
    }

    private void atualizarNota(String tabela, UUID id, BigDecimal nota) {
        var atual = jdbc.sql("select nota_media, total_avaliacoes from " + tabela + " where id = :i").param("i", id)
                .query((rs, i) -> new Object[]{rs.getBigDecimal(1), rs.getInt(2)}).single();
        jdbc.sql("update " + tabela + " set nota_media = :n, total_avaliacoes = total_avaliacoes + 1 where id = :i")
                .param("n", mediaIncremental((BigDecimal) atual[0], (int) atual[1], nota)).param("i", id).update();
    }

    // ---------- Fale conosco ----------

    public List<ContatoDto> contatos(boolean abertos) {
        return jdbc.sql("""
                select c.id, coalesce(u.nome, split_part(c.email, '@', 1)) as nome, c.email, c.assunto, c.mensagem, c.criado_em, c.respondido_em
                from contato_suporte c left join usuario u on u.id = c.id_usuario
                where %s order by c.criado_em desc limit 100""".formatted(abertos ? "c.respondido_em is null" : "c.respondido_em is not null"))
                .query((rs, i) -> new ContatoDto(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"), rs.getString("assunto"),
                        rs.getString("mensagem"), rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("respondido_em", OffsetDateTime.class))).list();
    }

    @Transactional
    public void marcarRespondido(UUID id, boolean respondido) {
        int n = jdbc.sql("update contato_suporte set respondido_em = " + (respondido ? "now()" : "null") + " where id = :c").param("c", id).update();
        if (n == 0) throw new RecursoNaoEncontradoException("CONTATO", "Contato não encontrado");
        if (respondido) {
            jdbc.sql("select id_usuario from contato_suporte where id = :c").param("c", id).query(UUID.class).optional().filter(Objects::nonNull)
                    .ifPresent(u -> notificacoes.notificar(u, TipoNotificacao.SISTEMA, "Respondemos seu contato", "A equipe CleanEats respondeu por e-mail.", null));
        }
    }

    // ---------- Plataforma: comissões e renovação simulada (CE-16, CE-17) ----------

    public PlataformaDto plataforma() {
        var lista = jdbc.sql("""
                select r.id, r.nome, r.status_aprovacao, r.comissao_percentual, r.nota_media,
                       count(p.id) filter (where p.status not in ('CANCELADO','RECUSADO')) as pedidos,
                       coalesce(sum(p.subtotal - p.desconto) filter (where p.status not in ('CANCELADO','RECUSADO')), 0) as vendas,
                       coalesce(sum(p.valor_comissao) filter (where p.status not in ('CANCELADO','RECUSADO')), 0) as comissao
                from restaurante r left join pedido p on p.id_restaurante = r.id
                  and p.criado_em >= date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife'
                group by r.id order by vendas desc, r.nome""")
                .query((rs, i) -> new RestauranteAdmin(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("status_aprovacao"),
                        rs.getBigDecimal("comissao_percentual"), rs.getLong("pedidos"), rs.getBigDecimal("vendas"), rs.getBigDecimal("comissao"),
                        rs.getBigDecimal("nota_media"))).list();
        var ass = jdbc.sql("""
                select count(*) filter (where status = 'ATIVA'), count(*) filter (where status = 'CANCELADA'), count(*) filter (where status = 'PAUSADA'),
                       coalesce(sum(case when ciclo = 'ANUAL' then valor / 12 else valor end) filter (where status = 'ATIVA'), 0)
                from assinatura""").query((rs, i) -> new AssinaturasResumo(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getBigDecimal(4).setScale(2, RoundingMode.HALF_UP))).single();
        return new PlataformaDto(lista, ass);
    }

    @Transactional
    public RestauranteAdmin definirComissao(UUID id, BigDecimal percentual) {
        if (percentual == null || percentual.signum() < 0 || percentual.compareTo(new BigDecimal("30")) > 0) {
            throw new IllegalArgumentException("A comissão deve ficar entre 0% e 30%");
        }
        int n = jdbc.sql("update restaurante set comissao_percentual = :c where id = :r").param("c", percentual.setScale(2, RoundingMode.HALF_UP)).param("r", id).update();
        if (n == 0) throw new RecursoNaoEncontradoException("RESTAURANTE", "Restaurante não encontrado");
        var dono = jdbc.sql("select id_usuario from restaurante where id = :r").param("r", id).query(UUID.class).single();
        notificacoes.notificar(dono, TipoNotificacao.SISTEMA, "Comissão atualizada", "A comissão da plataforma passou a ser "
                + percentual.stripTrailingZeros().toPlainString() + "% para os próximos pedidos. Pedidos já feitos não mudam.", "/restaurante/financeiro");
        return plataforma().restaurantes().stream().filter(r -> r.id().equals(id)).findFirst().orElseThrow();
    }

    /**
     * CE-16 SIMULADO: avança o "relógio" das assinaturas até {@code ate}. ATIVA com renovação vencida → renova e gera fatura PAGA
     * (quantas vezes for preciso); CANCELADA com encerramento vencido → EXPIRADA e o usuário volta ao Free (histórico mantido);
     * PAUSADA com pausa vencida → ATIVA.
     */
    @Transactional
    public RenovacaoResultado simularRenovacao(LocalDate ate) {
        var limite = (ate == null ? LocalDate.now(FUSO).plusMonths(1) : ate).atTime(23, 59).atZone(FUSO).toOffsetDateTime();
        int renovadas = 0, expiradas = 0, retomadas = 0;
        BigDecimal faturado = BigDecimal.ZERO;
        var formato = DateTimeFormatter.ofPattern("MM/yyyy");
        for (var a : assinaturas.findAll()) {
            if (a.getStatus() == StatusAssinatura.ATIVA && a.getRenovacaoEm() != null && !a.getRenovacaoEm().isAfter(limite)) {
                while (!a.getRenovacaoEm().isAfter(limite)) {
                    var referencia = a.getRenovacaoEm().atZoneSameInstant(FUSO).format(formato);
                    a.renovar();
                    faturas.save(Fatura.pagaAgora(a.getId(), referencia, a.getValor()));
                    faturado = faturado.add(a.getValor());
                }
                assinaturas.save(a);
                renovadas++;
                notificacoes.notificar(a.getIdUsuario(), TipoNotificacao.ASSINATURA, "Assinatura renovada",
                        "Pagamento aprovado. Próxima cobrança em " + a.getRenovacaoEm().atZoneSameInstant(FUSO).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".", "/app/assinatura");
            } else if (a.getStatus() == StatusAssinatura.CANCELADA && a.getEncerraEm() != null && !a.getEncerraEm().isAfter(limite)) {
                a.expirar();
                assinaturas.save(a);
                usuarios.findById(a.getIdUsuario()).ifPresent(u -> { u.setTier(TierAssinatura.FREE); usuarios.save(u); });
                expiradas++;
                notificacoes.notificar(a.getIdUsuario(), TipoNotificacao.ASSINATURA, "Seu plano terminou",
                        "Sua conta voltou para o Free. Seu histórico continua aqui; assine de novo quando quiser.", "/app/assinatura");
            } else if (a.getStatus() == StatusAssinatura.PAUSADA && a.getPausadaAte() != null && !a.getPausadaAte().isAfter(limite)) {
                a.retomar(limite);
                assinaturas.save(a);
                retomadas++;
            }
        }
        return new RenovacaoResultado(limite.toLocalDate(), renovadas, expiradas, retomadas, faturado);
    }

    // ---------- utilitários ----------

    /** CNPJ com dígitos verificadores (módulo 11). */
    public static boolean cnpjValido(String cnpj) {
        if (cnpj == null) return false;
        var d = cnpj.replaceAll("\\D", "");
        if (d.length() != 14 || d.chars().distinct().count() == 1) return false;
        int[] p1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}, p2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int s = 0;
        for (int i = 0; i < 12; i++) s += (d.charAt(i) - '0') * p1[i];
        int dv1 = s % 11 < 2 ? 0 : 11 - s % 11;
        s = 0;
        for (int i = 0; i < 13; i++) s += (d.charAt(i) - '0') * p2[i];
        int dv2 = s % 11 < 2 ? 0 : 11 - s % 11;
        return dv1 == d.charAt(12) - '0' && dv2 == d.charAt(13) - '0';
    }

    private static String limpar(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private static Integer inteiro(Object o) { return o == null ? null : ((Number) o).intValue(); }
    private static List<String> textos(java.sql.Array a) throws java.sql.SQLException { return a == null ? List.of() : List.of((String[]) a.getArray()); }
}
