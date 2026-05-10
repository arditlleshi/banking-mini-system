package com.ardit.banking.account.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "banking.account.numbering")
public record AccountNumberingProperties(
    String countryCode,
    String bankCode,
    int localAccountNumberLength,
    int ibanAccountNumberLength,
    int baseNumberLength,
    int serialLength
) {
}
