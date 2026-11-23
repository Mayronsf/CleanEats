package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.domain.Marmita;
import com.tricode.cleaneats.domain.StatusPrato;
import com.tricode.cleaneats.repository.MarmitaRepository;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import com.tricode.cleaneats.service.SupabaseServicoClient;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Cardápio do restaurante (telas 38, 39, 40; CE-3). Prato novo nasce RASCUNHO; com a ficha nutricional completa vai para
 * EM_ANALISE (curadoria no /admin). Mudar a ficha de um prato publicado o devolve à análise. Pausar/reativar só
 * para aprovados. Fotos no bucket público `pratos`. Dono: frente C.
 */
@Service
public class CardapioService {

    public record PratoLinha(UUID id, String nome, String categoria, String imagemUrl, BigDecimal preco, Integer calorias, long pedidos,
                             String status, String motivoRejeicao, List<String> tags, OffsetDateTime enviadoEm, OffsetDateTime avaliadoEm,
                             Integer tempoPreparoMin) {}
    public record CardapioDto(List<PratoLinha> pratos, long total, long ativos, List<String> categorias) {}
    public record IngredienteDto(String nome, String quantidade) {}
    public record PratoForm(String nome, String descricao, String categoria, BigDecimal preco, Integer porcaoG, Integer tempoPreparoMin,
                            Integer servePessoas, Integer calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras,
                            BigDecimal fibras, Integer sodioMg, List<String> objetivos, List<String> alergenos, List<String> compatibilidades,
                            List<String> tags, String observacoesInternas, String imagemUrl, List<IngredienteDto> ingredientes,
                            Boolean ativo) {}
    public record PratoDetalhe(UUID id, String status, String motivoRejeicao, PratoForm dados) {}
    public record SalvarResultado(UUID id, String status, String mensagem) {}

    /** Alérgenos da tela 39. */
    public static final List<String> ALERGENOS = List.of("Glúten", "Lactose", "Soja", "Ovo", "Amendoim", "Frutos do mar", "Castanhas", "Trigo");
    static final Set<String> OBJETIVOS = Set.of("EMAGRECIMENTO", "GANHO_MASSA", "EQUILIBRIO");

    private final JdbcClient jdbc;
    private final MarmitaRepository marmitas;
    private final PainelPedidosService painel;
    private final SupabaseServicoClient supabase;

    public CardapioService(JdbcClient jdbc, MarmitaRepository marmitas, PainelPedidosService painel, SupabaseServicoClient supabase) {
        this.jdbc = jdbc; this.marmitas = marmitas; this.painel = painel; this.supabase = supabase;
    }

    public CardapioDto listar(UUID idUsuario) {
        var r = painel.restaurante(idUsuario);
        var pratos = jdbc.sql("""
                select m.id, m.nome, m.categoria, m.imagem_url, m.preco, m.calorias, m.status_prato, m.motivo_rejeicao, m.tags,
                       m.enviado_analise_em, m.avaliado_em, m.tempo_preparo_min,
                       coalesce((select sum(i.quantidade) from item_pedido i join pedido p on p.id = i.id_pedido
                                 where i.id_marmita = m.id and p.status not in ('CANCELADO','RECUSADO')), 0) as pedidos
                from marmita m where m.id_restaurante = :r
                order by case m.status_prato when 'APROVADO' then 0 when 'EM_ANALISE' then 1 when 'PAUSADO' then 2 when 'REJEITADO' then 3 else 4 end, m.nome""")
                .param("r", r.id())
                .query((rs, i) -> new PratoLinha(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("categoria"), rs.getString("imagem_url"),
                        rs.getBigDecimal("preco"), (Integer) rs.getObject("calorias"), rs.getLong("pedidos"), rs.getString("status_prato"),
                        rs.getString("motivo_rejeicao"), textos(rs.getArray("tags")), rs.getObject("enviado_analise_em", OffsetDateTime.class),
                        rs.getObject("avaliado_em", OffsetDateTime.class), (Integer) rs.getObject("tempo_preparo_min")))
                .list();
        var categorias = jdbc.sql("select distinct categoria from marmita order by 1").query(String.class).list();
        return new CardapioDto(pratos, pratos.size(), pratos.stream().filter(p -> "APROVADO".equals(p.status())).count(), categorias);
    }

