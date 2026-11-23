package com.tricode.cleaneats.service.nutri;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tricode.cleaneats.domain.CalculoFinanceiro;
import com.tricode.cleaneats.service.SupabaseServicoClient;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.*;

/** Dados das telas 26, 34 e 35 do painel da nutricionista. */
@Service
public class PainelNutriService {
    public record Indicador(String titulo, String valor, String detalhe) {}
    public record LinhaDashboard(UUID id, String nome, String resumo, OffsetDateTime data, String tipo, String avatarUrl) {}
    public record Dashboard(String nome, String statusAprovacao, String motivoRejeicao, List<Indicador> indicadores,
                            List<LinhaDashboard> triagens, List<LinhaDashboard> mensagens, List<LinhaDashboard> clientes) {}
    public record Assinante(UUID id, String nome, String tier, BigDecimal mensalidade, BigDecimal repasse, OffsetDateTime inicioEm, String status) {}
    public record MesFinanceiro(String mes, BigDecimal bruto, BigDecimal liquido) {}
    public record Financeiro(BigDecimal bruto, BigDecimal liquido, long clientesPagantes, BigDecimal ticketMedio,
                             List<MesFinanceiro> meses, List<Assinante> assinantes, String chavePix) {}
    public record Horario(int dia, String inicio, String fim) {}
    public record Perfil(String nome, String email, String telefone, String crn, String crnUf, String statusAprovacao,
                         String motivoRejeicao, String bio, List<String> especialidades, Integer anosExperiencia,
                         List<Horario> disponibilidade, Integer maxClientes, String chavePix, String assinaturaDigitalUrl) {}
    public record PerfilEdicao(String nome, String telefone, String bio, List<String> especialidades,
                               Integer anosExperiencia, List<Horario> disponibilidade, Integer maxClientes, String chavePix) {}

    private final JdbcClient jdbc;
    private final NutriContexto contexto;
    private final ObjectMapper json;
    private final SupabaseServicoClient storage;

    public PainelNutriService(JdbcClient jdbc, NutriContexto contexto, ObjectMapper json, SupabaseServicoClient storage) {
        this.jdbc = jdbc; this.contexto = contexto; this.json = json; this.storage = storage;
    }

    public Dashboard dashboard(UUID idUsuario) {
        var n = contexto.atual(idUsuario);
        long ativos = jdbc.sql("select count(*) from perfil_cliente where id_nutricionista=:n")
                .param("n", n.id()).query(Long.class).single();
        long triagensAguardando = jdbc.sql("select count(*) from triagem where id_nutricionista=:n and status='AGUARDANDO'")
                .param("n", n.id()).query(Long.class).single();
        long naoLidas = jdbc.sql("select count(*) from mensagem m join conversa c on c.id=m.id_conversa where c.id_nutricionista=:n and m.id_autor<>:u and m.lida_em is null")
                .param("n", n.id()).param("u", n.idUsuario()).query(Long.class).single();
        var adesao = jdbc.sql("""
                select coalesce(sum(x.pedidas),0) as pedidas, coalesce(sum(x.planejadas),0) as planejadas
                from (select p.id_usuario,
                         (select count(*) from item_pedido ip join pedido pe on pe.id=ip.id_pedido
                           where pe.id_usuario=p.id_usuario and pe.criado_em >= current_date-6 and pe.status not in ('CANCELADO','RECUSADO')
                             and ip.id_marmita in (select rp.id_marmita from refeicao_plano rp where rp.id_plano_alimentar=p.id)) as pedidas,
                         (select count(*) from refeicao_plano rp where rp.id_plano_alimentar=p.id) as planejadas
                      from plano_alimentar p join perfil_cliente pc on pc.id_usuario=p.id_usuario
                      where p.ativo and p.id_nutricionista=:n and pc.id_nutricionista=:n) x
                """).param("n", n.id()).query((rs,i)->new long[]{rs.getLong("pedidas"),rs.getLong("planejadas")}).single();
        String adesaoValor = adesao[1] == 0 ? "—" : BigDecimal.valueOf(adesao[0] * 100).divide(BigDecimal.valueOf(adesao[1]), 0, RoundingMode.HALF_UP) + "%";
        var recentesTriagens = jdbc.sql("""
                select t.id,u.nome,t.criado_em,t.status,u.avatar_url from triagem t join usuario u on u.id=t.id_cliente
                where t.id_nutricionista=:n order by t.criado_em desc limit 5
                """).param("n",n.id()).query((rs,i)->new LinhaDashboard(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("status"),rs.getObject("criado_em",OffsetDateTime.class),"TRIAGEM",rs.getString("avatar_url"))).list();
        var mensagens = jdbc.sql("""
                select m.id,u.nome,m.texto,m.criado_em,u.avatar_url from mensagem m join conversa c on c.id=m.id_conversa
                join usuario u on u.id=m.id_autor where c.id_nutricionista=:n and m.id_autor<>:u
                order by m.criado_em desc limit 5
                """).param("n",n.id()).param("u",n.idUsuario()).query((rs,i)->new LinhaDashboard(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("texto"),rs.getObject("criado_em",OffsetDateTime.class),"MENSAGEM",rs.getString("avatar_url"))).list();
        var clientes = jdbc.sql("""
                select u.id,u.nome,u.avatar_url,coalesce(a.tier,'FREE') tier from perfil_cliente pc join usuario u on u.id=pc.id_usuario
                left join lateral (select t.nome tier from assinatura s join tier t on t.id=s.id_tier where s.id_usuario=u.id and s.status in ('ATIVA','TRIAL') order by s.criado_em desc limit 1) a on true
                where pc.id_nutricionista=:n order by u.nome limit 5
                """).param("n",n.id()).query((rs,i)->new LinhaDashboard(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("tier"),null,"CLIENTE",rs.getString("avatar_url"))).list();
        return new Dashboard(n.nome(),n.statusAprovacao(),n.motivoRejeicao(),List.of(
                new Indicador("Clientes ativos",Long.toString(ativos),"Vinculados ao seu perfil"),
                new Indicador("Triagens aguardando",Long.toString(triagensAguardando),"Atendimentos pendentes"),
                new Indicador("Mensagens não lidas",Long.toString(naoLidas),"Mensagens de clientes"),
                new Indicador("Adesão média",adesaoValor,"Últimos 7 dias")), recentesTriagens,mensagens,clientes);
    }

