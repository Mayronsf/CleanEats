package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.dto.cliente.CatalogoDtos.PratoDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import com.tricode.cleaneats.service.cliente.CatalogoService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalTime;
import java.util.*;

/**
 * Restaurantes para o cliente (telas 13 e 14). Só aparecem os de vw_restaurante_publico:
 * aprovados e com pelo menos 1 prato aprovado (CE-5). "Aberto agora" calculado no fuso de Recife. Dono: frente A.
 */
@RestController
@RequestMapping("/api/restaurantes")
public class RestauranteClienteController {

    public record RestauranteDto(UUID id, String nome, String sigla, String descricao, String capaUrl, String logoUrl, List<String> cozinhas,
                                 BigDecimal nota, int totalAvaliacoes, int tempoEntregaMin, int tempoEntregaMax, BigDecimal taxaEntrega,
                                 BigDecimal pedidoMinimo, long pratos, boolean aberto, String abreAs, boolean destaque, String bairro) {}
    public record Cozinha(String nome, long total) {}
    public record Resumo(long total, long tiposCozinha, BigDecimal notaMedia, List<Cozinha> cozinhas) {}
    public record Horario(int diaSemana, LocalTime abre, LocalTime fecha) {}
    public record Secao(String categoria, List<PratoDto> pratos) {}
    public record Curadoria(String nome, String crn) {}
    public record RestauranteDetalhe(RestauranteDto restaurante, String logradouro, String numero, String cep, String cidade, String uf,
                                     String telefone, List<Horario> horarios, List<PratoDto> destaques, List<Secao> secoes, Curadoria curadoria) {}

    /** Hora/dia de Recife e se está aberto agora (considera o horário do dia). */
    private static final String ABERTO = """
            exists (select 1 from horario_funcionamento h where h.id_restaurante = r.id
                    and h.dia_semana = extract(dow from now() at time zone 'America/Recife')
                    and (now() at time zone 'America/Recife')::time between h.abre and h.fecha)""";
    private static final String ABRE_AS = """
            (select to_char(min(h.abre), 'HH24:MI') from horario_funcionamento h where h.id_restaurante = r.id
              and h.dia_semana = extract(dow from now() at time zone 'America/Recife') and h.abre > (now() at time zone 'America/Recife')::time)""";
    private static final String SELECT = """
            select r.*, (select count(*) from marmita m where m.id_restaurante = r.id and m.status_prato = 'APROVADO') as pratos,
                   %s as aberto, %s as abre_as
            from vw_restaurante_publico r""".formatted(ABERTO, ABRE_AS);

    private final JdbcClient jdbc;
    private final CatalogoService catalogo;

    public RestauranteClienteController(JdbcClient jdbc, CatalogoService catalogo) {
        this.jdbc = jdbc;
        this.catalogo = catalogo;
    }

    @GetMapping
    public PaginaDto<RestauranteDto> listar(@RequestParam(required = false) String cozinha, @RequestParam(required = false) String busca,
                                            @RequestParam(required = false) String ordenar, @RequestParam(defaultValue = "0") int pagina,
                                            @RequestParam(defaultValue = "6") int tamanho) {
        var params = new HashMap<String, Object>();
        var w = new StringBuilder(" where true");
        if (cozinha != null && !cozinha.isBlank()) { w.append(" and :cozinha = any(r.tipos_cozinha)"); params.put("cozinha", cozinha); }
        if (busca != null && !busca.isBlank()) { w.append(" and (r.nome ilike :b or r.bairro ilike :b or array_to_string(r.tipos_cozinha, ' ') ilike :b)"); params.put("b", "%" + busca.trim() + "%"); }
        String ordem = switch (ordenar == null ? "" : ordenar) {
            case "nota" -> "r.nota_media desc, r.total_avaliacoes desc";
            case "rapidos" -> "r.tempo_entrega_min asc, r.tempo_entrega_max asc";
            case "taxa" -> "r.taxa_entrega asc";
            default -> "aberto desc, r.destaque desc, r.nota_media desc, r.total_avaliacoes desc";   // recomendados
        };
        long total = jdbc.sql("select count(*) from vw_restaurante_publico r" + w).params(params).query(Long.class).single();
        int tam = Math.max(1, Math.min(tamanho, 24));
        params.put("lim", tam);
        params.put("off", Math.max(0, pagina) * tam);
        var itens = jdbc.sql("select * from (" + SELECT + w + ") r order by " + ordem + ", r.nome limit :lim offset :off")
                .params(params).query((rs, n) -> dto(rs)).list();
        return new PaginaDto<>(itens, pagina, (int) Math.ceil(total / (double) tam), total);
    }

