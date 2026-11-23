package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.PainelNutriService;
import com.tricode.cleaneats.service.nutri.PainelNutriService.Dashboard;
import com.tricode.cleaneats.service.nutri.PainelNutriService.Financeiro;
import com.tricode.cleaneats.service.nutri.PainelNutriService.Perfil;
import com.tricode.cleaneats.service.nutri.PainelNutriService.PerfilEdicao;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Rotas das telas 26, 34 e 35. */
@RestController
@RequestMapping("/api/nutri")
public class PainelNutriController {
    private final PainelNutriService servico;
    public PainelNutriController(PainelNutriService servico){this.servico=servico;}
    @GetMapping("/dashboard") public Dashboard dashboard(){return servico.dashboard(UsuarioLogado.id());}
    @GetMapping("/financeiro") public Financeiro financeiro(){return servico.financeiro(UsuarioLogado.id());}
    @GetMapping("/financeiro/csv") public ResponseEntity<byte[]> csv(){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=financeiro-nutri.csv")
            .contentType(new MediaType("text","csv",StandardCharsets.UTF_8)).body(servico.csv(UsuarioLogado.id()));}
    @GetMapping("/perfil") public Perfil perfil(){return servico.perfil(UsuarioLogado.id());}
    @PutMapping("/perfil") public Perfil salvar(@RequestBody PerfilEdicao dados){return servico.salvarPerfil(UsuarioLogado.id(),dados);}
    @PostMapping(path="/perfil/assinatura",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,String> assinatura(@RequestParam("arquivo") MultipartFile arquivo){return Map.of("url",servico.enviarAssinatura(UsuarioLogado.id(),arquivo));}
}
