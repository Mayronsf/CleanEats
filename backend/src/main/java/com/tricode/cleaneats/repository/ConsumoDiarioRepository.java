package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.ConsumoDiario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface ConsumoDiarioRepository extends JpaRepository<ConsumoDiario, UUID>, JpaSpecificationExecutor<ConsumoDiario> {
    java.util.Optional<ConsumoDiario> findByIdUsuarioAndData(UUID idUsuario, java.time.LocalDate data);
}
