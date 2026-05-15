package com.ardit.banking.transaction.statement;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

import com.ardit.banking.common.document.InstitutionDocumentProperties;

class AccountStatementPdfGeneratorTests {

    private final AccountStatementPdfGenerator generator = new AccountStatementPdfGenerator(
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
    void generatedPdfContainsStatementDetails() throws IOException {
        AccountStatement statement = new AccountStatement(
            7L,
            "123456STD01",
            "AL4721211009000000000000",
            "Main Account",
            "CURRENT",
            "EUR",
            "ACTIVE",
            new BigDecimal("1150.00"),
            new BigDecimal("1150.00"),
            "Statement User",
            "statement-user",
            Instant.parse("2026-05-01T09:00:00Z"),
            LocalDate.of(2026, 5, 1),
            LocalDate.of(2026, 5, 31),
            Instant.parse("2026-05-13T10:15:00Z"),
            1,
            new BigDecimal("200.00"),
            new BigDecimal("50.00"),
            new BigDecimal("150.00"),
            List.of(
                new AccountStatementTransaction(
                    1L,
                    "ref-123",
                    "ext-123",
                    "PAYMENT",
                    "BOOKED",
                    "DEBIT",
                    "EUR",
                    new BigDecimal("50.00"),
                    "Utility bill payment",
                    "Power Utility",
                    "AL000000000000000000001",
                    Instant.parse("2026-05-10T09:30:00Z"),
                    LocalDate.of(2026, 5, 10),
                    new BigDecimal("1150.00"),
                    null,
                    null,
                    null
                )
            )
        );

        byte[] pdf = generator.generate(statement);

        assertThat(pdf).isNotEmpty();

        try (PDDocument document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Transaction Statement");
            assertThat(text).contains("Statement date");
            assertThat(text).contains("Statement period");
            assertThat(text).contains("Statement User");
            assertThat(text).contains("123456STD01");
            assertThat(text).contains("10 May 2026");
            assertThat(text).contains("11:30:00");
            assertThat(text).contains("ref-12");
            assertThat(text).contains("From:");
            assertThat(text).contains("Details:");
            assertThat(text).contains("Power Utility");
            assertThat(text).contains("Utility bill payment");
            assertThat(text).contains("DEBIT");
            assertThat(text).contains("CREDIT");
            assertThat(text).contains("BALANCE");
            assertThat(text).contains("Debit amount");
            assertThat(text).contains("(1)");
            assertThat(text).contains("Credit amount");
            assertThat(text).contains("Blocked amount");
            assertThat(text).contains("Available amount");
        }
    }
}
