package com.tricode.cleaneats.service.restaurante;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.tricode.cleaneats.service.PdfEstiloCleanEats;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.FundoERodape;
import com.tricode.cleaneats.service.PdfEstiloCleanEats.Tema;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Gera os relatórios gerenciais do restaurante em PDF com identidade visual CleanEats
 * (tema coral: logo oficial, cabeçalho em pílulas, cards de resumo KPI, tabela estilizada e marca d'água).
 */
final class RelatorioRestaurantePdf {

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private RelatorioRestaurantePdf() {}

    static byte[] gerar(String restaurante, String titulo, LocalDate ini, LocalDate fim,
                        List<String> resumo, List<String> cabecalho, List<List<String>> linhas) {
        try {
            var saida = new ByteArrayOutputStream();
            var doc = new Document(PageSize.A4, 40, 40, 36, 52);
            var writer = PdfWriter.getInstance(doc, saida);
            writer.setPageEvent(new FundoERodape(Tema.RESTAURANTE,
                    "CleanEats · Painel do Restaurante · " + restaurante));
            doc.open();

            String hoje = LocalDate.now(FUSO).format(FMT);
            String periodo = ini.format(FMT) + " a " + fim.format(FMT);

            // ---------- 1. CABEÇALHO EDITORIAL 2 COLUNAS ----------
            var topo = new PdfPTable(new float[]{1.15f, 1.35f});
            topo.setWidthPercentage(100);
            topo.setSpacingAfter(18f);

            var colEsq = new PdfPCell();
            colEsq.setBorder(Rectangle.NO_BORDER);
            colEsq.setVerticalAlignment(Element.ALIGN_TOP);
            colEsq.setPaddingRight(12f);

            var logo = PdfEstiloCleanEats.imagemRecurso("/pdf/logo-cleaneats.png");
            if (logo != null) {
                logo.scaleToFit(122f, 32f);
                logo.setSpacingAfter(8f);
                colEsq.addElement(logo);
            } else {
                colEsq.addElement(new Paragraph("CleanEats", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PdfEstiloCleanEats.VERDE_ESCURO)));
            }

            var pRest = new Paragraph(restaurante, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, PdfEstiloCleanEats.TINTA));
            pRest.setSpacingBefore(3f);
            colEsq.addElement(pRest);

            var pSub = new Paragraph("R E S T A U R A N T E   P A R C E I R O", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, PdfEstiloCleanEats.CORAL));
            pSub.setSpacingBefore(2f);
            colEsq.addElement(pSub);
            topo.addCell(colEsq);

            var colDir = new PdfPCell();
            colDir.setBorder(Rectangle.NO_BORDER);
            colDir.setVerticalAlignment(Element.ALIGN_TOP);

            var pilulas = new PdfPTable(new float[]{1.25f, 0.75f});
            pilulas.setWidthPercentage(100);
            var cDoc = PdfEstiloCleanEats.pilula("Documento:", titulo, PdfEstiloCleanEats.CORAL_BG);
            cDoc.setColspan(2);
            pilulas.addCell(cDoc);
            pilulas.addCell(PdfEstiloCleanEats.pilula("Período:", periodo, PdfEstiloCleanEats.CORAL_BG));
            pilulas.addCell(PdfEstiloCleanEats.pilula("Emitido em:", hoje, PdfEstiloCleanEats.VERDE_BG));
            colDir.addElement(pilulas);
            topo.addCell(colDir);

            doc.add(topo);

            // ---------- 2. TÍTULO CENTRALIZADO + FILET CORAL ----------
            var pTit = new Paragraph(titulo.toUpperCase(Locale.ROOT), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13f, PdfEstiloCleanEats.TINTA));
            pTit.setAlignment(Element.ALIGN_CENTER);
            pTit.setSpacingAfter(6f);
            doc.add(pTit);

            var barra = new PdfPTable(1);
            barra.setWidthPercentage(16);
            barra.setHorizontalAlignment(Element.ALIGN_CENTER);
            barra.setSpacingAfter(16f);
            var bCel = new PdfPCell();
            bCel.setBorder(Rectangle.NO_BORDER);
            bCel.setBackgroundColor(PdfEstiloCleanEats.CORAL);
            bCel.setFixedHeight(2.5f);
            barra.addCell(bCel);
            doc.add(barra);

            // ---------- 3. CARDS KPI DO RESUMO ----------
            if (resumo != null && !resumo.isEmpty()) {
                var kpis = new PdfPTable(resumo.size());
                kpis.setWidthPercentage(100);
                kpis.setSpacingAfter(18f);
                for (String item : resumo) {
                    int idx = item.indexOf(':');
                    String rot = idx > 0 ? item.substring(0, idx).trim() : "Indicador";
                    String val = idx > 0 ? item.substring(idx + 1).trim() : item;
                    kpis.addCell(PdfEstiloCleanEats.cardMetrica(rot, val, PdfEstiloCleanEats.CORAL_ESCURO, PdfEstiloCleanEats.CORAL_BG));
                }
                doc.add(kpis);
            }

            // ---------- 4. TABELA DETALHADA ----------
            var tabela = new PdfPTable(cabecalho.size());
            tabela.setWidthPercentage(100);
            tabela.setHeaderRows(1);

            var fCab = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, PdfEstiloCleanEats.BRANCO);
            var fCel = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, PdfEstiloCleanEats.TINTA);

            for (String col : cabecalho) {
                var cel = new PdfPCell(new Phrase(col, fCab));
                cel.setBackgroundColor(PdfEstiloCleanEats.CORAL);
                cel.setBorderColor(PdfEstiloCleanEats.CORAL);
                cel.setPaddingTop(7f);
                cel.setPaddingBottom(7f);
                cel.setPaddingLeft(8f);
                cel.setPaddingRight(8f);
                if (ehColunaNumerica(col)) cel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                tabela.addCell(cel);
            }

            boolean zebra = false;
            for (var linha : linhas) {
                Color bg = zebra ? PdfEstiloCleanEats.CORAL_ZEBRA : PdfEstiloCleanEats.BRANCO;
                for (int i = 0; i < linha.size(); i++) {
                    var cel = new PdfPCell(new Phrase(linha.get(i), fCel));
                    cel.setBackgroundColor(bg);
                    cel.setBorder(Rectangle.BOTTOM);
                    cel.setBorderColorBottom(PdfEstiloCleanEats.LINHA);
                    cel.setBorderWidthBottom(0.6f);
                    cel.setPaddingTop(6f);
                    cel.setPaddingBottom(6f);
                    cel.setPaddingLeft(8f);
                    cel.setPaddingRight(8f);
                    if (i < cabecalho.size() && ehColunaNumerica(cabecalho.get(i))) {
                        cel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    }
                    tabela.addCell(cel);
                }
                zebra = !zebra;
            }

            if (linhas.isEmpty()) {
                var vazio = new PdfPCell(new Phrase("Sem registros encontrados no período selecionado.",
                        FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9f, PdfEstiloCleanEats.CINZA)));
                vazio.setColspan(cabecalho.size());
                vazio.setHorizontalAlignment(Element.ALIGN_CENTER);
                vazio.setPadding(16f);
                vazio.setBorderColor(PdfEstiloCleanEats.LINHA);
                tabela.addCell(vazio);
            }

            doc.add(tabela);
            doc.close();
            return saida.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível gerar o relatório em PDF.", e);
        }
    }

    private static boolean ehColunaNumerica(String col) {
        var c = col.toLowerCase(Locale.ROOT);
        return c.contains("r$") || c.contains("unidades") || c.contains("pedidos") || c.contains("vendidos")
                || c.contains("kcal") || c.contains("nota") || c.contains("cancelados") || c.contains("(min)");
    }
}
