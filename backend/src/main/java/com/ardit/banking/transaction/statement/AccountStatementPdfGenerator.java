package com.ardit.banking.transaction.statement;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Locale;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import com.ardit.banking.common.document.InstitutionDocumentProperties;
import com.ardit.banking.transaction.domain.TransactionDirection;

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
    private static final float TABLE_FONT_SIZE = 7f;
    private static final float TABLE_LINE_HEIGHT = 9f;
    private static final float CELL_TEXT_PADDING = 2f;
    private static final float MONEY_CELL_PADDING = 12f;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM uuuu");
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("dd MMM uuuu HH:mm:ss")
        .withZone(ZoneId.systemDefault());
    private static final float[] TRANSACTION_COLUMN_WIDTHS = new float[] {84f, 128f, 58f, 62f, 52f, 52f, 77f};

    private final InstitutionDocumentProperties properties;

    public AccountStatementPdfGenerator(InstitutionDocumentProperties properties) {
        this.properties = properties;
    }

    public byte[] generate(AccountStatement statement) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PageWriter writer = new PageWriter(document);

            drawHeader(writer, statement);
            drawTransactions(writer, statement);
            drawStatementSummary(writer, statement);

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
        String directionSuffix = statement.directionFilter() == null
            ? ""
            : "-" + statement.directionFilter().name().toLowerCase(Locale.ROOT);
        return "statement-" + statement.accountNumber() + "-" + fromDate + "-to-" + toDate + directionSuffix + ".pdf";
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

        writer.writeLabelValue("Statement date", formatDate(statement.generatedAt()), PAGE_MARGIN, 688f, 120f);
        writer.writeLabelValue("Statement period", formatPeriod(statement), PAGE_MARGIN, 674f, 120f);
        writer.writeLabelValue("Customer name", statement.customerName(), PAGE_MARGIN, 660f, 120f);
        writer.writeLabelValue("Username", statement.username(), PAGE_MARGIN, 646f, 120f);
        writer.writeLabelValue("Transaction type", formatDirectionFilter(statement.directionFilter()), PAGE_MARGIN, 632f, 120f);

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

        writer.moveCursorTo(596f);
    }

    private void drawStatementSummary(PageWriter writer, AccountStatement statement) throws IOException {
        writer.space(18f);
        writer.sectionTitle("Statement Summary");
        writer.drawSummaryBlock(statement);
    }

    private void drawTransactions(PageWriter writer, AccountStatement statement) throws IOException {
        writer.sectionTitle("Transactions");
        if (statement.transactions().isEmpty()) {
            writer.detailRow("Status", "No booked transactions were found for the selected filters.");
            return;
        }

        writer.ensureSpace(24f);
        writer.drawTransactionHeader();
        for (AccountStatementTransaction transaction : statement.transactions()) {
            List<String> bookingDateLines = wrapText(
                formatTimestamp(transaction.bookingTimestamp()),
                TRANSACTION_COLUMN_WIDTHS[0] - 2f,
                FONT_REGULAR,
                TABLE_FONT_SIZE
            );
            List<String> descriptionLines = buildDescriptionLines(transaction);
            float rowHeight = Math.max(
                TABLE_LINE_HEIGHT + 4f,
                Math.max(bookingDateLines.size(), descriptionLines.size()) * TABLE_LINE_HEIGHT + 6f
            );
            writer.ensureSpace(rowHeight + 6f);
            writer.drawTransactionRow(transaction, bookingDateLines, descriptionLines, rowHeight);
        }
    }

    private static List<String> buildDescriptionLines(AccountStatementTransaction transaction) throws IOException {
        List<String> lines = new ArrayList<>();

        String fromLine = "From: " + joinCounterparty(transaction.counterpartyName(), transaction.counterpartyAccount());
        String detailsLine = "Details: " + nullSafe(transaction.description());

        lines.addAll(wrapText(fromLine, TRANSACTION_COLUMN_WIDTHS[1] - 2f, FONT_REGULAR, TABLE_FONT_SIZE));
        lines.addAll(wrapText(detailsLine, TRANSACTION_COLUMN_WIDTHS[1] - 2f, FONT_REGULAR, TABLE_FONT_SIZE));
        return lines;
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
        String from = statement.fromDate() == null ? formatDate(statement.accountOpenedAt()) : formatDate(statement.fromDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        String to = statement.toDate() == null ? formatDate(statement.generatedAt()) : formatDate(statement.toDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        return from + " to " + to;
    }

    private static String formatDirectionFilter(TransactionDirection directionFilter) {
        if (directionFilter == null) {
            return "All transactions";
        }

        return directionFilter == TransactionDirection.CREDIT
            ? "Incoming (credit)"
            : "Outgoing (debit)";
    }

    private static String formatTimestamp(java.time.Instant timestamp) {
        return TIMESTAMP_FORMAT.format(timestamp);
    }

    private static String formatDate(LocalDate date) {
        return DATE_FORMAT.format(date);
    }

    private static String formatDate(java.time.Instant timestamp) {
        return DATE_FORMAT.format(timestamp.atZone(ZoneId.systemDefault()).toLocalDate());
    }

    private static String formatAmount(BigDecimal amount) {
        NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.US);
        numberFormat.setMinimumFractionDigits(2);
        numberFormat.setMaximumFractionDigits(2);
        return numberFormat.format(amount);
    }

    private static BigDecimal blockedAmount(AccountStatement statement) {
        BigDecimal blocked = statement.currentBalance().subtract(statement.availableBalance());
        return blocked.signum() < 0 ? BigDecimal.ZERO : blocked;
    }

    private static int countTransactions(AccountStatement statement, String direction) {
        int count = 0;
        for (AccountStatementTransaction transaction : statement.transactions()) {
            if (direction.equals(transaction.direction())) {
                count++;
            }
        }
        return count;
    }

    private static String nullSafe(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.trim();
    }

    private static String shortReference(String value) {
        String reference = nullSafe(value);
        if ("-".equals(reference) || reference.length() <= 6) {
            return reference;
        }
        return reference.substring(0, 6);
    }

    private static List<String> wrapText(String value, float maxWidth, PDFont font, float fontSize) throws IOException {
        String normalized = nullSafe(value);
        if ("-".equals(normalized)) {
            return List.of("-");
        }

        String[] words = normalized.split("\\s+");
        List<String> lines = new ArrayList<>();
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.isEmpty() ? word : currentLine + " " + word;
            if (textWidth(candidate, font, fontSize) <= maxWidth || currentLine.isEmpty()) {
                if (!currentLine.isEmpty()) {
                    currentLine.append(' ');
                }
                currentLine.append(word);
            } else {
                lines.add(currentLine.toString());
                currentLine = new StringBuilder(word);
            }
        }

        if (!currentLine.isEmpty()) {
            lines.add(currentLine.toString());
        }

        return lines;
    }

    private static float textWidth(String text, PDFont font, float fontSize) throws IOException {
        return font.getStringWidth(text) / 1000f * fontSize;
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

        void drawSummaryBlock(AccountStatement statement) throws IOException {
            String debitCount = "(" + countTransactions(statement, "DEBIT") + ")";
            String creditCount = "(" + countTransactions(statement, "CREDIT") + ")";
            String debitAmount = formatAmount(statement.totalDebits());
            String creditAmount = formatAmount(statement.totalCredits());
            String blockedAmount = formatAmount(blockedAmount(statement));
            String availableAmount = formatAmount(statement.availableBalance());

            float labelColumnWidth = maxTextWidth(FONT_BOLD, BODY_FONT_SIZE, "Debit amount:", "Credit amount:", "Blocked amount:", "Available amount:");
            float countColumnWidth = maxTextWidth(FONT_REGULAR, BODY_FONT_SIZE, debitCount, creditCount);
            float amountColumnWidth = maxTextWidth(FONT_REGULAR, BODY_FONT_SIZE, debitAmount, creditAmount, blockedAmount, availableAmount);
            float blockPaddingX = 10f;
            float blockPaddingY = 8f;
            float labelGap = 12f;
            float countGap = 14f;
            float blockWidth = blockPaddingX * 2f + labelColumnWidth + labelGap + countColumnWidth + countGap + amountColumnWidth;
            float blockHeight = (3f * LINE_GAP) + (blockPaddingY * 2f);

            ensureSpace(blockHeight + 4f);

            float firstRowY = currentY;
            float labelX = PAGE_MARGIN + blockPaddingX;
            float countRightX = labelX + labelColumnWidth + labelGap + countColumnWidth;
            float amountRightX = PAGE_MARGIN + blockWidth - blockPaddingX;

            writeText("Debit amount:", labelX, firstRowY, FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(debitCount, countRightX, firstRowY, FONT_REGULAR, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(debitAmount, amountRightX, firstRowY, FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);

            writeText("Credit amount:", labelX, firstRowY - LINE_GAP, FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(creditCount, countRightX, firstRowY - LINE_GAP, FONT_REGULAR, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(creditAmount, amountRightX, firstRowY - LINE_GAP, FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);

            writeText("Blocked amount:", labelX, firstRowY - (2f * LINE_GAP), FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(blockedAmount, amountRightX, firstRowY - (2f * LINE_GAP), FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);

            writeText("Available amount:", labelX, firstRowY - (3f * LINE_GAP), FONT_BOLD, BODY_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedText(availableAmount, amountRightX, firstRowY - (3f * LINE_GAP), FONT_REGULAR, BODY_FONT_SIZE, Color.BLACK);

            currentY = firstRowY - (4f * LINE_GAP) - 8f;
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

        void writeRightAlignedText(String text, float rightEdgeX, float y, PDFont font, float fontSize, Color color)
            throws IOException {
            float x = rightEdgeX - textWidth(text, font, fontSize);
            writeText(text, x, y, font, fontSize, color);
        }

        private float maxTextWidth(PDFont font, float fontSize, String... values) throws IOException {
            float maxWidth = 0f;
            for (String value : values) {
                float width = textWidth(value, font, fontSize);
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
            return maxWidth;
        }

        void drawTransactionHeader() throws IOException {
            float top = currentY;
            drawCellBackground(top + 4f, 20f, new Color(236, 239, 243));
            writeTableHeaderCell("DATE", 0);
            writeTableHeaderCell("DESCRIPTION", 1);
            writeTableHeaderCell("REFERENCE", 2);
            writeTableHeaderCell("VALUE DATE", 3);
            writeTableHeaderCell("DEBIT", 4);
            writeTableHeaderCell("CREDIT", 5);
            writeTableHeaderCell("BALANCE", 6);
            currentY -= 18f;
            drawDivider(currentY + 4f);
            currentY -= 4f;
        }

        void drawTransactionRow(
            AccountStatementTransaction transaction,
            List<String> bookingDateLines,
            List<String> descriptionLines,
            float rowHeight
        ) throws IOException {
            float top = currentY;
            ensureSpace(rowHeight + 8f);

            String debit = transaction.direction().equals("DEBIT") ? formatAmount(transaction.amount()) : "-";
            String credit = transaction.direction().equals("CREDIT") ? formatAmount(transaction.amount()) : "-";
            Color debitCreditColor = transaction.direction().equals("CREDIT") ? new Color(0, 102, 51) : new Color(153, 0, 0);

            writeCenteredCell(bookingDateLines, 0, top, rowHeight, FONT_REGULAR, TABLE_FONT_SIZE, Color.DARK_GRAY);
            writeWrappedCell(descriptionLines, 1, top, rowHeight, FONT_REGULAR, TABLE_FONT_SIZE, Color.BLACK);
            writeCenteredCellText(shortReference(transaction.transactionReference()), 2, top, rowHeight, FONT_MONO, TABLE_FONT_SIZE, Color.BLACK);
            writeCenteredCellText(formatDate(transaction.valueDate()), 3, top, rowHeight, FONT_REGULAR, TABLE_FONT_SIZE, Color.DARK_GRAY);
            writeRightAlignedCellText(debit, 4, top, rowHeight, FONT_BOLD, TABLE_FONT_SIZE, debitCreditColor);
            writeRightAlignedCellText(credit, 5, top, rowHeight, FONT_BOLD, TABLE_FONT_SIZE, debitCreditColor);
            writeRightAlignedCellText(formatAmount(transaction.balanceAfter()), 6, top, rowHeight, FONT_BOLD, TABLE_FONT_SIZE, Color.BLACK);

            currentY -= rowHeight + 4f;
            drawDivider(currentY + 4f);
        }

        private void drawCellBackground(float y, float height, Color color) throws IOException {
            stream.setNonStrokingColor(color);
            stream.addRect(PAGE_MARGIN, y - height, CONTENT_WIDTH, height);
            stream.fill();
        }

        private void writeTableHeaderCell(String text, int columnIndex) throws IOException {
            float x = columnX(columnIndex);
            float width = TRANSACTION_COLUMN_WIDTHS[columnIndex];
            float y = currentY;
            if (columnIndex == 1) {
                writeText(text, x + CELL_TEXT_PADDING, y, FONT_BOLD, TABLE_FONT_SIZE, new Color(60, 70, 82));
                return;
            }

            if (columnIndex >= 4) {
                writeRightAlignedText(text, x + width - MONEY_CELL_PADDING, y, FONT_BOLD, TABLE_FONT_SIZE, new Color(60, 70, 82));
                return;
            }

            float centeredX = x + (width - textWidth(text, FONT_BOLD, TABLE_FONT_SIZE)) / 2f;
            writeText(text, centeredX, y, FONT_BOLD, TABLE_FONT_SIZE, new Color(60, 70, 82));
        }

        private void writeCenteredCell(
            List<String> lines,
            int columnIndex,
            float top,
            float rowHeight,
            PDFont font,
            float fontSize,
            Color color
        ) throws IOException {
            float x = columnX(columnIndex);
            float y = top - 10f;
            int maxLines = Math.min(lines.size(), Math.max(1, (int) (rowHeight / TABLE_LINE_HEIGHT)));
            for (int lineIndex = 0; lineIndex < maxLines; lineIndex++) {
                String line = lines.get(lineIndex);
                float lineY = y - (lineIndex * TABLE_LINE_HEIGHT);
                float lineX = x + (TRANSACTION_COLUMN_WIDTHS[columnIndex] - textWidth(line, font, fontSize)) / 2f;
                stream.beginText();
                stream.setNonStrokingColor(color);
                stream.setFont(font, fontSize);
                stream.newLineAtOffset(lineX, lineY);
                stream.showText(line);
                stream.endText();
            }
        }

        private void writeCenteredCellText(
            String text,
            int columnIndex,
            float top,
            float rowHeight,
            PDFont font,
            float fontSize,
            Color color
        ) throws IOException {
            List<String> lines = wrapText(text, TRANSACTION_COLUMN_WIDTHS[columnIndex] - 2f, font, fontSize);
            writeCenteredCell(lines, columnIndex, top, rowHeight, font, fontSize, color);
        }

        private void writeRightAlignedCellText(
            String text,
            int columnIndex,
            float top,
            float rowHeight,
            PDFont font,
            float fontSize,
            Color color
        ) throws IOException {
            float x = columnX(columnIndex);
            float y = top - 10f;
            float lineX = x + TRANSACTION_COLUMN_WIDTHS[columnIndex] - textWidth(text, font, fontSize) - MONEY_CELL_PADDING;
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(lineX, y);
            stream.showText(text);
            stream.endText();
        }

        private void writeWrappedCell(List<String> lines, int columnIndex, float top, float rowHeight, PDFont font, float fontSize, Color color)
            throws IOException {
            float x = columnX(columnIndex);
            float y = top - 10f;
            int maxLines = Math.min(lines.size(), Math.max(1, (int) (rowHeight / TABLE_LINE_HEIGHT)));
            for (int lineIndex = 0; lineIndex < maxLines; lineIndex++) {
                float lineY = y - (lineIndex * TABLE_LINE_HEIGHT);
                stream.beginText();
                stream.setNonStrokingColor(color);
                stream.setFont(font, fontSize);
                stream.newLineAtOffset(x, lineY);
                stream.showText(lines.get(lineIndex));
                stream.endText();
            }
        }

        private float columnX(int columnIndex) {
            float x = PAGE_MARGIN;
            for (int index = 0; index < columnIndex; index++) {
                x += TRANSACTION_COLUMN_WIDTHS[index];
            }
            return x;
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
