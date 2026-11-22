package com.tricode.cleaneats.service;

import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.domain.Usuario;
import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Conta da plataforma. COMPARTILHADO: as frentes B e C usam criarConta nos cadastros 06 e 07. */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public UsuarioDto buscarUsuarioAtual(UUID idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .map(UsuarioDto::de)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "PERFIL_PENDENTE", "Conta autenticada, mas o cadastro do perfil ainda não foi concluído."));
    }

    /**
     * Etapa 3 do cadastro (CE-2): cria a linha em `usuario` para a conta do Supabase Auth, com o perfil escolhido.
     * Cada conta tem um único perfil — segunda chamada é recusada.
     */
    @Transactional
    public UsuarioDto criarConta(UUID idUsuario, String email, String nome, String telefone, PerfilUsuario perfil,
                                 OffsetDateTime aceiteTermosEm) {
        if (perfil == PerfilUsuario.ADMIN) throw new IllegalArgumentException("Perfil inválido");
        if (usuarioRepository.existsById(idUsuario)) {
            throw new IllegalArgumentException("Esta conta já tem um perfil. Cada conta tem apenas um perfil.");
        }
        if (aceiteTermosEm == null) throw new IllegalArgumentException("É preciso aceitar os termos de uso e a política de privacidade");
        if (nome == null || nome.isBlank()) throw new IllegalArgumentException("Informe seu nome");
        var usuario = new Usuario(idUsuario, nome.trim(), email, perfil);
        usuario.setTelefone(telefone);
        usuario.setAceiteTermosEm(aceiteTermosEm);
        usuario.setAceiteLgpdEm(aceiteTermosEm);
        return UsuarioDto.de(usuarioRepository.save(usuario));
    }
}
