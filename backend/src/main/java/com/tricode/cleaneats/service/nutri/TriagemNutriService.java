package com.tricode.cleaneats.service.nutri;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.MetasIniciais;
import com.tricode.cleaneats.domain.MetasIniciais.CalculoMetabolico;
import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.*;

/** Triagens da nutricionista (tela 27). */
@Service
public class TriagemNutriService {
    public record TriagemLinha(UUID id, UUID idCliente, String status, String nome, String tier, Integer idade, java.math.BigDecimal pesoKg,
                               java.math.BigDecimal alturaCm, String sexo, String nivelAtividade, String objetivo,
                               CalculoMetabolico calculoBasal, List<String> restricoes, String rotina,
                               List<String> condicoesSaude, OffsetDateTime criadoEm, OffsetDateTime iniciadaEm,
                               OffsetDateTime concluidaEm, String observacoes) {}
    public record ListaTriagens(PaginaDto<TriagemLinha> pagina, Map<String, Long> contagens) {}
    public record Metas(Integer kcal, Integer proteinas, Integer carboidratos, Integer gorduras, Integer fibras, Integer aguaMl,
                        String observacoes) {}
    public record AcaoTriagem(UUID id, String status, OffsetDateTime iniciadaEm, OffsetDateTime concluidaEm) {}

    private static final Set<String> STATUS = Set.of("AGUARDANDO", "EM_ANDAMENTO", "CONCLUIDA");
    private final JdbcClient jdbc;
    private final NutriContexto contexto;
    private final NotificacaoService notificacoes;
    private final ObjectMapper json;

    public TriagemNutriService(JdbcClient jdbc, NutriContexto contexto, NotificacaoService notificacoes, ObjectMapper json) {
        this.jdbc = jdbc; this.contexto = contexto; this.notificacoes = notificacoes; this.json = json;
    }

    public ListaTriagens listar(UUID idUsuario, String status, String ordenacao, int pagina, int limite) {
        var nutri = contexto.atual(idUsuario);
        if (status == null || !STATUS.contains(status)) throw new IllegalArgumentException("Escolha um status de triagem válido");
        if (pagina < 0 || limite < 1 || limite > 50) throw new IllegalArgumentException("Paginação inválida");
        if (ordenacao == null) ordenacao = "ANTIGAS";
        String order = switch (ordenacao) {
            case "ANTIGAS" -> "t.criado_em asc";
            case "RECENTES" -> "t.criado_em desc";
            case "TIER" -> "case c.id_tier when 'PREMIUM' then 0 when 'PRO' then 1 else 2 end, t.criado_em asc";
            default -> throw new IllegalArgumentException("Ordenação inválida");
        };
        var contagens = new LinkedHashMap<String, Long>();
        jdbc.sql("select status, count(*) total from triagem where id_nutricionista = :n group by status")
                .param("n", nutri.id()).query((rs, i) -> Map.entry(rs.getString("status"), rs.getLong("total")))
                .list().forEach(e -> contagens.put(e.getKey(), e.getValue()));
        STATUS.forEach(s -> contagens.putIfAbsent(s, 0L));
        long total = contagens.get(status);
        int offset = pagina * limite;
        var itens = jdbc.sql("""
                select t.id, t.status, c.id id_cliente, c.nome, c.id_tier tier, pc.data_nascimento,
                       pc.peso_kg, pc.altura_cm, pc.sexo, pc.nivel_atividade, pc.objetivo_nutricional objetivo,
                       coalesce(r.restricoes, array[]::text[]) restricoes, t.respostas::text respostas,
                       t.criado_em, t.iniciada_em, t.concluida_em, t.observacoes
                from triagem t
                join usuario c on c.id = t.id_cliente
                join perfil_cliente pc on pc.id_usuario = c.id
                left join lateral (
                  select array_agg(ra.nome order by ra.nome) restricoes
                  from cliente_restricao cr join restricao_alimentar ra on ra.id = cr.id_restricao
                  where cr.id_usuario = c.id
                ) r on true
                where t.id_nutricionista = :n and t.status = :status
                order by""" + " " + order + " limit :limite offset :offset")
                .param("n", nutri.id()).param("status", status).param("limite", limite).param("offset", offset)
                .query((rs, i) -> {
                    Map<String, Object> respostas;
                    try { respostas = json.readValue(rs.getString("respostas"), new TypeReference<>() {}); }
                    catch (Exception e) { respostas = Map.of(); }
                    var nascimento = rs.getObject("data_nascimento", LocalDate.class);
                    Integer idade = nascimento == null ? null : Period.between(nascimento, LocalDate.now()).getYears();
                    var peso = rs.getBigDecimal("peso_kg");
                    var altura = rs.getBigDecimal("altura_cm");
                    var sexo = rs.getString("sexo");
                    var nivel = rs.getString("nivel_atividade");
                    var objStr = rs.getString("objetivo");
                    ObjetivoNutricional objEnum;
                    try { objEnum = ObjetivoNutricional.valueOf(objStr); } catch (Exception e) { objEnum = ObjetivoNutricional.EQUILIBRIO; }
                    var basal = MetasIniciais.calcular(objEnum, peso, altura, idade, sexo, MetasIniciais.lerNivel(nivel));
                    var restricoes = rs.getArray("restricoes");
                    List<String> nomes = List.of();
                    if (restricoes != null) try { nomes = List.of((String[]) restricoes.getArray()); } catch (Exception ignored) { }
                    var condicoes = respostas.get("condicoes_saude");
                    List<String> condicaoLista = condicoes instanceof List<?> lista ? lista.stream().map(String::valueOf).toList() : List.of();
                    return new TriagemLinha(rs.getObject("id", UUID.class), rs.getObject("id_cliente", UUID.class), rs.getString("status"), rs.getString("nome"),
                            rs.getString("tier"), idade, peso, altura, sexo, nivel, objStr, basal, nomes,
                            Objects.toString(respostas.get("rotina"), ""), condicaoLista,
                            rs.getObject("criado_em", OffsetDateTime.class), rs.getObject("iniciada_em", OffsetDateTime.class),
                            rs.getObject("concluida_em", OffsetDateTime.class), rs.getString("observacoes"));
                }).list();
        return new ListaTriagens(new PaginaDto<>(itens, pagina, (int) Math.ceil((double) total / limite), total), contagens);
    }

