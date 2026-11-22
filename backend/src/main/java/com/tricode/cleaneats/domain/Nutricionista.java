package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Nutricionista com CRN validado manualmente (CE-18). Entidade compartilhada. */
@Entity
@Table(name = "nutricionista")
public class Nutricionista {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "id_usuario", nullable = false, unique = true) private UUID idUsuario;
    @Column(nullable = false, unique = true) private String crn;
    @Column(name = "crn_uf", nullable = false) private String crnUf;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(nullable = false) private String[] especialidades = {};
    private String bio;
    @Column(name = "anos_experiencia") private Short anosExperiencia;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private String disponibilidade = "[]";
    @Column(name = "max_clientes") private Short maxClientes;
    @Column(name = "assinatura_digital_url") private String assinaturaDigitalUrl;
    @Column(name = "chave_pix") private String chavePix;
    @Enumerated(EnumType.STRING) @Column(name = "status_aprovacao", nullable = false) private StatusAprovacao statusAprovacao = StatusAprovacao.PENDENTE;
    @Column(name = "motivo_rejeicao") private String motivoRejeicao;
    @Column(name = "avaliado_por") private UUID avaliadoPor;
    @Column(name = "avaliado_em") private OffsetDateTime avaliadoEm;
    @Column(name = "nota_media", nullable = false) private BigDecimal notaMedia = BigDecimal.ZERO;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected Nutricionista() {}

    public Nutricionista(UUID idUsuario, String crn, String crnUf) {
        this.idUsuario = idUsuario; this.crn = crn; this.crnUf = crnUf;
    }

    public void avaliar(StatusAprovacao decisao, String motivo, UUID idAdmin) {
        if (decisao == StatusAprovacao.REJEITADO && (motivo == null || motivo.isBlank())) {
            throw new IllegalArgumentException("Informe o motivo da rejeição");
        }
        this.statusAprovacao = decisao;
        this.motivoRejeicao = decisao == StatusAprovacao.REJEITADO ? motivo : null;
        this.avaliadoPor = idAdmin;
        this.avaliadoEm = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public String getCrn() { return crn; }
    public void setCrn(String v) { this.crn = v; }
    public String getCrnUf() { return crnUf; }
    public void setCrnUf(String v) { this.crnUf = v; }
    public String[] getEspecialidades() { return especialidades; }
    public void setEspecialidades(String[] v) { this.especialidades = v; }
    public String getBio() { return bio; }
    public void setBio(String v) { this.bio = v; }
    public Short getAnosExperiencia() { return anosExperiencia; }
    public void setAnosExperiencia(Short v) { this.anosExperiencia = v; }
    public String getDisponibilidade() { return disponibilidade; }
    public void setDisponibilidade(String json) { this.disponibilidade = json; }
    public Short getMaxClientes() { return maxClientes; }
    public void setMaxClientes(Short v) { this.maxClientes = v; }
    public String getAssinaturaDigitalUrl() { return assinaturaDigitalUrl; }
    public void setAssinaturaDigitalUrl(String v) { this.assinaturaDigitalUrl = v; }
    public String getChavePix() { return chavePix; }
    public void setChavePix(String v) { this.chavePix = v; }
    public StatusAprovacao getStatusAprovacao() { return statusAprovacao; }
    public String getMotivoRejeicao() { return motivoRejeicao; }
    public OffsetDateTime getAvaliadoEm() { return avaliadoEm; }
    public BigDecimal getNotaMedia() { return notaMedia; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
