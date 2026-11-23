package com.tricode.cleaneats.service.restaurante;

import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.domain.StatusPedido;
import com.tricode.cleaneats.repository.PedidoRepository;
import com.tricode.cleaneats.service.NotificacaoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entrega SIMULADA (tela 18). A cada 5 s:
 * (1) pedido PRONTO cujo último status tem entre {@code segundos-ate-sair} e 10 min → entregador fictício, previsão =
 *     agora + {@code segundos-ate-entregar}, status A_CAMINHO. PRONTO há mais de 10 min (os do seed da tela 37) espera o
 *     "Confirmar retirada" no painel.
 * (2) pedido A_CAMINHO com previsão vencida → ENTREGUE. Notifica o cliente nas duas mudanças. Dono: frente C.
 */
@Component
public class EntregaSimuladaJob {

    private static final Logger log = LoggerFactory.getLogger(EntregaSimuladaJob.class);

    private final JdbcClient jdbc;
    private final PedidoRepository pedidos;
    private final NotificacaoService notificacoes;
    private final TransactionTemplate transacao;
    private final int segundosAteSair;
    private final int segundosAteEntregar;

    public EntregaSimuladaJob(JdbcClient jdbc, PedidoRepository pedidos, NotificacaoService notificacoes, TransactionTemplate transacao,
                              @Value("${cleaneats.entrega.segundos-ate-sair:20}") int segundosAteSair,
                              @Value("${cleaneats.entrega.segundos-ate-entregar:40}") int segundosAteEntregar) {
        this.jdbc = jdbc; this.pedidos = pedidos; this.notificacoes = notificacoes; this.transacao = transacao;
        this.segundosAteSair = segundosAteSair; this.segundosAteEntregar = segundosAteEntregar;
    }

    @Scheduled(fixedDelayString = "${cleaneats.entrega.intervalo-ms:5000}", initialDelay = 15000)
    public void avancar() {
        try {
            var saindo = jdbc.sql("""
                    select p.id from pedido p
                    where p.status = 'PRONTO'
                      and (select max(h.em) from historico_status_pedido h where h.id_pedido = p.id and h.status = 'PRONTO')
                          between now() - interval '10 min' and now() - make_interval(secs => :s)""")
                    .param("s", segundosAteSair).query(UUID.class).list();
            saindo.forEach(id -> transacao.executeWithoutResult(t -> sair(id)));
            var chegando = jdbc.sql("select id from pedido where status = 'A_CAMINHO' and previsao_entrega_em <= now()").query(UUID.class).list();
            chegando.forEach(id -> transacao.executeWithoutResult(t -> entregar(id)));
        } catch (RuntimeException e) {
            log.warn("Entrega simulada: {}", e.getMessage());
        }
    }

    private void sair(UUID id) {
        pedidos.findById(id).filter(p -> p.getStatus() == StatusPedido.PRONTO).ifPresent(p -> {
            p.mudarStatus(StatusPedido.A_CAMINHO);
            p.setEntregadorNome(PainelPedidosService.entregador(id));
            p.setPrevisaoEntregaEm(OffsetDateTime.now().plusSeconds(segundosAteEntregar));
            pedidos.saveAndFlush(p);
            notificacoes.notificar(p.getIdUsuario(), TipoNotificacao.PEDIDO, "Pedido a caminho · " + codigo(id),
                    p.getEntregadorNome() + " saiu com seu pedido.", "/app/pedidos/" + id);
        });
    }

    private void entregar(UUID id) {
        pedidos.findById(id).filter(p -> p.getStatus() == StatusPedido.A_CAMINHO).ifPresent(p -> {
            p.mudarStatus(StatusPedido.ENTREGUE);
            pedidos.saveAndFlush(p);
            notificacoes.notificar(p.getIdUsuario(), TipoNotificacao.PEDIDO, "Pedido entregue · " + codigo(id),
                    "Bom apetite! Depois conte como foi: você pode avaliar o pedido.", "/app/pedidos/" + id + "/avaliar");
        });
    }

    private String codigo(UUID id) {
        return jdbc.sql("select codigo from pedido where id = :p").param("p", id).query(String.class).single();
    }
}