    public PratoDetalhe detalhe(UUID idUsuario, UUID id) {
        var m = exigir(idUsuario, id);
        var extra = jdbc.sql("select alergenos, tempo_preparo_min, serve_pessoas, tags, observacoes_internas from marmita where id = :m").param("m", id)
                .query((rs, i) -> new Object[]{textos(rs.getArray(1)), rs.getObject(2), rs.getObject(3), textos(rs.getArray(4)), rs.getString(5)}).single();
        var ingredientes = jdbc.sql("select nome, quantidade from ingrediente_marmita where id_marmita = :m order by ordem, nome").param("m", id)
                .query((rs, i) -> new IngredienteDto(rs.getString(1), rs.getString(2))).list();
        var compat = jdbc.sql("""
                select r.slug from marmita_compatibilidade c join restricao_alimentar r on r.id = c.id_restricao where c.id_marmita = :m order by r.id""")
                .param("m", id).query(String.class).list();
        @SuppressWarnings("unchecked") var alergenos = (List<String>) extra[0];
        @SuppressWarnings("unchecked") var tags = (List<String>) extra[3];
        var dados = new PratoForm(m.getNome(), m.getDescricao(), m.getCategoria(), m.getPreco(), m.getPorcaoG(), (Integer) extra[1],
                extra[2] == null ? 1 : ((Number) extra[2]).intValue(), m.getCalorias(), m.getProteinas(), m.getCarboidratos(), m.getGorduras(),
                m.getFibras(), m.getSodioMg(), m.getObjetivos() == null ? List.of() : List.of(m.getObjetivos()), alergenos, compat, tags,
                (String) extra[4], m.getImagemUrl(), ingredientes, m.getStatusPrato() != StatusPrato.PAUSADO);
        return new PratoDetalhe(m.getId(), m.getStatusPrato().name(), m.getMotivoRejeicao(), dados);
    }

