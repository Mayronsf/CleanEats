package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Conta da plataforma. O id é o mesmo de auth.users do Supabase. Entidade compartilhada. */
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
    @Column(nullable = false)
    private PerfilUsuario perfil;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_tier", nullable = false)
    private TierAssinatura tier = TierAssinatura.FREE;

    @Column(name = "aceite_termos_em")
    private OffsetDateTime aceiteTermosEm;

    @Column(name = "aceite_lgpd_em")
    private OffsetDateTime aceiteLgpdEm;

    @Column(name = "anonimizado_em")
    private OffsetDateTime anonimizadoEm;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferencias_notificacao", nullable = false)
    private String preferenciasNotificacao = "{\"pedido\": true, \"cardapio\": true, \"nutricionista\": true, \"email\": true}";

    @Column(name = "criado_em", insertable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected Usuario() {}

    public Usuario(UUID id, String nome, String email, PerfilUsuario perfil) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
    }

    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public PerfilUsuario getPerfil() { return perfil; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public TierAssinatura getTier() { return tier; }
    public void setTier(TierAssinatura tier) { this.tier = tier; }
    public OffsetDateTime getAceiteTermosEm() { return aceiteTermosEm; }
    public void setAceiteTermosEm(OffsetDateTime v) { this.aceiteTermosEm = v; }
    public OffsetDateTime getAceiteLgpdEm() { return aceiteLgpdEm; }
    public void setAceiteLgpdEm(OffsetDateTime v) { this.aceiteLgpdEm = v; }
    public OffsetDateTime getAnonimizadoEm() { return anonimizadoEm; }
    public void setAnonimizadoEm(OffsetDateTime v) { this.anonimizadoEm = v; }
    public String getPreferenciasNotificacao() { return preferenciasNotificacao; }
    public void setPreferenciasNotificacao(String json) { this.preferenciasNotificacao = json; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
