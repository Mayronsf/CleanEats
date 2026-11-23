package com.tricode.cleaneats.service;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.Notificacao;
import com.tricode.cleaneats.repository.NotificacaoRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * CE-13 — ponto único para criar notificações (o front recebe via Supabase Realtime).
 * COMPARTILHADO: todas as frentes chamam; só a sessão principal altera.
 * Ex.: notificacaoService.notificar(idCliente, TipoNotificacao.PEDIDO, "Pedido a caminho", "CE-4901 saiu para entrega", "/app/pedidos/" + id);
 */
@Service
public class NotificacaoService {

    private final NotificacaoRepository notificacaoRepository;
    private final JdbcClient jdbc;

    public NotificacaoService(NotificacaoRepository notificacaoRepository, JdbcClient jdbc) {
        this.notificacaoRepository = notificacaoRepository;
        this.jdbc = jdbc;
    }

    /**
     * Cria a notificação, respeitando as preferências do usuário (tela 21 → usuario.preferencias_notificacao).
     * SISTEMA sempre chega. Devolve null quando o usuário desligou aquele tipo.
     */
    @Transactional
    public Notificacao notificar(UUID idUsuario, TipoNotificacao tipo, String titulo, String corpo, String link) {
        if (tipo != TipoNotificacao.SISTEMA) {
            var ligado = jdbc.sql("select coalesce((preferencias_notificacao ->> :chave)::boolean, true) from usuario where id = :u")
                    .param("chave", tipo.name().toLowerCase()).param("u", idUsuario).query(Boolean.class).optional().orElse(true);
            if (!ligado) return null;
        }
        return notificacaoRepository.save(new Notificacao(idUsuario, tipo, titulo, corpo, link));
    }
}
