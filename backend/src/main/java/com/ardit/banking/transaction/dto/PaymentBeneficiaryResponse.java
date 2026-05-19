package com.ardit.banking.transaction.dto;

public record PaymentBeneficiaryResponse(
    Long accountId,
    String accountNumber,
    String iban,
    String beneficiaryName,
    String accountName,
    String currency
) {
}
