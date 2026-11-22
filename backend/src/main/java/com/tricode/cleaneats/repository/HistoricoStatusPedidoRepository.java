package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.HistoricoStatusPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;


/** Repositório compartilhado (sessão principal). Frentes podem pedir consultas novas. */
public interface HistoricoStatusPedidoRepository extends JpaRepository<HistoricoStatusPedido, Long>, JpaSpecificationExecutor<HistoricoStatusPedido> {
    java.util.List<HistoricoStatusPedido> findByIdPedidoOrderByEmAsc(UUID idPedido);
}
