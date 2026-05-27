package com.ardit.banking.account.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AccountHistoryTransactionResponse(
    Long id,
    String transactionReference,
    String type,
    String direction,
    String currency,
    BigDecimal amount,
    String description,
    String counterpartyName,
    String counterpartyAccount,
    Instant bookingTimestamp
) {
}
