package com.tricode.cleaneats.service.cliente;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import com.tricode.cleaneats.domain.MetasIniciais;
import com.tricode.cleaneats.repository.RestricaoAlimentarRepository;
import com.tricode.cleaneats.service.SupabaseServicoClient;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.util.*;

/**
 * Perfil do cliente (telas 21 e 22, CE-12): dados pessoais e físicos (IMC), objetivo e metas, restrições,
 * foto e capa (Storage), preferências de notificação, estatísticas, conquistas e exclusão de conta (LGPD). Dono: frente A.
 */
@Service
public class PerfilClienteService {

    public record RestricaoDto(short id, String slug, String nome) {}
    public record MetasDto(Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras, Integer fibras, Integer aguaMl) {}
    public record NutriDto(String nome, String crn, String avatarUrl) {}
    public record PerfilDto(UUID id, String nome, String email, String telefone, String avatarUrl, String capaUrl, String username,
                            String bio, OffsetDateTime membroDesde, String tier, String sexo, LocalDate dataNascimento, Integer idade,
                            BigDecimal pesoKg, BigDecimal alturaCm, String nivelAtividade, BigDecimal imc, String classificacaoImc,
                            String objetivo, MetasDto metas, BigDecimal metaPesoKg, Integer prazoMetaMeses, List<RestricaoDto> restricoes,
                            String observacoesAlimentares, String cidade, int totalEnderecos, Map<String, Boolean> preferencias, NutriDto nutricionista) {}
    public record AtualizarPerfilReq(String nome, String telefone, String username, String bio, LocalDate dataNascimento, String sexo,
                                     BigDecimal pesoKg, BigDecimal alturaCm, String nivelAtividade, String objetivo,
                                     BigDecimal metaPesoKg, Integer prazoMetaMeses, List<String> restricoes, String observacoesAlimentares) {}
    public record ConquistaDto(String codigo, String nome, String descricao, String icone, boolean obtida, OffsetDateTime obtidaEm,
                               int progresso, int alvo) {}
    public record NutrienteSemana(String nome, BigDecimal consumido, BigDecimal meta, BigDecimal previstoRestante) {}
    public record EstatisticasDto(int pedidos, BigDecimal calorias, BigDecimal proteinas, int avaliacoes, LocalDate semanaInicio,
                                  int diasRestantes, List<NutrienteSemana> semana, List<ConquistaDto> conquistas) {}

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final Set<String> NIVEIS = Set.of("SEDENTARIO", "LEVE", "MODERADO", "INTENSO", "ATLETA");
    private static final Set<String> PREFERENCIAS = Set.of("pedido", "cardapio", "nutricionista", "assinatura", "email");

    private final JdbcClient jdbc;
    private final RestricaoAlimentarRepository restricoes;
    private final SupabaseServicoClient supabase;
    private final ObjectMapper json;

    public PerfilClienteService(JdbcClient jdbc, RestricaoAlimentarRepository restricoes, SupabaseServicoClient supabase, ObjectMapper json) {
        this.jdbc = jdbc; this.restricoes = restricoes; this.supabase = supabase; this.json = json;
    }

