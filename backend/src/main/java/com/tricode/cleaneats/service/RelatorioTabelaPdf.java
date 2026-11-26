package com.tricode.cleaneats.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
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
 * Gerador genérico de relatórios e extratos tabulares em PDF com a identidade visual oficial do CleanEats
 * (logo, marca d'água, cabeçalho em pílulas, cards KPI, tabela zebrada e faixa institucional por tema).
 */
public final class RelatorioTabelaPdf {

    private static final ZoneId FUSO = ZoneId.of("America/Recife");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private RelatorioTabelaPdf() {}

    public static byte[] gerar(
            Tema tema,
            String titular,
            String subtituloPerfil,
            String tituloDocumento,
            String periodoTexto,
            String rodapeTexto,
            List<String> resumoKpis,
            List<String> cabecalho,
            List<List<String>> linhas,
            boolean paisagem
    ) {
        try {
            var saida = new ByteArrayOutputStream();
            var tamanho = paisagem ? PageSize.A4.rotate() : PageSize.A4;
            var doc = new Document(tamanho, 36, 36, 34, 52);
            var writer = PdfWriter.getInstance(doc, saida);
            writer.setPageEvent(new FundoERodape(tema, rodapeTexto));
            doc.open();

            String hoje = LocalDate.now(FUSO).format(FMT);
            Color corZebra = switch (tema) {
                case NUTRI -> PdfEstiloCleanEats.AZUL_ZEBRA;
                case RESTAURANTE -> PdfEstiloCleanEats.CORAL_ZEBRA;
                case PADRAO -> new Color(246, 251, 243);
            };

            // 1. Cabeçalho editorial 2 colunas
            var topo = new PdfPTable(new float[]{1.15f, 1.35f});
            topo.setWidthPercentage(100);
            topo.setSpacingAfter(16f);

            var colEsq = new PdfPCell();
            colEsq.setBorder(Rectangle.NO_BORDER);
            colEsq.setVerticalAlignment(Element.ALIGN_TOP);
            colEsq.setPaddingRight(12f);

            var logo = PdfEstiloCleanEats.imagemRecurso("/pdf/logo-cleaneats.png");
            if (logo != null) {
                logo.scaleToFit(122f, 32f);
                logo.setSpacingAfter(7f);
                colEsq.addElement(logo);
            } else {
                colEsq.addElement(new Paragraph("CleanEats", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PdfEstiloCleanEats.VERDE_ESCURO)));
            }

            var pTitular = new Paragraph(titular == null || titular.isBlank() ? "CleanEats" : titular,
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13.5f, PdfEstiloCleanEats.TINTA));
            pTitular.setSpacingBefore(3f);
            colEsq.addElement(pTitular);

            var pSub = new Paragraph(espacarLetras(subtituloPerfil), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, tema.principal));
            pSub.setSpacingBefore(2f);
            colEsq.addElement(pSub);
            topo.addCell(colEsq);

            var colDir = new PdfPCell();
            colDir.setBorder(Rectangle.NO_BORDER);
            colDir.setVerticalAlignment(Element.ALIGN_TOP);

            var pilulas = new PdfPTable(new float[]{1.25f, 0.75f});
            pilulas.setWidthPercentage(100);
            var cDoc = PdfEstiloCleanEats.pilula("Documento:", tituloDocumento, tema.fundoSuave);
            cDoc.setColspan(2);
            pilulas.addCell(cDoc);
            pilulas.addCell(PdfEstiloCleanEats.pilula("Período:", periodoTexto == null || periodoTexto.isBlank() ? "Geral" : periodoTexto, tema.fundoSuave));
            pilulas.addCell(PdfEstiloCleanEats.pilula("Emitido em:", hoje, PdfEstiloCleanEats.VERDE_BG));
            colDir.addElement(pilulas);
            topo.addCell(colDir);

            doc.add(topo);

            // 2. Título centralizado + filete temático
            var pTit = new Paragraph(tituloDocumento.toUpperCase(Locale.ROOT),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12.5f, PdfEstiloCleanEats.TINTA));
            pTit.setAlignment(Element.ALIGN_CENTER);
            pTit.setSpacingAfter(6f);
            doc.add(pTit);

            var barra = new PdfPTable(1);
            barra.setWidthPercentage(15);
            barra.setHorizontalAlignment(Element.ALIGN_CENTER);
            barra.setSpacingAfter(14f);
            var bCel = new PdfPCell();
            bCel.setBorder(Rectangle.NO_BORDER);
            bCel.setBackgroundColor(tema.principal);
            bCel.setFixedHeight(2.5f);
            barra.addCell(bCel);
            doc.add(barra);

            // 3. Cards KPI do resumo
            if (resumoKpis != null && !resumoKpis.isEmpty()) {
                var kpis = new PdfPTable(resumoKpis.size());
                kpis.setWidthPercentage(100);
                kpis.setSpacingAfter(16f);
                for (String item : resumoKpis) {
                    int idx = item.indexOf(':');
                    String rot = idx > 0 ? item.substring(0, idx).trim() : "Indicador";
                    String val = idx > 0 ? item.substring(idx + 1).trim() : item;
                    kpis.addCell(PdfEstiloCleanEats.cardMetrica(rot, val, tema.escuro, tema.fundoSuave));
                }
                doc.add(kpis);
            }

            // 4. Tabela detalhada
            var tabela = new PdfPTable(cabecalho.size());
            tabela.setWidthPercentage(100);
            tabela.setHeaderRows(1);

            float tamFonte = cabecalho.size() >= 8 ? 7.5f : 8.5f;
            var fCab = FontFactory.getFont(FontFactory.HELVETICA_BOLD, tamFonte, PdfEstiloCleanEats.BRANCO);
            var fCel = FontFactory.getFont(FontFactory.HELVETICA, tamFonte, PdfEstiloCleanEats.TINTA);

            for (String col : cabecalho) {
                var cel = new PdfPCell(new Phrase(col, fCab));
                cel.setBackgroundColor(tema.principal);
                cel.setBorderColor(tema.principal);
                cel.setPaddingTop(6.5f);
                cel.setPaddingBottom(6.5f);
                cel.setPaddingLeft(7f);
                cel.setPaddingRight(7f);
                if (ehColunaNumerica(col)) cel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                tabela.addCell(cel);
            }

            boolean zebra = false;
            for (var linha : linhas) {
                Color bg = zebra ? corZebra : PdfEstiloCleanEats.BRANCO;
                for (int i = 0; i < linha.size(); i++) {
                    var cel = new PdfPCell(new Phrase(linha.get(i) == null ? "—" : linha.get(i), fCel));
                    cel.setBackgroundColor(bg);
                    cel.setBorder(Rectangle.BOTTOM);
                    cel.setBorderColorBottom(PdfEstiloCleanEats.LINHA);
                    cel.setBorderWidthBottom(0.6f);
                    cel.setPaddingTop(5.5f);
                    cel.setPaddingBottom(5.5f);
                    cel.setPaddingLeft(7f);
                    cel.setPaddingRight(7f);
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
            throw new IllegalStateException("Não foi possível gerar o documento em PDF.", e);
        }
    }

    private static String espacarLetras(String texto) {
        if (texto == null) return "";
        var sb = new StringBuilder();
        for (char c : texto.toUpperCase(Locale.ROOT).toCharArray()) {
            if (sb.length() > 0) sb.append(c == ' ' ? "   " : " ");
            if (c != ' ') sb.append(c);
        }
        return sb.toString();
    }

    private static boolean ehColunaNumerica(String col) {
        var c = col.toLowerCase(Locale.ROOT);
        return c.contains("r$") || c.contains("valor") || c.contains("mensalidade") || c.contains("repasse")
                || c.contains("subtotal") || c.contains("desconto") || c.contains("bruto") || c.contains("líquido")
                || c.contains("comissão") || c.contains("unidades") || c.contains("pedidos") || c.contains("vendidos")
                || c.contains("kcal") || c.contains("prot") || c.contains("nota") || c.contains("cancelados")
                || c.contains("(min)") || c.contains("total");
    }
}
