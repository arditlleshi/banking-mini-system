package com.ardit.banking.account.paymentdetails;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import com.ardit.banking.common.document.InstitutionDocumentProperties;

@Component
public class AccountPaymentDetailsPdfGenerator {

    private static final PDFont FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDFont FONT_MONO_BOLD = new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
    private static final float PAGE_MARGIN = 42f;
    private static final float CONTENT_WIDTH = PDRectangle.A4.getWidth() - (PAGE_MARGIN * 2f);
    private static final Color BRAND_COLOR = new Color(19, 50, 78);
    private static final Color TEXT_MUTED = new Color(79, 92, 105);
    private static final Color TEXT_DARK = new Color(32, 39, 46);
    private static final Color BORDER_SOFT = new Color(209, 216, 224);
    private static final Color PANEL_FILL = new Color(242, 245, 248);
    private static final float PANEL_CORNER_RADIUS = 8f;
    private static final DateTimeFormatter GENERATED_AT_FORMAT = DateTimeFormatter.ofPattern("dd MMM uuuu")
        .withZone(ZoneId.systemDefault());
    private final InstitutionDocumentProperties institutionDocumentProperties;

    public AccountPaymentDetailsPdfGenerator(InstitutionDocumentProperties institutionDocumentProperties) {
        this.institutionDocumentProperties = institutionDocumentProperties;
    }