    public PerfilDto consultar(UUID idUsuario) {
        var lista = restricoes.listarDoCliente(idUsuario).stream().map(r -> new RestricaoDto(r.getId(), r.getSlug(), r.getNome())).toList();
        return jdbc.sql("""
                select u.id, u.nome, u.email, u.telefone, u.avatar_url, u.criado_em, u.id_tier, u.preferencias_notificacao::text as prefs,
                       pc.capa_url, pc.username, pc.bio, pc.sexo, pc.data_nascimento, pc.peso_kg, pc.altura_cm, pc.nivel_atividade,
                       pc.objetivo_nutricional, pc.meta_calorias, pc.meta_proteinas, pc.meta_carboidratos, pc.meta_gorduras, pc.meta_fibras,
                       pc.meta_agua_ml, pc.meta_peso_kg, pc.prazo_meta_meses, pc.observacoes_alimentares,
                       (select e.cidade || ' · ' || e.uf from endereco e where e.id_usuario = u.id order by e.principal desc limit 1) as cidade,
                       (select count(*) from endereco e where e.id_usuario = u.id) as enderecos,
                       nu.nome as nutri_nome, n.crn, nu.avatar_url as nutri_avatar
                from usuario u join perfil_cliente pc on pc.id_usuario = u.id
                left join nutricionista n on n.id = pc.id_nutricionista left join usuario nu on nu.id = n.id_usuario
                where u.id = :u""")
                .param("u", idUsuario)
                .query((rs, i) -> {
                    var nascimento = rs.getObject("data_nascimento", LocalDate.class);
                    var peso = rs.getBigDecimal("peso_kg");
                    var altura = rs.getBigDecimal("altura_cm");
                    var imc = imc(peso, altura);
                    return new PerfilDto(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"), rs.getString("telefone"),
                            rs.getString("avatar_url"), rs.getString("capa_url"), rs.getString("username"), rs.getString("bio"),
                            rs.getObject("criado_em", OffsetDateTime.class), rs.getString("id_tier"), rs.getString("sexo"), nascimento,
                            nascimento == null ? null : Period.between(nascimento, LocalDate.now(FUSO)).getYears(),
                            peso, altura, rs.getString("nivel_atividade"), imc, MetasIniciais.classificarImc(imc), rs.getString("objetivo_nutricional"),
                            new MetasDto(inteiro(rs, "meta_calorias"), inteiro(rs, "meta_proteinas"), inteiro(rs, "meta_carboidratos"),
                                    inteiro(rs, "meta_gorduras"), inteiro(rs, "meta_fibras"), inteiro(rs, "meta_agua_ml")),
                            rs.getBigDecimal("meta_peso_kg"), inteiro(rs, "prazo_meta_meses"), lista, rs.getString("observacoes_alimentares"),
                            rs.getString("cidade"), rs.getInt("enderecos"), lerPreferencias(rs.getString("prefs")),
                            rs.getString("nutri_nome") == null ? null : new NutriDto(rs.getString("nutri_nome"), rs.getString("crn"), rs.getString("nutri_avatar")));
                })
                .optional().orElseThrow(() -> new IllegalArgumentException("Perfil de cliente não encontrado"));
    }

