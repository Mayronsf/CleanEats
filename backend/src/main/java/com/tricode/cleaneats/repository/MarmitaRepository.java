package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Marmita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface MarmitaRepository extends JpaRepository<Marmita, UUID>, JpaSpecificationExecutor<Marmita> {
}
