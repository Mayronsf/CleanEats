package com.tricode.cleaneats.service.cliente;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.*;
import com.tricode.cleaneats.domain.Enums.TipoNotificacao;
import com.tricode.cleaneats.repository.*;
import com.tricode.cleaneats.service.NotificacaoService;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Checkout do cliente (tela 16, CE-9): prévia e confirmação. O backend recalcula tudo a partir do banco
 * (preço, macros, desconto do plano, cupom, taxa) — nunca confia em valores vindos do front.
 * Pagamento é SIMULADO (aprova na hora). Dono: frente A.
 */
@Service
public class PedidoClienteService {

    public record ItemPedidoReq(UUID idMarmita, int quantidade, String observacao, Map<String, Object> personalizacao) {}
    public record PedidoReq(List<ItemPedidoReq> itens, String cupom, UUID idEndereco, String formaPagamento,
                            OffsetDateTime agendadoPara, String observacao) {}

    public record ItemPrevia(UUID idMarmita, String nome, int quantidade, BigDecimal precoUnitario, BigDecimal total,
                             int calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras) {}
    public record CupomAplicado(String codigo, String descricao, BigDecimal percentual, BigDecimal valor) {}
    public record Previa(UUID idRestaurante, String restaurante, List<ItemPrevia> itens, int quantidadeItens, BigDecimal subtotal,
                         String tier, int percentualTier, BigDecimal descontoTier, CupomAplicado cupom, String erroCupom,
                         BigDecimal taxaEntrega, boolean entregaGratis, BigDecimal total, BigDecimal pedidoMinimo,
                         boolean abaixoDoMinimo, int calorias, BigDecimal proteinas, BigDecimal carboidratos, BigDecimal gorduras,
                         int tempoEntregaMin, int tempoEntregaMax) {}
    public record PedidoCriado(UUID id, String codigo) {}

    private static final Set<String> FORMAS = Set.of("PIX", "CREDITO", "DINHEIRO");
    private static final BigDecimal CEM = new BigDecimal("100");

    private final JdbcClient jdbc;
    private final MarmitaRepository marmitas;
    private final RestauranteRepository restaurantes;
    private final UsuarioRepository usuarios;
    private final PedidoRepository pedidos;
    private final ConsumoDiarioRepository consumos;
    private final NotificacaoService notificacoes;
    private final ObjectMapper json;
    private final MonteSuaMarmitaService monte;

    public PedidoClienteService(JdbcClient jdbc, MarmitaRepository marmitas, RestauranteRepository restaurantes, UsuarioRepository usuarios,
                                PedidoRepository pedidos, ConsumoDiarioRepository consumos, NotificacaoService notificacoes, ObjectMapper json,
                                MonteSuaMarmitaService monte) {
        this.jdbc = jdbc; this.marmitas = marmitas; this.restaurantes = restaurantes; this.usuarios = usuarios;
        this.pedidos = pedidos; this.consumos = consumos; this.notificacoes = notificacoes; this.json = json; this.monte = monte;
    }

    /** Monta o pedido em memória (sem gravar) e devolve os valores. */
    public Previa previa(UUID idUsuario, PedidoReq req) {
        return montar(idUsuario, req).previa();
    }

    @Transactional
    public PedidoCriado confirmar(UUID idUsuario, PedidoReq req) {
        var m = montar(idUsuario, req);
        var p = m.previa();
        if (p.abaixoDoMinimo()) {
            throw new IllegalArgumentException("O pedido mínimo do " + p.restaurante() + " é R$ " + p.pedidoMinimo().setScale(2) .toPlainString().replace('.', ','));
        }
        if (req.cupom() != null && !req.cupom().isBlank() && p.erroCupom() != null) throw new IllegalArgumentException(p.erroCupom());
        if (req.idEndereco() == null) throw new IllegalArgumentException("Escolha o endereço de entrega");
        boolean enderecoDoCliente = jdbc.sql("select count(*) from endereco where id = :e and id_usuario = :u")
                .param("e", req.idEndereco()).param("u", idUsuario).query(Integer.class).single() > 0;
        if (!enderecoDoCliente) throw new RecursoNaoEncontradoException("ENDERECO", "Endereço não encontrado");
        String forma = req.formaPagamento() == null ? "PIX" : req.formaPagamento().toUpperCase(Locale.ROOT);
        if (!FORMAS.contains(forma)) throw new IllegalArgumentException("Forma de pagamento inválida");
        if (req.agendadoPara() != null) {
            var agora = OffsetDateTime.now();
            if (req.agendadoPara().isBefore(agora.plusMinutes(30)) || req.agendadoPara().isAfter(agora.plusDays(7))) {
                throw new IllegalArgumentException("Agende para daqui a pelo menos 30 minutos e até 7 dias");
            }
        }

        var pedido = m.pedido;
        pedido.setIdEndereco(req.idEndereco());
        pedido.setFormaPagamento(forma);                  // pagamento SIMULADO: aprovado na hora
        pedido.setAgendadoPara(req.agendadoPara());
        pedido.setObservacao(limpar(req.observacao(), 300));
        if (m.idCupom != null) pedido.setIdCupom(m.idCupom);
        pedidos.saveAndFlush(pedido);
        String codigo = jdbc.sql("select codigo from pedido where id = :id").param("id", pedido.getId()).query(String.class).single();

        // CE-9: soma no consumo do dia da entrega
        LocalDate dia = (req.agendadoPara() != null ? req.agendadoPara().atZoneSameInstant(AcompanhamentoService.FUSO).toLocalDate() : AcompanhamentoService.hoje());
        var consumo = consumos.findByIdUsuarioAndData(idUsuario, dia).orElseGet(() -> new ConsumoDiario(idUsuario, dia));
        consumo.somar(pedido);
        consumo.setFibras(consumo.getFibras().add(m.fibras));
        consumos.save(consumo);

        var restaurante = m.restaurante;
        notificacoes.notificar(restaurante.getIdUsuario(), TipoNotificacao.PEDIDO, "Novo pedido: " + codigo,
                m.nomeCliente + " · " + resumoItens(pedido) + " · R$ " + pedido.getTotal().setScale(2).toPlainString().replace('.', ','),
                "/restaurante/pedidos");
        return new PedidoCriado(pedido.getId(), codigo);
    }

