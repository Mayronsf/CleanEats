package com.tricode.cleaneats.service.nutri;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
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

    @Test void pdfEstruturadoPersonalizadoGeraComMetasEPlano() throws IOException {
        byte[] pdf = PrescricaoPdf.gerar(new PrescricaoPdf.Dados(
                "Breno Filho", "cliente@cleaneats.test", "GANHO_MASSA",
                new BigDecimal("78.2"), new BigDecimal("178"),
                "Dra. Ana Souza", "CRN-6 PE 12345/P",
                2200, 140, 240, 70, 30, 3000,
                List.of(
                        new PrescricaoPdf.ItemRefeicao("Segunda-feira", "Café da manhã", "Tapioca com Ovo e Banana", "Com canela"),
                        new PrescricaoPdf.ItemRefeicao("Segunda-feira", "Almoço", "Frango Grelhado Fitness", "Sem molho"),
                        new PrescricaoPdf.ItemRefeicao("Terça-feira", "Jantar", "Salmão com Quinoa", null)
                ),
                "Manter hidratação mínima de 3 litros ao dia e evitar laticínios.",
                null
        ));
        var texto = new PdfTextExtractor(new PdfReader(pdf)).getTextFromPage(1);
        assertTrue(texto.contains("PRESCRIÇÃO NUTRICIONAL"));
        assertTrue(texto.contains("Breno Filho"));
        assertTrue(texto.contains("2200 kcal"));
        assertTrue(texto.contains("Frango Grelhado Fitness"));
        assertTrue(texto.contains("CRN-6 PE 12345/P"));
    }

    @Test void clienteNaoPremiumERecusadoComMensagemClara() {
        var erro=assertThrows(IllegalArgumentException.class,()->PrescricaoService.validarElegibilidade(false,true));
        assertTrue(erro.getMessage().contains("somente para clientes Premium"));
    }
}