    /** Salva a tela 22. Trocar o objetivo recalcula as metas iniciais; trocar o peso recalcula a meta de água. */
    @Transactional
    public PerfilDto atualizar(UUID idUsuario, AtualizarPerfilReq r) {
        var nome = r.nome() == null ? "" : r.nome().trim();
        if (nome.length() < 3) throw new IllegalArgumentException("Informe o nome completo");
        var telefone = r.telefone() == null || r.telefone().isBlank() ? null : r.telefone().trim();
        if (telefone != null && telefone.replaceAll("\\D", "").length() < 10) throw new IllegalArgumentException("Telefone inválido: use DDD + número");
        var username = r.username() == null || r.username().isBlank() ? null : r.username().trim().replaceFirst("^@", "").toLowerCase(Locale.ROOT);
        if (username != null && !username.matches("[a-z0-9_.]{3,30}")) throw new IllegalArgumentException("Username: 3 a 30 letras minúsculas, números, ponto ou _");
        if (r.bio() != null && r.bio().length() > 400) throw new IllegalArgumentException("A bio pode ter no máximo 400 caracteres");
        if (r.dataNascimento() != null) {
            var idade = Period.between(r.dataNascimento(), LocalDate.now(FUSO)).getYears();
            if (idade < 13 || idade > 120) throw new IllegalArgumentException("Data de nascimento inválida");
        }
        if (r.sexo() != null && !Set.of("F", "M", "O").contains(r.sexo())) throw new IllegalArgumentException("Gênero inválido");
        if (r.pesoKg() == null || r.pesoKg().compareTo(BigDecimal.valueOf(20)) < 0 || r.pesoKg().compareTo(BigDecimal.valueOf(400)) > 0)
            throw new IllegalArgumentException("Peso deve estar entre 20 e 400 kg");
        if (r.alturaCm() == null || r.alturaCm().compareTo(BigDecimal.valueOf(80)) < 0 || r.alturaCm().compareTo(BigDecimal.valueOf(250)) > 0)
            throw new IllegalArgumentException("Altura deve estar entre 80 e 250 cm");
        if (r.nivelAtividade() != null && !NIVEIS.contains(r.nivelAtividade())) throw new IllegalArgumentException("Nível de atividade inválido");
        ObjetivoNutricional objetivo;
        try { objetivo = ObjetivoNutricional.valueOf(r.objetivo()); } catch (RuntimeException e) { throw new IllegalArgumentException("Escolha um objetivo"); }
        if (r.metaPesoKg() != null && (r.metaPesoKg().compareTo(BigDecimal.valueOf(20)) < 0 || r.metaPesoKg().compareTo(BigDecimal.valueOf(400)) > 0))
            throw new IllegalArgumentException("Meta de peso inválida");
        if (r.prazoMetaMeses() != null && (r.prazoMetaMeses() < 1 || r.prazoMetaMeses() > 24)) throw new IllegalArgumentException("Prazo da meta inválido");
        if (r.observacoesAlimentares() != null && r.observacoesAlimentares().length() > 1000) throw new IllegalArgumentException("Observações: no máximo 1.000 caracteres");

        var antes = jdbc.sql("select objetivo_nutricional, peso_kg from perfil_cliente where id_usuario = :u").param("u", idUsuario)
                .query((rs, i) -> new Object[]{rs.getString(1), rs.getBigDecimal(2)}).single();
        jdbc.sql("update usuario set nome = :n, telefone = :t, atualizado_em = now() where id = :u")
                .param("n", nome).param("t", telefone).param("u", idUsuario).update();
        try {
            jdbc.sql("""
                    update perfil_cliente set username = :username, bio = :bio, data_nascimento = :nasc, sexo = :sexo, peso_kg = :peso,
                      altura_cm = :altura, nivel_atividade = :nivel, objetivo_nutricional = :obj, meta_peso_kg = :metaPeso,
                      prazo_meta_meses = :prazo, observacoes_alimentares = :obs
                    where id_usuario = :u""")
                    .param("username", username).param("bio", vazioParaNulo(r.bio())).param("nasc", r.dataNascimento()).param("sexo", r.sexo())
                    .param("peso", r.pesoKg()).param("altura", r.alturaCm()).param("nivel", r.nivelAtividade()).param("obj", objetivo.name())
                    .param("metaPeso", r.metaPesoKg()).param("prazo", r.prazoMetaMeses()).param("obs", vazioParaNulo(r.observacoesAlimentares()))
                    .param("u", idUsuario).update();
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("Esse username já está em uso");
        }
        if (!objetivo.name().equals(antes[0])) {
            var m = MetasIniciais.para(objetivo);
            jdbc.sql("update perfil_cliente set meta_calorias = :c, meta_proteinas = :p, meta_carboidratos = :cb, meta_gorduras = :g, meta_fibras = :f where id_usuario = :u")
                    .param("c", m.calorias()).param("p", m.proteinas()).param("cb", m.carboidratos()).param("g", m.gorduras()).param("f", m.fibras())
                    .param("u", idUsuario).update();
        }
        if (antes[1] == null || ((BigDecimal) antes[1]).compareTo(r.pesoKg()) != 0) {
            jdbc.sql("update perfil_cliente set meta_agua_ml = :a where id_usuario = :u").param("a", MetasIniciais.aguaMl(r.pesoKg())).param("u", idUsuario).update();
        }
        if (r.restricoes() != null) {
            restricoes.limparDoCliente(idUsuario);
            for (var x : restricoes.findBySlugIn(r.restricoes())) restricoes.vincular(idUsuario, x.getId());
        }
        return consultar(idUsuario);
    }