    private record Montagem(Pedido pedido, Restaurante restaurante, UUID idCupom, BigDecimal fibras, String nomeCliente, Previa previa) {}

    private Montagem montar(UUID idUsuario, PedidoReq req) {
        if (req.itens() == null || req.itens().isEmpty()) throw new IllegalArgumentException("Seu carrinho está vazio");
        if (req.itens().size() > 30) throw new IllegalArgumentException("Itens demais em um pedido");
        var usuario = usuarios.findById(idUsuario).orElseThrow(() -> new RecursoNaoEncontradoException("USUARIO", "Usuário não encontrado"));
        TierAssinatura tier = usuario.getTier() == null ? TierAssinatura.FREE : usuario.getTier();

        Restaurante restaurante = null;
        Pedido pedido = null;
        BigDecimal fibras = BigDecimal.ZERO;
        var itensPrevia = new ArrayList<ItemPrevia>();
        for (var it : req.itens()) {
            int qtd = Math.max(1, Math.min(20, it.quantidade()));
            if (it.idMarmita() == null) {
                // Monte sua marmita (tela 15): preço e macros recalculados a partir dos componentes do banco
                var calc = monte.calcular(MonteSuaMarmitaService.selecaoDe(it.personalizacao()));
                if (restaurante == null) {
                    restaurante = restaurantes.findById(calc.idRestaurante())
                            .filter(r -> r.getStatusAprovacao() == StatusAprovacao.APROVADO)
                            .orElseThrow(() -> new IllegalArgumentException("Restaurante indisponível"));
                    pedido = new Pedido(idUsuario, restaurante.getId());
                } else if (!restaurante.getId().equals(calc.idRestaurante())) {
                    throw new IllegalArgumentException("Cada pedido é de um restaurante só");
                }
                var extraMonte = new LinkedHashMap<String, Object>(calc.personalizacao());
                String obsMonte = limpar(it.observacao(), 200);
                if (obsMonte != null) extraMonte.put("observacao", obsMonte);
                var itemMonte = ItemPedido.personalizado(calc.nome(), qtd, calc.preco(), calc.calorias(), calc.proteinas(),
                        calc.carboidratos(), calc.gorduras(), paraJson(extraMonte));
                pedido.adicionarItem(itemMonte);
                fibras = fibras.add(calc.fibras().multiply(BigDecimal.valueOf(qtd)));
                itensPrevia.add(new ItemPrevia(null, calc.nome(), qtd, calc.preco(), itemMonte.getValorTotal(), calc.calorias() * qtd,
                        calc.proteinas().multiply(BigDecimal.valueOf(qtd)), calc.carboidratos().multiply(BigDecimal.valueOf(qtd)),
                        calc.gorduras().multiply(BigDecimal.valueOf(qtd))));
                continue;
            }
            var marmita = marmitas.findById(it.idMarmita())
                    .filter(Marmita::visivelNoMarketplace)
                    .orElseThrow(() -> new IllegalArgumentException("Um dos pratos do carrinho não está mais disponível"));
            if (restaurante == null) {
                restaurante = restaurantes.findById(marmita.getIdRestaurante())
                        .filter(r -> r.getStatusAprovacao() == StatusAprovacao.APROVADO)
                        .orElseThrow(() -> new IllegalArgumentException("Restaurante indisponível"));
                pedido = new Pedido(idUsuario, restaurante.getId());
            } else if (!restaurante.getId().equals(marmita.getIdRestaurante())) {
                throw new IllegalArgumentException("Cada pedido é de um restaurante só");
            }
            var item = ItemPedido.de(marmita, qtd);
            var extra = new LinkedHashMap<String, Object>();
            if (it.personalizacao() != null) extra.putAll(it.personalizacao());
            String obs = limpar(it.observacao(), 200);
            if (obs != null) extra.put("observacao", obs);
            if (!extra.isEmpty()) item.anotar(paraJson(extra));
            pedido.adicionarItem(item);
            if (marmita.getFibras() != null) fibras = fibras.add(marmita.getFibras().multiply(BigDecimal.valueOf(qtd)));
            itensPrevia.add(new ItemPrevia(marmita.getId(), marmita.getNome(), qtd, marmita.getPreco(), item.getValorTotal(),
                    item.getCalorias() * qtd, item.getProteinas().multiply(BigDecimal.valueOf(qtd)),
                    item.getCarboidratos().multiply(BigDecimal.valueOf(qtd)), item.getGorduras().multiply(BigDecimal.valueOf(qtd))));
        }

        BigDecimal soma = pedido.getItens().stream().map(ItemPedido::getValorTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal descontoTier = soma.subtract(CalculoFinanceiro.aplicarDescontoTier(soma, tier));

        // Cupom: percentual sobre o valor já com o desconto do plano, ou valor fixo
        CupomAplicado cupom = null;
        String erroCupom = null;
        UUID idCupom = null;
        BigDecimal valorCupom = BigDecimal.ZERO;
        if (req.cupom() != null && !req.cupom().isBlank()) {
            record C(UUID id, String codigo, String descricao, BigDecimal percentual, BigDecimal valorFixo, LocalDate validoAte, Integer usoMaximo, boolean ativo) {}
            var c = jdbc.sql("select id, codigo, descricao, percentual, valor_fixo, valido_ate, uso_maximo, ativo from cupom where upper(codigo) = upper(:c)")
                    .param("c", req.cupom().trim())
                    .query((rs, n) -> new C(rs.getObject("id", UUID.class), rs.getString("codigo"), rs.getString("descricao"), rs.getBigDecimal("percentual"),
                            rs.getBigDecimal("valor_fixo"), rs.getObject("valido_ate", LocalDate.class), (Integer) rs.getObject("uso_maximo"), rs.getBoolean("ativo")))
                    .optional().orElse(null);
            if (c == null || !c.ativo()) erroCupom = "Cupom inválido";
            else if (c.validoAte() != null && c.validoAte().isBefore(AcompanhamentoService.hoje())) erroCupom = "Este cupom expirou";
            else if (c.usoMaximo() != null && jdbc.sql("select count(*) from pedido where id_cupom = :c and status <> 'CANCELADO'")
                    .param("c", c.id()).query(Integer.class).single() >= c.usoMaximo()) erroCupom = "Este cupom já atingiu o limite de usos";
            else {
                BigDecimal base = soma.subtract(descontoTier);
                valorCupom = c.percentual() != null ? base.multiply(c.percentual()).divide(CEM, 2, RoundingMode.HALF_EVEN) : c.valorFixo().min(base);
                cupom = new CupomAplicado(c.codigo(), c.descricao(), c.percentual(), valorCupom);
                idCupom = c.id();
            }
        }

        pedido.fecharValores(tier, restaurante.getTaxaEntrega(), valorCupom, restaurante.getComissaoPercentual());
        boolean entregaGratis = pedido.getTaxaEntrega().signum() == 0 && restaurante.getTaxaEntrega().signum() > 0;
        BigDecimal minimo = restaurante.getPedidoMinimo() == null ? BigDecimal.ZERO : restaurante.getPedidoMinimo();
        var previa = new Previa(restaurante.getId(), restaurante.getNome(), itensPrevia,
                itensPrevia.stream().mapToInt(ItemPrevia::quantidade).sum(), pedido.getSubtotal(), tier.name(), tier.getDescontoPedidoPercentual(),
                descontoTier, cupom, erroCupom, pedido.getTaxaEntrega(), entregaGratis, pedido.getTotal(), minimo,
                pedido.getSubtotal().compareTo(minimo) < 0,
                itensPrevia.stream().mapToInt(ItemPrevia::calorias).sum(),
                itensPrevia.stream().map(ItemPrevia::proteinas).reduce(BigDecimal.ZERO, BigDecimal::add),
                itensPrevia.stream().map(ItemPrevia::carboidratos).reduce(BigDecimal.ZERO, BigDecimal::add),
                itensPrevia.stream().map(ItemPrevia::gorduras).reduce(BigDecimal.ZERO, BigDecimal::add),
                restaurante.getTempoEntregaMin(), restaurante.getTempoEntregaMax());
        return new Montagem(pedido, restaurante, idCupom, fibras, usuario.getNome(), previa);
    }

    private static String resumoItens(Pedido p) {
        var nomes = p.getItens().stream().map(i -> (i.getQuantidade() > 1 ? i.getQuantidade() + "× " : "") + i.getNome()).toList();
        return nomes.size() <= 2 ? String.join(" + ", nomes) : nomes.get(0) + " + " + (nomes.size() - 1) + " itens";
    }

    private static String limpar(String s, int max) {
        if (s == null || s.isBlank()) return null;
        var t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private String paraJson(Map<String, Object> m) {
        try { return json.writeValueAsString(m); } catch (Exception e) { return null; }
    }
}
