package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Linha da tabela `tier` (preços e benefícios, tela 09). Somente leitura. Compartilhada. */
@Entity
@Table(name = "tier")
public class Tier {
    @Id @Enumerated(EnumType.STRING) private TierAssinatura id;
    @Column(nullable = false) private String nome;
    @Column(name = "preco_mensal", nullable = false) private BigDecimal precoMensal;
    @Column(name = "preco_anual", nullable = false) private BigDecimal precoAnual;
    @Column(name = "desconto_pedido", nullable = false) private BigDecimal descontoPedido;
    @Column(name = "limite_nutribot_dia", nullable = false) private Integer limiteNutribotDia;
    @Column(name = "nutricionista_dedicado", nullable = false) private Boolean nutricionistaDedicado;
    @Column(name = "prescricao_digital", nullable = false) private Boolean prescricaoDigital;
    @Column(name = "entrega_gratis_acima") private BigDecimal entregaGratisAcima;
    @Column(nullable = false) private Short ordem;

    protected Tier() {}

    public TierAssinatura getId() { return id; }
    public String getNome() { return nome; }
    public BigDecimal getPrecoMensal() { return precoMensal; }
    public BigDecimal getPrecoAnual() { return precoAnual; }
    public BigDecimal getDescontoPedido() { return descontoPedido; }
    public Integer getLimiteNutribotDia() { return limiteNutribotDia; }
    public Boolean getNutricionistaDedicado() { return nutricionistaDedicado; }
    public Boolean getPrescricaoDigital() { return prescricaoDigital; }
    public BigDecimal getEntregaGratisAcima() { return entregaGratisAcima; }
    public Short getOrdem() { return ordem; }
}
