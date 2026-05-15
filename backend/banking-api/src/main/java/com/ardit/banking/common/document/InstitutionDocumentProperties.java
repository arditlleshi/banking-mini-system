package com.ardit.banking.common.document;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "banking.statement")
public record InstitutionDocumentProperties(
    String institutionName,
    String institutionAddressLine,
    String institutionCity,
    String institutionCountry,
    String institutionBic,
    String supportEmail,
    String supportPhone
) {

    public InstitutionDocumentProperties {
        institutionName = normalize(institutionName, "Banking Mini System");
        institutionAddressLine = normalize(institutionAddressLine, "Rruga e Bankes 1");
        institutionCity = normalize(institutionCity, "Tirane");
        institutionCountry = normalize(institutionCountry, "Albania");
        institutionBic = normalize(institutionBic, "BMSIALTR");
        supportEmail = normalize(supportEmail, "support@banking.local");
        supportPhone = normalize(supportPhone, "+355 4 000 0000");
    }

    public String institutionCityCountry() {
        return institutionCity + ", " + institutionCountry;
    }

    private static String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
