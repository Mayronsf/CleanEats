package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Pedido do cliente (CE-9, CE-14). Entidade compartilhada. */
@Entity
@Table(name = "pedido")
public class Pedido {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(insertable = false, updatable = false) private String codigo;   // CE-4900... (default do banco)
    @Column(name = "id_usuario", nullable = false) private UUID idUsuario;
    @Column(name = "id_restaurante", nullable = false) private UUID idRestaurante;
    @Column(name = "id_endereco") private UUID idEndereco;
    @Column(name = "id_cupom") private UUID idCupom;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusPedido status = StatusPedido.NOVO;
    @Column(nullable = false) private BigDecimal subtotal;
    @Column(nullable = false) private BigDecimal desconto = BigDecimal.ZERO;
    @Column(name = "taxa_entrega", nullable = false) private BigDecimal taxaEntrega = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal total;
    @Column(name = "comissao_percentual", nullable = false) private BigDecimal comissaoPercentual;
    @Column(name = "valor_comissao", nullable = false) private BigDecimal valorComissao;
    @Column(name = "forma_pagamento", nullable = false) private String formaPagamento = "PIX";
    private String observacao;
    @Column(name = "motivo_recusa") private String motivoRecusa;
    @Column(name = "agendado_para") private OffsetDateTime agendadoPara;
    @Column(name = "entregador_nome") private String entregadorNome;
    @Column(name = "previsao_entrega_em") private OffsetDateTime previsaoEntregaEm;
    @Column(name = "confirmado_em", nullable = false) private OffsetDateTime confirmadoEm = OffsetDateTime.now();
    @Column(name = "entregue_em") private OffsetDateTime entregueEm;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;
    @Column(name = "atualizado_em", insertable = false, updatable = false) private OffsetDateTime atualizadoEm;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemPedido> itens = new ArrayList<>();

    protected Pedido() {}

    public Pedido(UUID idUsuario, UUID idRestaurante) {
        this.idUsuario = idUsuario; this.idRestaurante = idRestaurante;
    }

    public void adicionarItem(ItemPedido item) { item.setPedido(this); itens.add(item); }

    /**
     * Fecha os valores do pedido: desconto do tier, taxa e comissão congelada (CE-17).
     * @param comissaoPercentualRestaurante comissão configurada no restaurante (padrão 8%)
     */
    public void fecharValores(TierAssinatura tier, BigDecimal taxaEntrega, BigDecimal descontoCupom,
                              BigDecimal comissaoPercentualRestaurante) {
        BigDecimal soma = itens.stream().map(ItemPedido::getValorTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal comDescontoTier = CalculoFinanceiro.aplicarDescontoTier(soma, tier);
        BigDecimal cupom = descontoCupom == null ? BigDecimal.ZERO : descontoCupom.min(comDescontoTier);
        boolean entregaGratis = tier == TierAssinatura.PREMIUM && soma.compareTo(new BigDecimal("30.00")) > 0;
        this.subtotal = soma;
        this.desconto = soma.subtract(comDescontoTier).add(cupom);
        this.taxaEntrega = entregaGratis ? BigDecimal.ZERO : taxaEntrega;
        this.total = soma.subtract(this.desconto).add(this.taxaEntrega);
        this.comissaoPercentual = comissaoPercentualRestaurante == null
                ? CalculoFinanceiro.COMISSAO_PADRAO_PERCENTUAL : comissaoPercentualRestaurante;
        // comissão sobre o valor dos produtos pago pelo cliente (sem a taxa de entrega)
        this.valorComissao = CalculoFinanceiro.calcularComissao(soma.subtract(this.desconto), this.comissaoPercentual);
    }

    /** Transição de status validada (CE-14). Lança IllegalArgumentException se não for permitida. */
    public void mudarStatus(StatusPedido novo) {
        if (!status.podeIrPara(novo)) {
            throw new IllegalArgumentException("Não é possível mudar o pedido de " + status + " para " + novo);
        }
        this.status = novo;
        if (novo == StatusPedido.ENTREGUE) this.entregueEm = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public String getCodigo() { return codigo; }
    public UUID getIdUsuario() { return idUsuario; }
    public UUID getIdRestaurante() { return idRestaurante; }
    public UUID getIdEndereco() { return idEndereco; }
    public void setIdEndereco(UUID v) { this.idEndereco = v; }
    public UUID getIdCupom() { return idCupom; }
    public void setIdCupom(UUID v) { this.idCupom = v; }
    public StatusPedido getStatus() { return status; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getDesconto() { return desconto; }
    public BigDecimal getTaxaEntrega() { return taxaEntrega; }
    public BigDecimal getTotal() { return total; }
    public BigDecimal getComissaoPercentual() { return comissaoPercentual; }
    public BigDecimal getValorComissao() { return valorComissao; }
    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String v) { this.formaPagamento = v; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String v) { this.observacao = v; }
    public String getMotivoRecusa() { return motivoRecusa; }
    public void setMotivoRecusa(String v) { this.motivoRecusa = v; }
    public OffsetDateTime getAgendadoPara() { return agendadoPara; }
    public void setAgendadoPara(OffsetDateTime v) { this.agendadoPara = v; }
    public String getEntregadorNome() { return entregadorNome; }
    public void setEntregadorNome(String v) { this.entregadorNome = v; }
    public OffsetDateTime getPrevisaoEntregaEm() { return previsaoEntregaEm; }
    public void setPrevisaoEntregaEm(OffsetDateTime v) { this.previsaoEntregaEm = v; }
    public OffsetDateTime getConfirmadoEm() { return confirmadoEm; }
    public OffsetDateTime getEntregueEm() { return entregueEm; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public OffsetDateTime getAtualizadoEm() { return atualizadoEm; }
    public List<ItemPedido> getItens() { return itens; }
}
