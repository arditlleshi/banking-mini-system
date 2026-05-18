package com.ardit.banking.account.dto;

public record AccountCurrencyDistributionResponse(
    String currency,
    long accountCount
) {
}
