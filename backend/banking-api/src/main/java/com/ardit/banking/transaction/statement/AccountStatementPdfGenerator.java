package com.ardit.banking.transaction.statement;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

@Component
public class AccountStatementPdfGenerator {

    private static final PDFont FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDFont FONT_MONO = new PDType1Font(Standard14Fonts.FontName.COURIER);
    private static final float PAGE_MARGIN = 42f;
    private static final float CONTENT_WIDTH = PDRectangle.A4.getWidth() - (PAGE_MARGIN * 2);
    private static final float BOTTOM_MARGIN = 36f;
    private static final float BODY_FONT_SIZE = 9f;
    private static final float SMALL_FONT_SIZE = 8f;
    private static final float TITLE_FONT_SIZE = 18f;
    private static final float LINE_GAP = 12f;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM uuuu");
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("dd MMM uuuu HH:mm")
        .withZone(ZoneId.systemDefault());

    private final StatementDocumentProperties properties;

    public AccountStatementPdfGenerator(StatementDocumentProperties properties) {
        this.properties = properties;
    }

    public byte[] generate(AccountStatement statement) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PageWriter writer = new PageWriter(document);

            drawHeader(writer, statement);
            drawStatementSummary(writer, statement);
            drawTransactions(writer, statement);

            writer.close();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate transaction statement PDF", ex);
        }
    }

    public String buildFilename(AccountStatement statement) {
        String fromDate = statement.fromDate() == null ? "all" : statement.fromDate().toString();
        String toDate = statement.toDate() == null ? "latest" : statement.toDate().toString();
        return "statement-" + statement.accountNumber() + "-" + fromDate + "-to-" + toDate + ".pdf";
    }

    private void drawHeader(PageWriter writer, AccountStatement statement) throws IOException {
        writer.writeText(properties.institutionName(), PAGE_MARGIN, 786f, FONT_BOLD, TITLE_FONT_SIZE, new Color(19, 50, 78));
        writer.writeText("Transaction Statement", PAGE_MARGIN, 764f, FONT_BOLD, 12f, Color.DARK_GRAY);

        writer.writeText(properties.institutionAddressLine(), PAGE_MARGIN, 742f, FONT_REGULAR, BODY_FONT_SIZE, Color.DARK_GRAY);
        writer.writeText(
            properties.institutionCity() + ", " + properties.institutionCountry(),
            PAGE_MARGIN,
            730f,
            FONT_REGULAR,
            BODY_FONT_SIZE,
            Color.DARK_GRAY
        );
        writer.writeText(
            "BIC: " + properties.institutionBic() + "  |  " + properties.supportEmail() + "  |  " + properties.supportPhone(),
            PAGE_MARGIN,
            718f,
            FONT_REGULAR,
            BODY_FONT_SIZE,
            Color.DARK_GRAY
        );

        writer.drawDivider(706f);

        writer.writeLabelValue("Generated", formatTimestamp(statement.generatedAt()), PAGE_MARGIN, 688f, 120f);
        writer.writeLabelValue("Statement period", formatPeriod(statement), PAGE_MARGIN, 674f, 120f);
        writer.writeLabelValue("Customer name", statement.customerName(), PAGE_MARGIN, 660f, 120f);
        writer.writeLabelValue("Username", statement.username(), PAGE_MARGIN, 646f, 120f);

        writer.writeLabelValue("Account name", statement.accountName(), 320f, 688f, 100f);
        writer.writeLabelValue("Account number", statement.accountNumber(), 320f, 674f, 100f);
        writer.writeLabelValue("IBAN", nullSafe(statement.iban()), 320f, 660f, 100f);
        writer.writeLabelValue("Account status", statement.accountStatus(), 320f, 646f, 100f);
        writer.writeLabelValue(
            "Type / currency",
            statement.accountType() + " / " + statement.accountCurrency(),
            320f,
            632f,
            100f
        );

        writer.moveCursorTo(612f);
    }

    private void drawStatementSummary(PageWriter writer, AccountStatement statement) throws IOException {
        writer.sectionTitle("Statement Summary");
        writer.detailRow("Transactions", Integer.toString(statement.transactionCount()));
        writer.detailRow("Opening balance", formatMoney(statement.openingBalance(), statement.accountCurrency()));
        writer.detailRow("Total money in", formatMoney(statement.totalCredits(), statement.accountCurrency()));
        writer.detailRow("Total money out", formatMoney(statement.totalDebits(), statement.accountCurrency()));
        writer.detailRow("Net movement", formatMoney(statement.netMovement(), statement.accountCurrency()));
        writer.detailRow("Closing balance", formatMoney(statement.closingBalance(), statement.accountCurrency()));
        writer.detailRow("Current balance", formatMoney(statement.currentBalance(), statement.accountCurrency()));
        writer.detailRow("Available balance", formatMoney(statement.availableBalance(), statement.accountCurrency()));
        writer.space(6f);
    }

    private void drawTransactions(PageWriter writer, AccountStatement statement) throws IOException {
        writer.sectionTitle("Booked Transactions");
        if (statement.transactions().isEmpty()) {
            writer.detailRow("Status", "No booked transactions were found for the selected period.");
            return;
        }

        int index = 1;
        for (AccountStatementTransaction transaction : statement.transactions()) {
            writer.ensureSpace(96f);
            writer.writeText(
                index + ". " + transaction.type() + " / " + transaction.direction(),
                PAGE_MARGIN,
                writer.currentY(),
                FONT_BOLD,
                10f,
                Color.BLACK
            );
            writer.writeText(
                formatMoney(transaction.amount(), transaction.currency()),
                410f,
                writer.currentY(),
                FONT_BOLD,
                10f,
                transaction.direction().equals("CREDIT") ? new Color(0, 102, 51) : new Color(153, 0, 0)
            );
            writer.moveCursor(-14f);

            writer.detailRow("Booking time", formatTimestamp(transaction.bookingTimestamp()));
            writer.detailRow("Value date", formatDate(transaction.valueDate()));
            writer.detailRow("Reference", transaction.transactionReference());
            writer.detailRow("External reference", nullSafe(transaction.externalReference()));
            writer.detailRow("Status", transaction.status());
            writer.detailRow("Description", transaction.description());
            writer.detailRow("Counterparty", joinCounterparty(transaction.counterpartyName(), transaction.counterpartyAccount()));
            writer.detailRow(
                "Balance after",
                formatMoney(transaction.balanceAfter(), transaction.currency())
            );

            if (transaction.fxRate() != null && transaction.fxReferenceAmount() != null && transaction.fxReferenceCurrency() != null) {
                writer.detailRow(
                    "FX details",
                    "Rate " + transaction.fxRate().toPlainString()
                        + " against "
                        + formatMoney(transaction.fxReferenceAmount(), transaction.fxReferenceCurrency())
                );
            }

            writer.drawDivider(writer.currentY() - 2f);
            writer.moveCursor(-10f);
            index++;
        }
    }

    private static String joinCounterparty(String name, String account) {
        String safeName = nullSafe(name);
        String safeAccount = nullSafe(account);
        if ("-".equals(safeName) && "-".equals(safeAccount)) {
            return "-";
        }
        return safeName + " / " + safeAccount;
    }

    private static String formatPeriod(AccountStatement statement) {
        String from = statement.fromDate() == null ? "Account opening" : formatDate(statement.fromDate());
        String to = statement.toDate() == null ? "Latest booked transaction" : formatDate(statement.toDate());
        return from + " to " + to;
    }

    private static String formatTimestamp(java.time.Instant timestamp) {
        return TIMESTAMP_FORMAT.format(timestamp);
    }

    private static String formatDate(java.time.LocalDate date) {
        return DATE_FORMAT.format(date);
    }

    private static String formatMoney(BigDecimal amount, String currency) {
        NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.US);
        numberFormat.setMinimumFractionDigits(2);
        numberFormat.setMaximumFractionDigits(2);
        return numberFormat.format(amount) + " " + currency;
    }

    private static String nullSafe(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.trim();
    }

    private static final class PageWriter {

        private final PDDocument document;
        private PDPage page;
        private PDPageContentStream stream;
        private float currentY;
        private int pageNumber;

        private PageWriter(PDDocument document) throws IOException {
            this.document = document;
            addPage();
        }

        float currentY() {
            return currentY;
        }

        void moveCursor(float deltaY) {
            currentY += deltaY;
        }

        void moveCursorTo(float y) {
            currentY = y;
        }

        void space(float amount) {
            currentY -= amount;
        }

        void sectionTitle(String title) throws IOException {
            ensureSpace(26f);
            writeText(title, PAGE_MARGIN, currentY, FONT_BOLD, 12f, new Color(19, 50, 78));
            currentY -= 14f;
            drawDivider(currentY + 4f);
            currentY -= 8f;
        }

        void detailRow(String label, String value) throws IOException {
            ensureSpace(14f);
            writeText(label + ":", PAGE_MARGIN, currentY, FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeText(value, PAGE_MARGIN + 92f, currentY, FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);
            currentY -= LINE_GAP;
        }

        void writeLabelValue(String label, String value, float x, float y, float labelWidth) throws IOException {
            writeText(label + ":", x, y, FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeText(value, x + labelWidth, y, FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);
        }

        void drawDivider(float y) throws IOException {
            stream.setStrokingColor(new Color(200, 205, 214));
            stream.moveTo(PAGE_MARGIN, y);
            stream.lineTo(PAGE_MARGIN + CONTENT_WIDTH, y);
            stream.stroke();
        }

        void ensureSpace(float requiredHeight) throws IOException {
            if (currentY - requiredHeight >= BOTTOM_MARGIN) {
                return;
            }
            addPage();
        }

        void writeText(String text, float x, float y, PDFont font, float fontSize, Color color) throws IOException {
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(x, y);
            stream.showText(text);
            stream.endText();
        }

        void close() throws IOException {
            if (stream != null) {
                stream.close();
            }
        }

        private void addPage() throws IOException {
            if (stream != null) {
                stream.close();
            }

            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            pageNumber++;
            currentY = 800f;

            writeText("Page " + pageNumber, PAGE_MARGIN + CONTENT_WIDTH - 40f, 18f, FONT_MONO, SMALL_FONT_SIZE, Color.GRAY);
        }
    }
}
