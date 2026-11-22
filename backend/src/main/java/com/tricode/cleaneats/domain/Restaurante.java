package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Restaurante parceiro (CE-3, CE-5, CE-17). Entidade compartilhada. */
@Entity
@Table(name = "restaurante")
public class Restaurante {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "id_usuario", nullable = false, unique = true) private UUID idUsuario;
    @Column(nullable = false) private String nome;
    @Column(nullable = false) private String sigla;
    private String descricao;
    @Column(nullable = false, unique = true) private String cnpj;
    @Column(name = "razao_social") private String razaoSocial;
    private String telefone;
    @Column(name = "logo_url") private String logoUrl;
    @Column(name = "capa_url") private String capaUrl;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(name = "tipos_cozinha", nullable = false) private String[] tiposCozinha = {};
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    @Column(nullable = false) private String cidade = "Recife";
    @Column(nullable = false) private String uf = "PE";
    private BigDecimal latitude;
    private BigDecimal longitude;
    @Column(name = "tempo_entrega_min", nullable = false) private Short tempoEntregaMin = 30;
    @Column(name = "tempo_entrega_max", nullable = false) private Short tempoEntregaMax = 45;
    @Column(name = "taxa_entrega", nullable = false) private BigDecimal taxaEntrega = BigDecimal.ZERO;
    @Column(name = "pedido_minimo", nullable = false) private BigDecimal pedidoMinimo = BigDecimal.ZERO;
    @Column(name = "comissao_percentual", nullable = false) private BigDecimal comissaoPercentual = CalculoFinanceiro.COMISSAO_PADRAO_PERCENTUAL;
    @Enumerated(EnumType.STRING) @Column(name = "status_aprovacao", nullable = false) private StatusAprovacao statusAprovacao = StatusAprovacao.PENDENTE;
    @Column(name = "motivo_rejeicao") private String motivoRejeicao;
    @Column(name = "avaliado_por") private UUID avaliadoPor;
    @Column(name = "avaliado_em") private OffsetDateTime avaliadoEm;
    @Column(name = "nota_media", nullable = false) private BigDecimal notaMedia = BigDecimal.ZERO;
    @Column(name = "total_avaliacoes", nullable = false) private Integer totalAvaliacoes = 0;
    @Column(nullable = false) private Boolean destaque = false;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected Restaurante() {}

    public Restaurante(UUID idUsuario, String nome, String sigla, String cnpj) {
        this.idUsuario = idUsuario; this.nome = nome; this.sigla = sigla; this.cnpj = cnpj;
    }

    /** Decisão da curadoria (admin). Rejeição exige motivo. */
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
    public String getNome() { return nome; }
    public void setNome(String v) { this.nome = v; }
    public String getSigla() { return sigla; }
    public void setSigla(String v) { this.sigla = v; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String v) { this.descricao = v; }
    public String getCnpj() { return cnpj; }
    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String v) { this.razaoSocial = v; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String v) { this.telefone = v; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String v) { this.logoUrl = v; }
    public String getCapaUrl() { return capaUrl; }
    public void setCapaUrl(String v) { this.capaUrl = v; }
    public String[] getTiposCozinha() { return tiposCozinha; }
    public void setTiposCozinha(String[] v) { this.tiposCozinha = v; }
    public String getCep() { return cep; }
    public void setCep(String v) { this.cep = v; }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String v) { this.logradouro = v; }
    public String getNumero() { return numero; }
    public void setNumero(String v) { this.numero = v; }
    public String getBairro() { return bairro; }
    public void setBairro(String v) { this.bairro = v; }
    public String getCidade() { return cidade; }
    public void setCidade(String v) { this.cidade = v; }
    public String getUf() { return uf; }
    public void setUf(String v) { this.uf = v; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public Short getTempoEntregaMin() { return tempoEntregaMin; }
    public void setTempoEntregaMin(Short v) { this.tempoEntregaMin = v; }
    public Short getTempoEntregaMax() { return tempoEntregaMax; }
    public void setTempoEntregaMax(Short v) { this.tempoEntregaMax = v; }
    public BigDecimal getTaxaEntrega() { return taxaEntrega; }
    public void setTaxaEntrega(BigDecimal v) { this.taxaEntrega = v; }
    public BigDecimal getPedidoMinimo() { return pedidoMinimo; }
    public void setPedidoMinimo(BigDecimal v) { this.pedidoMinimo = v; }
    public BigDecimal getComissaoPercentual() { return comissaoPercentual; }
    public void setComissaoPercentual(BigDecimal v) { this.comissaoPercentual = v; }
    public StatusAprovacao getStatusAprovacao() { return statusAprovacao; }
    public String getMotivoRejeicao() { return motivoRejeicao; }
    public OffsetDateTime getAvaliadoEm() { return avaliadoEm; }
    public BigDecimal getNotaMedia() { return notaMedia; }
    public void setNotaMedia(BigDecimal v) { this.notaMedia = v; }
    public Integer getTotalAvaliacoes() { return totalAvaliacoes; }
    public void setTotalAvaliacoes(Integer v) { this.totalAvaliacoes = v; }
    public Boolean getDestaque() { return destaque; }
    public void setDestaque(Boolean v) { this.destaque = v; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
