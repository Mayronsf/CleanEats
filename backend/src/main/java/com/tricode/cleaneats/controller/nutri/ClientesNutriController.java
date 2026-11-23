package com.tricode.cleaneats.controller.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.security.UsuarioLogado;
import com.tricode.cleaneats.service.nutri.ClientesNutriService;
import com.tricode.cleaneats.service.nutri.ClientesNutriService.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nutri/clientes")
public class ClientesNutriController {
    private final ClientesNutriService service;
    public ClientesNutriController(ClientesNutriService service) { this.service = service; }
    @GetMapping public PaginaDto<ClienteLinha> listar(@RequestParam(required=false) String busca, @RequestParam(required=false) String tier,
             @RequestParam(required=false) String objetivo, @RequestParam(defaultValue="nome") String ordem,
             @RequestParam(defaultValue="0") int pagina, @RequestParam(defaultValue="9") int tamanho) {
        return service.listar(UsuarioLogado.id(), busca, tier, objetivo, ordem, pagina, tamanho);
    }
    @GetMapping("/{id}") public Perfil perfil(@PathVariable UUID id) { return service.perfil(UsuarioLogado.id(), id); }
    @GetMapping("/{id}/pedidos") public List<PedidoCliente> pedidos(@PathVariable UUID id) { return service.listarPedidos(UsuarioLogado.id(), id); }
    @PostMapping("/{id}/medicoes") @ResponseStatus(HttpStatus.CREATED)
    public Medicao registrar(@PathVariable UUID id, @RequestBody NovaMedicao req) { return service.registrar(UsuarioLogado.id(), id, req); }
}
