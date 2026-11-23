package com.tricode.cleaneats.controller.cliente;

import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService;
import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService.Calculo;
import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService.CatalogoDto;
import com.tricode.cleaneats.service.cliente.MonteSuaMarmitaService.Selecao;
import org.springframework.web.bind.annotation.*;

/** Monte sua marmita (tela 15, CE-6). Dono: frente A. */
@RestController
@RequestMapping("/api/componentes-marmita")
public class MonteSuaMarmitaController {

    private final MonteSuaMarmitaService servico;

    public MonteSuaMarmitaController(MonteSuaMarmitaService servico) {
        this.servico = servico;
    }

    @GetMapping
    public CatalogoDto catalogo() { return servico.catalogo(UsuarioLogado.id()); }

    /** Prévia calculada no servidor (a mesma conta usada no pedido). */
    @PostMapping("/calculo")
    public Calculo calcular(@RequestBody Selecao selecao) { return servico.calcular(selecao); }
}
