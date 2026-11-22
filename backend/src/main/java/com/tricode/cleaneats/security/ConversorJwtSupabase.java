package com.tricode.cleaneats.security;

import com.tricode.cleaneats.repository.UsuarioRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Converte o JWT do Supabase em autenticação do Spring.
 * O perfil (CLIENTE, NUTRICIONISTA, RESTAURANTE, ADMIN) vem da tabela usuario — nunca do token
 * nem do front — e vira a authority ROLE_&lt;PERFIL&gt;.
 */
@Component
public class ConversorJwtSupabase implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UsuarioRepository usuarioRepository;

    public ConversorJwtSupabase(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        List<GrantedAuthority> authorities = usuarioRepository.findById(UUID.fromString(jwt.getSubject()))
                .<List<GrantedAuthority>>map(u -> List.of(new SimpleGrantedAuthority("ROLE_" + u.getPerfil().name())))
                .orElse(List.of());
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
