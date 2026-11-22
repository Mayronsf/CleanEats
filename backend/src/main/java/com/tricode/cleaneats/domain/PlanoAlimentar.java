package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Plano semanal montado pela nutri com pratos reais (CE-19). Entidade compartilhada (B escreve, A lê). */
@Entity
@Table(name = "plano_alimentar")
public class PlanoAlimentar {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "id_usuario", nullable = false) private UUID idUsuario;
    @Column(name = "id_nutricionista", nullable = false) private UUID idNutricionista;
    @Column(name = "semana_inicio", nullable = false) private LocalDate semanaInicio;
    @Column(nullable = false) private Boolean ativo = true;
    private String observacoes;
    @Column(name = "meta_calorias") private Integer metaCalorias;
    @Column(name = "meta_proteinas") private Integer metaProteinas;
    @Column(name = "meta_carboidratos") private Integer metaCarboidratos;
    @Column(name = "meta_gorduras") private Integer metaGorduras;
    @Column(name = "meta_fibras") private Integer metaFibras;
    @Column(name = "meta_agua_ml") private Integer metaAguaMl;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;
    @Column(name = "atualizado_em", insertable = false, updatable = false) private OffsetDateTime atualizadoEm;

    @OneToMany(mappedBy = "plano", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("diaSemana ASC, horario ASC")
    private List<RefeicaoPlano> refeicoes = new ArrayList<>();

    protected PlanoAlimentar() {}

    public PlanoAlimentar(UUID idUsuario, UUID idNutricionista, LocalDate semanaInicio) {
        this.idUsuario = idUsuario; this.idNutricionista = idNutricionista; this.semanaInicio = semanaInicio;
    }

    /** CE-19: só pratos APROVADOS entram no plano. */
    public RefeicaoPlano definirRefeicao(short diaSemana, Enums.TipoRefeicao tipo, Marmita prato, String observacao) {
        if (!prato.visivelNoMarketplace()) throw new IllegalArgumentException("Só pratos aprovados podem entrar no plano");
        refeicoes.removeIf(r -> r.getDiaSemana() == diaSemana && r.getTipoRefeicao() == tipo);
        var r = new RefeicaoPlano(this, diaSemana, tipo, prato.getId(), observacao);
        refeicoes.add(r);
        return r;
    }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public UUID getIdNutricionista() { return idNutricionista; }
    public LocalDate getSemanaInicio() { return semanaInicio; }
    public void setSemanaInicio(LocalDate v) { this.semanaInicio = v; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean v) { this.ativo = v; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String v) { this.observacoes = v; }
    public Integer getMetaCalorias() { return metaCalorias; }
    public void setMetaCalorias(Integer v) { this.metaCalorias = v; }
    public Integer getMetaProteinas() { return metaProteinas; }
    public void setMetaProteinas(Integer v) { this.metaProteinas = v; }
    public Integer getMetaCarboidratos() { return metaCarboidratos; }
    public void setMetaCarboidratos(Integer v) { this.metaCarboidratos = v; }
    public Integer getMetaGorduras() { return metaGorduras; }
    public void setMetaGorduras(Integer v) { this.metaGorduras = v; }
    public Integer getMetaFibras() { return metaFibras; }
    public void setMetaFibras(Integer v) { this.metaFibras = v; }
    public Integer getMetaAguaMl() { return metaAguaMl; }
    public void setMetaAguaMl(Integer v) { this.metaAguaMl = v; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public OffsetDateTime getAtualizadoEm() { return atualizadoEm; }
    public List<RefeicaoPlano> getRefeicoes() { return refeicoes; }
}
