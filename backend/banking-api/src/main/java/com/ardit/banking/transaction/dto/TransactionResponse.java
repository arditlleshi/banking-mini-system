package com.ardit.banking.transaction.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TransactionResponse(
    Long id,
    String transactionReference,
    String externalReference,
    String type,
    String status,
    String direction,
    String currency,
    BigDecimal amount,
    String description,
    String counterpartyName,
    String counterpartyAccount,
    Instant bookingTimestamp,
    LocalDate valueDate,
    BigDecimal balanceAfter,
    BigDecimal fxRate,
    BigDecimal fxReferenceAmount,
    String fxReferenceCurrency
) {
}
