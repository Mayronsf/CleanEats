package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.RestricaoAlimentar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Restrições alimentares e o vínculo cliente ↔ restrição (tabela cliente_restricao). Compartilhado. */
public interface RestricaoAlimentarRepository extends JpaRepository<RestricaoAlimentar, Short> {

    List<RestricaoAlimentar> findAllByOrderByIdAsc();

    List<RestricaoAlimentar> findBySlugIn(Collection<String> slugs);

    @Query(value = "select r.* from restricao_alimentar r join cliente_restricao c on c.id_restricao = r.id where c.id_usuario = :idUsuario order by r.id",
           nativeQuery = true)
    List<RestricaoAlimentar> listarDoCliente(@Param("idUsuario") UUID idUsuario);

    @Modifying
    @Query(value = "delete from cliente_restricao where id_usuario = :idUsuario", nativeQuery = true)
    void limparDoCliente(@Param("idUsuario") UUID idUsuario);

    @Modifying
    @Query(value = "insert into cliente_restricao (id_usuario, id_restricao) values (:idUsuario, :idRestricao) on conflict do nothing", nativeQuery = true)
    void vincular(@Param("idUsuario") UUID idUsuario, @Param("idRestricao") Short idRestricao);
}
