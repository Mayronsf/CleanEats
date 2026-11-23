package com.tricode.cleaneats.service.nutri;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.service.UsuarioService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Etapa profissional do cadastro de nutricionista (tela 06). */
@Service
public class CadastroNutriService {
    public record Disponibilidade(int dia, String inicio, String fim) {}
    public record DadosCadastro(String nome, String crn, List<String> especialidades, Integer anosExperiencia,
                                String bio, List<Disponibilidade> disponibilidade, OffsetDateTime aceiteTermosEm) {}
    private static final Pattern CRN = Pattern.compile("^CRN-(?:[1-9]|1[01]) ([A-Z]{2}) ([0-9]{1,6})/([A-Z])$");
    private final UsuarioService usuarios;
    private final JdbcClient jdbc;
    private final ObjectMapper json;

    public CadastroNutriService(UsuarioService usuarios, JdbcClient jdbc, ObjectMapper json) {
        this.usuarios = usuarios; this.jdbc = jdbc; this.json = json;
    }

    @Transactional
    public UsuarioDto cadastrar(UUID idUsuario, String email, DadosCadastro dados) {
        validar(dados);
        Matcher crn = CRN.matcher(dados.crn().trim());
        crn.matches();
        var usuario = usuarios.criarConta(idUsuario, email, dados.nome().trim(), null, PerfilUsuario.NUTRICIONISTA, dados.aceiteTermosEm());
        String agenda;
        try { agenda = json.writeValueAsString(dados.disponibilidade()); }
        catch (JsonProcessingException e) { throw new IllegalArgumentException("Disponibilidade inválida"); }
        jdbc.sql("""
                insert into nutricionista (id_usuario, crn, crn_uf, especialidades, anos_experiencia, bio, disponibilidade, status_aprovacao)
                values (:usuario, :crn, :uf, cast(:especialidades as text[]), :anos, :bio, cast(:agenda as jsonb), 'PENDENTE')
                """)
                .param("usuario", idUsuario).param("crn", dados.crn().trim()).param("uf", crn.group(1))
                .param("especialidades", arrayPg(dados.especialidades())).param("anos", dados.anosExperiencia())
                .param("bio", dados.bio().trim()).param("agenda", agenda).update();
        return usuario;
    }

    static void validar(DadosCadastro d) {
        if (d == null) throw new IllegalArgumentException("Preencha os dados profissionais");
        if (d.nome() == null || d.nome().isBlank()) throw new IllegalArgumentException("Informe seu nome");
        if (d.crn() == null || !CRN.matcher(d.crn().trim()).matches())
            throw new IllegalArgumentException("Informe o CRN no formato CRN-6 PE 12345/P");
        if (d.especialidades() == null || d.especialidades().stream().filter(x -> x != null && !x.isBlank()).distinct().count() == 0)
            throw new IllegalArgumentException("Adicione ao menos uma especialidade");
        if (d.anosExperiencia() == null || d.anosExperiencia() < 0 || d.anosExperiencia() > 70)
            throw new IllegalArgumentException("Informe seus anos de experiência");
        if (d.bio() == null || d.bio().trim().length() < 100 || d.bio().trim().length() > 500)
            throw new IllegalArgumentException("A biografia deve ter entre 100 e 500 caracteres");
        if (d.disponibilidade() == null || d.disponibilidade().isEmpty()) throw new IllegalArgumentException("Selecione ao menos um dia de atendimento");
        for (var a : d.disponibilidade()) {
            if (a == null || a.dia() < 1 || a.dia() > 7 || a.inicio() == null || a.fim() == null
                    || !a.inicio().matches("(?:[01]\\d|2[0-3]):[0-5]\\d") || !a.fim().matches("(?:[01]\\d|2[0-3]):[0-5]\\d")
                    || a.inicio().compareTo(a.fim()) >= 0)
                throw new IllegalArgumentException("Confira os dias e horários da agenda");
        }
        if (d.aceiteTermosEm() == null) throw new IllegalArgumentException("É preciso aceitar os termos de uso e a política de privacidade");
    }

    private static String arrayPg(List<String> valores) {
        var sb = new StringBuilder("{");
        for (var v : valores.stream().filter(x -> x != null && !x.isBlank()).map(String::trim).distinct().toList()) {
            if (sb.length() > 1) sb.append(',');
            sb.append('"').append(v.replace("\\", "\\\\").replace("\"", "\\\"")).append('"');
        }
        return sb.append('}').toString();
    }
}
