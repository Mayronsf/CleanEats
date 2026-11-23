package com.tricode.cleaneats.service.nutri;

import com.tricode.cleaneats.dto.PaginaDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class PrescricaoService {
    public record ClienteElegivel(UUID id, String nome, String email, String tier, BigDecimal pesoKg, BigDecimal alturaCm,
                                  String objetivo, Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras,
                                  Integer fibras, Integer aguaMl, boolean premium) {}
    public record Refeicao(String dia, String tipo, String prato, String observacao) {}
    public record Previa(UUID idCliente, String nomeCliente, String email, String tier, BigDecimal pesoKg, BigDecimal alturaCm,
                         String objetivo, Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras,
                         Integer fibras, Integer aguaMl, boolean premium, boolean planoAtivo, String nomeNutri, String crn,
                         List<Refeicao> refeicoes) {}
    public record Linha(UUID id, String nomeCliente, String tier, OffsetDateTime emitidaEm, String hashDocumento,
                        boolean enviadaEmail) {}
    public record Emissao(UUID id, String pdfUrl, String hashDocumento, boolean emailEnviado, String mensagem) {}
    public record Download(String url) {}

    private final JdbcClient jdbc; private final NutriContexto contexto; private final EmailService email;
    private final String supabaseUrl, chave; private final RestClient http;
    public PrescricaoService(JdbcClient jdbc, NutriContexto contexto, EmailService email,
                             @Value("${cleaneats.supabase.url}") String supabaseUrl,
                             @Value("${cleaneats.supabase-servico.service-role-key:}") String chave) {
        this.jdbc=jdbc; this.contexto=contexto; this.email=email; this.supabaseUrl=supabaseUrl.replaceAll("/$", ""); this.chave=chave;
        this.http=RestClient.builder().baseUrl(this.supabaseUrl).defaultHeader("apikey", chave).defaultHeader("Authorization", "Bearer "+chave).build();
    }

    public PaginaDto<Linha> listar(UUID idUsuario, int pagina, int tamanho) {
        var n=contexto.atual(idUsuario); var p=Math.max(0,pagina); var t=Math.min(50,Math.max(1,tamanho));
        long total=jdbc.sql("select count(*) from prescricao where id_nutricionista=:n").param("n",n.id()).query(Long.class).single();
        var itens=jdbc.sql("""
                select p.id,u.nome,u.id_tier,p.emitida_em,p.hash_documento,p.enviada_email_em
                from prescricao p join usuario u on u.id=p.id_cliente where p.id_nutricionista=:n
                order by p.emitida_em desc limit :lim offset :off""").param("n",n.id()).param("lim",t).param("off",p*t)
                .query((rs,i)->new Linha(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("id_tier"),
                        rs.getObject("emitida_em",OffsetDateTime.class),rs.getString("hash_documento"),rs.getObject("enviada_email_em",OffsetDateTime.class)!=null)).list();
        return new PaginaDto<>(itens,p,(int)Math.ceil(total/(double)t),total);
    }

    public List<ClienteElegivel> clientes(UUID idUsuario) {
        var n=contexto.atual(idUsuario);
        return jdbc.sql("""
                select u.id,u.nome,u.email,u.id_tier,p.peso_kg,p.altura_cm,p.objetivo_nutricional,
                coalesce(p.meta_calorias,pl.meta_calorias) calorias,coalesce(p.meta_proteinas,pl.meta_proteinas) proteinas,
                coalesce(p.meta_carboidratos,pl.meta_carboidratos) carboidratos,coalesce(p.meta_gorduras,pl.meta_gorduras) gorduras,
                coalesce(p.meta_fibras,pl.meta_fibras) fibras,coalesce(p.meta_agua_ml,pl.meta_agua_ml) agua_ml
                from perfil_cliente p join usuario u on u.id=p.id_usuario left join plano_alimentar pl on pl.id_usuario=u.id and pl.ativo
                where p.id_nutricionista=:n order by u.nome""").param("n",n.id()).query((rs,i)->new ClienteElegivel(rs.getObject("id",UUID.class),rs.getString("nome"),rs.getString("email"),
                rs.getString("id_tier"),rs.getBigDecimal("peso_kg"),rs.getBigDecimal("altura_cm"),rs.getString("objetivo_nutricional"),
                (Integer)rs.getObject("calorias"),(Integer)rs.getObject("proteinas"),(Integer)rs.getObject("carboidratos"),
                (Integer)rs.getObject("gorduras"),(Integer)rs.getObject("fibras"),(Integer)rs.getObject("agua_ml"),"PREMIUM".equals(rs.getString("id_tier")))).list();
    }

    public Previa previa(UUID idUsuario, UUID idCliente) {
        if(idCliente==null) throw new IllegalArgumentException("Selecione um cliente para a prescrição.");
        var n=contexto.atual(idUsuario); contexto.exigirCliente(n.id(),idCliente);
        var c=jdbc.sql("""
                select u.id,u.nome,u.email,u.id_tier,p.peso_kg,p.altura_cm,p.objetivo_nutricional,
                coalesce(p.meta_calorias,pl.meta_calorias) calorias,coalesce(p.meta_proteinas,pl.meta_proteinas) proteinas,
                coalesce(p.meta_carboidratos,pl.meta_carboidratos) carboidratos,coalesce(p.meta_gorduras,pl.meta_gorduras) gorduras,
                coalesce(p.meta_fibras,pl.meta_fibras) fibras,coalesce(p.meta_agua_ml,pl.meta_agua_ml) agua_ml,pl.id plano
                from usuario u join perfil_cliente p on p.id_usuario=u.id left join plano_alimentar pl on pl.id_usuario=u.id and pl.ativo where u.id=:c""")
                .param("c",idCliente).query((rs,i)->new Object[]{rs.getString("nome"),rs.getString("email"),rs.getString("id_tier"),rs.getBigDecimal("peso_kg"),rs.getBigDecimal("altura_cm"),rs.getString("objetivo_nutricional"),(Integer)rs.getObject("calorias"),(Integer)rs.getObject("proteinas"),(Integer)rs.getObject("carboidratos"),(Integer)rs.getObject("gorduras"),(Integer)rs.getObject("fibras"),(Integer)rs.getObject("agua_ml"),rs.getObject("plano",UUID.class)}).single();
        UUID plano=(UUID)c[12]; List<Refeicao> refeicoes=plano==null?List.of():jdbc.sql("""
                select r.dia_semana,r.tipo_refeicao,m.nome,r.observacao from refeicao_plano r join marmita m on m.id=r.id_marmita where r.id_plano_alimentar=:p order by (r.dia_semana+6)%7, array_position(array['CAFE_DA_MANHA','LANCHE_MANHA','ALMOCO','LANCHE_TARDE','JANTAR','CEIA']::text[], r.tipo_refeicao::text)""").param("p",plano).query((rs,i)->new Refeicao(dia(rs.getInt(1)),refeicao(rs.getString(2)),rs.getString(3),rs.getString(4))).list();
        return new Previa(idCliente,(String)c[0],(String)c[1],(String)c[2],(BigDecimal)c[3],(BigDecimal)c[4],(String)c[5],(Integer)c[6],(Integer)c[7],(Integer)c[8],(Integer)c[9],(Integer)c[10],(Integer)c[11],"PREMIUM".equals(c[2]),plano!=null,n.nome(),n.crn(),refeicoes);
    }

    @Transactional
    public Emissao emitir(UUID idUsuario, UUID idCliente, String observacoes) {
        var n=contexto.atual(idUsuario); contexto.exigirCliente(n.id(),idCliente); var previa=previa(idUsuario,idCliente);
        validarElegibilidade(previa.premium(), previa.planoAtivo());
        if(observacoes!=null && observacoes.length()>4000) throw new IllegalArgumentException("As observações podem ter no máximo 4.000 caracteres");
        var planoId=jdbc.sql("select id from plano_alimentar where id_usuario=:c and ativo").param("c",idCliente).query(UUID.class).single();
        var imagem=baixarAssinatura(n.assinaturaDigitalUrl());
        String metas=String.format("Calorias: %s kcal; proteínas: %s g; carboidratos: %s g; gorduras: %s g; fibras: %s g; água: %s ml.",v(previa.calorias()),v(previa.proteinas()),v(previa.carboidratos()),v(previa.gorduras()),v(previa.fibras()),v(previa.aguaMl()));
        String refeicoes=previa.refeicoes().stream().map(r->r.dia()+" · "+r.tipo()+": "+r.prato()+(r.observacao()==null?"":" — "+r.observacao())).reduce("",(a,b)->a+b+"\n");
        if(observacoes!=null&&!observacoes.isBlank()) refeicoes+="\nObservações: "+observacoes.trim();
        var pdf=PrescricaoPdf.gerar(previa.nomeCliente(),n.nome(),n.crn(),metas,refeicoes,imagem); var hash=PrescricaoPdf.sha256(pdf);
        exigirStorage(); var caminho="nutricionistas/"+n.id()+"/"+UUID.randomUUID()+".pdf";
        http.post().uri("/storage/v1/object/prescricoes/"+caminho).header("x-upsert","false").header("cache-control","no-store").contentType(org.springframework.http.MediaType.APPLICATION_PDF).body(pdf).retrieve().toBodilessEntity();
        var id=UUID.randomUUID(); jdbc.sql("insert into prescricao(id,id_plano_alimentar,id_nutricionista,id_cliente,pdf_url,hash_documento) values (:id,:p,:n,:c,:url,:h)")
                .param("id",id).param("p",planoId).param("n",n.id()).param("c",idCliente).param("url",caminho).param("h",hash).update();
        boolean enviado=email.enviar(previa.email(),previa.nomeCliente(),pdf);
        if(enviado) jdbc.sql("update prescricao set enviada_email_em=now() where id=:id").param("id",id).update();
        return new Emissao(id,assinar(caminho),hash,enviado,enviado?"Prescrição emitida e enviada por e-mail.":"Prescrição emitida. E-mail não configurado; baixe o PDF para compartilhar.");
    }

    public Download pdf(UUID idUsuario,UUID id) {
        var n=contexto.atual(idUsuario); var caminho=jdbc.sql("select pdf_url from prescricao where id=:id and id_nutricionista=:n").param("id",id).param("n",n.id()).query(String.class).optional().orElseThrow(()->new com.tricode.cleaneats.service.RecursoNaoEncontradoException("PRESCRICAO","Prescrição não encontrada"));
        return new Download(assinar(caminho));
    }
    private String assinar(String caminho){ exigirStorage(); var resposta=http.post().uri("/storage/v1/object/sign/prescricoes/"+caminho).body(Map.of("expiresIn",3600)).retrieve().body(Map.class); var caminhoUrl=(String)resposta.get("signedURL"); return caminhoUrl.startsWith("http")?caminhoUrl:supabaseUrl+"/storage/v1"+caminhoUrl; }
    private void exigirStorage(){if(chave==null||chave.isBlank())throw new IllegalStateException("Storage de prescrições não configurado no backend.");}
    private byte[] baixarAssinatura(String url){if(url==null||url.isBlank())return null;try{return RestClient.create().get().uri(URI.create(url)).retrieve().body(byte[].class);}catch(Exception ignored){return null;}}
    private static String v(Object x){return x==null?"não informado":x.toString();}
    /** Nome da refeição como aparece no app (tipo_refeicao do banco). */
    static String refeicao(String tipo){return switch(tipo){case "CAFE_DA_MANHA"->"Café da manhã";case "LANCHE_MANHA"->"Lanche da manhã";case "ALMOCO"->"Almoço";
        case "LANCHE_TARDE"->"Lanche da tarde";case "JANTAR"->"Jantar";case "CEIA"->"Ceia";default->tipo;};}

    private static String dia(int n){return List.of("Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado").get(n);}
    static void validarElegibilidade(boolean premium, boolean planoAtivo){
        if(!premium) throw new IllegalArgumentException("A prescrição digital está disponível somente para clientes Premium.");
        if(!planoAtivo) throw new IllegalArgumentException("Monte o plano antes de prescrever");
    }
}
