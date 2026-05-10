package com.ardit.banking.account.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AccountResponse(
    Long id,
    String accountNumber,
    String iban,
    String baseNumber,
    String accountClassCode,
    Integer serialNumber,
    String type,
    String currency,
    String name,
    String status,
    BigDecimal currentBalance,
    BigDecimal availableBalance,
    BigDecimal overdraftLimit,
    BigDecimal annualInterestRate,
    Instant openedAt,
    Instant closedAt
) {
}
