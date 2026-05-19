package com.ardit.banking.account.paymentdetails;

import java.time.Instant;

public record AccountPaymentDetailsDocument(
    Long accountId,
    String beneficiaryName,
    String accountName,
    String accountNumber,
    String iban,
    String bic,
    String institutionName,
    String institutionAddressLine,
    String institutionCityCountry,
    String currency,
    Instant generatedAt
) {
}
