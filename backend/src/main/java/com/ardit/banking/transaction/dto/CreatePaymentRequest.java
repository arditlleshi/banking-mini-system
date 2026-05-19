package com.ardit.banking.transaction.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePaymentRequest(
    @NotNull Long sourceAccountId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotBlank @Size(max = 280) String description,
    @NotBlank @Size(max = 140) String counterpartyName,
    @NotBlank @Size(max = 34) String counterpartyAccount,
    @Size(max = 64) String externalReference
) {
}
