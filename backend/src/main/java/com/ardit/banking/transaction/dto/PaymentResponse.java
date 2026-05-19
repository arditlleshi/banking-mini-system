package com.ardit.banking.transaction.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
    String paymentReference,
    Long sourceAccountId,
    String currency,
    BigDecimal amount,
    String description,
    String counterpartyName,
    String counterpartyAccount,
    BigDecimal balanceAfter,
    Instant bookedAt
) {
}
