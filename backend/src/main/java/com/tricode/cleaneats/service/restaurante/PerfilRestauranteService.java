package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.SupabaseServicoClient;
import com.tricode.cleaneats.service.UsuarioService;
import com.tricode.cleaneats.service.admin.AdminService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Cadastro (tela 07, CE-3) e perfil (tela 44) do restaurante. Cadastro nasce PENDENTE e entra na fila do /admin; CNPJ
 * validado pelos dígitos verificadores. Trocar o CNPJ ou reenviar um cadastro rejeitado volta para a análise.
 * Logo e capa no bucket público `restaurantes`. Dono: frente C.
 */
@Service
public class PerfilRestauranteService {

    public record Horario(int dia, boolean aberto, String abre, String fecha) {}
    public record PerfilForm(String nome, String razaoSocial, String cnpj, String telefone, String slogan, String descricao,
                             String cep, String logradouro, String numero, String complemento, String bairro, String cidade, String uf,
                             List<String> tiposCozinha, List<Horario> horarios, Integer tempoEntregaMin, Integer tempoEntregaMax,
                             BigDecimal taxaEntrega, BigDecimal pedidoMinimo, String chavePix, String tipoChavePix, String titularPix,
                             String logoUrl, String capaUrl) {}
    public record PerfilDto(UUID id, String email, String statusAprovacao, String motivoRejeicao, BigDecimal notaMedia, int totalAvaliacoes,
                            OffsetDateTime criadoEm, PerfilForm dados) {}
    public record CadastroReq(String nomeResponsavel, OffsetDateTime aceiteTermosEm, PerfilForm restaurante) {}

    /** Tipos de cozinha da tela 07. */
    public static final List<String> COZINHAS = List.of("Fitness", "Saudável", "Vegano", "Vegetariano", "Low Carb", "Sem Glúten", "Pescetariano", "Bowls",
            "Integral", "Marmitas", "Sucos", "Açaí");
    static final Set<String> TIPOS_PIX = Set.of("CNPJ", "EMAIL", "TELEFONE", "ALEATORIA");

    private final JdbcClient jdbc;
    private final UsuarioService usuarios;
    private final SupabaseServicoClient supabase;
    private final NotificacaoService notificacoes;
    private final PainelPedidosService painel;

    public PerfilRestauranteService(JdbcClient jdbc, UsuarioService usuarios, SupabaseServicoClient supabase, NotificacaoService notificacoes,
                                    PainelPedidosService painel) {
        this.jdbc = jdbc; this.usuarios = usuarios; this.supabase = supabase; this.notificacoes = notificacoes; this.painel = painel;
    }

    public PerfilDto consultar(UUID idUsuario) {
        var id = painel.restaurante(idUsuario).id();
        var horarios = jdbc.sql("select dia_semana, abre, fecha from horario_funcionamento where id_restaurante = :r order by dia_semana, abre").param("r", id)
                .query((rs, i) -> new Horario(rs.getInt(1), true, rs.getObject(2, LocalTime.class).toString(), rs.getObject(3, LocalTime.class).toString())).list();
        var porDia = new ArrayList<Horario>();
        for (int d = 0; d < 7; d++) {
            final int dia = d;
            porDia.add(horarios.stream().filter(h -> h.dia() == dia).findFirst().orElse(new Horario(dia, false, "08:00", "22:00")));
        }
        return jdbc.sql("""
                select r.*, u.email from restaurante r join usuario u on u.id = r.id_usuario where r.id = :r""").param("r", id)
                .query((rs, i) -> new PerfilDto(id, rs.getString("email"), rs.getString("status_aprovacao"), rs.getString("motivo_rejeicao"),
                        rs.getBigDecimal("nota_media"), rs.getInt("total_avaliacoes"), rs.getObject("criado_em", OffsetDateTime.class),
                        new PerfilForm(rs.getString("nome"), rs.getString("razao_social"), rs.getString("cnpj"), rs.getString("telefone"), rs.getString("slogan"),
                                rs.getString("descricao"), rs.getString("cep"), rs.getString("logradouro"), rs.getString("numero"), rs.getString("complemento"),
                                rs.getString("bairro"), rs.getString("cidade"), rs.getString("uf"), textos(rs.getArray("tipos_cozinha")), porDia,
                                rs.getInt("tempo_entrega_min"), rs.getInt("tempo_entrega_max"), rs.getBigDecimal("taxa_entrega"), rs.getBigDecimal("pedido_minimo"),
                                rs.getString("chave_pix"), rs.getString("tipo_chave_pix"), rs.getString("titular_pix"), rs.getString("logo_url"), rs.getString("capa_url"))))
                .single();
    }

