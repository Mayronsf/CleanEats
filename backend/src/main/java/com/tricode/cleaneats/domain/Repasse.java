package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.StatusRepasse;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Repasse a restaurante (CE-17) ou nutricionista (60%). Exatamente um dos dois ids é preenchido. Compartilhada. */
@Entity
@Table(name = "repasse")
public class Repasse {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "id_restaurante") private UUID idRestaurante;
    @Column(name = "id_nutricionista") private UUID idNutricionista;
    @Column(name = "periodo_inicio", nullable = false) private LocalDate periodoInicio;
    @Column(name = "periodo_fim", nullable = false) private LocalDate periodoFim;
    @Column(name = "valor_bruto", nullable = false) private BigDecimal valorBruto;
    @Column(name = "valor_comissao", nullable = false) private BigDecimal valorComissao;
    @Column(name = "valor_liquido", nullable = false) private BigDecimal valorLiquido;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusRepasse status = StatusRepasse.PREVISTO;
    @Column(name = "previsto_para") private LocalDate previstoPara;
    @Column(name = "pago_em") private OffsetDateTime pagoEm;

    protected Repasse() {}

    public static Repasse paraRestaurante(UUID idRestaurante, LocalDate inicio, LocalDate fim, BigDecimal bruto, BigDecimal comissao) {
        var r = base(inicio, fim, bruto, comissao); r.idRestaurante = idRestaurante; return r;
    }

    public static Repasse paraNutricionista(UUID idNutricionista, LocalDate inicio, LocalDate fim, BigDecimal brutoAssinaturas) {
        BigDecimal liquido = CalculoFinanceiro.calcularRepasseNutricionista(brutoAssinaturas);
        var r = base(inicio, fim, brutoAssinaturas, brutoAssinaturas.subtract(liquido)); r.idNutricionista = idNutricionista; return r;
    }

    private static Repasse base(LocalDate inicio, LocalDate fim, BigDecimal bruto, BigDecimal comissao) {
        var r = new Repasse();
        r.periodoInicio = inicio; r.periodoFim = fim; r.valorBruto = bruto; r.valorComissao = comissao;
        r.valorLiquido = bruto.subtract(comissao);
        return r;
    }

    public UUID getId() { return id; }
    public UUID getIdRestaurante() { return idRestaurante; }
    public UUID getIdNutricionista() { return idNutricionista; }
    public LocalDate getPeriodoInicio() { return periodoInicio; }
    public LocalDate getPeriodoFim() { return periodoFim; }
    public BigDecimal getValorBruto() { return valorBruto; }
    public BigDecimal getValorComissao() { return valorComissao; }
    public BigDecimal getValorLiquido() { return valorLiquido; }
    public StatusRepasse getStatus() { return status; }
    public LocalDate getPrevistoPara() { return previstoPara; }
    public void setPrevistoPara(LocalDate v) { this.previstoPara = v; }
    public OffsetDateTime getPagoEm() { return pagoEm; }
}
