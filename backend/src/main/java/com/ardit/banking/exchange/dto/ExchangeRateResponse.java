package com.ardit.banking.exchange.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ExchangeRateResponse(
    Long id,
    String baseCurrency,
    String quoteCurrency,
    BigDecimal buyRate,
    BigDecimal sellRate,
    String source,
    Instant validFrom,
    Instant updatedAt
) {
}
