package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.time.LocalTime;
import java.util.UUID;

/** Uma refeição do plano: dia × tipo × prato real + observação (CE-19). Entidade compartilhada. */
@Entity
@Table(name = "refeicao_plano")
public class RefeicaoPlano {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "id_plano_alimentar", nullable = false) private PlanoAlimentar plano;
    @Column(name = "dia_semana", nullable = false) private Short diaSemana;   // 0 = domingo
    @Enumerated(EnumType.STRING) @Column(name = "tipo_refeicao", nullable = false) private Enums.TipoRefeicao tipoRefeicao;
    private LocalTime horario;
    @Column(name = "id_marmita", nullable = false) private UUID idMarmita;
    private String observacao;

    protected RefeicaoPlano() {}

    RefeicaoPlano(PlanoAlimentar plano, short diaSemana, Enums.TipoRefeicao tipo, UUID idMarmita, String observacao) {
        this.plano = plano; this.diaSemana = diaSemana; this.tipoRefeicao = tipo; this.idMarmita = idMarmita; this.observacao = observacao;
    }

    public UUID getId() { return id; }
    public PlanoAlimentar getPlano() { return plano; }
    public Short getDiaSemana() { return diaSemana; }
    public Enums.TipoRefeicao getTipoRefeicao() { return tipoRefeicao; }
    public LocalTime getHorario() { return horario; }
    public void setHorario(LocalTime v) { this.horario = v; }
    public UUID getIdMarmita() { return idMarmita; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String v) { this.observacao = v; }
}
