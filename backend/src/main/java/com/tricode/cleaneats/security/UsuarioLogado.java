package com.tricode.cleaneats.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.UUID;

/** Atalho para o id do usuário autenticado (sub do JWT do Supabase). Compartilhado. */
public final class UsuarioLogado {
    private UsuarioLogado() {}

    public static UUID id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) return UUID.fromString(jwt.getToken().getSubject());
        throw new IllegalStateException("Nenhum usuário autenticado");
    }

    public static String email() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) return jwt.getToken().getClaimAsString("email");
        throw new IllegalStateException("Nenhum usuário autenticado");
    }
}
