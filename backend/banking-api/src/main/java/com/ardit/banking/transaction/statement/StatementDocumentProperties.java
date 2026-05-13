package com.ardit.banking.transaction.statement;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "banking.statement")
public record StatementDocumentProperties(
    String institutionName,
    String institutionAddressLine,
    String institutionCity,
    String institutionCountry,
    String institutionBic,
    String supportEmail,
    String supportPhone
) {

    public StatementDocumentProperties {
        institutionName = normalize(institutionName, "Banking Mini System");
        institutionAddressLine = normalize(institutionAddressLine, "Rruga e Bankes 1");
        institutionCity = normalize(institutionCity, "Tirane");
        institutionCountry = normalize(institutionCountry, "Albania");
        institutionBic = normalize(institutionBic, "BMSIALTR");
        supportEmail = normalize(supportEmail, "support@banking.local");
        supportPhone = normalize(supportPhone, "+355 4 000 0000");
    }

    private static String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
