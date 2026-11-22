package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Nutricionista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface NutricionistaRepository extends JpaRepository<Nutricionista, UUID>, JpaSpecificationExecutor<Nutricionista> {
    java.util.Optional<Nutricionista> findByIdUsuario(UUID idUsuario);
}