    @Transactional
    public PerfilDto enviarFoto(UUID idUsuario, MultipartFile arquivo, boolean capa) {
        var urlImagem = supabase.enviarImagem("avatares", idUsuario.toString(), arquivo);
        if (capa) jdbc.sql("update perfil_cliente set capa_url = :x where id_usuario = :u").param("x", urlImagem).param("u", idUsuario).update();
        else jdbc.sql("update usuario set avatar_url = :x, atualizado_em = now() where id = :u").param("x", urlImagem).param("u", idUsuario).update();
        return consultar(idUsuario);
    }

    @Transactional
    public PerfilDto removerFoto(UUID idUsuario) {
        jdbc.sql("update usuario set avatar_url = null, atualizado_em = now() where id = :u").param("u", idUsuario).update();
        return consultar(idUsuario);
    }

    @Transactional
    public Map<String, Boolean> salvarPreferencias(UUID idUsuario, Map<String, Boolean> prefs) {
        var limpas = new LinkedHashMap<String, Boolean>();
        prefs.forEach((k, v) -> { if (PREFERENCIAS.contains(k) && v != null) limpas.put(k, v); });
        try {
            jdbc.sql("update usuario set preferencias_notificacao = preferencias_notificacao || cast(:p as jsonb) where id = :u")
                    .param("p", json.writeValueAsString(limpas)).param("u", idUsuario).update();
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalArgumentException("Preferências inválidas");
        }
        return consultar(idUsuario).preferencias();
    }

    /**
     * CE-12 / LGPD: anonimiza os dados pessoais, apaga endereços e restrições, cancela a assinatura e bloqueia o login.
     * Pedidos e faturas ficam (obrigação fiscal e histórico do restaurante), sem dado que identifique a pessoa.
     */
    @Transactional
    public void excluirConta(UUID idUsuario) {
        var emailAnonimo = "removido-" + idUsuario + "@anonimo.cleaneats.app";
        jdbc.sql("""
                update usuario set nome = 'Usuário removido', email = :e, telefone = null, avatar_url = null, id_tier = 'FREE',
                  anonimizado_em = now(), atualizado_em = now() where id = :u""").param("e", emailAnonimo).param("u", idUsuario).update();
        jdbc.sql("""
                update perfil_cliente set username = null, bio = null, capa_url = null, data_nascimento = null, sexo = null, peso_kg = null,
                  altura_cm = null, meta_peso_kg = null, prazo_meta_meses = null, observacoes_alimentares = null, id_nutricionista = null
                where id_usuario = :u""").param("u", idUsuario).update();
        jdbc.sql("delete from endereco where id_usuario = :u").param("u", idUsuario).update();
        jdbc.sql("delete from favorito where id_usuario = :u").param("u", idUsuario).update();
        restricoes.limparDoCliente(idUsuario);
        jdbc.sql("""
                update assinatura set status = 'EXPIRADA', cancelada_em = coalesce(cancelada_em, now()), encerra_em = now()
                where id_usuario = :u and status in ('TRIAL', 'ATIVA', 'PAUSADA', 'CANCELADA')""").param("u", idUsuario).update();
        supabase.bloquearUsuarioAuth(idUsuario, emailAnonimo);
    }

