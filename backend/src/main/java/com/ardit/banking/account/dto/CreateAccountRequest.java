package com.ardit.banking.account.dto;

import java.math.BigDecimal;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAccountRequest(
    @NotNull AccountType type,
    @NotNull AccountCurrency currency,
    @NotBlank @Size(max = 120) String name,
    @NotNull @DecimalMin(value = "0.00") BigDecimal initialDeposit
) {
}
