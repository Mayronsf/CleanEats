package com.tricode.cleaneats.config;

import com.tricode.cleaneats.security.ConversorJwtSupabase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filtroSeguranca(HttpSecurity http, ConversorJwtSupabase conversor) throws Exception {
        http
            .csrf(c -> c.disable())
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/saude").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/contatos-suporte").permitAll()
                // Catálogo público (marketplace, restaurantes, ficha técnica via QR Code)
                .requestMatchers(HttpMethod.GET, "/api/marmitas/**", "/api/restaurantes/**",
                        "/api/fichas-tecnicas/**", "/api/tiers", "/api/restricoes").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/nutri/**").hasRole("NUTRICIONISTA")
                .requestMatchers("/api/painel-restaurante/**").hasRole("RESTAURANTE")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(conversor)));
        return http.build();
    }

    /**
     * Valida o JWT do Supabase. Projetos novos assinam com chave assimétrica (ES256/RS256, via JWKS);
     * projetos antigos usam o "JWT secret" (HS256). Se SUPABASE_JWT_SECRET estiver definido, usa HS256.
     */
    @Bean
    JwtDecoder jwtDecoder(@Value("${cleaneats.supabase.url}") String supabaseUrl,
                          @Value("${cleaneats.supabase.jwt-secret:}") String jwtSecret) {
        String issuer = supabaseUrl.replaceAll("/+$", "") + "/auth/v1";
        NimbusJwtDecoder decoder;
        if (jwtSecret != null && !jwtSecret.isBlank()) {
            var chave = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            decoder = NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(MacAlgorithm.HS256).build();
        } else {
            decoder = NimbusJwtDecoder.withJwkSetUri(issuer + "/.well-known/jwks.json")
                    .jwsAlgorithm(SignatureAlgorithm.ES256)
                    .jwsAlgorithm(SignatureAlgorithm.RS256)
                    .build();
        }
        OAuth2TokenValidator<Jwt> audiencia = jwt -> jwt.getAudience() != null && jwt.getAudience().contains("authenticated")
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Audiência inválida", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer), audiencia));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${cleaneats.cors.origens}") List<String> origens) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(origens);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
