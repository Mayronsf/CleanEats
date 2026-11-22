package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.PlanoAlimentar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface PlanoAlimentarRepository extends JpaRepository<PlanoAlimentar, UUID>, JpaSpecificationExecutor<PlanoAlimentar> {
    java.util.Optional<PlanoAlimentar> findByIdUsuarioAndAtivoTrue(UUID idUsuario);
}
