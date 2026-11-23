package com.tricode.cleaneats.service.cliente;

import com.tricode.cleaneats.dto.cliente.CatalogoDtos.PratoDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Consumo do dia vs. metas (tela 10, CE-9) e plano alimentar ativo do cliente (telas 10 e 24, CE-19).
 * "Consumida" = existe pedido não cancelado do cliente com aquele prato no dia da refeição. Dono: frente A.
 */
@Service
public class AcompanhamentoService {

    public static final ZoneId FUSO = ZoneId.of("America/Recife");

    public record Nutrientes(int calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras, BigDecimal fibras, int aguaMl) {}
    public record ConsumoDto(LocalDate data, Nutrientes consumo, Nutrientes metas) {}
    public record NutricionistaMiniDto(UUID id, String nome, String crn, String avatarUrl) {}
    public record RefeicaoDto(UUID id, int diaSemana, LocalDate data, String tipo, LocalTime horario, String observacao,
                              boolean consumida, PratoDto prato) {}
    public record PlanoDto(UUID id, LocalDate semanaInicio, LocalDate semanaFim, String observacoes, OffsetDateTime atualizadoEm,
                           Nutrientes metas, NutricionistaMiniDto nutricionista, List<RefeicaoDto> refeicoes) {}
    public record ResumoDto(String nome, String tier, String objetivo, long restaurantes, long pedidos, long favoritos,
                            long notificacoesNaoLidas) {}

    private final JdbcClient jdbc;

    public AcompanhamentoService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public static LocalDate hoje() {
        return LocalDate.now(FUSO);
    }

    public ConsumoDto consumo(UUID idUsuario, LocalDate data) {
        var consumo = jdbc.sql("""
                select calorias, proteinas, carboidratos, gorduras, fibras, agua_ml
                from consumo_diario where id_usuario = :u and data = :d""")
                .param("u", idUsuario).param("d", data)
                .query((rs, n) -> new Nutrientes(rs.getInt("calorias"), rs.getBigDecimal("proteinas"), rs.getBigDecimal("carboidratos"),
                        rs.getBigDecimal("gorduras"), rs.getBigDecimal("fibras"), rs.getInt("agua_ml")))
                .optional()
                .orElse(new Nutrientes(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0));
        return new ConsumoDto(data, consumo, metas(idUsuario));
    }

    /** Metas do plano ativo (definidas pela nutri) ou, sem plano, as do perfil (cadastro, tela 05). */
    public Nutrientes metas(UUID idUsuario) {
        return jdbc.sql("""
                select coalesce(pa.meta_calorias, pc.meta_calorias, 2000) as kcal,
                       coalesce(pa.meta_proteinas, pc.meta_proteinas, 0) as prot,
                       coalesce(pa.meta_carboidratos, pc.meta_carboidratos, 0) as carb,
                       coalesce(pa.meta_gorduras, pc.meta_gorduras, 0) as gord,
                       coalesce(pa.meta_fibras, pc.meta_fibras, 30) as fibra,
                       coalesce(pa.meta_agua_ml, pc.meta_agua_ml, 2500) as agua
                from usuario u
                left join perfil_cliente pc on pc.id_usuario = u.id
                left join lateral (select * from plano_alimentar p where p.id_usuario = u.id and p.ativo
                                   order by p.semana_inicio desc limit 1) pa on true
                where u.id = :u""").param("u", idUsuario)
                .query((rs, n) -> new Nutrientes(rs.getInt("kcal"), rs.getBigDecimal("prot"), rs.getBigDecimal("carb"),
                        rs.getBigDecimal("gord"), rs.getBigDecimal("fibra"), rs.getInt("agua")))
                .single();
    }

