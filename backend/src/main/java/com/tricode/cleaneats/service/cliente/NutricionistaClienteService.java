package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Catálogo e escolha de nutricionistas pelo cliente:
 * lista nutricionistas aprovados com especialidades, avaliação, bio, vagas e compatibilidade com o objetivo,
 * permitindo ao cliente Pro/Premium escolher ou trocar seu profissional (abrindo triagem automática).
 */
@Service
public class NutricionistaClienteService {

    public record NutricionistaCardDto(
            UUID id,
            String nome,
            String crn,
            String crnUf,
            String avatarUrl,
            List<String> especialidades,
            Integer anosExperiencia,
            String bio,
            BigDecimal notaMedia,
            int clientesAtivos,
            int maxClientes,
            int vagasDisponiveis,
            boolean disponivel,
            boolean atual,
            boolean compativelObjetivo
    ) {}

    public record CatalogoNutrisDto(
            List<NutricionistaCardDto> itens,
            List<String> especialidades,
            UUID idNutricionistaAtual,
            String objetivoCliente,
            String tierCliente
    ) {}

    private final JdbcClient jdbc;
    private final NotificacaoService notificacoes;

    public NutricionistaClienteService(JdbcClient jdbc, NotificacaoService notificacoes) {
        this.jdbc = jdbc;
        this.notificacoes = notificacoes;
    }

