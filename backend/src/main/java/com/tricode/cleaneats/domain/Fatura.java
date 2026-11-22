package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.StatusFatura;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Fatura da assinatura. Cobrança SIMULADA: nasce PAGA. Entidade compartilhada. */
@Entity
@Table(name = "fatura")
public class Fatura {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "id_assinatura", nullable = false) private UUID idAssinatura;
    @Column(nullable = false) private String referencia;
    @Column(nullable = false) private BigDecimal valor;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusFatura status = StatusFatura.PENDENTE;
    @Column(nullable = false) private LocalDate vencimento;
    @Column(name = "paga_em") private OffsetDateTime pagaEm;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected Fatura() {}

    /** Cobrança simulada: aprova na hora. */
    public static Fatura pagaAgora(UUID idAssinatura, String referencia, BigDecimal valor) {
        var f = new Fatura();
        f.idAssinatura = idAssinatura; f.referencia = referencia; f.valor = valor;
        f.vencimento = LocalDate.now(); f.status = StatusFatura.PAGA; f.pagaEm = OffsetDateTime.now();
        return f;
    }

    public UUID getId() { return id; }
    public UUID getIdAssinatura() { return idAssinatura; }
    public String getReferencia() { return referencia; }
    public BigDecimal getValor() { return valor; }
    public StatusFatura getStatus() { return status; }
    public LocalDate getVencimento() { return vencimento; }
    public OffsetDateTime getPagaEm() { return pagaEm; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
