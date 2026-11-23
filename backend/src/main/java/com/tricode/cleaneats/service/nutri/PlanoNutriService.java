package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.nutri.CatalogoNutriService.Prato;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * Editor de plano alimentar (tela 30; CE-19). A nutri monta a semana do cliente com pratos aprovados do catálogo (tela 31);
 * ao salvar, as refeições da semana são substituídas numa transação e o cliente é notificado. A tela 24 do cliente lê as
 * mesmas tabelas (plano_alimentar ativo + refeicao_plano). Dono: frente B.
 */
@Service
public class PlanoNutriService {

    public static final List<String> TIPOS = List.of("CAFE_DA_MANHA", "LANCHE_MANHA", "ALMOCO", "LANCHE_TARDE", "JANTAR", "CEIA");
    /** Horário padrão de cada refeição: a tela 24 usa para mostrar a "próxima refeição". */
    static final Map<String, LocalTime> HORARIOS = Map.of(
            "CAFE_DA_MANHA", LocalTime.of(7, 0), "LANCHE_MANHA", LocalTime.of(10, 0), "ALMOCO", LocalTime.of(12, 30),
            "LANCHE_TARDE", LocalTime.of(15, 30), "JANTAR", LocalTime.of(19, 30), "CEIA", LocalTime.of(21, 30));
    static final ZoneId FUSO = ZoneId.of("America/Recife");

    public record Metas(Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras, Integer fibras) {}
    public record Refeicao(UUID id, int diaSemana, String tipo, String tipoRefeicao, String observacao, Prato prato) {}
    public record Plano(UUID id, LocalDate semanaInicio, LocalDate semanaFim, Metas metas, List<Refeicao> refeicoes) {}
    public record RefeicaoForm(Integer diaSemana, String tipo, UUID idMarmita, String observacao) {}
    public record PlanoForm(List<RefeicaoForm> refeicoes) {}

    private final JdbcClient jdbc;
    private final NutriContexto ctx;
    private final CatalogoNutriService catalogo;
    private final NotificacaoService notificacoes;

    public PlanoNutriService(JdbcClient jdbc, NutriContexto ctx, CatalogoNutriService catalogo, NotificacaoService notificacoes) {
        this.jdbc = jdbc; this.ctx = ctx; this.catalogo = catalogo; this.notificacoes = notificacoes;
    }

    /** A API usa 1 = segunda … 7 = domingo (como a tela 30); o banco usa 0 = domingo … 6 = sábado (refeicao_plano). */
    static short diaParaBanco(int diaApi) { return (short) (diaApi % 7); }

    static int diaDoBanco(int diaBanco) { return diaBanco == 0 ? 7 : diaBanco; }