    public Financeiro financeiro(UUID idUsuario) {
        var n=contexto.atual(idUsuario);
        var assinantes=jdbc.sql("""
                select u.id,u.nome,t.nome tier,case when s.ciclo='ANUAL' then s.valor/12 else s.valor end mensalidade,s.inicio_em,s.status
                from perfil_cliente pc join assinatura s on s.id_usuario=pc.id_usuario join tier t on t.id=s.id_tier join usuario u on u.id=pc.id_usuario
                where pc.id_nutricionista=:n and s.id_tier in ('PRO','PREMIUM') and s.status='ATIVA' and (s.encerra_em is null or s.encerra_em>=now()) order by u.nome
                """).param("n",n.id()).query((rs,i)->{
                    var mensalidade=rs.getBigDecimal("mensalidade");
                    return new Assinante(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("tier"),mensalidade,
                            CalculoFinanceiro.calcularRepasseNutricionista(mensalidade),rs.getObject("inicio_em",OffsetDateTime.class),rs.getString("status"));
                }).list();
        var bruto=assinantes.stream().map(Assinante::mensalidade).reduce(BigDecimal.ZERO,BigDecimal::add).setScale(2,RoundingMode.HALF_EVEN);
        var liquido=assinantes.stream().map(a->CalculoFinanceiro.calcularRepasseNutricionista(a.mensalidade())).reduce(BigDecimal.ZERO,BigDecimal::add).setScale(2,RoundingMode.HALF_EVEN);
        var meses=new ArrayList<MesFinanceiro>();
        for(int i=5;i>=0;i--){ YearMonth ym=YearMonth.now().minusMonths(i); var inicio=ym.atDay(1); var fim=ym.plusMonths(1).atDay(1);
            var total=jdbc.sql("""
                    select coalesce(sum(case when s.ciclo='ANUAL' then f.valor/12 else f.valor end),0)
                    from fatura f join assinatura s on s.id=f.id_assinatura join tier t on t.id=s.id_tier
                    join perfil_cliente pc on pc.id_usuario=s.id_usuario
                    where pc.id_nutricionista=:n and s.id_tier in ('PRO','PREMIUM') and f.status='PAGA'
                      and f.paga_em >= :inicio and f.paga_em < :fim
                    """).param("n",n.id()).param("inicio",inicio.atStartOfDay().atOffset(java.time.ZoneOffset.UTC))
                    .param("fim",fim.atStartOfDay().atOffset(java.time.ZoneOffset.UTC)).query(BigDecimal.class).single();
            meses.add(new MesFinanceiro(ym.toString(),total,CalculoFinanceiro.calcularRepasseNutricionista(total)));
        }
        var media=assinantes.isEmpty()?BigDecimal.ZERO:bruto.divide(BigDecimal.valueOf(assinantes.size()),2,RoundingMode.HALF_EVEN);
        String pix=jdbc.sql("select chave_pix from nutricionista where id=:n").param("n",n.id()).query(String.class).optional().orElse(null);
        return new Financeiro(bruto,liquido,assinantes.size(),media,meses,assinantes,pix);
    }

