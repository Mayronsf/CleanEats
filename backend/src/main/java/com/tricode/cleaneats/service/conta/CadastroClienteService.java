package com.tricode.cleaneats.service.conta;

import com.tricode.cleaneats.domain.Enums.NivelAtividade;
import com.tricode.cleaneats.domain.Enums.ObjetivoNutricional;
import com.tricode.cleaneats.domain.MetasIniciais;
import com.tricode.cleaneats.domain.PerfilCliente;
import com.tricode.cleaneats.domain.PerfilUsuario;
import com.tricode.cleaneats.domain.RestricaoAlimentar;
import com.tricode.cleaneats.dto.UsuarioDto;
import com.tricode.cleaneats.repository.PerfilClienteRepository;
import com.tricode.cleaneats.repository.RestricaoAlimentarRepository;
import com.tricode.cleaneats.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Tela 05 — etapa 3 do cadastro do cliente (CE-2, CE-6). */
@Service
public class CadastroClienteService {

    public record DadosCliente(String nome, String telefone, ObjetivoNutricional objetivo, List<String> restricoes,
                               BigDecimal pesoKg, BigDecimal alturaCm, Integer idade, String sexo,
                               NivelAtividade nivelAtividade, OffsetDateTime aceiteTermosEm) {}

    private final UsuarioService usuarioService;
    private final PerfilClienteRepository perfilClienteRepository;
    private final RestricaoAlimentarRepository restricaoRepository;

    public CadastroClienteService(UsuarioService usuarioService, PerfilClienteRepository perfilClienteRepository,
                                  RestricaoAlimentarRepository restricaoRepository) {
        this.usuarioService = usuarioService;
        this.perfilClienteRepository = perfilClienteRepository;
        this.restricaoRepository = restricaoRepository;
    }

    @Transactional
    public UsuarioDto cadastrar(UUID idUsuario, String email, DadosCliente dados) {
        var usuario = usuarioService.criarConta(idUsuario, email, dados.nome(), dados.telefone(), PerfilUsuario.CLIENTE, dados.aceiteTermosEm());

        var perfil = new PerfilCliente(idUsuario);
        perfil.setObjetivoNutricional(dados.objetivo());
        perfil.setPesoKg(dados.pesoKg());
        perfil.setAlturaCm(dados.alturaCm());
        if (dados.idade() != null) perfil.setDataNascimento(LocalDate.now().minusYears(dados.idade()).withDayOfYear(1));
        if (dados.sexo() != null && java.util.Set.of("F", "M", "O").contains(dados.sexo())) perfil.setSexo(dados.sexo());
        var nivel = dados.nivelAtividade() == null ? NivelAtividade.MODERADO : dados.nivelAtividade();
        perfil.setNivelAtividade(nivel);
        var calc = MetasIniciais.calcular(dados.objetivo(), dados.pesoKg(), dados.alturaCm(), dados.idade(), dados.sexo(), nivel);
        perfil.setMetaCalorias(calc.calorias());
        perfil.setMetaProteinas(calc.proteinas());
        perfil.setMetaCarboidratos(calc.carboidratos());
        perfil.setMetaGorduras(calc.gorduras());
        perfil.setMetaFibras(calc.fibras());
        perfil.setMetaAguaMl(calc.aguaMl());
        perfilClienteRepository.save(perfil);

        if (dados.restricoes() != null && !dados.restricoes().isEmpty()) {
            List<RestricaoAlimentar> encontradas = restricaoRepository.findBySlugIn(dados.restricoes());
            if (encontradas.size() != dados.restricoes().stream().distinct().count()) {
                throw new IllegalArgumentException("Restrição alimentar desconhecida");
            }
            encontradas.forEach(r -> restricaoRepository.vincular(idUsuario, r.getId()));
        }
        return usuario;
    }
}
