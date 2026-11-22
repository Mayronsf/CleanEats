package com.tricode.cleaneats.domain;

import jakarta.persistence.*;

/** Restrição alimentar (sem lactose, vegano…). Catálogo fixo do seed. Compartilhada. */
@Entity
@Table(name = "restricao_alimentar")
public class RestricaoAlimentar {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Short id;
    @Column(nullable = false, unique = true) private String slug;
    @Column(nullable = false) private String nome;

    protected RestricaoAlimentar() {}

    public Short getId() { return id; }
    public String getSlug() { return slug; }
    public String getNome() { return nome; }
}
