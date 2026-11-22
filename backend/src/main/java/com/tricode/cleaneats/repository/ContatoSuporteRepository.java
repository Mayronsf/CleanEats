package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.ContatoSuporte;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

/** Repositório compartilhado (sessão principal). */
public interface ContatoSuporteRepository extends JpaRepository<ContatoSuporte, UUID> {
    Page<ContatoSuporte> findAllByOrderByCriadoEmDesc(Pageable pagina);
}
