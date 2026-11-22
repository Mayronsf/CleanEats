package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
}