    /** Estatísticas, metas da semana e conquistas (calculadas dos dados reais; as obtidas ficam gravadas). */
    @Transactional
    public EstatisticasDto estatisticas(UUID idUsuario) {
        var hoje = LocalDate.now(FUSO);
        var inicioSemana = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1L);
        var n = jdbc.sql("""
                select
                  (select count(*) from pedido where id_usuario = :u and status <> 'CANCELADO') as pedidos,
                  (select count(*) from pedido where id_usuario = :u and status = 'ENTREGUE') as entregues,
                  (select coalesce(sum(i.calorias * i.quantidade), 0) from item_pedido i join pedido p on p.id = i.id_pedido
                     where p.id_usuario = :u and p.status <> 'CANCELADO') as calorias,
                  (select coalesce(sum(i.proteinas * i.quantidade), 0) from item_pedido i join pedido p on p.id = i.id_pedido
                     where p.id_usuario = :u and p.status <> 'CANCELADO') as proteinas,
                  (select count(*) from avaliacao where id_usuario = :u) as avaliacoes,
                  (select count(*) from consumo_diario where id_usuario = :u and calorias > 0) as dias_registro,
                  (select count(*) from consumo_diario c join perfil_cliente pc on pc.id_usuario = c.id_usuario
                     where c.id_usuario = :u and pc.meta_proteinas > 0 and c.proteinas >= pc.meta_proteinas) as dias_proteina,
                  (select count(*) from consumo_diario c join perfil_cliente pc on pc.id_usuario = c.id_usuario
                     where c.id_usuario = :u and pc.meta_calorias > 0 and c.calorias >= pc.meta_calorias * 0.9
                       and c.data >= date_trunc('month', :hoje::date)) as metas_mes,
                  (select (:hoje::date - criado_em::date) from usuario where id = :u) as dias_conta""")
                .param("u", idUsuario).param("hoje", hoje)
                .query((rs, i) -> Map.of("pedidos", rs.getInt("pedidos"), "entregues", rs.getInt("entregues"),
                        "calorias", rs.getBigDecimal("calorias"), "proteinas", rs.getBigDecimal("proteinas"), "avaliacoes", rs.getInt("avaliacoes"),
                        "dias_registro", rs.getInt("dias_registro"), "dias_proteina", rs.getInt("dias_proteina"),
                        "metas_mes", rs.getInt("metas_mes"), "dias_conta", rs.getInt("dias_conta")))
                .single();

        var progresso = new LinkedHashMap<String, int[]>();
        progresso.put("PRIMEIRO_PEDIDO", new int[]{(int) n.get("entregues"), 1});
        progresso.put("SEMANA_CONSISTENTE", new int[]{(int) n.get("dias_registro"), 7});
        progresso.put("MESTRE_PROTEINA", new int[]{(int) n.get("dias_proteina"), 30});
        progresso.put("AVALIADOR_TOP", new int[]{(int) n.get("avaliacoes"), 30});
        progresso.put("MARATONISTA_FIT", new int[]{(int) n.get("pedidos"), 40});
        progresso.put("FORCA_TOTAL", new int[]{((BigDecimal) n.get("proteinas")).intValue(), 2000});
        progresso.put("ATIRADOR", new int[]{(int) n.get("metas_mes"), 10});
        progresso.put("VETERANO", new int[]{(int) n.get("dias_conta"), 365});
        progresso.forEach((codigo, p) -> {
            if (p[0] >= p[1]) jdbc.sql("""
                    insert into conquista_usuario (id_usuario, id_conquista) select :u, id from conquista where codigo = :c
                    on conflict do nothing""").param("u", idUsuario).param("c", codigo).update();
        });
        var conquistas = jdbc.sql("""
                select c.codigo, c.nome, c.descricao, c.icone, cu.obtida_em from conquista c
                left join conquista_usuario cu on cu.id_conquista = c.id and cu.id_usuario = :u order by c.id""")
                .param("u", idUsuario)
                .query((rs, i) -> {
                    var p = progresso.getOrDefault(rs.getString("codigo"), new int[]{0, 1});
                    var obtidaEm = rs.getObject("obtida_em", OffsetDateTime.class);
                    return new ConquistaDto(rs.getString("codigo"), rs.getString("nome"), rs.getString("descricao"), rs.getString("icone"),
                            obtidaEm != null, obtidaEm, Math.min(p[0], p[1]), p[1]);
                }).list();

