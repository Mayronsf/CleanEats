package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Assinatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface AssinaturaRepository extends JpaRepository<Assinatura, UUID>, JpaSpecificationExecutor<Assinatura> {
    java.util.Optional<Assinatura> findFirstByIdUsuarioAndStatusInOrderByInicioEmDesc(UUID idUsuario, java.util.Collection<com.tricode.cleaneats.domain.Enums.StatusAssinatura> status);
}
