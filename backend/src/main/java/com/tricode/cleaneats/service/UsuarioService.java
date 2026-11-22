package com.tricode.cleaneats.service;

import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

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
}
