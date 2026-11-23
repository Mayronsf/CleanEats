package com.tricode.cleaneats.dto;

import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.domain.TierAssinatura;
import com.tricode.cleaneats.domain.Usuario;
import java.util.UUID;

/** Conta logada (GET /api/auth/me). `tier` = plano vigente (CE-15), usado por todas as frentes. */
public record UsuarioDto(UUID id, String nome, String email, PerfilUsuario perfil, String avatarUrl, TierAssinatura tier) {
    public static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(), u.getAvatarUrl(), u.getTier());
    }
}
