package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ClientesNutriService {
    public record Adesao(int pedidas, int planejadas, Integer percentual) {}
    public record ClienteLinha(UUID id, String nome, String avatarUrl, String tier, String objetivo, Integer idade,
                               BigDecimal pesoKg, BigDecimal alturaCm, Adesao adesao, OffsetDateTime ultimoPedido, String statusUltimoPedido) {}
    public record ItemPedido(String nome, int quantidade, String imagemUrl, int calorias, BigDecimal proteinas) {}
    public record PedidoCliente(UUID id, String codigo, String status, OffsetDateTime criadoEm, List<ItemPedido> itens) {}
    public record Medicao(UUID id, LocalDate data, BigDecimal pesoKg, BigDecimal gorduraPercentual, BigDecimal cinturaCm, String observacao) {}
    public record Metas(Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras, Integer fibras, Integer aguaMl) {}
    public record DiaAdesao(LocalDate data, int planejadas, int pedidas) {}
    public record Perfil(ClienteLinha cliente, String email, OffsetDateTime clienteDesde, String sexo, LocalDate dataNascimento,
                         List<String> restricoes, Metas metas, List<DiaAdesao> adesaoDias, List<PedidoCliente> pedidos, List<Medicao> medicoes) {}
    public record NovaMedicao(BigDecimal pesoKg, BigDecimal gorduraPercentual, BigDecimal cinturaCm, String observacao) {}

    private final JdbcClient jdbc;
    private final NutriContexto ctx;
    public ClientesNutriService(JdbcClient jdbc, NutriContexto ctx) { this.jdbc = jdbc; this.ctx = ctx; }

    public PaginaDto<ClienteLinha> listar(UUID idUsuario, String busca, String tier, String objetivo, String ordem, int pagina, int tamanho) {
        var nutri = ctx.atual(idUsuario).id();
        if (pagina < 0 || tamanho < 1 || tamanho > 100) throw new IllegalArgumentException("Parâmetros de paginação inválidos");
        if (ordem == null || !List.of("nome", "adesao", "recentes").contains(ordem)) throw new IllegalArgumentException("Ordenação inválida");
        var filtro = " from perfil_cliente pc join usuario u on u.id=pc.id_usuario where pc.id_nutricionista=:n " +
                "and (cast(:busca as text) is null or lower(u.nome) like lower(cast(:like as text)) or lower(replace(pc.objetivo_nutricional::text,'_',' ')) like lower(cast(:like as text))) " +
                "and (cast(:tier as text) is null or u.id_tier=cast(:tier as text)) and (cast(:objetivo as text) is null or pc.objetivo_nutricional::text=cast(:objetivo as text))";
        long total = jdbc.sql("select count(*)" + filtro).param("n", nutri).param("busca", vazio(busca)).param("like", "%" + (vazio(busca) == null ? "" : busca.trim()) + "%")
                .param("tier", vazio(tier)).param("objetivo", vazio(objetivo)).query(Long.class).single();
        String sort = switch (ordem) { case "adesao" -> "adesao_pct asc nulls last, u.nome"; case "recentes" -> "ultimo_pedido desc nulls last, u.nome"; default -> "u.nome"; };
        var joins = " from perfil_cliente pc join usuario u on u.id=pc.id_usuario " +
                "left join lateral (select count(*) planejadas,count(*) filter(where exists(select 1 from pedido pe join item_pedido ip on ip.id_pedido=pe.id " +
                "where pe.id_usuario=pc.id_usuario and pe.criado_em::date between current_date-6 and current_date and pe.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE') " +
                "and ip.id_marmita=rp.id_marmita and pe.criado_em::date=(current_date-((extract(dow from current_date)::int-rp.dia_semana+7)%7)))) pedidas " +
                "from plano_alimentar pa join refeicao_plano rp on rp.id_plano_alimentar=pa.id where pa.id_usuario=pc.id_usuario and pa.id_nutricionista=:n and pa.ativo " +
                "and (current_date-((extract(dow from current_date)::int-rp.dia_semana+7)%7)) between greatest(current_date-6,pa.semana_inicio) and current_date) a on true " +
                "left join lateral (select criado_em ultimo_pedido,status from pedido where id_usuario=pc.id_usuario order by criado_em desc limit 1) p on true ";
        var filtroLista = " where pc.id_nutricionista=:n and (cast(:busca as text) is null or lower(u.nome) like lower(cast(:like as text)) or lower(replace(pc.objetivo_nutricional::text,'_',' ')) like lower(cast(:like as text))) " +
                "and (cast(:tier as text) is null or u.id_tier=cast(:tier as text)) and (cast(:objetivo as text) is null or pc.objetivo_nutricional::text=cast(:objetivo as text))";
        var sql = "select u.id,u.nome,u.avatar_url,u.id_tier,pc.objetivo_nutricional,pc.data_nascimento,pc.peso_kg,pc.altura_cm," +
                "coalesce(a.pedidas,0) pedidas,coalesce(a.planejadas,0) planejadas,case when coalesce(a.planejadas,0)=0 then null else round(a.pedidas*100.0/a.planejadas)::int end adesao_pct,"+
                "p.ultimo_pedido,p.status status_ultimo " + joins + filtroLista + " order by " + sort + " limit :limite offset :offset";
        var itens = jdbc.sql(sql).param("n", nutri).param("busca", vazio(busca)).param("like", "%" + (vazio(busca) == null ? "" : busca.trim()) + "%")
                .param("tier", vazio(tier)).param("objetivo", vazio(objetivo)).param("limite", tamanho).param("offset", pagina*tamanho)
                .query((rs, i) -> new ClienteLinha(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("avatar_url"), rs.getString("id_tier"),
                        rs.getString("objetivo_nutricional"), idade(rs.getObject("data_nascimento", LocalDate.class)), rs.getBigDecimal("peso_kg"), rs.getBigDecimal("altura_cm"),
                        new Adesao(rs.getInt("pedidas"), rs.getInt("planejadas"), (Integer)rs.getObject("adesao_pct")), rs.getObject("ultimo_pedido", OffsetDateTime.class), rs.getString("status_ultimo"))).list();
        return new PaginaDto<>(itens, pagina, (int)Math.ceil(total/(double)tamanho), total);
    }

    public Perfil perfil(UUID idUsuario, UUID idCliente) {
        UUID n = ctx.atual(idUsuario).id(); ctx.exigirCliente(n, idCliente);
        var dados = jdbc.sql("select u.id,u.nome,u.email,u.avatar_url,u.id_tier,u.criado_em,pc.objetivo_nutricional,pc.data_nascimento,pc.peso_kg,pc.altura_cm,pc.sexo,pc.meta_calorias,pc.meta_proteinas,pc.meta_carboidratos,pc.meta_gorduras,pc.meta_fibras,pc.meta_agua_ml from usuario u join perfil_cliente pc on pc.id_usuario=u.id where u.id=:c")
                .param("c", idCliente).query((rs,i)->new Object[]{new ClienteLinha(idCliente,rs.getString("nome"),rs.getString("avatar_url"),rs.getString("id_tier"),rs.getString("objetivo_nutricional"),idade(rs.getObject("data_nascimento",LocalDate.class)),rs.getBigDecimal("peso_kg"),rs.getBigDecimal("altura_cm"),adesaoAtual(idCliente,n),ultimoPedidoData(idCliente),ultimoPedidoStatus(idCliente)),rs.getString("email"),rs.getObject("criado_em",OffsetDateTime.class),rs.getString("sexo"),rs.getObject("data_nascimento",LocalDate.class),new Metas((Integer)rs.getObject("meta_calorias"),(Integer)rs.getObject("meta_proteinas"),(Integer)rs.getObject("meta_carboidratos"),(Integer)rs.getObject("meta_gorduras"),(Integer)rs.getObject("meta_fibras"),(Integer)rs.getObject("meta_agua_ml"))}).optional().orElseThrow(()->new RecursoNaoEncontradoException("CLIENTE","Cliente não encontrado"));
        @SuppressWarnings("unchecked") var linha=(ClienteLinha)dados[0];
        var restricoes=jdbc.sql("select r.nome from cliente_restricao cr join restricao_alimentar r on r.id=cr.id_restricao where cr.id_usuario=:c order by r.nome").param("c",idCliente).query(String.class).list();
        return new Perfil(linha,(String)dados[1],(OffsetDateTime)dados[2],(String)dados[3],(LocalDate)dados[4],restricoes,(Metas)dados[5],dias(idCliente,n),pedidos(idCliente),medicoes(idCliente));
    }
    public List<PedidoCliente> listarPedidos(UUID idUsuario, UUID idCliente) { UUID n=ctx.atual(idUsuario).id();ctx.exigirCliente(n,idCliente);return pedidos(idCliente); }
    @Transactional public Medicao registrar(UUID idUsuario, UUID idCliente, NovaMedicao req) {
        UUID n=ctx.atual(idUsuario).id();ctx.exigirCliente(n,idCliente);
        if(req==null||req.pesoKg()==null||req.pesoKg().compareTo(BigDecimal.valueOf(20))<0||req.pesoKg().compareTo(BigDecimal.valueOf(400))>0) throw new IllegalArgumentException("O peso deve estar entre 20 e 400 kg");
        if(req.gorduraPercentual()!=null&&(req.gorduraPercentual().compareTo(BigDecimal.valueOf(2))<0||req.gorduraPercentual().compareTo(BigDecimal.valueOf(70))>0))throw new IllegalArgumentException("A gordura corporal deve estar entre 2% e 70%");
        var id=jdbc.sql("insert into medicao(id_usuario,id_nutricionista,peso_kg,gordura_percentual,cintura_cm,observacao) values(:c,:n,:p,:g,:ci,:o) returning id,data")
                .param("c",idCliente).param("n",n).param("p",req.pesoKg()).param("g",req.gorduraPercentual()).param("ci",req.cinturaCm()).param("o",vazio(req.observacao())).query((rs,i)->new Object[]{rs.getObject(1,UUID.class),rs.getObject(2,LocalDate.class)}).single();
        return new Medicao((UUID)id[0],(LocalDate)id[1],req.pesoKg(),req.gorduraPercentual(),req.cinturaCm(),vazio(req.observacao()));
    }
    private Adesao adesaoAtual(UUID c,UUID n){var x=jdbc.sql("select count(*) planejadas,count(*) filter(where exists(select 1 from pedido p join item_pedido i on i.id_pedido=p.id where p.id_usuario=:c and p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE') and i.id_marmita=r.id_marmita and p.criado_em::date=current_date-((extract(dow from current_date)::int-r.dia_semana+7)%7))) pedidas from plano_alimentar a join refeicao_plano r on r.id_plano_alimentar=a.id where a.id_usuario=:c and a.id_nutricionista=:n and a.ativo and current_date-((extract(dow from current_date)::int-r.dia_semana+7)%7) between greatest(current_date-6,a.semana_inicio) and current_date").param("c",c).param("n",n).query((rs,i)->new Adesao(rs.getInt("pedidas"),rs.getInt("planejadas"),CalculoAdesao.percentual(rs.getInt("pedidas"),rs.getInt("planejadas")))).single();return x;}
    private OffsetDateTime ultimoPedidoData(UUID c){return jdbc.sql("select criado_em from pedido where id_usuario=:c order by criado_em desc limit 1").param("c",c).query(OffsetDateTime.class).optional().orElse(null);}
    private String ultimoPedidoStatus(UUID c){return jdbc.sql("select status::text from pedido where id_usuario=:c order by criado_em desc limit 1").param("c",c).query(String.class).optional().orElse(null);}
    private List<DiaAdesao> dias(UUID c,UUID n){return jdbc.sql("select d::date data,count(r.id) planejadas,count(r.id) filter(where exists(select 1 from pedido p join item_pedido i on i.id_pedido=p.id where p.id_usuario=:c and p.status in ('NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE') and i.id_marmita=r.id_marmita and p.criado_em::date=d::date)) pedidas from generate_series(current_date-6,current_date,interval '1 day') d left join plano_alimentar a on a.id_usuario=:c and a.id_nutricionista=:n and a.ativo and d::date>=a.semana_inicio left join refeicao_plano r on r.id_plano_alimentar=a.id and r.dia_semana=extract(dow from d)::int group by d order by d").param("c",c).param("n",n).query((rs,i)->new DiaAdesao(rs.getObject("data",LocalDate.class),rs.getInt("planejadas"),rs.getInt("pedidas"))).list();}
    private List<PedidoCliente> pedidos(UUID c){var pedidos=jdbc.sql("select id,codigo,status::text,criado_em from pedido where id_usuario=:c order by criado_em desc").param("c",c).query((rs,i)->new PedidoCliente(rs.getObject("id",UUID.class),rs.getString("codigo"),rs.getString("status"),rs.getObject("criado_em",OffsetDateTime.class),List.of())).list();return pedidos.stream().map(p->new PedidoCliente(p.id(),p.codigo(),p.status(),p.criadoEm(),jdbc.sql("select i.nome,i.quantidade,m.imagem_url,i.calorias,i.proteinas from item_pedido i left join marmita m on m.id=i.id_marmita where i.id_pedido=:p order by i.id").param("p",p.id()).query((rs,i)->new ItemPedido(rs.getString("nome"),rs.getInt("quantidade"),rs.getString("imagem_url"),rs.getInt("calorias"),rs.getBigDecimal("proteinas"))).list())).toList();}
    private List<Medicao> medicoes(UUID c){return jdbc.sql("select id,data,peso_kg,gordura_percentual,cintura_cm,observacao from medicao where id_usuario=:c order by data desc,criado_em desc limit 30").param("c",c).query((rs,i)->new Medicao(rs.getObject("id",UUID.class),rs.getObject("data",LocalDate.class),rs.getBigDecimal("peso_kg"),rs.getBigDecimal("gordura_percentual"),rs.getBigDecimal("cintura_cm"),rs.getString("observacao"))).list();}
    private static Integer idade(LocalDate d){return d==null?null:java.time.Period.between(d,LocalDate.now()).getYears();}
    private static String vazio(String s){return s==null||s.isBlank()?null:s.trim();}
}
