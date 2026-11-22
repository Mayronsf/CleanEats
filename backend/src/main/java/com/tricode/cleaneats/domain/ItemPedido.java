package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.UUID;

/** Item com snapshot de preço e macros no momento da compra. Entidade compartilhada. */
@Entity
@Table(name = "item_pedido")
public class ItemPedido {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "id_pedido", nullable = false) private Pedido pedido;
    @Column(name = "id_marmita") private UUID idMarmita;          // null = "monte sua marmita"
    @Column(nullable = false) private String nome;
    @Column(nullable = false) private Short quantidade;
    @Column(name = "preco_unitario", nullable = false) private BigDecimal precoUnitario;
    @Column(nullable = false) private Integer calorias;
    @Column(nullable = false) private BigDecimal proteinas;
    @Column(nullable = false) private BigDecimal carboidratos;
    @Column(nullable = false) private BigDecimal gorduras;
    @JdbcTypeCode(SqlTypes.JSON) private String personalizacao;

    protected ItemPedido() {}

    /** Item a partir de um prato do catálogo (copia preço e macros). */
    public static ItemPedido de(Marmita m, int quantidade) {
        if (quantidade < 1) throw new IllegalArgumentException("Quantidade mínima é 1");
        if (!m.visivelNoMarketplace()) throw new IllegalArgumentException("Prato indisponível: " + m.getNome());
        var i = new ItemPedido();
        i.idMarmita = m.getId(); i.nome = m.getNome(); i.quantidade = (short) quantidade;
        i.precoUnitario = m.getPreco(); i.calorias = m.getCalorias();
        i.proteinas = m.getProteinas(); i.carboidratos = m.getCarboidratos(); i.gorduras = m.getGorduras();
        return i;
    }

    /** Item personalizado (tela 15), com macros e preço já calculados pelo service. */
    public static ItemPedido personalizado(String nome, int quantidade, BigDecimal preco, int calorias,
                                           BigDecimal p, BigDecimal c, BigDecimal g, String personalizacaoJson) {
        var i = new ItemPedido();
        i.nome = nome; i.quantidade = (short) quantidade; i.precoUnitario = preco; i.calorias = calorias;
        i.proteinas = p; i.carboidratos = c; i.gorduras = g; i.personalizacao = personalizacaoJson;
        return i;
    }

    public BigDecimal getValorTotal() { return precoUnitario.multiply(BigDecimal.valueOf(quantidade)); }

    public UUID getId() { return id; }
    public Pedido getPedido() { return pedido; }
    void setPedido(Pedido p) { this.pedido = p; }
    public UUID getIdMarmita() { return idMarmita; }
    public String getNome() { return nome; }
    public Short getQuantidade() { return quantidade; }
    public BigDecimal getPrecoUnitario() { return precoUnitario; }
    public Integer getCalorias() { return calorias; }
    public BigDecimal getProteinas() { return proteinas; }
    public BigDecimal getCarboidratos() { return carboidratos; }
    public BigDecimal getGorduras() { return gorduras; }
    public String getPersonalizacao() { return personalizacao; }
}
