package com.tricode.cleaneats.service.cliente;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Monte sua marmita (tela 15, CE-6). O preço e os macros são SEMPRE calculados aqui (a tela só mostra a prévia
 * com as mesmas regras): proteína (1, obrigatória, já inclui a base) + carboidrato (1, obrigatório, tamanho P/M/G)
 * + até 2 vegetais (inclusos) + até 3 adicionais (cobrados). Dono: frente A.
 */
@Service
public class MonteSuaMarmitaService {

    public enum Tamanho {
        P("Pequena", new BigDecimal("0.5"), new BigDecimal("-1.00")),
        M("Média", BigDecimal.ONE, BigDecimal.ZERO),
        G("Grande", new BigDecimal("1.5"), new BigDecimal("2.00"));
        final String nome; final BigDecimal fator; final BigDecimal ajustePreco;
        Tamanho(String nome, BigDecimal fator, BigDecimal ajustePreco) { this.nome = nome; this.fator = fator; this.ajustePreco = ajustePreco; }
    }

    public record ComponenteDto(UUID id, String categoria, String nome, int porcaoG, int calorias, BigDecimal proteinas,
                                BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras, BigDecimal preco,
                                boolean permiteTamanho, String imagemUrl) {}
    public record TamanhoDto(String codigo, String nome, BigDecimal fator, BigDecimal ajustePreco) {}
    public record LimiteDto(String categoria, int minimo, int maximo) {}
    public record RestauranteMontagem(UUID id, String nome, String sigla, int tempoEntregaMin, int tempoEntregaMax, BigDecimal taxaEntrega) {}
    public record CatalogoDto(RestauranteMontagem restaurante, List<ComponenteDto> componentes, List<TamanhoDto> tamanhos,
                              List<LimiteDto> limites, Map<String, Integer> metaPorRefeicao, String objetivo) {}
    public record Selecao(UUID proteina, UUID carboidrato, String tamanho, List<UUID> vegetais, List<UUID> adicionais) {}
    public record Calculo(UUID idRestaurante, String nome, String descricao, BigDecimal preco, int calorias, BigDecimal proteinas,
                          BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras, Map<String, Object> personalizacao) {}

    /** Meta de calorias por refeição conforme o objetivo (tela 15). */
    public static final Map<String, Integer> META_POR_REFEICAO = Map.of("EMAGRECIMENTO", 450, "GANHO_MASSA", 650, "EQUILIBRIO", 550);
    static final List<LimiteDto> LIMITES = List.of(new LimiteDto("PROTEINA", 1, 1), new LimiteDto("CARBOIDRATO", 1, 1),
            new LimiteDto("VEGETAL", 0, 2), new LimiteDto("ADICIONAL", 0, 3));

    private final JdbcClient jdbc;

    public MonteSuaMarmitaService(JdbcClient jdbc) { this.jdbc = jdbc; }

    public CatalogoDto catalogo(UUID idUsuario) {
        var componentes = componentesAtivos(null);
        if (componentes.isEmpty()) throw new IllegalArgumentException("O monte sua marmita está indisponível no momento");
        var idRestaurante = jdbc.sql("select id_restaurante from componente_marmita where id = :id").param("id", componentes.get(0).id())
                .query(UUID.class).single();
        var restaurante = jdbc.sql("""
                select id, nome, sigla, tempo_entrega_min, tempo_entrega_max, taxa_entrega from restaurante where id = :r and status_aprovacao = 'APROVADO'""")
                .param("r", idRestaurante)
                .query((rs, i) -> new RestauranteMontagem(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("sigla"),
                        rs.getInt("tempo_entrega_min"), rs.getInt("tempo_entrega_max"), rs.getBigDecimal("taxa_entrega")))
                .optional().orElseThrow(() -> new IllegalArgumentException("O restaurante do monte sua marmita está indisponível"));
        var objetivo = idUsuario == null ? null : jdbc.sql("select objetivo_nutricional from perfil_cliente where id_usuario = :u")
                .param("u", idUsuario).query(String.class).optional().orElse(null);
        var tamanhos = Arrays.stream(Tamanho.values()).map(t -> new TamanhoDto(t.name(), t.nome, t.fator, t.ajustePreco)).toList();
        return new CatalogoDto(restaurante, componentes, tamanhos, LIMITES, META_POR_REFEICAO, objetivo);
    }

