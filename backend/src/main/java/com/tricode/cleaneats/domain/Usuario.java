package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Conta da plataforma. O id é o mesmo de auth.users do Supabase. */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "perfil_usuario")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    private PerfilUsuario perfil;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "aceite_termos_em")
    private OffsetDateTime aceiteTermosEm;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected Usuario() {}

    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getTelefone() { return telefone; }
    public PerfilUsuario getPerfil() { return perfil; }
    public String getAvatarUrl() { return avatarUrl; }
    public OffsetDateTime getAceiteTermosEm() { return aceiteTermosEm; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
