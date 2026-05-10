package com.ardit.banking.exchange.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ardit.banking.account.domain.AccountCurrency;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertExchangeRateRequest(
    @NotNull AccountCurrency baseCurrency,
    @NotNull AccountCurrency quoteCurrency,
    @NotNull @DecimalMin(value = "0.00000001") BigDecimal buyRate,
    @NotNull @DecimalMin(value = "0.00000001") BigDecimal sellRate,
    @NotBlank @Size(max = 80) String source,
    @NotNull Instant validFrom
) {
}
