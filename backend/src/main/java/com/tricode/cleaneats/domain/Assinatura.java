package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.CicloCobranca;
import com.tricode.cleaneats.domain.Enums.StatusAssinatura;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Assinatura do cliente (CE-15, CE-16). Pagamento SIMULADO. Entidade compartilhada. */
@Entity
@Table(name = "assinatura")
public class Assinatura {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "id_usuario", nullable = false) private UUID idUsuario;
    @Enumerated(EnumType.STRING) @Column(name = "id_tier", nullable = false) private TierAssinatura tier;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private CicloCobranca ciclo = CicloCobranca.MENSAL;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusAssinatura status = StatusAssinatura.ATIVA;
    @Column(nullable = false) private BigDecimal valor;
    @Column(name = "inicio_em", nullable = false) private OffsetDateTime inicioEm = OffsetDateTime.now();
    @Column(name = "trial_ate") private OffsetDateTime trialAte;
    @Column(name = "renovacao_em") private OffsetDateTime renovacaoEm;
    @Column(name = "cancelada_em") private OffsetDateTime canceladaEm;
    @Column(name = "encerra_em") private OffsetDateTime encerraEm;
    @Column(name = "pausada_ate") private OffsetDateTime pausadaAte;
    @Column(nullable = false) private String gateway = "SIMULADO";
    @Column(name = "id_externo") private String idExterno;

    protected Assinatura() {}

    public Assinatura(UUID idUsuario, TierAssinatura tier, CicloCobranca ciclo) {
        this.idUsuario = idUsuario; this.tier = tier; this.ciclo = ciclo;
        this.valor = ciclo == CicloCobranca.ANUAL ? tier.getPrecoAnual() : tier.getPrecoMensal();
        this.renovacaoEm = ciclo == CicloCobranca.ANUAL ? inicioEm.plusYears(1) : inicioEm.plusMonths(1);
    }

    /** CE-16: cancela mantendo os benefícios até o fim do período pago. Retorna a data de encerramento. */
    public OffsetDateTime cancelar() {
        if (status == StatusAssinatura.CANCELADA || status == StatusAssinatura.EXPIRADA) {
            throw new IllegalArgumentException("A assinatura já está cancelada");
        }
        this.status = StatusAssinatura.CANCELADA;
        this.canceladaEm = OffsetDateTime.now();
        this.encerraEm = renovacaoEm;
        return encerraEm;
    }

    /** Renovação (SIMULADA no admin): avança o ciclo. */
    public void renovar() {
        if (status != StatusAssinatura.ATIVA) throw new IllegalArgumentException("Só assinaturas ativas são renovadas");
        this.renovacaoEm = ciclo == CicloCobranca.ANUAL ? renovacaoEm.plusYears(1) : renovacaoEm.plusMonths(1);
    }

    public boolean expirou(OffsetDateTime agora) {
        return status == StatusAssinatura.CANCELADA && encerraEm != null && !agora.isBefore(encerraEm);
    }

    public void expirar() { this.status = StatusAssinatura.EXPIRADA; }

    public void pausar(OffsetDateTime ate) {
        if (status != StatusAssinatura.ATIVA) throw new IllegalArgumentException("Só assinaturas ativas podem ser pausadas");
        this.status = StatusAssinatura.PAUSADA;
        this.pausadaAte = ate;
    }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public TierAssinatura getTier() { return tier; }
    public CicloCobranca getCiclo() { return ciclo; }
    public StatusAssinatura getStatus() { return status; }
    public BigDecimal getValor() { return valor; }
    public OffsetDateTime getInicioEm() { return inicioEm; }
    public OffsetDateTime getTrialAte() { return trialAte; }
    public void setTrialAte(OffsetDateTime v) { this.trialAte = v; }
    public OffsetDateTime getRenovacaoEm() { return renovacaoEm; }
    public OffsetDateTime getCanceladaEm() { return canceladaEm; }
    public OffsetDateTime getEncerraEm() { return encerraEm; }
    public OffsetDateTime getPausadaAte() { return pausadaAte; }
    public String getGateway() { return gateway; }
}