    public CatalogoNutrisDto listar(UUID idUsuarioOpcional, String especialidade, String ordenar) {
        String objetivo = null;
        UUID idAtual = null;
        String tier = null;

        if (idUsuarioOpcional != null) {
            var ctx = jdbc.sql("""
                    select u.id_tier, pc.objetivo_nutricional, pc.id_nutricionista
                    from usuario u left join perfil_cliente pc on pc.id_usuario = u.id
                    where u.id = :u""")
                    .param("u", idUsuarioOpcional)
                    .query((rs, i) -> new Object[]{rs.getString(1), rs.getString(2), rs.getObject(3, UUID.class)})
                    .optional().orElse(null);
            if (ctx != null) {
                tier = (String) ctx[0];
                objetivo = (String) ctx[1];
                idAtual = (UUID) ctx[2];
            }
        }

        final String objFinal = objetivo;
        final UUID atualFinal = idAtual;

        var brutos = jdbc.sql("""
                select n.id, u.nome, n.crn, n.crn_uf, u.avatar_url, n.especialidades, n.anos_experiencia,
                       n.bio, n.nota_media, coalesce(n.max_clientes, 30) as max_clientes,
                       (select count(*) from perfil_cliente pc where pc.id_nutricionista = n.id) as clientes_ativos
                from nutricionista n
                join usuario u on u.id = n.id_usuario
                where n.status_aprovacao = 'APROVADO' and u.anonimizado_em is null""")
                .query((rs, i) -> {
                    UUID id = rs.getObject("id", UUID.class);
                    List<String> esps = CatalogoService.textos(rs.getArray("especialidades"));
                    int ativos = rs.getInt("clientes_ativos");
                    int max = rs.getInt("max_clientes");
                    int vagas = Math.max(0, max - ativos);
                    boolean atual = id.equals(atualFinal);
                    boolean compativel = combinaComObjetivo(esps, objFinal);
                    return new NutricionistaCardDto(
                            id,
                            rs.getString("nome"),
                            rs.getString("crn"),
                            rs.getString("crn_uf"),
                            rs.getString("avatar_url"),
                            esps,
                            (Integer) rs.getObject("anos_experiencia"),
                            rs.getString("bio"),
                            rs.getBigDecimal("nota_media"),
                            ativos,
                            max,
                            vagas,
                            vagas > 0 || atual,
                            atual,
                            compativel
                    );
                }).list();

        var todasEsp = new TreeSet<String>(String.CASE_INSENSITIVE_ORDER);
        brutos.forEach(n -> todasEsp.addAll(n.especialidades()));

        var filtrados = brutos.stream()
                .filter(n -> especialidade == null || especialidade.isBlank()
                        || n.especialidades().stream().anyMatch(e -> e.toLowerCase(Locale.ROOT).contains(especialidade.trim().toLowerCase(Locale.ROOT))))
                .toList();

        var ordenados = new ArrayList<>(filtrados);
        Comparator<NutricionistaCardDto> comp = switch (ordenar == null ? "recomendados" : ordenar.toLowerCase(Locale.ROOT)) {
            case "nota" -> Comparator.comparing(NutricionistaCardDto::notaMedia, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(NutricionistaCardDto::anosExperiencia, Comparator.nullsLast(Comparator.reverseOrder()));
            case "experiencia" -> Comparator.comparing(NutricionistaCardDto::anosExperiencia, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(NutricionistaCardDto::notaMedia, Comparator.nullsLast(Comparator.reverseOrder()));
            case "vagas" -> Comparator.comparingInt(NutricionistaCardDto::vagasDisponiveis).reversed()
                    .thenComparing(NutricionistaCardDto::notaMedia, Comparator.nullsLast(Comparator.reverseOrder()));
            default -> Comparator.comparing(NutricionistaCardDto::atual).reversed()
                    .thenComparing(NutricionistaCardDto::disponivel).reversed()
                    .thenComparing(NutricionistaCardDto::compativelObjetivo).reversed()
                    .thenComparing(NutricionistaCardDto::notaMedia, Comparator.nullsLast(Comparator.reverseOrder()));
        };
        ordenados.sort(comp);

        return new CatalogoNutrisDto(ordenados, new ArrayList<>(todasEsp), idAtual, objetivo, tier);
    }

    @Transactional
    public NutricionistaCardDto escolher(UUID idUsuario, UUID idNutricionista) {
        var user = jdbc.sql("select nome, perfil, id_tier from usuario where id = :u")
                .param("u", idUsuario)
                .query((rs, i) -> new String[]{rs.getString(1), rs.getString(2), rs.getString(3)})
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("USUARIO", "Usuário não encontrado"));
        if (!"CLIENTE".equals(user[1])) {
            throw new IllegalArgumentException("Apenas contas de cliente podem escolher um nutricionista.");
        }
        var tier = TierAssinatura.valueOf(user[2]);
        if (!tier.temNutricionistaDedicado()) {
            throw new IllegalArgumentException("O acompanhamento com nutricionista está disponível nos planos Pro e Premium.");
        }

        var nutri = jdbc.sql("""
                select n.id, n.id_usuario, u.nome, coalesce(n.max_clientes, 30) as max_c,
                       (select count(*) from perfil_cliente pc where pc.id_nutricionista = n.id) as ativos
                from nutricionista n join usuario u on u.id = n.id_usuario
                where n.id = :n and n.status_aprovacao = 'APROVADO'""")
                .param("n", idNutricionista)
                .query((rs, i) -> new Object[]{
                        rs.getObject("id", UUID.class),
                        rs.getObject("id_usuario", UUID.class),
                        rs.getString("nome"),
                        rs.getInt("max_c"),
                        rs.getInt("ativos")
                }).optional()
                .orElseThrow(() -> new RecursoNaoEncontradoException("NUTRICIONISTA", "Nutricionista não encontrado ou não aprovado."));

        UUID atual = jdbc.sql("select id_nutricionista from perfil_cliente where id_usuario = :u")
                .param("u", idUsuario).query(UUID.class).optional().orElse(null);

        if (!idNutricionista.equals(atual) && (int) nutri[4] >= (int) nutri[3]) {
            throw new IllegalArgumentException("Este nutricionista está com a agenda completa no momento. Escolha outro profissional.");
        }

        jdbc.sql("update perfil_cliente set id_nutricionista = :n where id_usuario = :u")
                .param("n", idNutricionista).param("u", idUsuario).update();

        // Abre triagem AGUARDANDO caso ainda não exista triagem aberta com este profissional
        jdbc.sql("""
                insert into triagem (id_cliente, id_nutricionista)
                select :u, :n where not exists (
                  select 1 from triagem where id_cliente = :u and id_nutricionista = :n and status <> 'CONCLUIDA')""")
                .param("u", idUsuario).param("n", idNutricionista).update();

        notificacoes.notificar((UUID) nutri[1], TipoNotificacao.NUTRICIONISTA, "Novo paciente escolheu você",
                user[0] + " selecionou você como nutricionista e já está na sua fila de triagens.", "/nutri/triagens");
        notificacoes.notificar(idUsuario, TipoNotificacao.NUTRICIONISTA, "Nutricionista definido",
                nutri[2] + " recebeu sua triagem e vai analisar suas metas e montar seu plano.", "/app/meu-plano");

        return listar(idUsuario, null, null).itens().stream()
                .filter(n -> n.id().equals(idNutricionista))
                .findFirst().orElseThrow();
    }

    static boolean combinaComObjetivo(List<String> especialidades, String objetivo) {
        if (objetivo == null || especialidades == null || especialidades.isEmpty()) return false;
        String tudo = String.join(" ", especialidades).toLowerCase(Locale.ROOT);
        return switch (objetivo) {
            case "EMAGRECIMENTO" -> tudo.contains("emagrec") || tudo.contains("cutting") || tudo.contains("low carb") || tudo.contains("déficit") || tudo.contains("deficit");
            case "GANHO_MASSA" -> tudo.contains("hipertrof") || tudo.contains("bulking") || tudo.contains("esport") || tudo.contains("massa") || tudo.contains("prote");
            case "EQUILIBRIO" -> tudo.contains("equil") || tudo.contains("reeduca") || tudo.contains("clínica") || tudo.contains("clinica") || tudo.contains("comport") || tudo.contains("plant") || tudo.contains("vegan");
            default -> false;
        };
    }
}
