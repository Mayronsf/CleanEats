package com.tricode.cleaneats.service.nutri;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.tricode.cleaneats.service.PdfEstiloCleanEats;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.CaixaBarraLateral;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.FundoERodape;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.Tema;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

/**
 * Gera o documento oficial da prescrição nutricional com identidade visual CleanEats
 * (estilo receituário clínico: cabeçalho com logo e pílulas do paciente, marca d'água suave,
 * cards de metas diárias, tabela semanal e assinatura digital com CRN).
 */
public final class PrescricaoPdf {

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final DateTimeFormatter FMT_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record ItemRefeicao(String dia, String tipo, String prato, String observacao) {}

    public record Dados(
            String cliente,
            String emailCliente,
            String objetivo,
            BigDecimal pesoKg,
            BigDecimal alturaCm,
            String nomeNutri,
            String crn,
            Integer calorias,
            Integer proteinas,
            Integer carboidratos,
            Integer gorduras,
            Integer fibras,
            Integer aguaMl,
            List<ItemRefeicao> refeicoes,
            String observacoes,
            byte[] assinatura
    ) {}

    private PrescricaoPdf() {}

    /** Assinatura legada mantida para compatibilidade com testes e chamadas simples. */
    public static byte[] gerar(String cliente, String nomeNutri, String crn, String metas, String plano, byte[] assinatura) {
        var itens = parsearLinhasPlano(plano);
        return gerarDocumento(cliente, null, null, null, null, nomeNutri, crn,
                null, null, null, null, null, null, metas, itens, null, assinatura);
    }

    /** Geração estruturada completa usada na emissão oficial (Tela 32). */
    public static byte[] gerar(Dados d) {
        return gerarDocumento(
                d.cliente(), d.emailCliente(), d.objetivo(), d.pesoKg(), d.alturaCm(),
                d.nomeNutri(), d.crn(),
                d.calorias(), d.proteinas(), d.carboidratos(), d.gorduras(), d.fibras(), d.aguaMl(),
                null, d.refeicoes() == null ? List.of() : d.refeicoes(), d.observacoes(), d.assinatura()
        );
    }

    private static byte[] gerarDocumento(
            String cliente, String emailCliente, String objetivo, BigDecimal pesoKg, BigDecimal alturaCm,
            String nomeNutri, String crn,
            Integer calorias, Integer proteinas, Integer carboidratos, Integer gorduras, Integer fibras, Integer aguaMl,
            String metasTextoLegado, List<ItemRefeicao> refeicoes, String observacoes, byte[] assinatura
    ) {
        try {
            var saida = new ByteArrayOutputStream();
            var doc = new Document(PageSize.A4, 42, 42, 38, 52);
            var writer = PdfWriter.getInstance(doc, saida);
            writer.setPageEvent(new FundoERodape(Tema.NUTRI,
                    "CleanEats · Prescrição Nutricional Digital · Emitida por " + safe(nomeNutri) + " (" + safe(crn) + ")"));
            doc.open();

            String hoje = LocalDate.now(FUSO).format(FMT_DATA);

            // ---------- 1. CABEÇALHO EDITORIAL (2 colunas estilo receituário) ----------
            var cabecalho = new PdfPTable(new float[]{1.15f, 1.35f});
            cabecalho.setWidthPercentage(100);
            cabecalho.setSpacingAfter(20f);

            // Coluna esquerda: Logo CleanEats + Profissional + NUTRICIONISTA + CRN
            var colEsq = new PdfPCell();
            colEsq.setBorder(Rectangle.NO_BORDER);
            colEsq.setVerticalAlignment(Element.ALIGN_TOP);
            colEsq.setPaddingRight(12f);

            var logo = PdfEstiloCleanEats.imagemRecurso("/pdf/logo-cleaneats.png");
            if (logo != null) {
                logo.scaleToFit(126f, 34f);
                logo.setSpacingAfter(8f);
                colEsq.addElement(logo);
            } else {
                var pMarca = new Paragraph("CleanEats", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PdfEstiloCleanEats.VERDE_ESCURO));
                pMarca.setSpacingAfter(6f);
                colEsq.addElement(pMarca);
            }

            var pNutri = new Paragraph(safe(nomeNutri), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, PdfEstiloCleanEats.TINTA));
            pNutri.setSpacingBefore(4f);
            colEsq.addElement(pNutri);

