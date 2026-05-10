package com.ardit.banking.transaction.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TransferResponse(
    String transferReference,
    Long sourceAccountId,
    Long targetAccountId,
    String sourceCurrency,
    String targetCurrency,
    BigDecimal sourceAmount,
    BigDecimal targetAmount,
    BigDecimal appliedExchangeRate,
    BigDecimal sourceBalanceAfter,
    BigDecimal targetBalanceAfter,
    Instant bookedAt
) {
}