    public byte[] csv(UUID idUsuario) {
        var f=financeiro(idUsuario); var linhas=new StringBuilder("Cliente;Plano;Mensalidade;Repasse 60%;Início;Status\n");
        for(var a:f.assinantes()) linhas.append(csvCampo(a.nome())).append(';').append(a.tier()).append(';').append(a.mensalidade()).append(';')
                .append(a.repasse()).append(';').append(a.inicioEm().toLocalDate()).append(';').append(a.status()).append('\n');
        return linhas.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
    private static String csvCampo(String valor){return "\""+valor.replace("\"","\"\"")+"\"";}

    public Perfil perfil(UUID idUsuario) {
        var n=contexto.atual(idUsuario);
        return jdbc.sql("""
                select u.nome,u.email,u.telefone,n.bio,n.especialidades,n.anos_experiencia,n.disponibilidade::text disponibilidade,
                       n.max_clientes,n.chave_pix,n.assinatura_digital_url
                from nutricionista n join usuario u on u.id=n.id_usuario where n.id=:n
                """).param("n",n.id()).query((rs,i)->new Perfil(rs.getString("nome"),rs.getString("email"),rs.getString("telefone"),n.crn(),n.crnUf(),n.statusAprovacao(),n.motivoRejeicao(),rs.getString("bio"),
                textos(rs.getArray("especialidades")),(Integer)rs.getObject("anos_experiencia"),horarios(rs.getString("disponibilidade")),(Integer)rs.getObject("max_clientes"),rs.getString("chave_pix"),rs.getString("assinatura_digital_url"))).single();
    }

    @Transactional
    public Perfil salvarPerfil(UUID idUsuario, PerfilEdicao f) {
        validarPerfil(f); var n=contexto.atual(idUsuario); String disp;
        var especialidades=f.especialidades().stream().filter(Objects::nonNull).map(String::trim).filter(s->!s.isEmpty()).distinct().toList();
        try { disp=json.writeValueAsString(f.disponibilidade()==null?List.of():f.disponibilidade()); }
        catch(JsonProcessingException e){throw new IllegalArgumentException("Revise os horários de disponibilidade");}
        jdbc.sql("update usuario set nome=:nome,telefone=:telefone,atualizado_em=now() where id=:u")
                .param("nome",f.nome().trim()).param("telefone",vazio(f.telefone())).param("u",n.idUsuario()).update();
        jdbc.sql("update nutricionista set bio=:bio,especialidades=cast(:esp as text[]),anos_experiencia=:anos,disponibilidade=cast(:disp as jsonb),max_clientes=:max,chave_pix=:pix where id=:n")
                .param("bio",vazio(f.bio())).param("esp",arrayPg(especialidades)).param("anos",f.anosExperiencia()).param("disp",disp).param("max",f.maxClientes()).param("pix",vazio(f.chavePix())).param("n",n.id()).update();
        return perfil(idUsuario);
    }
    public String enviarAssinatura(UUID idUsuario, MultipartFile arquivo){var n=contexto.atual(idUsuario);String url=storage.enviarImagem("avatares","assinaturas/"+n.id(),arquivo);jdbc.sql("update nutricionista set assinatura_digital_url=:url where id=:n").param("url",url).param("n",n.id()).update();return url;}
    static void validarPerfil(PerfilEdicao f){
        if(f==null||f.nome()==null||f.nome().isBlank())throw new IllegalArgumentException("Informe seu nome completo");
        if(f.bio()!=null&&f.bio().length()>600)throw new IllegalArgumentException("A bio pode ter no máximo 600 caracteres");
        if(f.especialidades()==null||f.especialidades().stream().filter(Objects::nonNull).map(String::trim).filter(s->!s.isEmpty()).toList().isEmpty())throw new IllegalArgumentException("Informe ao menos uma especialidade");
        if(f.anosExperiencia()!=null&&(f.anosExperiencia()<0||f.anosExperiencia()>70))throw new IllegalArgumentException("Informe um tempo de experiência válido");
        if(f.maxClientes()!=null&&(f.maxClientes()<1||f.maxClientes()>500))throw new IllegalArgumentException("O limite de clientes deve estar entre 1 e 500");
        if(f.disponibilidade()!=null&&f.disponibilidade().stream().anyMatch(h->h==null||h.dia()<0||h.dia()>6||h.inicio()==null||h.fim()==null))throw new IllegalArgumentException("Revise os horários de disponibilidade");
    }
    private List<Horario> horarios(String value){try{return json.readValue(value,new TypeReference<>(){});}catch(Exception e){return List.of();}}
    private static String arrayPg(List<String> valores){return "{"+valores.stream().map(v->"\""+v.replace("\\","\\\\").replace("\"","\\\"")+"\"").reduce((a,b)->a+","+b).orElse("") +"}";}
    private static List<String> textos(java.sql.Array array){try{return array==null?List.of():Arrays.asList((String[])array.getArray());}catch(Exception e){return List.of();}}
    private static String vazio(String s){return s==null||s.isBlank()?null:s.trim();}
}
