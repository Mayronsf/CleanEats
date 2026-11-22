package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID>, JpaSpecificationExecutor<Notificacao> {
    org.springframework.data.domain.Page<Notificacao> findByIdUsuarioOrderByCriadoEmDesc(UUID idUsuario, org.springframework.data.domain.Pageable pagina);
    long countByIdUsuarioAndLidaEmIsNull(UUID idUsuario);
}
