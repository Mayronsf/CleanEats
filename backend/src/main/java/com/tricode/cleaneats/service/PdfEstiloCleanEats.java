package com.tricode.cleaneats.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import java.awt.Color;
import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Identidade visual compartilhada dos PDFs do CleanEats: paleta da marca,
 * logo oficial, marca d'água suave, caixas arredondadas e barra inferior institucional.
 */
public final class PdfEstiloCleanEats {

    public static final Color VERDE        = new Color(91, 176, 51);    // #5BB033
    public static final Color VERDE_ESCURO = new Color(45, 106, 31);    // #2D6A1F
    public static final Color VERDE_BG     = new Color(236, 247, 224);  // #ECF7E0

    public static final Color AZUL         = new Color(69, 123, 157);   // #457B9D
    public static final Color AZUL_ESCURO  = new Color(45, 90, 117);    // #2D5A75
    public static final Color AZUL_BG      = new Color(235, 245, 252);  // #EBF5FC
    public static final Color AZUL_ZEBRA   = new Color(246, 250, 253);  // #F6FAFD

    public static final Color CORAL        = new Color(224, 120, 86);   // #E07856
    public static final Color CORAL_ESCURO = new Color(194, 84, 58);    // #C2543A
    public static final Color CORAL_BG     = new Color(253, 236, 230);  // #FDECE6
    public static final Color CORAL_ZEBRA  = new Color(253, 247, 244);  // #FDF7F4

    public static final Color TINTA        = new Color(26, 46, 26);     // #1A2E1A
    public static final Color TEXTO        = new Color(56, 72, 56);     // #384838
    public static final Color CINZA        = new Color(122, 134, 122);  // #7A867A
    public static final Color LINHA        = new Color(228, 234, 228);  // #E4EAE4
    public static final Color BRANCO       = Color.WHITE;

    // Cores dos macros
    public static final Color MACRO_KCAL   = new Color(230, 132, 46);
    public static final Color MACRO_PROT   = new Color(217, 89, 64);
    public static final Color MACRO_CARB   = new Color(196, 152, 42);
    public static final Color MACRO_GORD   = new Color(186, 66, 52);
    public static final Color MACRO_FIBRA  = new Color(66, 158, 112);
    public static final Color MACRO_AGUA   = new Color(58, 134, 184);

    public enum Tema {
        NUTRI(AZUL, AZUL_ESCURO, AZUL_BG, "/pdf/marca-dagua-azul.png"),
        RESTAURANTE(CORAL, CORAL_ESCURO, CORAL_BG, "/pdf/marca-dagua-coral.png"),
        PADRAO(VERDE, VERDE_ESCURO, VERDE_BG, "/pdf/marca-dagua-verde.png");

        public final Color principal;
        public final Color escuro;
        public final Color fundoSuave;
        public final String marcaDaguaRecurso;

        Tema(Color principal, Color escuro, Color fundoSuave, String marcaDaguaRecurso) {
            this.principal = principal;
            this.escuro = escuro;
            this.fundoSuave = fundoSuave;
            this.marcaDaguaRecurso = marcaDaguaRecurso;
        }
    }

    private static final Map<String, byte[]> CACHE_IMAGENS = new ConcurrentHashMap<>();

    private PdfEstiloCleanEats() {}

    public static byte[] carregarRecurso(String caminho) {
        return CACHE_IMAGENS.computeIfAbsent(caminho, k -> {
            try (InputStream in = PdfEstiloCleanEats.class.getResourceAsStream(k)) {
                return in == null ? new byte[0] : in.readAllBytes();
            } catch (Exception e) {
                return new byte[0];
            }
        });
    }

    public static Image imagemRecurso(String caminho) {
        byte[] bytes = carregarRecurso(caminho);
        if (bytes.length == 0) return null;
        try { return Image.getInstance(bytes); } catch (Exception e) { return null; }
    }

