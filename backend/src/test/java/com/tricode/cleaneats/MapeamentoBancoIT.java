package com.tricode.cleaneats;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Confere o mapeamento JPA de TODAS as entidades contra o banco real (Supabase).
 * Fora da suíte padrão. Rodar com: ./mvnw test -Dtest=MapeamentoBancoIT -Dintegracao=true
 * (usa backend/.env). Toda frente que criar entidade nova deve rodar antes de cada integração.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@EnabledIfSystemProperty(named = "integracao", matches = "true")
class MapeamentoBancoIT {

    @Autowired ApplicationContext contexto;

    @Test
    @Transactional(readOnly = true)
    @SuppressWarnings({"rawtypes"})
    void todasAsEntidadesLeemDoBanco() {
        List<String> falhas = new ArrayList<>();
        var repositorios = contexto.getBeansOfType(JpaRepository.class);
        repositorios.forEach((nome, repo) -> {
            try {
                var pagina = repo.findAll(PageRequest.of(0, 5));
                System.out.printf("OK  %-38s %d linha(s)%n", nome, pagina.getTotalElements());
            } catch (Exception e) {
                falhas.add(nome + ": " + e.getMessage());
            }
        });
        falhas.forEach(f -> System.out.println("ERRO " + f));
        assertTrue(falhas.isEmpty(), "Entidades com problema de mapeamento: " + falhas);
    }
}