    @Transactional
    public AcaoTriagem iniciar(UUID idUsuario, UUID id) {
        var nutri = contexto.atual(idUsuario);
        var triagem = exigirDaNutri(nutri.id(), id);
        contexto.exigirCliente(nutri.id(), triagem.cliente());
        int alteradas = jdbc.sql("update triagem set status = 'EM_ANDAMENTO', iniciada_em = coalesce(iniciada_em, now()) where id = :id and status = 'AGUARDANDO'")
                .param("id", id).update();
        if (alteradas == 0) throw new IllegalArgumentException("Esta triagem não está mais pendente");
        return jdbc.sql("select id, status, iniciada_em, concluida_em from triagem where id = :id").param("id", id)
                .query((rs, i) -> new AcaoTriagem(rs.getObject("id", UUID.class), rs.getString("status"),
                        rs.getObject("iniciada_em", OffsetDateTime.class), rs.getObject("concluida_em", OffsetDateTime.class))).single();
    }

    @Transactional
    public AcaoTriagem concluir(UUID idUsuario, UUID id, Metas metas) {
        validar(metas);
        var nutri = contexto.atual(idUsuario);
        var triagem = exigirDaNutri(nutri.id(), id);
        contexto.exigirCliente(nutri.id(), triagem.cliente());
        int perfil = jdbc.sql("""
                update perfil_cliente set meta_calorias = :kcal, meta_proteinas = :p, meta_carboidratos = :c,
                  meta_gorduras = :g, meta_fibras = :f, meta_agua_ml = :agua
                where id_usuario = :cliente and id_nutricionista = :nutri
                """).param("kcal", metas.kcal()).param("p", metas.proteinas()).param("c", metas.carboidratos())
                .param("g", metas.gorduras()).param("f", metas.fibras()).param("agua", metas.aguaMl())
                .param("cliente", triagem.cliente()).param("nutri", nutri.id()).update();
        if (perfil == 0) throw new RecursoNaoEncontradoException("CLIENTE", "Perfil do cliente não encontrado");
        int alteradas = jdbc.sql("update triagem set status = 'CONCLUIDA', concluida_em = now(), observacoes = :obs where id = :id and status = 'EM_ANDAMENTO'")
                .param("obs", metas.observacoes() == null || metas.observacoes().isBlank() ? null : metas.observacoes().trim())
                .param("id", id).update();
        if (alteradas == 0) throw new IllegalArgumentException("Inicie a triagem antes de concluí-la");
        notificacoes.notificar(triagem.cliente(), TipoNotificacao.NUTRICIONISTA, "Seu plano está pronto",
                "A nutricionista definiu suas metas. Acesse seu plano alimentar.", "/app/meu-plano");
        return jdbc.sql("select id, status, iniciada_em, concluida_em from triagem where id = :id").param("id", id)
                .query((rs, i) -> new AcaoTriagem(rs.getObject("id", UUID.class), rs.getString("status"),
                        rs.getObject("iniciada_em", OffsetDateTime.class), rs.getObject("concluida_em", OffsetDateTime.class))).single();
    }

    static void validar(Metas m) {
        if (m == null) throw new IllegalArgumentException("Informe as metas nutricionais");
        if (m.kcal() == null || m.kcal() < 800 || m.kcal() > 6000) throw new IllegalArgumentException("Calorias devem ficar entre 800 e 6000 kcal");
        for (var macro : new Integer[]{m.proteinas(), m.carboidratos(), m.gorduras(), m.fibras()})
            if (macro == null || macro < 0) throw new IllegalArgumentException("Macros e fibras devem ser iguais ou maiores que zero");
        if (m.aguaMl() == null || m.aguaMl() < 500 || m.aguaMl() > 6000) throw new IllegalArgumentException("Água deve ficar entre 500 e 6000 ml");
        if (m.observacoes() != null && m.observacoes().length() > 2000) throw new IllegalArgumentException("As observações podem ter até 2000 caracteres");
    }

    private TriagemRef exigirDaNutri(UUID idNutri, UUID id) {
        return jdbc.sql("select id_cliente from triagem where id = :id and id_nutricionista = :n").param("id", id).param("n", idNutri)
                .query((rs, i) -> new TriagemRef(rs.getObject(1, UUID.class))).optional()
                .orElseThrow(() -> new RecursoNaoEncontradoException("TRIAGEM", "Triagem não encontrada"));
    }
    private record TriagemRef(UUID cliente) {}
}