    public byte[] generate(AccountPaymentDetailsDocument document) {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            pdf.addPage(page);

            try (PDPageContentStream stream = new PDPageContentStream(pdf, page)) {
                PageWriter writer = new PageWriter(stream);
                writer.drawHeader(document);
                writer.drawIbanPanel(document);
                writer.drawDetailsGrid(document);
                writer.drawFooter(document, institutionDocumentProperties);
            }

            pdf.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate payment details PDF", ex);
        }
    }

    public String buildFilename(AccountPaymentDetailsDocument document) {
        return "payment-details-" + document.accountNumber() + ".pdf";
    }

    private static final class PageWriter {

        private final PDPageContentStream stream;

        private PageWriter(PDPageContentStream stream) {
            this.stream = stream;
        }

        void drawHeader(AccountPaymentDetailsDocument document) throws IOException {
            writeText(document.institutionName(), PAGE_MARGIN, 786f, FONT_BOLD, 18f, BRAND_COLOR);
            writeText("Payment Details", PAGE_MARGIN, 763f, FONT_BOLD, 12f, TEXT_DARK);
            writeText(
                "Use these details to send money to this account.",
                PAGE_MARGIN,
                748f,
                FONT_REGULAR,
                9f,
                TEXT_MUTED
            );

            writeText(document.institutionAddressLine(), PAGE_MARGIN, 728f, FONT_REGULAR, 9f, TEXT_MUTED);
            writeText(document.institutionCityCountry(), PAGE_MARGIN, 715f, FONT_REGULAR, 9f, TEXT_MUTED);
            drawDivider(700f);
        }

        void drawIbanPanel(AccountPaymentDetailsDocument document) throws IOException {
            drawRoundedFilledBox(PAGE_MARGIN, 610f, CONTENT_WIDTH, 72f, PANEL_CORNER_RADIUS, PANEL_FILL, BORDER_SOFT);
            writeText("IBAN", PAGE_MARGIN + 16f, 660f, FONT_BOLD, 9f, TEXT_MUTED);
            writeText(formatIban(document.iban()), PAGE_MARGIN + 16f, 634f, FONT_MONO_BOLD, 18f, BRAND_COLOR);
        }

        void drawDetailsGrid(AccountPaymentDetailsDocument document) throws IOException {
            float leftX = PAGE_MARGIN;
            float rightX = PAGE_MARGIN + 274f;
            float startY = 582f;

            writeDetail("Beneficiary name", document.beneficiaryName(), leftX, startY, false);
            writeDetail("SWIFT / BIC", document.bic(), rightX, startY, true);

            writeDetail("Account number", document.accountNumber(), leftX, startY - 54f, true);
            writeDetail("Currency", document.currency(), rightX, startY - 54f, false);

            writeDetail("Account description", document.accountName(), leftX, startY - 108f, false);
            writeDetail("Bank name", document.institutionName(), rightX, startY - 108f, false);

            writeDetail("Bank address", document.institutionAddressLine(), leftX, startY - 162f, false);
            writeDetail("City / Country", document.institutionCityCountry(), rightX, startY - 162f, false);
        }

        void drawFooter(AccountPaymentDetailsDocument document, InstitutionDocumentProperties properties) throws IOException {
            drawDivider(132f);
            writeText(
                "Generated on " + GENERATED_AT_FORMAT.format(document.generatedAt()),
                PAGE_MARGIN,
                114f,
                FONT_REGULAR,
                8f,
                TEXT_MUTED
            );
            writeText(
                "Support: " + properties.supportEmail() + "  |  " + properties.supportPhone(),
                PAGE_MARGIN,
                100f,
                FONT_REGULAR,
                8f,
                TEXT_MUTED
            );
        }

        private void writeDetail(String label, String value, float x, float y, boolean monospaced) throws IOException {
            writeText(label.toUpperCase(), x, y, FONT_BOLD, 8f, TEXT_MUTED);
            writeText(value, x, y - 18f, monospaced ? FONT_MONO_BOLD : FONT_REGULAR, 11f, TEXT_DARK);
        }

        private void drawRoundedFilledBox(float x, float y, float width, float height, float radius, Color fill, Color stroke)
            throws IOException {
            stream.setNonStrokingColor(fill);
            appendRoundedRectPath(x, y, width, height, radius);
            stream.fill();

            stream.setStrokingColor(stroke);
            appendRoundedRectPath(x, y, width, height, radius);
            stream.stroke();
        }

        private void drawDivider(float y) throws IOException {
            stream.setStrokingColor(BORDER_SOFT);
            stream.moveTo(PAGE_MARGIN, y);
            stream.lineTo(PAGE_MARGIN + CONTENT_WIDTH, y);
            stream.stroke();
        }

        private void writeText(String text, float x, float y, PDFont font, float fontSize, Color color) throws IOException {
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(x, y);
            stream.showText(text);
            stream.endText();
        }

        private void appendRoundedRectPath(float x, float y, float width, float height, float radius) throws IOException {
            float clampedRadius = Math.min(radius, Math.min(width, height) / 2f);
            float control = clampedRadius * 0.55228475f;
            float maxX = x + width;
            float maxY = y + height;

            stream.moveTo(x + clampedRadius, y);
            stream.lineTo(maxX - clampedRadius, y);
            stream.curveTo(maxX - clampedRadius + control, y, maxX, y + clampedRadius - control, maxX, y + clampedRadius);
            stream.lineTo(maxX, maxY - clampedRadius);
            stream.curveTo(maxX, maxY - clampedRadius + control, maxX - clampedRadius + control, maxY, maxX - clampedRadius, maxY);
            stream.lineTo(x + clampedRadius, maxY);
            stream.curveTo(x + clampedRadius - control, maxY, x, maxY - clampedRadius + control, x, maxY - clampedRadius);
            stream.lineTo(x, y + clampedRadius);
            stream.curveTo(x, y + clampedRadius - control, x + clampedRadius - control, y, x + clampedRadius, y);
            stream.closePath();
        }

        private String formatIban(String iban) {
            String compactIban = iban.replaceAll("\\s+", "").trim();
            StringBuilder formatted = new StringBuilder(compactIban.length() + (compactIban.length() / 4));
            for (int index = 0; index < compactIban.length(); index++) {
                if (index > 0 && index % 4 == 0) {
                    formatted.append(' ');
                }
                formatted.append(compactIban.charAt(index));
            }
            return formatted.toString();
        }
    }
}
