package com.tricode.cleaneats.dto;

import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.domain.Usuario;
import java.util.UUID;

public record UsuarioDto(UUID id, String nome, String email, PerfilUsuario perfil, String avatarUrl) {
    public static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(), u.getAvatarUrl());
    }
}
