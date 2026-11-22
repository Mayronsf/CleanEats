package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Macros consumidos no dia (HistoricoConsumo). Alimenta a home e o contexto do NutriBot. Compartilhada. */
@Entity
@Table(name = "consumo_diario")
public class ConsumoDiario {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "id_usuario", nullable = false) private UUID idUsuario;
    @Column(nullable = false) private LocalDate data;
    @Column(nullable = false) private Integer calorias = 0;
    @Column(nullable = false) private BigDecimal proteinas = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal carboidratos = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal gorduras = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal fibras = BigDecimal.ZERO;
    @Column(name = "agua_ml", nullable = false) private Integer aguaMl = 0;

    protected ConsumoDiario() {}

    public ConsumoDiario(UUID idUsuario, LocalDate data) { this.idUsuario = idUsuario; this.data = data; }

    /** CE-9: ao confirmar o pedido, os macros dos itens somam no consumo do dia. */
    public void somar(Pedido pedido) {
        for (ItemPedido i : pedido.getItens()) {
            BigDecimal q = BigDecimal.valueOf(i.getQuantidade());
            calorias += i.getCalorias() * i.getQuantidade();
            proteinas = proteinas.add(i.getProteinas().multiply(q));
            carboidratos = carboidratos.add(i.getCarboidratos().multiply(q));
            gorduras = gorduras.add(i.getGorduras().multiply(q));
        }
    }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public LocalDate getData() { return data; }
    public Integer getCalorias() { return calorias; }
    public BigDecimal getProteinas() { return proteinas; }
    public BigDecimal getCarboidratos() { return carboidratos; }
    public BigDecimal getGorduras() { return gorduras; }
    public BigDecimal getFibras() { return fibras; }
    public void setFibras(BigDecimal v) { this.fibras = v; }
    public Integer getAguaMl() { return aguaMl; }
    public void setAguaMl(Integer v) { this.aguaMl = v; }
}
