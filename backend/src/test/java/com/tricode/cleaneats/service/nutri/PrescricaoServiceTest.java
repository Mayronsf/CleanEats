package com.tricode.cleaneats.service.nutri;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;
import java.io.IOException;
import static org.junit.jupiter.api.Assertions.*;

class PrescricaoServiceTest {
    @Test void pdfContemClienteCrnEMetas() throws IOException {
        byte[] pdf=PrescricaoPdf.gerar("Breno Filho","Dra. Ana Souza","CRN-6 PE 12345/P",
                "Calorias: 2200 kcal; proteínas: 140 g", "Segunda-feira · ALMOCO: Prato de teste", null);
        var texto=new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1);
        assertTrue(texto.contains("Breno Filho"));
        assertTrue(texto.contains("CRN-6 PE 12345/P"));
        assertTrue(texto.contains("2200 kcal"));
    }

    @Test void clienteNaoPremiumERecusadoComMensagemClara() {
        var erro=assertThrows(IllegalArgumentException.class,()->PrescricaoService.validarElegibilidade(false,true));
        assertTrue(erro.getMessage().contains("somente para clientes Premium"));
    }
}
