package com.tricode.cleaneats.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** "Fale conosco" (telas 04, 17, 18, 21) — fila no /admin/suporte. Compartilhada (sessão principal). */
@Entity
@Table(name = "contato_suporte")
public class ContatoSuporte {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "id_usuario") private UUID idUsuario;
    @Column(nullable = false) private String email;
    @Column(nullable = false) private String assunto;
    @Column(nullable = false) private String mensagem;
    @Column(name = "respondido_em") private OffsetDateTime respondidoEm;
    @Column(name = "criado_em", insertable = false, updatable = false) private OffsetDateTime criadoEm;

    protected ContatoSuporte() {}

    public ContatoSuporte(UUID idUsuario, String email, String assunto, String mensagem) {
        this.idUsuario = idUsuario; this.email = email; this.assunto = assunto; this.mensagem = mensagem;
    }

    public void marcarRespondido() { if (respondidoEm == null) respondidoEm = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getIdUsuario() { return idUsuario; }
    public String getEmail() { return email; }
    public String getAssunto() { return assunto; }
    public String getMensagem() { return mensagem; }
    public OffsetDateTime getRespondidoEm() { return respondidoEm; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
