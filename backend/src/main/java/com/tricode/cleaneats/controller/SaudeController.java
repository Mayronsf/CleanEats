package com.tricode.cleaneats.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/saude")
public class SaudeController {
    @GetMapping
    public Map<String, Object> verificarSaude() {
        return Map.of("status", "ok", "servico", "cleaneats-api", "momento", OffsetDateTime.now().toString());
    }
}