    /** Célula estilizada em formato de pílula arredondada suave (estilo cabeçalho clínico). */
    public static PdfPCell pilula(String rotulo, String valor, Color fundo) {
        var fRot = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, CINZA);
        var fVal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, TINTA);
        var p = new Phrase();
        p.add(new Chunk(rotulo + "  ", fRot));
        p.add(new Chunk(valor == null || valor.isBlank() ? "—" : valor, fVal));
        var cel = new PdfPCell(p);
        cel.setBorder(Rectangle.NO_BORDER);
        cel.setPaddingTop(6f);
        cel.setPaddingBottom(7f);
        cel.setPaddingLeft(11f);
        cel.setPaddingRight(11f);
        cel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cel.setCellEvent(new FundoArredondado(fundo, null, 7f, 2.5f));
        return cel;
    }

    /** Card arredondado para KPIs e metas nutricionais. */
    public static PdfPCell cardMetrica(String rotulo, String valor, Color corDestaque, Color fundo) {
        var p = new Paragraph();
        p.setAlignment(Element.ALIGN_CENTER);
        p.setLeading(13f);
        p.add(new Chunk(rotulo.toUpperCase() + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, corDestaque)));
        p.add(new Chunk(valor, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, TINTA)));
        var cel = new PdfPCell(p);
        cel.setBorder(Rectangle.NO_BORDER);
        cel.setHorizontalAlignment(Element.ALIGN_CENTER);
        cel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cel.setPaddingTop(9f);
        cel.setPaddingBottom(9f);
        cel.setPaddingLeft(6f);
        cel.setPaddingRight(6f);
        cel.setCellEvent(new FundoArredondado(fundo, LINHA, 8f, 3f));
        return cel;
    }

    /** Desenha um fundo arredondado com margem interna para criar espaçamento limpo entre pílulas/cards. */
    public static final class FundoArredondado implements PdfPCellEvent {
        private final Color preenchimento;
        private final Color borda;
        private final float raio;
        private final float recuo;

        public FundoArredondado(Color preenchimento, Color borda, float raio, float recuo) {
            this.preenchimento = preenchimento;
            this.borda = borda;
            this.raio = raio;
            this.recuo = recuo;
        }

        @Override
        public void cellLayout(PdfPCell cell, Rectangle rect, PdfContentByte[] canvases) {
            var cb = canvases[PdfPTable.BACKGROUNDCANVAS];
            cb.saveState();
            float x = rect.getLeft() + recuo;
            float y = rect.getBottom() + recuo;
            float w = Math.max(2f, rect.getWidth() - recuo * 2);
            float h = Math.max(2f, rect.getHeight() - recuo * 2);
            if (preenchimento != null) {
                cb.setColorFill(preenchimento);
                cb.roundRectangle(x, y, w, h, raio);
                cb.fill();
            }
            if (borda != null) {
                cb.setColorStroke(borda);
                cb.setLineWidth(0.75f);
                cb.roundRectangle(x, y, w, h, raio);
                cb.stroke();
            }
            cb.restoreState();
        }
    }

    /** Caixa de destaque com fundo suave e barra vertical colorida na esquerda. */
    public static final class CaixaBarraLateral implements PdfPCellEvent {
        private final Color fundo;
        private final Color barra;

        public CaixaBarraLateral(Color fundo, Color barra) {
            this.fundo = fundo;
            this.barra = barra;
        }

        @Override
        public void cellLayout(PdfPCell cell, Rectangle rect, PdfContentByte[] canvases) {
            var cb = canvases[PdfPTable.BACKGROUNDCANVAS];
            cb.saveState();
            cb.setColorFill(fundo);
            cb.roundRectangle(rect.getLeft(), rect.getBottom(), rect.getWidth(), rect.getHeight(), 6f);
            cb.fill();
            cb.setColorFill(barra);
            cb.roundRectangle(rect.getLeft(), rect.getBottom(), 4f, rect.getHeight(), 2f);
            cb.fill();
            cb.restoreState();
        }
    }

    /** Desenha marca d'água suave, faixa inferior sólida da marca e rodapé em todas as páginas. */
    public static final class FundoERodape extends PdfPageEventHelper {
        private final Tema tema;
        private final String rodapeEsquerdo;

        public FundoERodape(Tema tema, String rodapeEsquerdo) {
            this.tema = tema;
            this.rodapeEsquerdo = rodapeEsquerdo;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            var page = document.getPageSize();
            float w = page.getWidth();

            // 1) Marca d'água delicada no canto inferior direito (atrás do texto)
            var under = writer.getDirectContentUnder();
            var wm = imagemRecurso(tema.marcaDaguaRecurso);
            if (wm != null) {
                try {
                    wm.scaleAbsolute(310f, 310f);
                    wm.setAbsolutePosition(w - 235f, 42f);
                    under.addImage(wm);
                } catch (Exception ignored) { }
            }

            // 2) Faixa sólida inferior na cor do tema (estilo receituário editorial)
            var over = writer.getDirectContent();
            over.saveState();
            over.setColorFill(tema.principal);
            over.rectangle(0f, 0f, w, 14f);
            over.fill();

            // Linha sutil acima do rodapé de texto
            over.setColorStroke(LINHA);
            over.setLineWidth(0.6f);
            over.moveTo(42f, 34f);
            over.lineTo(w - 42f, 34f);
            over.stroke();
            over.restoreState();

            // 3) Texto do rodapé
            var fRod = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, CINZA);
            ColumnText.showTextAligned(over, Element.ALIGN_LEFT, new Phrase(rodapeEsquerdo, fRod), 42f, 22f, 0f);
            ColumnText.showTextAligned(over, Element.ALIGN_RIGHT, new Phrase("Página " + writer.getPageNumber(), fRod), w - 42f, 22f, 0f);
        }
    }
}
