package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.PerfilCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface PerfilClienteRepository extends JpaRepository<PerfilCliente, UUID>, JpaSpecificationExecutor<PerfilCliente> {
}
