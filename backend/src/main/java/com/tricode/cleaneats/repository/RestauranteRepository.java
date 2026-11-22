package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Restaurante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface RestauranteRepository extends JpaRepository<Restaurante, UUID>, JpaSpecificationExecutor<Restaurante> {
    java.util.Optional<Restaurante> findByIdUsuario(UUID idUsuario);
}
