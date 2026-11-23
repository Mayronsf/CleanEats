package com.tricode.cleaneats.repository;

import com.tricode.cleaneats.domain.Tier;
import com.tricode.cleaneats.domain.TierAssinatura;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Tiers de assinatura (tabela tier). Compartilhado. */
public interface TierRepository extends JpaRepository<Tier, TierAssinatura> {
    List<Tier> findAllByOrderByOrdemAsc();
}
