package com.ardit.banking.account.paymentdetails;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.time.Instant;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import com.ardit.banking.common.document.InstitutionDocumentProperties;

class AccountPaymentDetailsPdfGeneratorTests {

    private final AccountPaymentDetailsPdfGenerator generator = new AccountPaymentDetailsPdfGenerator(
        new InstitutionDocumentProperties(
            "Banking Mini System",
            "Rruga e Bankes 1",
            "Tirane",
            "Albania",
            "BMSIALTR",
            "support@banking.local",
            "+355 4 000 0000"
        )
    );

    @Test
    void generatedPdfContainsPaymentDetails() throws IOException {
        AccountPaymentDetailsDocument document = new AccountPaymentDetailsDocument(
            7L,
            "Payment User",
            "Main Account",
            "123456CUR01",
            "AL4721211009000000123456",
            "BMSIALTR",
            "Banking Mini System",
            "Rruga e Bankes 1",
            "Tirane, Albania",
            "EUR",
            Instant.parse("2026-05-15T08:30:00Z")
        );

        byte[] pdf = generator.generate(document);

        assertThat(pdf).isNotEmpty();

        try (PDDocument loadedPdf = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(loadedPdf);
            assertThat(loadedPdf.getNumberOfPages()).isEqualTo(1);
            assertThat(text).contains("Payment Details");
            assertThat(text).contains("Use these details to send money to this account.");
            assertThat(text).contains("Payment User");
            assertThat(text).contains("AL47 2121 1009 0000 0012 3456");
            assertThat(text).contains("BMSIALTR");
            assertThat(text).contains("123456CUR01");
            assertThat(text).contains("Main Account");
            assertThat(text).contains("EUR");
            assertThat(text).contains("Banking Mini System");
            assertThat(text).contains("Rruga e Bankes 1");
            assertThat(text).contains("Tirane, Albania");
            assertThat(text).contains("support@banking.local");
            assertThat(text).contains("+355 4 000 0000");
            assertThat(text).contains("15 May 2026");
        }
    }
}
