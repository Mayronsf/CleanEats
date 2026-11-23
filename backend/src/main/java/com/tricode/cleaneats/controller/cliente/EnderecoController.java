package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Endereços do cliente (telas 16 e 22): só o dono lê e altera os seus. Dono: frente A. */
@RestController
@RequestMapping("/api/enderecos")
public class EnderecoController {

    public record EnderecoDto(UUID id, String apelido, String cep, String logradouro, String numero, String complemento,
                              String bairro, String cidade, String uf, boolean principal) {}

    private final JdbcClient jdbc;

    public EnderecoController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<EnderecoDto> listar() {
        return jdbc.sql("select * from endereco where id_usuario = :u order by principal desc, criado_em")
                .param("u", UsuarioLogado.id()).query((rs, n) -> new EnderecoDto(rs.getObject("id", UUID.class), rs.getString("apelido"),
                        rs.getString("cep"), rs.getString("logradouro"), rs.getString("numero"), rs.getString("complemento"),
                        rs.getString("bairro"), rs.getString("cidade"), rs.getString("uf"), rs.getBoolean("principal")))
                .list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public EnderecoDto criar(@RequestBody EnderecoDto e) {
        var u = UsuarioLogado.id();
        validar(e);
        boolean primeiro = jdbc.sql("select count(*) from endereco where id_usuario = :u").param("u", u).query(Integer.class).single() == 0;
        boolean principal = e.principal() || primeiro;
        if (principal) jdbc.sql("update endereco set principal = false where id_usuario = :u").param("u", u).update();
        var id = jdbc.sql("""
                insert into endereco (id_usuario, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
                values (:u, :apelido, :cep, :logradouro, :numero, :complemento, :bairro, :cidade, :uf, :principal) returning id""")
                .param("u", u).param("apelido", texto(e.apelido(), "Casa")).param("cep", soDigitos(e.cep()))
                .param("logradouro", e.logradouro().trim()).param("numero", e.numero().trim()).param("complemento", texto(e.complemento(), null))
                .param("bairro", e.bairro().trim()).param("cidade", e.cidade().trim()).param("uf", e.uf().trim().toUpperCase())
                .param("principal", principal).query(UUID.class).single();
        return buscar(id, u);
    }

    @PutMapping("/{id}")
    @Transactional
    public EnderecoDto atualizar(@PathVariable UUID id, @RequestBody EnderecoDto e) {
        var u = UsuarioLogado.id();
        buscar(id, u);
        validar(e);
        if (e.principal()) jdbc.sql("update endereco set principal = false where id_usuario = :u").param("u", u).update();
        jdbc.sql("""
                update endereco set apelido = :apelido, cep = :cep, logradouro = :logradouro, numero = :numero, complemento = :complemento,
                       bairro = :bairro, cidade = :cidade, uf = :uf, principal = (principal or :principal)
                where id = :id and id_usuario = :u""")
                .param("id", id).param("u", u).param("apelido", texto(e.apelido(), "Casa")).param("cep", soDigitos(e.cep()))
                .param("logradouro", e.logradouro().trim()).param("numero", e.numero().trim()).param("complemento", texto(e.complemento(), null))
                .param("bairro", e.bairro().trim()).param("cidade", e.cidade().trim()).param("uf", e.uf().trim().toUpperCase())
                .param("principal", e.principal()).update();
        return buscar(id, u);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        var u = UsuarioLogado.id();
        var e = buscar(id, u);
        jdbc.sql("delete from endereco where id = :id and id_usuario = :u").param("id", id).param("u", u).update();
        if (e.principal()) {   // promove o mais antigo que sobrou
            jdbc.sql("update endereco set principal = true where id = (select id from endereco where id_usuario = :u order by criado_em limit 1)")
                    .param("u", u).update();
        }
        return ResponseEntity.noContent().build();
    }

    private EnderecoDto buscar(UUID id, UUID u) {
        return jdbc.sql("select * from endereco where id = :id and id_usuario = :u").param("id", id).param("u", u)
                .query((rs, n) -> new EnderecoDto(rs.getObject("id", UUID.class), rs.getString("apelido"), rs.getString("cep"),
                        rs.getString("logradouro"), rs.getString("numero"), rs.getString("complemento"), rs.getString("bairro"),
                        rs.getString("cidade"), rs.getString("uf"), rs.getBoolean("principal")))
                .optional().orElseThrow(() -> new RecursoNaoEncontradoException("ENDERECO", "Endereço não encontrado"));
    }

    private static void validar(EnderecoDto e) {
        if (e == null || soDigitos(e.cep()).length() != 8) throw new IllegalArgumentException("Informe um CEP com 8 dígitos");
        if (vazio(e.logradouro()) || vazio(e.numero()) || vazio(e.bairro()) || vazio(e.cidade())) {
            throw new IllegalArgumentException("Preencha rua, número, bairro e cidade");
        }
        if (e.uf() == null || !e.uf().trim().matches("[A-Za-z]{2}")) throw new IllegalArgumentException("UF deve ter 2 letras");
    }

    private static boolean vazio(String s) { return s == null || s.isBlank(); }
    private static String soDigitos(String s) { return s == null ? "" : s.replaceAll("\\D", ""); }
    private static String texto(String s, String padrao) { return s == null || s.isBlank() ? padrao : s.trim(); }
}
