package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.NivelAtividade;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/** Dados nutricionais do cliente (telas 05, 21, 22). Entidade compartilhada. */
@Entity
@Table(name = "perfil_cliente")
public class PerfilCliente {

    @Id
    @Column(name = "id_usuario")
    private UUID idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "objetivo_nutricional", nullable = false)
    private ObjetivoNutricional objetivoNutricional = ObjetivoNutricional.EQUILIBRIO;

    private String sexo;
    @Column(name = "data_nascimento") private LocalDate dataNascimento;
    @Column(name = "peso_kg") private BigDecimal pesoKg;
    @Column(name = "altura_cm") private BigDecimal alturaCm;
    @Enumerated(EnumType.STRING) @Column(name = "nivel_atividade") private NivelAtividade nivelAtividade;
    @Column(name = "meta_calorias") private Integer metaCalorias;
    @Column(name = "meta_proteinas") private Integer metaProteinas;
    @Column(name = "meta_carboidratos") private Integer metaCarboidratos;
    @Column(name = "meta_gorduras") private Integer metaGorduras;
    @Column(name = "meta_fibras") private Integer metaFibras;
    @Column(name = "meta_agua_ml") private Integer metaAguaMl;
    @Column(name = "id_nutricionista") private UUID idNutricionista;

    protected PerfilCliente() {}

    public PerfilCliente(UUID idUsuario) { this.idUsuario = idUsuario; }

    /** IMC = peso / altura² (telas 05 e 22). */
    public BigDecimal calcularImc() {
        if (pesoKg == null || alturaCm == null || alturaCm.signum() == 0) return null;
        BigDecimal alturaM = alturaCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return pesoKg.divide(alturaM.multiply(alturaM), 1, RoundingMode.HALF_UP);
    }

    public UUID getIdUsuario() { return idUsuario; }
    public ObjetivoNutricional getObjetivoNutricional() { return objetivoNutricional; }
    public void setObjetivoNutricional(ObjetivoNutricional v) { this.objetivoNutricional = v; }
    public String getSexo() { return sexo; }
    public void setSexo(String v) { this.sexo = v; }
    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate v) { this.dataNascimento = v; }
    public BigDecimal getPesoKg() { return pesoKg; }
    public void setPesoKg(BigDecimal v) { this.pesoKg = v; }
    public BigDecimal getAlturaCm() { return alturaCm; }
    public void setAlturaCm(BigDecimal v) { this.alturaCm = v; }
    public NivelAtividade getNivelAtividade() { return nivelAtividade; }
    public void setNivelAtividade(NivelAtividade v) { this.nivelAtividade = v; }
    public Integer getMetaCalorias() { return metaCalorias; }
    public void setMetaCalorias(Integer v) { this.metaCalorias = v; }
    public Integer getMetaProteinas() { return metaProteinas; }
    public void setMetaProteinas(Integer v) { this.metaProteinas = v; }
    public Integer getMetaCarboidratos() { return metaCarboidratos; }
    public void setMetaCarboidratos(Integer v) { this.metaCarboidratos = v; }
    public Integer getMetaGorduras() { return metaGorduras; }
    public void setMetaGorduras(Integer v) { this.metaGorduras = v; }
    public Integer getMetaFibras() { return metaFibras; }
    public void setMetaFibras(Integer v) { this.metaFibras = v; }
    public Integer getMetaAguaMl() { return metaAguaMl; }
    public void setMetaAguaMl(Integer v) { this.metaAguaMl = v; }
    public UUID getIdNutricionista() { return idNutricionista; }
    public void setIdNutricionista(UUID v) { this.idNutricionista = v; }
}