        var semana = jdbc.sql("""
                select coalesce(sum(c.calorias), 0) cal, coalesce(sum(c.proteinas), 0) prot, coalesce(sum(c.carboidratos), 0) carb,
                       coalesce(sum(c.fibras), 0) fib, max(pc.meta_calorias) mc, max(pc.meta_proteinas) mp, max(pc.meta_carboidratos) mcb,
                       max(pc.meta_fibras) mf
                from perfil_cliente pc left join consumo_diario c on c.id_usuario = pc.id_usuario and c.data between :ini and :hoje
                where pc.id_usuario = :u""")
                .param("u", idUsuario).param("ini", inicioSemana).param("hoje", hoje)
                .query((rs, i) -> new BigDecimal[]{rs.getBigDecimal("cal"), rs.getBigDecimal("prot"), rs.getBigDecimal("carb"), rs.getBigDecimal("fib"),
                        rs.getBigDecimal("mc"), rs.getBigDecimal("mp"), rs.getBigDecimal("mcb"), rs.getBigDecimal("mf")}).single();
        // Previsto nos dias que faltam da semana: refeições do plano ativo ainda não consumidas
        var previsto = jdbc.sql("""
                select coalesce(sum(m.calorias), 0) cal, coalesce(sum(m.proteinas), 0) prot, coalesce(sum(m.carboidratos), 0) carb,
                       coalesce(sum(m.fibras), 0) fib
                from plano_alimentar pa join refeicao_plano rp on rp.id_plano_alimentar = pa.id join marmita m on m.id = rp.id_marmita
                where pa.id_usuario = :u and pa.ativo and (pa.semana_inicio + (rp.dia_semana - 1)) > :hoje
                  and (pa.semana_inicio + (rp.dia_semana - 1)) <= :fim""")
                .param("u", idUsuario).param("hoje", hoje).param("fim", inicioSemana.plusDays(6))
                .query((rs, i) -> new BigDecimal[]{rs.getBigDecimal("cal"), rs.getBigDecimal("prot"), rs.getBigDecimal("carb"), rs.getBigDecimal("fib")})
                .single();
        var sete = BigDecimal.valueOf(7);
        var nomes = List.of("Calorias", "Proteína", "Carboidratos", "Fibras");
        var lista = new ArrayList<NutrienteSemana>();
        for (int i = 0; i < 4; i++) {
            lista.add(new NutrienteSemana(nomes.get(i), semana[i], semana[i + 4] == null ? null : semana[i + 4].multiply(sete), previsto[i]));
        }
        return new EstatisticasDto((int) n.get("pedidos"), (BigDecimal) n.get("calorias"), (BigDecimal) n.get("proteinas"), (int) n.get("avaliacoes"),
                inicioSemana, 7 - hoje.getDayOfWeek().getValue(), lista, conquistas);
    }

    // ---------- auxiliares ----------

    static BigDecimal imc(BigDecimal pesoKg, BigDecimal alturaCm) {
        if (pesoKg == null || alturaCm == null || alturaCm.signum() == 0) return null;
        var m = alturaCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return pesoKg.divide(m.multiply(m), 1, RoundingMode.HALF_UP);
    }

    private Map<String, Boolean> lerPreferencias(String texto) {
        try { return texto == null ? Map.of() : json.readValue(texto, new TypeReference<Map<String, Boolean>>() {}); }
        catch (Exception e) { return Map.of(); }
    }

    private static Integer inteiro(java.sql.ResultSet rs, String coluna) throws java.sql.SQLException {
        var v = rs.getObject(coluna);
        return v == null ? null : ((Number) v).intValue();
    }

    private static String vazioParaNulo(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