    /** Cria (id nulo) ou edita. Ficha completa → curadoria; incompleta → rascunho (só se for novo). */
    @Transactional
    public SalvarResultado salvar(UUID idUsuario, UUID id, PratoForm f) {
        validar(f);
        var r = painel.restaurante(idUsuario);
        Marmita m;
        boolean novo = id == null;
        boolean fichaMudou;
        if (novo) {
            m = new Marmita(r.id(), f.nome().trim(), f.categoria().trim(), f.preco());
            fichaMudou = true;
        } else {
            m = exigir(idUsuario, id);
            fichaMudou = !Objects.equals(m.getCalorias(), f.calorias()) || difere(m.getProteinas(), f.proteinas()) || difere(m.getCarboidratos(), f.carboidratos())
                    || difere(m.getGorduras(), f.gorduras()) || !Objects.equals(m.getPorcaoG(), f.porcaoG());
            m.setNome(f.nome().trim()); m.setCategoria(f.categoria().trim()); m.setPreco(f.preco());
        }
        m.setDescricao(vazio(f.descricao())); m.setImagemUrl(vazio(f.imagemUrl())); m.setPorcaoG(f.porcaoG()); m.setCalorias(f.calorias());
        m.setProteinas(f.proteinas()); m.setCarboidratos(f.carboidratos()); m.setGorduras(f.gorduras()); m.setFibras(f.fibras()); m.setSodioMg(f.sodioMg());
        m.setObjetivos(f.objetivos() == null ? new String[0] : f.objetivos().stream().distinct().toArray(String[]::new));

        String mensagem;
        var status = m.getStatusPrato();
        if (m.fichaNutricionalCompleta() && (novo || status == StatusPrato.RASCUNHO || status == StatusPrato.REJEITADO)) {
            m.enviarParaAnalise();
            mensagem = "Prato enviado para a curadoria nutricional. O prazo médio é de 24 a 48 horas.";
        } else if (!novo && fichaMudou && (status == StatusPrato.APROVADO || status == StatusPrato.PAUSADO)) {
            m.voltarParaAnalise();
            mensagem = "A ficha nutricional mudou: o prato saiu do marketplace e voltou para a curadoria.";
        } else if (!m.fichaNutricionalCompleta()) {
            mensagem = "Rascunho salvo. Complete a ficha nutricional para enviar à curadoria.";
        } else {
            if (Boolean.FALSE.equals(f.ativo()) && status == StatusPrato.APROVADO) m.pausar();
            if (Boolean.TRUE.equals(f.ativo()) && status == StatusPrato.PAUSADO) m.reativar();
            mensagem = "Prato atualizado.";
        }
        m = marmitas.saveAndFlush(m);
        var idPrato = m.getId();
        jdbc.sql("""
                update marmita set alergenos = cast(:al as text[]), tempo_preparo_min = :tp, serve_pessoas = :sp, tags = cast(:tags as text[]),
                  observacoes_internas = :obs, atualizado_em = now(),
                  enviado_analise_em = case when status_prato = 'EM_ANALISE' and (enviado_analise_em is null or :reenvio) then now() else enviado_analise_em end
                where id = :m""")
                .param("al", arrayPg(f.alergenos())).param("tp", f.tempoPreparoMin()).param("sp", f.servePessoas() == null ? 1 : f.servePessoas())
                .param("tags", arrayPg(f.tags())).param("obs", vazio(f.observacoesInternas())).param("reenvio", mensagem.contains("curadoria"))
                .param("m", idPrato).update();
        jdbc.sql("delete from ingrediente_marmita where id_marmita = :m").param("m", idPrato).update();
        var ordem = 0;
        for (var ing : f.ingredientes() == null ? List.<IngredienteDto>of() : f.ingredientes()) {
            if (ing.nome() == null || ing.nome().isBlank()) continue;
            jdbc.sql("insert into ingrediente_marmita (id_marmita, nome, quantidade, ordem) values (:m, :n, :q, :o)")
                    .param("m", idPrato).param("n", ing.nome().trim()).param("q", vazio(ing.quantidade())).param("o", ordem++).update();
        }
        jdbc.sql("delete from marmita_compatibilidade where id_marmita = :m").param("m", idPrato).update();
        if (f.compatibilidades() != null && !f.compatibilidades().isEmpty()) {
            jdbc.sql("insert into marmita_compatibilidade (id_marmita, id_restricao) select :m, id from restricao_alimentar where slug in (:s)")
                    .param("m", idPrato).param("s", f.compatibilidades()).update();
        }
        return new SalvarResultado(idPrato, m.getStatusPrato().name(), mensagem);
    }

    @Transactional
    public SalvarResultado alternarPausa(UUID idUsuario, UUID id) {
        var m = exigir(idUsuario, id);
        if (m.getStatusPrato() == StatusPrato.PAUSADO) m.reativar(); else m.pausar();
        marmitas.saveAndFlush(m);
        return new SalvarResultado(id, m.getStatusPrato().name(), m.getStatusPrato() == StatusPrato.PAUSADO
                ? "Prato pausado: saiu do marketplace até você reativar." : "Prato reativado no marketplace.");
    }

    @Transactional
    public SalvarResultado reenviar(UUID idUsuario, UUID id) {
        var m = exigir(idUsuario, id);
        m.enviarParaAnalise();
        marmitas.saveAndFlush(m);
        jdbc.sql("update marmita set enviado_analise_em = now() where id = :m").param("m", id).update();
        return new SalvarResultado(id, m.getStatusPrato().name(), "Prato reenviado para a curadoria.");
    }

