package com.tricode.cleaneats.service.nutri;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

/** Gera o documento oficial da prescrição nutricional. */
public final class PrescricaoPdf {
    private PrescricaoPdf() {}

    public static byte[] gerar(String cliente, String nomeNutri, String crn, String metas, String plano, byte[] assinatura) {
        try {
            var saida = new ByteArrayOutputStream();
            var doc = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(doc, saida);
            doc.open();
            doc.add(new Paragraph("CleanEats", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18)));
            doc.add(new Paragraph("Prescrição Nutricional", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
            doc.add(new Paragraph("Paciente: " + cliente));
            doc.add(new Paragraph("Emitida em: " + java.time.LocalDate.now(java.time.ZoneId.of("America/Recife")).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Metas nutricionais", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            doc.add(new Paragraph(metas));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Plano alimentar ativo", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            doc.add(new Paragraph(plano == null || plano.isBlank() ? "Sem refeições cadastradas." : plano));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Nutricionista: " + nomeNutri));
            doc.add(new Paragraph("CRN: " + crn));
            if (assinatura != null) {
                try { var imagem = Image.getInstance(assinatura); imagem.scaleToFit(150, 55); doc.add(imagem); }
                catch (Exception ignored) { }
            }
            doc.close();
            return saida.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("Não foi possível gerar o PDF da prescrição.", e); }
    }

    public static String sha256(byte[] documento) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(documento)); }
        catch (Exception e) { throw new IllegalStateException("Não foi possível calcular o hash do documento.", e); }
    }
}