    @Transactional
    public PerfilDto salvar(UUID idUsuario, PerfilForm f) {
        validar(f, false);
        var r = painel.restaurante(idUsuario);
        var cnpjAntigo = jdbc.sql("select cnpj from restaurante where id = :r").param("r", r.id()).query(String.class).single();
        var cnpj = digitos(f.cnpj());
        boolean voltaParaAnalise = "REJEITADO".equals(r.statusAprovacao()) || !cnpj.equals(cnpjAntigo);
        try {
            gravar(r.id(), f);
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("Esse CNPJ já está cadastrado na plataforma");
        }
        if (voltaParaAnalise) {
            jdbc.sql("update restaurante set status_aprovacao = 'PENDENTE', motivo_rejeicao = null, avaliado_por = null, avaliado_em = null where id = :r")
                    .param("r", r.id()).update();
            avisarAdmins("Restaurante para revisar: " + f.nome().trim(), "REJEITADO".equals(r.statusAprovacao()) ? "Cadastro corrigido e reenviado." : "O CNPJ foi alterado.");
        }
        return consultar(idUsuario);
    }

    /** Etapa 3 do cadastro para o perfil RESTAURANTE (tela 07). */
    @Transactional
    public PerfilDto cadastrar(UUID idUsuario, String email, CadastroReq req) {
        if (req == null || req.restaurante() == null) throw new IllegalArgumentException("Preencha os dados do restaurante");
        validar(req.restaurante(), true);
        var f = req.restaurante();
        var responsavel = req.nomeResponsavel() == null || req.nomeResponsavel().isBlank() ? f.nome() : req.nomeResponsavel();
        usuarios.criarConta(idUsuario, email, responsavel.trim(), f.telefone(), PerfilUsuario.RESTAURANTE, req.aceiteTermosEm());
        UUID id;
        try {
            id = jdbc.sql("insert into restaurante (id_usuario, nome, sigla, cnpj) values (:u, :n, :s, :c) returning id")
                    .param("u", idUsuario).param("n", f.nome().trim()).param("s", sigla(f.nome())).param("c", digitos(f.cnpj())).query(UUID.class).single();
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("Esse CNPJ já está cadastrado na plataforma");
        }
        gravar(id, f);
        avisarAdmins("Novo restaurante para aprovar: " + f.nome().trim(), "CNPJ " + digitos(f.cnpj()) + " · " + f.bairro() + ", " + f.cidade() + ".");
        notificacoes.notificar(idUsuario, TipoNotificacao.SISTEMA, "Cadastro enviado para análise",
                "Validamos CNPJ e endereço em até 72h úteis. Enquanto isso, você já pode cadastrar seus pratos.", "/restaurante");
        return consultar(idUsuario);
    }

    public String enviarImagem(UUID idUsuario, MultipartFile arquivo) {
        return supabase.enviarImagem("restaurantes", idUsuario.toString(), arquivo);
    }

    // ---------- internos ----------

    private void gravar(UUID id, PerfilForm f) {
        jdbc.sql("""
                update restaurante set nome = :nome, sigla = :sigla, razao_social = :razao, cnpj = :cnpj, telefone = :tel, slogan = :slogan, descricao = :desc,
                  cep = :cep, logradouro = :rua, numero = :num, complemento = :comp, bairro = :bairro, cidade = :cidade, uf = :uf,
                  tipos_cozinha = cast(:coz as text[]), tempo_entrega_min = :tmin, tempo_entrega_max = :tmax, taxa_entrega = :taxa, pedido_minimo = :min,
                  chave_pix = :pix, tipo_chave_pix = :tpix, titular_pix = :titular, logo_url = :logo, capa_url = :capa
                where id = :id""")
                .param("nome", f.nome().trim()).param("sigla", sigla(f.nome())).param("razao", vazio(f.razaoSocial())).param("cnpj", digitos(f.cnpj()))
                .param("tel", vazio(f.telefone())).param("slogan", vazio(f.slogan())).param("desc", vazio(f.descricao())).param("cep", digitos(f.cep()))
                .param("rua", f.logradouro().trim()).param("num", f.numero().trim()).param("comp", vazio(f.complemento())).param("bairro", f.bairro().trim())
                .param("cidade", f.cidade().trim()).param("uf", f.uf().trim().toUpperCase(Locale.ROOT)).param("coz", arrayPg(f.tiposCozinha()))
                .param("tmin", f.tempoEntregaMin() == null ? 30 : f.tempoEntregaMin()).param("tmax", f.tempoEntregaMax() == null ? 45 : f.tempoEntregaMax())
                .param("taxa", f.taxaEntrega() == null ? BigDecimal.ZERO : f.taxaEntrega()).param("min", f.pedidoMinimo() == null ? BigDecimal.ZERO : f.pedidoMinimo())
                .param("pix", vazio(f.chavePix())).param("tpix", vazio(f.chavePix()) == null ? null : f.tipoChavePix()).param("titular", vazio(f.titularPix()))
                .param("logo", vazio(f.logoUrl())).param("capa", vazio(f.capaUrl())).param("id", id).update();
        jdbc.sql("delete from horario_funcionamento where id_restaurante = :r").param("r", id).update();
        for (var h : f.horarios()) {
            if (!h.aberto()) continue;
            jdbc.sql("insert into horario_funcionamento (id_restaurante, dia_semana, abre, fecha) values (:r, :d, cast(:a as time), cast(:f as time))")
                    .param("r", id).param("d", h.dia()).param("a", h.abre()).param("f", h.fecha()).update();
        }
    }