    /** Calcula a marmita montada a partir do banco (usado na prévia, no carrinho e na confirmação do pedido). */
    public Calculo calcular(Selecao s) {
        if (s == null) throw new IllegalArgumentException("Monte sua marmita");
        var ids = new ArrayList<UUID>();
        if (s.proteina() != null) ids.add(s.proteina());
        if (s.carboidrato() != null) ids.add(s.carboidrato());
        if (s.vegetais() != null) ids.addAll(s.vegetais());
        if (s.adicionais() != null) ids.addAll(s.adicionais());
        var porId = new HashMap<UUID, ComponenteDto>();
        componentesAtivos(ids).forEach(c -> porId.put(c.id(), c));
        var idRestaurante = ids.isEmpty() ? null : jdbc.sql("select distinct id_restaurante from componente_marmita where id in (:ids)")
                .param("ids", ids).query(UUID.class).list();
        if (idRestaurante == null || idRestaurante.size() != 1) throw new IllegalArgumentException("Componentes inválidos");
        return calcular(s, porId, idRestaurante.get(0));
    }

    /** Regra pura (testável): valida a seleção e soma preço e macros. */
    static Calculo calcular(Selecao s, Map<UUID, ComponenteDto> porId, UUID idRestaurante) {
        Tamanho tamanho;
        try { tamanho = Tamanho.valueOf(s.tamanho() == null ? "M" : s.tamanho()); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Tamanho inválido"); }
        var proteina = exigir(porId, s.proteina(), "PROTEINA", "Escolha uma proteína");
        var carbo = exigir(porId, s.carboidrato(), "CARBOIDRATO", "Escolha um carboidrato");
        var vegetais = distintos(s.vegetais());
        var adicionais = distintos(s.adicionais());
        if (vegetais.size() > 2) throw new IllegalArgumentException("Escolha até 2 vegetais");
        if (adicionais.size() > 3) throw new IllegalArgumentException("Escolha até 3 adicionais");
        var lista = new ArrayList<ComponenteDto>();
        for (var id : vegetais) lista.add(exigir(porId, id, "VEGETAL", "Vegetal inválido"));
        for (var id : adicionais) lista.add(exigir(porId, id, "ADICIONAL", "Adicional inválido"));

        var fator = carbo.permiteTamanho() ? tamanho.fator : BigDecimal.ONE;
        var preco = proteina.preco().add(carbo.preco()).add(carbo.permiteTamanho() ? tamanho.ajustePreco : BigDecimal.ZERO);
        var kcal = BigDecimal.valueOf(proteina.calorias()).add(BigDecimal.valueOf(carbo.calorias()).multiply(fator));
        var p = proteina.proteinas().add(carbo.proteinas().multiply(fator));
        var c = proteina.carboidratos().add(carbo.carboidratos().multiply(fator));
        var g = proteina.gorduras().add(carbo.gorduras().multiply(fator));
        var f = proteina.fibras().add(carbo.fibras().multiply(fator));
        for (var x : lista) {
            preco = preco.add(x.preco());
            kcal = kcal.add(BigDecimal.valueOf(x.calorias()));
            p = p.add(x.proteinas()); c = c.add(x.carboidratos()); g = g.add(x.gorduras()); f = f.add(x.fibras());
        }
        var nomesVegetais = lista.stream().filter(x -> x.categoria().equals("VEGETAL")).map(ComponenteDto::nome).toList();
        var nomesAdicionais = lista.stream().filter(x -> x.categoria().equals("ADICIONAL")).map(ComponenteDto::nome).toList();
        var descricao = new StringJoiner(" · ");
        descricao.add(proteina.nome()).add(carbo.nome() + (carbo.permiteTamanho() ? " (" + tamanho.nome.toLowerCase() + ")" : ""));
        nomesVegetais.forEach(descricao::add);
        nomesAdicionais.forEach(n -> descricao.add("+ " + n));

        var personalizacao = new LinkedHashMap<String, Object>();
        personalizacao.put("tipo", "MONTE_SUA_MARMITA");
        personalizacao.put("proteina", proteina.id().toString());
        personalizacao.put("carboidrato", carbo.id().toString());
        personalizacao.put("tamanho", tamanho.name());
        personalizacao.put("vegetais", vegetais.stream().map(UUID::toString).toList());
        personalizacao.put("adicionais", adicionais.stream().map(UUID::toString).toList());
        personalizacao.put("descricao", descricao.toString());
        return new Calculo(idRestaurante, "Monte sua marmita: " + proteina.nome() + " + " + carbo.nome(), descricao.toString(),
                preco.setScale(2, RoundingMode.HALF_EVEN), kcal.setScale(0, RoundingMode.HALF_UP).intValue(),
                p.setScale(1, RoundingMode.HALF_UP), c.setScale(1, RoundingMode.HALF_UP), g.setScale(1, RoundingMode.HALF_UP),
                f.setScale(1, RoundingMode.HALF_UP), personalizacao);
    }

    /** Converte o mapa vindo do carrinho (strings) numa seleção. */
    @SuppressWarnings("unchecked")
    public static Selecao selecaoDe(Map<String, Object> m) {
        if (m == null) throw new IllegalArgumentException("Marmita personalizada sem componentes");
        try {
            var vegetais = ((List<Object>) m.getOrDefault("vegetais", List.of())).stream().map(x -> UUID.fromString(x.toString())).toList();
            var adicionais = ((List<Object>) m.getOrDefault("adicionais", List.of())).stream().map(x -> UUID.fromString(x.toString())).toList();
            return new Selecao(UUID.fromString(String.valueOf(m.get("proteina"))), UUID.fromString(String.valueOf(m.get("carboidrato"))),
                    m.get("tamanho") == null ? "M" : m.get("tamanho").toString(), vegetais, adicionais);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Marmita personalizada inválida");
        }
    }

    private List<ComponenteDto> componentesAtivos(List<UUID> ids) {
        if (ids != null && ids.isEmpty()) return List.of();
        var sql = """
                select c.id, c.categoria, c.nome, c.porcao_g, c.calorias, c.proteinas, c.carboidratos, c.gorduras, c.fibras, c.preco,
                       c.permite_tamanho, c.imagem_url
                from componente_marmita c join restaurante r on r.id = c.id_restaurante
                where c.ativo and r.status_aprovacao = 'APROVADO'""" + (ids == null ? "" : " and c.id in (:ids)") + """

                order by case c.categoria when 'PROTEINA' then 1 when 'CARBOIDRATO' then 2 when 'VEGETAL' then 3 else 4 end, c.ordem, c.nome""";
        var q = jdbc.sql(sql);
        if (ids != null) q = q.param("ids", ids);
        return q.query((rs, i) -> new ComponenteDto(rs.getObject("id", UUID.class), rs.getString("categoria"), rs.getString("nome"),
                rs.getInt("porcao_g"), rs.getInt("calorias"), rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"),
                rs.getBigDecimal("gorduras"), rs.getBigDecimal("fibras"), rs.getBigDecimal("preco"), rs.getBoolean("permite_tamanho"),
                rs.getString("imagem_url"))).list();
    }

    private static ComponenteDto exigir(Map<UUID, ComponenteDto> porId, UUID id, String categoria, String erro) {
        var c = id == null ? null : porId.get(id);
        if (c == null || !c.categoria().equals(categoria)) throw new IllegalArgumentException(erro);
        return c;
    }

    private static List<UUID> distintos(List<UUID> ids) { return ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList(); }
}
