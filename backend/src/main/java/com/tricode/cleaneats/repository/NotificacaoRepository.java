package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID>, JpaSpecificationExecutor<Notificacao> {
    org.springframework.data.domain.Page<Notificacao> findByIdUsuarioOrderByCriadoEmDesc(UUID idUsuario, org.springframework.data.domain.Pageable pagina);
    long countByIdUsuarioAndLidaEmIsNull(UUID idUsuario);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Notificacao n set n.lidaEm = CURRENT_TIMESTAMP where n.idUsuario = :idUsuario and n.lidaEm is null")
    int marcarTodasComoLidas(@org.springframework.data.repository.query.Param("idUsuario") UUID idUsuario);
}