            var pCargo = new Paragraph("N U T R I C I O N I S T A", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, PdfEstiloCleanEats.AZUL));
            pCargo.setSpacingBefore(2f);
            colEsq.addElement(pCargo);

            var pCrn = new Paragraph(safe(crn), FontFactory.getFont(FontFactory.HELVETICA, 8.5f, PdfEstiloCleanEats.CINZA));
            pCrn.setSpacingBefore(2f);
            colEsq.addElement(pCrn);

            cabecalho.addCell(colEsq);

            // Coluna direita: Pílulas arredondadas suaves (Paciente, Data, Objetivo/Dados)
            var colDir = new PdfPCell();
            colDir.setBorder(Rectangle.NO_BORDER);
            colDir.setVerticalAlignment(Element.ALIGN_TOP);

            var gridPilulas = new PdfPTable(new float[]{0.82f, 1.18f});
            gridPilulas.setWidthPercentage(100);

            var cPac = PdfEstiloCleanEats.pilula("Paciente:", safe(cliente), PdfEstiloCleanEats.AZUL_BG);
            cPac.setColspan(2);
            gridPilulas.addCell(cPac);

            gridPilulas.addCell(PdfEstiloCleanEats.pilula("Data:", hoje, PdfEstiloCleanEats.AZUL_BG));
            gridPilulas.addCell(PdfEstiloCleanEats.pilula("Objetivo:", formatarObjetivo(objetivo), PdfEstiloCleanEats.VERDE_BG));

            if (pesoKg != null || alturaCm != null || (emailCliente != null && !emailCliente.isBlank())) {
                String medidas = formatarMedidas(pesoKg, alturaCm);
                if (!medidas.isBlank()) {
                    var cMed = PdfEstiloCleanEats.pilula("Antropometria:", medidas, PdfEstiloCleanEats.AZUL_BG);
                    cMed.setColspan(2);
                    gridPilulas.addCell(cMed);
                } else {
                    var cMail = PdfEstiloCleanEats.pilula("E-mail:", emailCliente, PdfEstiloCleanEats.AZUL_BG);
                    cMail.setColspan(2);
                    gridPilulas.addCell(cMail);
                }
            }

            colDir.addElement(gridPilulas);
            cabecalho.addCell(colDir);
            doc.add(cabecalho);

            // ---------- 2. TÍTULO CENTRALIZADO COM FILET DECORATIVO ----------
            var titulo = new Paragraph("PRESCRIÇÃO NUTRICIONAL", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13.5f, PdfEstiloCleanEats.TINTA));
            titulo.setAlignment(Element.ALIGN_CENTER);
            titulo.setSpacingAfter(6f);
            doc.add(titulo);

            var barra = new PdfPTable(1);
            barra.setWidthPercentage(16);
            barra.setHorizontalAlignment(Element.ALIGN_CENTER);
            barra.setSpacingAfter(16f);
            var barraCel = new PdfPCell();
            barraCel.setBorder(Rectangle.NO_BORDER);
            barraCel.setBackgroundColor(PdfEstiloCleanEats.VERDE);
            barraCel.setFixedHeight(2.5f);
            barra.addCell(barraCel);
            doc.add(barra);

            // ---------- 3. METAS NUTRICIONAIS DIÁRIAS ----------
            adicionarTituloSecao(doc, "Metas nutricionais diárias");
            boolean temMetasEstruturadas = calorias != null || proteinas != null || carboidratos != null
                    || gorduras != null || fibras != null || aguaMl != null;

            if (temMetasEstruturadas) {
                var tMetas = new PdfPTable(6);
                tMetas.setWidthPercentage(100);
                tMetas.setSpacingAfter(16f);
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Calorias", val(calorias, " kcal"), PdfEstiloCleanEats.MACRO_KCAL, PdfEstiloCleanEats.VERDE_BG));
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Proteínas", val(proteinas, " g"), PdfEstiloCleanEats.MACRO_PROT, PdfEstiloCleanEats.AZUL_BG));
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Carboidratos", val(carboidratos, " g"), PdfEstiloCleanEats.MACRO_CARB, PdfEstiloCleanEats.AZUL_BG));
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Gorduras", val(gorduras, " g"), PdfEstiloCleanEats.MACRO_GORD, PdfEstiloCleanEats.AZUL_BG));
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Fibras", val(fibras, " g"), PdfEstiloCleanEats.MACRO_FIBRA, PdfEstiloCleanEats.VERDE_BG));
                tMetas.addCell(PdfEstiloCleanEats.cardMetrica("Água", val(aguaMl, " ml"), PdfEstiloCleanEats.MACRO_AGUA, PdfEstiloCleanEats.AZUL_BG));
                doc.add(tMetas);
            } else if (metasTextoLegado != null && !metasTextoLegado.isBlank()) {
                var box = new PdfPTable(1);
                box.setWidthPercentage(100);
                box.setSpacingAfter(16f);
                var cel = new PdfPCell(new Phrase(metasTextoLegado, FontFactory.getFont(FontFactory.HELVETICA, 9.5f, PdfEstiloCleanEats.TINTA)));
                cel.setBorder(Rectangle.NO_BORDER);
                cel.setPadding(11f);
                cel.setPaddingLeft(14f);
                cel.setCellEvent(new CaixaBarraLateral(PdfEstiloCleanEats.VERDE_BG, PdfEstiloCleanEats.VERDE));
                box.addCell(cel);
                doc.add(box);
            }

            // ---------- 4. PLANO ALIMENTAR SEMANAL ----------
            adicionarTituloSecao(doc, "Plano alimentar semanal");
            if (refeicoes.isEmpty()) {
                var vazio = new Paragraph("Nenhuma refeição cadastrada no plano ativo.", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9.5f, PdfEstiloCleanEats.CINZA));
                vazio.setSpacingAfter(14f);
                doc.add(vazio);
            } else {
                var tabela = new PdfPTable(new float[]{1.1f, 1.15f, 2.0f, 1.45f});
                tabela.setWidthPercentage(100);
                tabela.setHeaderRows(1);
                tabela.setSpacingAfter(16f);

                var fCab = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, PdfEstiloCleanEats.BRANCO);
                for (String col : List.of("Dia", "Refeição", "Prato recomendado", "Observação")) {
                    var c = new PdfPCell(new Phrase(col, fCab));
                    c.setBackgroundColor(PdfEstiloCleanEats.AZUL);
                    c.setBorderColor(PdfEstiloCleanEats.AZUL);
                    c.setPaddingTop(7f);
                    c.setPaddingBottom(7f);
                    c.setPaddingLeft(8f);
                    c.setPaddingRight(8f);
                    tabela.addCell(c);
                }

                var fDia = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, PdfEstiloCleanEats.AZUL_ESCURO);
                var fTxt = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, PdfEstiloCleanEats.TINTA);
                var fObs = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8f, PdfEstiloCleanEats.TEXTO);

                boolean zebra = false;
                String ultimoDia = "";
                for (var r : refeicoes) {
                    Color bg = zebra ? PdfEstiloCleanEats.AZUL_ZEBRA : PdfEstiloCleanEats.BRANCO;
                    String diaExibido = Objects.equals(ultimoDia, r.dia()) ? "" : safe(r.dia());
                    ultimoDia = safe(r.dia());

                    tabela.addCell(celulaTabela(diaExibido, fDia, bg));
                    tabela.addCell(celulaTabela(safe(r.tipo()), fTxt, bg));
                    tabela.addCell(celulaTabela(safe(r.prato()), fTxt, bg));
                    tabela.addCell(celulaTabela(r.observacao() == null || r.observacao().isBlank() ? "—" : r.observacao(), fObs, bg));
                    zebra = !zebra;
                }
                doc.add(tabela);
            }

            // ---------- 5. ORIENTAÇÕES GERAIS ----------
            if (observacoes != null && !observacoes.isBlank()) {
                adicionarTituloSecao(doc, "Orientações e recomendações clínicas");
                var boxObs = new PdfPTable(1);
                boxObs.setWidthPercentage(100);
                boxObs.setSpacingAfter(18f);
                var pObs = new Paragraph(observacoes.trim(), FontFactory.getFont(FontFactory.HELVETICA, 9.5f, PdfEstiloCleanEats.TEXTO));
                pObs.setLeading(14f);
                var cObs = new PdfPCell(pObs);
                cObs.setBorder(Rectangle.NO_BORDER);
                cObs.setPadding(12f);
                cObs.setPaddingLeft(16f);
                cObs.setCellEvent(new CaixaBarraLateral(PdfEstiloCleanEats.VERDE_BG, PdfEstiloCleanEats.VERDE));
                boxObs.addCell(cObs);
                doc.add(boxObs);
            }

            // ---------- 6. ASSINATURA DIGITAL & CARIMBO CRN ----------
            var blocoAssinatura = new PdfPTable(1);
            blocoAssinatura.setWidthPercentage(52);
            blocoAssinatura.setHorizontalAlignment(Element.ALIGN_CENTER);
            blocoAssinatura.setSpacingBefore(14f);
            blocoAssinatura.setKeepTogether(true);

            if (assinatura != null && assinatura.length > 0) {
                try {
                    var img = Image.getInstance(assinatura);
                    img.scaleToFit(155f, 52f);
                    img.setAlignment(Element.ALIGN_CENTER);
                    var cImg = new PdfPCell(img);
                    cImg.setBorder(Rectangle.NO_BORDER);
                    cImg.setHorizontalAlignment(Element.ALIGN_CENTER);
                    cImg.setPaddingBottom(4f);
                    blocoAssinatura.addCell(cImg);
                } catch (Exception ignored) { }
            }

            var cLinha = new PdfPCell();
            cLinha.setBorder(Rectangle.TOP);
            cLinha.setBorderColorTop(PdfEstiloCleanEats.AZUL);
            cLinha.setBorderWidthTop(1f);
            cLinha.setPaddingTop(6f);
            cLinha.setHorizontalAlignment(Element.ALIGN_CENTER);

            var pAssNome = new Paragraph(safe(nomeNutri), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10.5f, PdfEstiloCleanEats.TINTA));
            pAssNome.setAlignment(Element.ALIGN_CENTER);
            cLinha.addElement(pAssNome);

            var pAssCrn = new Paragraph("Nutricionista · " + safe(crn), FontFactory.getFont(FontFactory.HELVETICA, 8.5f, PdfEstiloCleanEats.CINZA));
            pAssCrn.setAlignment(Element.ALIGN_CENTER);
            cLinha.addElement(pAssCrn);

            var pVal = new Paragraph("Documento assinado digitalmente via CleanEats em " + hoje, FontFactory.getFont(FontFactory.HELVETICA, 7.5f, PdfEstiloCleanEats.CINZA));
            pVal.setAlignment(Element.ALIGN_CENTER);
            pVal.setSpacingBefore(3f);
            cLinha.addElement(pVal);

            blocoAssinatura.addCell(cLinha);
            doc.add(blocoAssinatura);

            doc.close();
            return saida.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível gerar o PDF da prescrição.", e);
        }
    }

    public static String sha256(byte[] documento) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(documento)); }
        catch (Exception e) { throw new IllegalStateException("Não foi possível calcular o hash do documento.", e); }
    }

    private static void adicionarTituloSecao(Document doc, String texto) throws DocumentException {
        var p = new Paragraph(texto.toUpperCase(Locale.ROOT), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, PdfEstiloCleanEats.AZUL_ESCURO));
        p.setSpacingBefore(4f);
        p.setSpacingAfter(7f);
        doc.add(p);
    }

    private static PdfPCell celulaTabela(String texto, Font fonte, Color fundo) {
        var c = new PdfPCell(new Phrase(texto, fonte));
        c.setBackgroundColor(fundo);
        c.setBorder(Rectangle.BOTTOM);
        c.setBorderColorBottom(PdfEstiloCleanEats.LINHA);
        c.setBorderWidthBottom(0.6f);
        c.setPaddingTop(6f);
        c.setPaddingBottom(6f);
        c.setPaddingLeft(8f);
        c.setPaddingRight(8f);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return c;
    }

    private static List<ItemRefeicao> parsearLinhasPlano(String plano) {
        if (plano == null || plano.isBlank()) return List.of();
        var lista = new ArrayList<ItemRefeicao>();
        for (String linha : plano.split("\\R")) {
            String t = linha.trim();
            if (t.isBlank()) continue;
            String dia = ""; String tipo = ""; String prato = t; String obs = null;
            int idxPonto = t.indexOf("·");
            if (idxPonto > 0) {
                dia = t.substring(0, idxPonto).trim();
                String resto = t.substring(idxPonto + 1).trim();
                int idxDoisPontos = resto.indexOf(":");
                if (idxDoisPontos > 0) {
                    tipo = resto.substring(0, idxDoisPontos).trim();
                    prato = resto.substring(idxDoisPontos + 1).trim();
                } else {
                    prato = resto;
                }
            }
            int idxTraco = prato.indexOf("—");
            if (idxTraco > 0) {
                obs = prato.substring(idxTraco + 1).trim();
                prato = prato.substring(0, idxTraco).trim();
            }
            lista.add(new ItemRefeicao(dia, tipo, prato, obs));
        }
        return lista;
    }

    private static String formatarObjetivo(String obj) {
        if (obj == null || obj.isBlank()) return "Personalizado";
        return switch (obj) {
            case "GANHO_MASSA" -> "Ganho de massa";
            case "EMAGRECIMENTO" -> "Emagrecimento";
            case "EQUILIBRIO" -> "Equilíbrio";
            default -> obj;
        };
    }

    private static String formatarMedidas(BigDecimal peso, BigDecimal altura) {
        var partes = new ArrayList<String>();
        if (peso != null) partes.add(peso.stripTrailingZeros().toPlainString().replace('.', ',') + " kg");
        if (altura != null) partes.add(altura.stripTrailingZeros().toPlainString().replace('.', ',') + " cm");
        return String.join("  ·  ", partes);
    }

    private static String val(Integer v, String sufixo) { return v == null ? "—" : v + sufixo; }
    private static String safe(String s) { return s == null || s.isBlank() ? "—" : s.trim(); }
}
