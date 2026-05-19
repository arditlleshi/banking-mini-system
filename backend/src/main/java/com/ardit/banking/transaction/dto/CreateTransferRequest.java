package com.ardit.banking.transaction.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTransferRequest(
    @NotNull Long sourceAccountId,
    @NotNull Long targetAccountId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotBlank @Size(max = 280) String description
) {
}