    static LocalDate segundaDaSemana(LocalDate dia) {
        return dia.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /**
     * Regras do plano (testáveis sem banco): dia 1–7, tipo de refeição válido, prato informado e aprovado (presente em
     * {@code aprovados}), uma refeição por dia × tipo e observação de até 300 caracteres.
     */
    static List<RefeicaoForm> validar(PlanoForm form, Set<UUID> aprovados) {
        if (form == null || form.refeicoes() == null) throw new IllegalArgumentException("Envie as refeições do plano");
        if (form.refeicoes().size() > 7 * TIPOS.size()) throw new IllegalArgumentException("Refeições demais para uma semana");
        var vistos = new HashSet<String>();
        var limpas = new ArrayList<RefeicaoForm>();
        for (var r : form.refeicoes()) {
            if (r.diaSemana() == null || r.diaSemana() < 1 || r.diaSemana() > 7) throw new IllegalArgumentException("Dia da semana inválido");
            if (r.tipo() == null || !TIPOS.contains(r.tipo())) throw new IllegalArgumentException("Tipo de refeição inválido");
            if (r.idMarmita() == null) throw new IllegalArgumentException("Escolha um prato para cada refeição");
            if (!aprovados.contains(r.idMarmita())) throw new IllegalArgumentException("Só pratos aprovados podem entrar no plano");
            if (!vistos.add(r.diaSemana() + "|" + r.tipo())) throw new IllegalArgumentException("Há duas refeições no mesmo dia e horário");
            var obs = r.observacao() == null || r.observacao().isBlank() ? null : r.observacao().trim();
            if (obs != null && obs.length() > 300) throw new IllegalArgumentException("A observação pode ter no máximo 300 caracteres");
            limpas.add(new RefeicaoForm(r.diaSemana(), r.tipo(), r.idMarmita(), obs));
        }
        return limpas;
    }

    public Plano consultar(UUID idUsuario, UUID idCliente) {
        var nutri = ctx.atual(idUsuario);
        ctx.exigirCliente(nutri.id(), idCliente);
        var metas = metas(idCliente);
        var plano = jdbc.sql("select id, semana_inicio from plano_alimentar where id_usuario = :c and ativo order by semana_inicio desc limit 1")
                .param("c", idCliente).query((rs, i) -> Map.entry(rs.getObject("id", UUID.class), rs.getObject("semana_inicio", LocalDate.class)))
                .optional();
        if (plano.isEmpty()) {
            var segunda = segundaDaSemana(LocalDate.now(FUSO));
            return new Plano(null, segunda, segunda.plusDays(6), metas, List.of());
        }
        var idPlano = plano.get().getKey();
        var linhas = jdbc.sql("select id, dia_semana, tipo_refeicao, id_marmita, observacao from refeicao_plano where id_plano_alimentar = :p")
                .param("p", idPlano)
                .query((rs, i) -> new Object[]{rs.getObject("id", UUID.class), diaDoBanco(rs.getInt("dia_semana")), rs.getString("tipo_refeicao"),
                        rs.getObject("id_marmita", UUID.class), rs.getString("observacao")})
                .list();
        var pratos = catalogo.aprovadosPorId(linhas.stream().map(l -> (UUID) l[3]).toList());
        var refeicoes = linhas.stream()
                .map(l -> new Refeicao((UUID) l[0], (int) l[1], (String) l[2], (String) l[2], (String) l[4], pratos.get((UUID) l[3])))
                .sorted(Comparator.comparingInt(Refeicao::diaSemana).thenComparingInt(r -> TIPOS.indexOf(r.tipo())))
                .toList();
        var inicio = plano.get().getValue();
        return new Plano(idPlano, inicio, inicio.plusDays(6), metas, refeicoes);
    }

    @Transactional
    public Plano salvar(UUID idUsuario, UUID idCliente, PlanoForm form) {
        var nutri = ctx.atual(idUsuario);
        ctx.exigirCliente(nutri.id(), idCliente);
        var ids = form == null || form.refeicoes() == null ? List.<UUID>of()
                : form.refeicoes().stream().map(RefeicaoForm::idMarmita).filter(Objects::nonNull).distinct().toList();
        var refeicoes = validar(form, catalogo.aprovadosPorId(ids).keySet());

        var metas = metas(idCliente);
        var idPlano = jdbc.sql("select id from plano_alimentar where id_usuario = :c and ativo order by semana_inicio desc limit 1")
                .param("c", idCliente).query(UUID.class).optional()
                .orElseGet(() -> jdbc.sql("""
                        insert into plano_alimentar (id_usuario, id_nutricionista, semana_inicio, ativo,
                                                     meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras)
                        values (:c, :n, :s, true, :kcal, :p, :carb, :g, :f) returning id""")
                        .param("c", idCliente).param("n", nutri.id()).param("s", segundaDaSemana(LocalDate.now(FUSO)))
                        .param("kcal", metas.calorias()).param("p", metas.proteinas()).param("carb", metas.carboidratos())
                        .param("g", metas.gorduras()).param("f", metas.fibras())
                        .query(UUID.class).single());

        jdbc.sql("delete from refeicao_plano where id_plano_alimentar = :p").param("p", idPlano).update();
        for (var r : refeicoes) {
            jdbc.sql("""
                    insert into refeicao_plano (id_plano_alimentar, dia_semana, tipo_refeicao, horario, id_marmita, observacao)
                    values (:p, :d, :t, :h, :m, :o)""")
                    .param("p", idPlano).param("d", diaParaBanco(r.diaSemana())).param("t", r.tipo()).param("h", HORARIOS.get(r.tipo()))
                    .param("m", r.idMarmita()).param("o", r.observacao())
                    .update();
        }
        jdbc.sql("update plano_alimentar set id_nutricionista = :n, atualizado_em = now() where id = :p")
                .param("n", nutri.id()).param("p", idPlano).update();

        notificacoes.notificar(idCliente, TipoNotificacao.NUTRICIONISTA, "Seu plano alimentar foi atualizado",
                nutri.nome() + " montou as refeições da sua semana com pratos do catálogo.", "/app/meu-plano");
        return consultar(idUsuario, idCliente);
    }

    private Metas metas(UUID idCliente) {
        return jdbc.sql("""
                select meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras from perfil_cliente where id_usuario = :c""")
                .param("c", idCliente)
                .query((rs, i) -> new Metas((Integer) rs.getObject("meta_calorias"), (Integer) rs.getObject("meta_proteinas"),
                        (Integer) rs.getObject("meta_carboidratos"), (Integer) rs.getObject("meta_gorduras"), (Integer) rs.getObject("meta_fibras")))
                .optional().orElse(new Metas(null, null, null, null, null));
    }
}
