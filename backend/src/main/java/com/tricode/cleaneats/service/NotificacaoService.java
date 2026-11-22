package com.tricode.cleaneats.service;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.Notificacao;
import com.tricode.cleaneats.repository.NotificacaoRepository;
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

    public NotificacaoService(NotificacaoRepository notificacaoRepository) {
        this.notificacaoRepository = notificacaoRepository;
    }

    @Transactional
    public Notificacao notificar(UUID idUsuario, TipoNotificacao tipo, String titulo, String corpo, String link) {
        return notificacaoRepository.save(new Notificacao(idUsuario, tipo, titulo, corpo, link));
    }
}