    public String enviarFoto(UUID idUsuario, MultipartFile arquivo) {
        var r = painel.restaurante(idUsuario);
        return supabase.enviarImagem("pratos", r.id().toString(), arquivo);
    }

    // ---------- validação ----------

    static void validar(PratoForm f) {
        if (f == null) throw new IllegalArgumentException("Preencha os dados do prato");
        if (f.nome() == null || f.nome().trim().length() < 3) throw new IllegalArgumentException("Informe o nome do prato (mínimo 3 letras)");
        if (f.nome().length() > 80) throw new IllegalArgumentException("O nome pode ter no máximo 80 caracteres");
        if (f.categoria() == null || f.categoria().isBlank()) throw new IllegalArgumentException("Escolha a categoria");
        if (f.preco() == null || f.preco().signum() <= 0 || f.preco().compareTo(new BigDecimal("999")) > 0) throw new IllegalArgumentException("Preço inválido");
        if (f.descricao() != null && f.descricao().length() > 600) throw new IllegalArgumentException("A descrição pode ter no máximo 600 caracteres");
        faixa(f.porcaoG(), 50, 3000, "Peso da porção deve estar entre 50 g e 3 kg");
        faixa(f.tempoPreparoMin(), 1, 240, "Tempo de preparo inválido");
        faixa(f.servePessoas(), 1, 10, "Porção deve servir de 1 a 10 pessoas");
        faixa(f.calorias(), 1, 5000, "Calorias inválidas");
        faixa(f.sodioMg(), 0, 10000, "Sódio inválido");
        for (var v : new BigDecimal[]{f.proteinas(), f.carboidratos(), f.gorduras(), f.fibras()}) {
            if (v != null && (v.signum() < 0 || v.compareTo(new BigDecimal("500")) > 0)) throw new IllegalArgumentException("Macronutrientes devem estar entre 0 e 500 g");
        }
        if (f.calorias() != null && f.proteinas() != null && f.carboidratos() != null && f.gorduras() != null) {
            // Coerência da ficha: 4 kcal/g de proteína e carboidrato, 9 kcal/g de gordura (tolerância de 25%)
            var estimado = f.proteinas().add(f.carboidratos()).multiply(BigDecimal.valueOf(4)).add(f.gorduras().multiply(BigDecimal.valueOf(9))).doubleValue();
            if (estimado > 0 && Math.abs(estimado - f.calorias()) / estimado > 0.25) {
                throw new IllegalArgumentException("As calorias não batem com os macros (≈" + Math.round(estimado) + " kcal pelos macros). Revise a ficha.");
            }
        }
        if (f.objetivos() != null && !OBJETIVOS.containsAll(f.objetivos())) throw new IllegalArgumentException("Objetivo inválido");
        if (f.alergenos() != null && !ALERGENOS.containsAll(f.alergenos())) throw new IllegalArgumentException("Alérgeno inválido");
        if (f.tags() != null && f.tags().size() > 5) throw new IllegalArgumentException("Use no máximo 5 tags");
    }

    private Marmita exigir(UUID idUsuario, UUID id) {
        var r = painel.restaurante(idUsuario);
        return marmitas.findById(id).filter(m -> m.getIdRestaurante().equals(r.id()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("MARMITA", "Prato não encontrado"));
    }

    private static void faixa(Integer v, int min, int max, String erro) { if (v != null && (v < min || v > max)) throw new IllegalArgumentException(erro); }
    private static boolean difere(BigDecimal a, BigDecimal b) { return a == null ? b != null : b == null || a.compareTo(b) != 0; }
    private static String vazio(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    static String arrayPg(List<String> valores) {
        var sb = new StringJoiner(",", "{", "}");
        for (var v : valores == null ? List.<String>of() : valores) {
            if (v == null || v.isBlank()) continue;
            sb.add("\"" + v.trim().replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
        }
        return sb.toString();
    }

    private static List<String> textos(java.sql.Array a) throws java.sql.SQLException {
        return a == null ? List.of() : List.of((String[]) a.getArray());
    }
}
