package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Fatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface FaturaRepository extends JpaRepository<Fatura, UUID>, JpaSpecificationExecutor<Fatura> {
    java.util.List<Fatura> findByIdAssinaturaOrderByCriadoEmDesc(UUID idAssinatura);
}
