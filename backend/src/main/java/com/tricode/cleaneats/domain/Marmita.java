package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Prato do catálogo com ficha nutricional (CE-3, CE-4). Entidade compartilhada. */
@Entity
@Table(name = "marmita")
public class Marmita {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "id_restaurante", nullable = false) private UUID idRestaurante;
    @Column(nullable = false) private String nome;
    private String descricao;
    @Column(nullable = false) private String categoria;
    @Column(name = "imagem_url") private String imagemUrl;
    @Column(nullable = false) private BigDecimal preco;
    @Column(name = "porcao_g") private Integer porcaoG;
    private Integer calorias;
    private BigDecimal proteinas;
    private BigDecimal carboidratos;
    private BigDecimal gorduras;
    private BigDecimal fibras;
    @Column(name = "sodio_mg") private Integer sodioMg;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(nullable = false) private String[] objetivos = {};
    @Enumerated(EnumType.STRING) @Column(name = "status_prato", nullable = false) private StatusPrato statusPrato = StatusPrato.RASCUNHO;
    @Column(name = "motivo_rejeicao") private String motivoRejeicao;
    @Column(name = "avaliado_por") private UUID avaliadoPor;
    @Column(name = "avaliado_em") private OffsetDateTime avaliadoEm;
    @Column(name = "nota_media", nullable = false) private BigDecimal notaMedia = BigDecimal.ZERO;
    @Column(name = "total_avaliacoes", nullable = false) private Integer totalAvaliacoes = 0;
    @Column(name = "aprovado_por_nutri", nullable = false) private Boolean aprovadoPorNutri = false;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected Marmita() {}

    public Marmita(UUID idRestaurante, String nome, String categoria, BigDecimal preco) {
        this.idRestaurante = idRestaurante; this.nome = nome; this.categoria = categoria; this.preco = preco;
    }

    /** CE-3: a ficha nutricional é obrigatória para publicar o prato. */
    public boolean fichaNutricionalCompleta() {
        return calorias != null && proteinas != null && carboidratos != null && gorduras != null && porcaoG != null;
    }

    /** Restaurante envia para a curadoria: RASCUNHO/REJEITADO → EM_ANALISE. */
    public void enviarParaAnalise() {
        if (!fichaNutricionalCompleta()) {
            throw new IllegalArgumentException("Preencha a ficha nutricional (kcal, proteínas, carboidratos, gorduras e porção) antes de enviar");
        }
        if (statusPrato != StatusPrato.RASCUNHO && statusPrato != StatusPrato.REJEITADO) {
            throw new IllegalArgumentException("Só rascunhos ou pratos rejeitados podem ser enviados para análise");
        }
        this.statusPrato = StatusPrato.EM_ANALISE;
        this.motivoRejeicao = null;
    }

    /** Curadoria (admin): EM_ANALISE → APROVADO/REJEITADO. Rejeição guarda o motivo. */
    public void avaliar(boolean aprovado, String motivo, UUID idAdmin) {
        if (statusPrato != StatusPrato.EM_ANALISE) throw new IllegalArgumentException("O prato não está em análise");
        if (!aprovado && (motivo == null || motivo.isBlank())) throw new IllegalArgumentException("Informe o motivo da rejeição");
        this.statusPrato = aprovado ? StatusPrato.APROVADO : StatusPrato.REJEITADO;
        this.motivoRejeicao = aprovado ? null : motivo;
        this.avaliadoPor = idAdmin;
        this.avaliadoEm = OffsetDateTime.now();
    }

    public boolean visivelNoMarketplace() { return statusPrato == StatusPrato.APROVADO; }

    public UUID getId() { return id; }
    public UUID getIdRestaurante() { return idRestaurante; }
    public String getNome() { return nome; }
    public void setNome(String v) { this.nome = v; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String v) { this.descricao = v; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String v) { this.categoria = v; }
    public String getImagemUrl() { return imagemUrl; }
    public void setImagemUrl(String v) { this.imagemUrl = v; }
    public BigDecimal getPreco() { return preco; }
    public void setPreco(BigDecimal v) { this.preco = v; }
    public Integer getPorcaoG() { return porcaoG; }
    public void setPorcaoG(Integer v) { this.porcaoG = v; }
    public Integer getCalorias() { return calorias; }
    public void setCalorias(Integer v) { this.calorias = v; }
    public BigDecimal getProteinas() { return proteinas; }
    public void setProteinas(BigDecimal v) { this.proteinas = v; }
    public BigDecimal getCarboidratos() { return carboidratos; }
    public void setCarboidratos(BigDecimal v) { this.carboidratos = v; }
    public BigDecimal getGorduras() { return gorduras; }
    public void setGorduras(BigDecimal v) { this.gorduras = v; }
    public BigDecimal getFibras() { return fibras; }
    public void setFibras(BigDecimal v) { this.fibras = v; }
    public Integer getSodioMg() { return sodioMg; }
    public void setSodioMg(Integer v) { this.sodioMg = v; }
    public String[] getObjetivos() { return objetivos; }
    public void setObjetivos(String[] v) { this.objetivos = v; }
    public StatusPrato getStatusPrato() { return statusPrato; }
    public void setStatusPrato(StatusPrato v) { this.statusPrato = v; }
    public String getMotivoRejeicao() { return motivoRejeicao; }
    public OffsetDateTime getAvaliadoEm() { return avaliadoEm; }
    public BigDecimal getNotaMedia() { return notaMedia; }
    public void setNotaMedia(BigDecimal v) { this.notaMedia = v; }
    public Integer getTotalAvaliacoes() { return totalAvaliacoes; }
    public void setTotalAvaliacoes(Integer v) { this.totalAvaliacoes = v; }
    public Boolean getAprovadoPorNutri() { return aprovadoPorNutri; }
    public void setAprovadoPorNutri(Boolean v) { this.aprovadoPorNutri = v; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