    static void validar(PerfilForm f, boolean cadastro) {
        if (f == null) throw new IllegalArgumentException("Preencha os dados do restaurante");
        if (f.nome() == null || f.nome().trim().length() < 3) throw new IllegalArgumentException("Informe o nome fantasia (mínimo 3 letras)");
        if (f.nome().length() > 60) throw new IllegalArgumentException("O nome pode ter no máximo 60 caracteres");
        if (!AdminService.cnpjValido(f.cnpj())) throw new IllegalArgumentException("CNPJ inválido: confira os números");
        if (f.telefone() == null || digitos(f.telefone()).length() < 10) throw new IllegalArgumentException("Telefone comercial inválido: use DDD + número");
        if (f.cep() == null || digitos(f.cep()).length() != 8) throw new IllegalArgumentException("CEP inválido");
        for (var campo : new String[][]{{f.logradouro(), "a rua"}, {f.numero(), "o número"}, {f.bairro(), "o bairro"}, {f.cidade(), "a cidade"}}) {
            if (campo[0] == null || campo[0].isBlank()) throw new IllegalArgumentException("Informe " + campo[1]);
        }
        if (f.uf() == null || f.uf().trim().length() != 2) throw new IllegalArgumentException("Informe o estado (UF)");
        if (f.tiposCozinha() == null || f.tiposCozinha().isEmpty()) throw new IllegalArgumentException("Selecione ao menos um tipo de cozinha");
        if (f.slogan() != null && f.slogan().length() > 120) throw new IllegalArgumentException("O slogan pode ter no máximo 120 caracteres");
        if (cadastro && (f.descricao() == null || f.descricao().trim().length() < 100)) throw new IllegalArgumentException("A descrição precisa ter pelo menos 100 caracteres");
        if (f.descricao() != null && f.descricao().length() > 500) throw new IllegalArgumentException("A descrição pode ter no máximo 500 caracteres");
        if (f.horarios() == null || f.horarios().stream().noneMatch(Horario::aberto)) throw new IllegalArgumentException("Informe ao menos um dia de funcionamento");
        for (var h : f.horarios()) {
            if (h.dia() < 0 || h.dia() > 6) throw new IllegalArgumentException("Dia da semana inválido");
            if (!h.aberto()) continue;
            LocalTime a, fe;
            try { a = LocalTime.parse(h.abre()); fe = LocalTime.parse(h.fecha()); } catch (RuntimeException e) { throw new IllegalArgumentException("Horário inválido"); }
            if (!fe.isAfter(a)) throw new IllegalArgumentException("O horário de fechamento precisa ser depois da abertura");
        }
        if (f.tempoEntregaMin() != null && f.tempoEntregaMax() != null && (f.tempoEntregaMin() < 5 || f.tempoEntregaMax() > 180 || f.tempoEntregaMin() > f.tempoEntregaMax())) {
            throw new IllegalArgumentException("Tempo de entrega inválido");
        }
        if (f.taxaEntrega() != null && (f.taxaEntrega().signum() < 0 || f.taxaEntrega().compareTo(BigDecimal.valueOf(50)) > 0)) throw new IllegalArgumentException("Taxa de entrega inválida");
        if (f.pedidoMinimo() != null && (f.pedidoMinimo().signum() < 0 || f.pedidoMinimo().compareTo(BigDecimal.valueOf(300)) > 0)) throw new IllegalArgumentException("Pedido mínimo inválido");
        if (vazio(f.chavePix()) != null && !TIPOS_PIX.contains(f.tipoChavePix())) throw new IllegalArgumentException("Escolha o tipo da chave PIX");
    }

    private void avisarAdmins(String titulo, String corpo) {
        jdbc.sql("select id from usuario where perfil = 'ADMIN' and anonimizado_em is null").query(UUID.class).list()
                .forEach(a -> notificacoes.notificar(a, TipoNotificacao.SISTEMA, titulo, corpo, "/admin?aba=restaurantes"));
    }

    static String sigla(String nome) {
        var partes = Arrays.stream(nome.trim().split("[\\s&]+")).filter(p -> p.length() > 2 || Character.isUpperCase(p.charAt(0))).toList();
        var s = partes.isEmpty() ? nome.trim() : partes.size() == 1 ? partes.get(0).substring(0, Math.min(2, partes.get(0).length()))
                : "" + partes.get(0).charAt(0) + partes.get(1).charAt(0);
        return s.toUpperCase(Locale.ROOT);
    }

    private static String digitos(String s) { return s == null ? "" : s.replaceAll("\\D", ""); }
    private static String vazio(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    private static String arrayPg(List<String> v) {
        var sb = new StringJoiner(",", "{", "}");
        for (var x : v) sb.add("\"" + x.trim().replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
        return sb.toString();
    }

    private static List<String> textos(java.sql.Array a) throws java.sql.SQLException { return a == null ? List.of() : List.of((String[]) a.getArray()); }
}