    public Optional<PlanoDto> planoAtivo(UUID idUsuario) {
        record Cab(UUID id, LocalDate inicio, String obs, OffsetDateTime atualizado, UUID idNutri, String nomeNutri, String crn, String avatar) {}
        var cab = jdbc.sql("""
                select p.id, p.semana_inicio, p.observacoes, p.atualizado_em, n.id as id_nutri, un.nome as nome_nutri, n.crn, un.avatar_url
                from plano_alimentar p join nutricionista n on n.id = p.id_nutricionista join usuario un on un.id = n.id_usuario
                where p.id_usuario = :u and p.ativo order by p.semana_inicio desc limit 1""").param("u", idUsuario)
                .query((rs, n) -> new Cab(rs.getObject("id", UUID.class), rs.getObject("semana_inicio", LocalDate.class), rs.getString("observacoes"),
                        rs.getObject("atualizado_em", OffsetDateTime.class), rs.getObject("id_nutri", UUID.class), rs.getString("nome_nutri"),
                        rs.getString("crn"), rs.getString("avatar_url")))
                .optional();
        if (cab.isEmpty()) return Optional.empty();
        var c = cab.get();
        var refeicoes = jdbc.sql("""
                select rp.id as rp_id, rp.dia_semana, rp.tipo_refeicao, rp.horario, rp.observacao,
                       (:inicio::date + ((rp.dia_semana + 6) % 7)) as data_refeicao,
                       exists (select 1 from pedido pe join item_pedido i on i.id_pedido = pe.id
                               where pe.id_usuario = :u and i.id_marmita = rp.id_marmita and pe.status not in ('CANCELADO', 'RECUSADO')
                                 and (pe.criado_em at time zone 'America/Recife')::date = (:inicio::date + ((rp.dia_semana + 6) % 7))) as consumida,
                       m.id, m.nome, m.descricao, m.categoria, m.imagem_url, m.preco, m.porcao_g, m.calorias, m.proteinas,
                       m.carboidratos, m.gorduras, m.fibras, m.nota_media, m.total_avaliacoes, m.aprovado_por_nutri, m.objetivos,
                       r.id as r_id, r.nome as r_nome, r.sigla as r_sigla, r.tempo_entrega_min, r.tempo_entrega_max, r.taxa_entrega,
                       exists (select 1 from favorito fv where fv.id_usuario = :u and fv.id_marmita = m.id) as favorito, true as do_objetivo
                from refeicao_plano rp join marmita m on m.id = rp.id_marmita join restaurante r on r.id = m.id_restaurante
                where rp.id_plano_alimentar = :p
                order by (rp.dia_semana + 6) % 7, rp.horario nulls last""")
                .param("u", idUsuario).param("p", c.id()).param("inicio", c.inicio())
                .query((rs, n) -> new RefeicaoDto(rs.getObject("rp_id", UUID.class), rs.getInt("dia_semana"),
                        rs.getObject("data_refeicao", LocalDate.class), rs.getString("tipo_refeicao"), rs.getObject("horario", LocalTime.class),
                        rs.getString("observacao"), rs.getBoolean("consumida"), CatalogoService.prato(rs)))
                .list();
        return Optional.of(new PlanoDto(c.id(), c.inicio(), c.inicio().plusDays(6), c.obs(), c.atualizado(), metas(idUsuario),
                new NutricionistaMiniDto(c.idNutri(), c.nomeNutri(), c.crn(), c.avatar()), refeicoes));
    }

    /** Registra água bebida hoje (ml positivo soma, negativo desfaz), entre 0 e 10 L. */
    public ConsumoDto registrarAgua(UUID idUsuario, int ml) {
        if (ml == 0 || Math.abs(ml) > 2000) throw new IllegalArgumentException("Quantidade de água inválida");
        var hoje = hoje();
        jdbc.sql("""
                insert into consumo_diario (id_usuario, data, agua_ml) values (:u, :d, greatest(:ml, 0))
                on conflict (id_usuario, data) do update set agua_ml = least(greatest(consumo_diario.agua_ml + :ml, 0), 10000)""")
                .param("u", idUsuario).param("d", hoje).param("ml", ml).update();
        return consumo(idUsuario, hoje);
    }

    public ResumoDto resumo(UUID idUsuario) {
        return jdbc.sql("""
                select u.nome, u.id_tier, pc.objetivo_nutricional,
                       (select count(*) from vw_restaurante_publico) as restaurantes,
                       (select count(*) from pedido p where p.id_usuario = u.id) as pedidos,
                       (select count(*) from favorito f where f.id_usuario = u.id) as favoritos,
                       (select count(*) from notificacao n where n.id_usuario = u.id and n.lida_em is null) as nao_lidas
                from usuario u left join perfil_cliente pc on pc.id_usuario = u.id where u.id = :u""").param("u", idUsuario)
                .query((rs, n) -> new ResumoDto(rs.getString("nome"), rs.getString("id_tier"), rs.getString("objetivo_nutricional"),
                        rs.getLong("restaurantes"), rs.getLong("pedidos"), rs.getLong("favoritos"), rs.getLong("nao_lidas")))
                .single();
    }
}
