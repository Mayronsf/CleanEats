package com.tricode.cleaneats.domain;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Notificação no sistema (CE-13). Criada pelos services via NotificacaoService. Compartilhada. */
@Entity
@Table(name = "notificacao")
public class Notificacao {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "id_usuario", nullable = false) private UUID idUsuario;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TipoNotificacao tipo;
    @Column(nullable = false) private String titulo;
    private String corpo;
    private String link;
    @Column(name = "lida_em") private OffsetDateTime lidaEm;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected Notificacao() {}

    public Notificacao(UUID idUsuario, TipoNotificacao tipo, String titulo, String corpo, String link) {
        this.idUsuario = idUsuario; this.tipo = tipo; this.titulo = titulo; this.corpo = corpo; this.link = link;
    }

    public void marcarComoLida() { if (lidaEm == null) lidaEm = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public TipoNotificacao getTipo() { return tipo; }
    public String getTitulo() { return titulo; }
    public String getCorpo() { return corpo; }
    public String getLink() { return link; }
    public OffsetDateTime getLidaEm() { return lidaEm; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
