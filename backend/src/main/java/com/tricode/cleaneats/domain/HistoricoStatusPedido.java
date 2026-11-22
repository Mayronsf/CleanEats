package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Linha da timeline do pedido — gravada por trigger no banco a cada mudança de status. Somente leitura. */
@Entity
@Table(name = "historico_status_pedido")
public class HistoricoStatusPedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "id_pedido", nullable = false) private UUID idPedido;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusPedido status;
    @Column(name = "id_autor") private UUID idAutor;
    @Column(nullable = false) private OffsetDateTime em;

    protected HistoricoStatusPedido() {}

    public Long getId() { return id; }
    public UUID getIdPedido() { return idPedido; }
    public StatusPedido getStatus() { return status; }
    public UUID getIdAutor() { return idAutor; }
    public OffsetDateTime getEm() { return em; }
}
