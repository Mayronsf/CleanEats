package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.PrescricaoService;
import com.tricode.cleaneats.service.nutri.PrescricaoService.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nutri/prescricoes")
public class PrescricaoController {
    public record EmitirReq(UUID idCliente, String observacoes) {}
    private final PrescricaoService servico;
    public PrescricaoController(PrescricaoService servico){this.servico=servico;}
    @GetMapping public PaginaDto<Linha> listar(@RequestParam(defaultValue="0") int pagina,@RequestParam(defaultValue="10") int tamanho){return servico.listar(UsuarioLogado.id(),pagina,tamanho);}
    @GetMapping("/clientes-elegiveis") public List<ClienteElegivel> clientes(){return servico.clientes(UsuarioLogado.id());}
    @GetMapping("/previa") public Previa previa(@RequestParam UUID cliente){return servico.previa(UsuarioLogado.id(),cliente);}
    @PostMapping public Emissao emitir(@RequestBody EmitirReq req){if(req==null)throw new IllegalArgumentException("Informe o cliente da prescrição");return servico.emitir(UsuarioLogado.id(),req.idCliente(),req.observacoes());}
    @GetMapping("/{id}/pdf") public Download pdf(@PathVariable UUID id){return servico.pdf(UsuarioLogado.id(),id);}
}