    @GetMapping("/resumo")
    public Resumo resumo() {
        var cozinhas = jdbc.sql("select c, count(*) as n from vw_restaurante_publico r, unnest(r.tipos_cozinha) c group by c order by count(*) desc, c")
                .query((rs, n) -> new Cozinha(rs.getString("c"), rs.getLong("n"))).list();
        return jdbc.sql("select count(*) as total, round(avg(nullif(nota_media, 0)), 1) as nota from vw_restaurante_publico")
                .query((rs, n) -> new Resumo(rs.getLong("total"), cozinhas.size(), rs.getBigDecimal("nota"), cozinhas)).single();
    }

    @GetMapping("/{id}")
    public RestauranteDetalhe detalhe(@PathVariable UUID id) {
        record Extra(RestauranteDto r, String logradouro, String numero, String cep, String cidade, String uf, String telefone) {}
        var e = jdbc.sql(SELECT + " where r.id = :id").param("id", id)
                .query((rs, n) -> new Extra(dto(rs), rs.getString("logradouro"), rs.getString("numero"), rs.getString("cep"),
                        rs.getString("cidade"), rs.getString("uf"), rs.getString("telefone")))
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("RESTAURANTE", "Restaurante não encontrado ou indisponível"));
        var horarios = jdbc.sql("select dia_semana, abre, fecha from horario_funcionamento where id_restaurante = :id order by dia_semana, abre")
                .param("id", id).query((rs, n) -> new Horario(rs.getInt("dia_semana"), rs.getObject("abre", LocalTime.class), rs.getObject("fecha", LocalTime.class))).list();
        // Cardápio: os mesmos filtros do marketplace (restrições do cliente escondem pratos), agrupado por categoria
        var filtros = new CatalogoService.Filtros(null, null, null, null, null, null, List.of(id), null, null, "nota", false, true);
        var pratos = catalogo.listar(filtros, UsuarioLogado.idOpcional(), 0, 48).itens();
        var destaques = pratos.stream().sorted(Comparator.comparingInt(PratoDto::totalAvaliacoes).reversed()).limit(4).toList();
        var porCategoria = new LinkedHashMap<String, List<PratoDto>>();
        pratos.stream().filter(p -> !destaques.contains(p)).forEach(p -> porCategoria.computeIfAbsent(p.categoria(), k -> new ArrayList<>()).add(p));
        var secoes = porCategoria.entrySet().stream().map(x -> new Secao(x.getKey(), x.getValue())).toList();
        var curadoria = jdbc.sql("""
                select u.nome, n.crn from nutricionista n join usuario u on u.id = n.id_usuario
                where n.status_aprovacao = 'APROVADO' order by n.criado_em limit 1""")
                .query((rs, n) -> new Curadoria(rs.getString("nome"), rs.getString("crn"))).optional().orElse(null);
        return new RestauranteDetalhe(e.r(), e.logradouro(), e.numero(), e.cep(), e.cidade(), e.uf(), e.telefone(), horarios, destaques, secoes, curadoria);
    }

    private static RestauranteDto dto(ResultSet rs) throws SQLException {
        var arr = rs.getArray("tipos_cozinha");
        return new RestauranteDto(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("sigla"), rs.getString("descricao"),
                rs.getString("capa_url"), rs.getString("logo_url"), arr == null ? List.of() : Arrays.asList((String[]) arr.getArray()),
                rs.getBigDecimal("nota_media"), rs.getInt("total_avaliacoes"), rs.getInt("tempo_entrega_min"), rs.getInt("tempo_entrega_max"),
                rs.getBigDecimal("taxa_entrega"), rs.getBigDecimal("pedido_minimo"), rs.getLong("pratos"), rs.getBoolean("aberto"),
                rs.getString("abre_as"), rs.getBoolean("destaque"), rs.getString("bairro"));
    }
}
