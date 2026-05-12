package com.ardit.banking.account.dto;

import java.math.BigDecimal;
import java.util.List;

import com.ardit.banking.transaction.dto.TransactionResponse;

public record AccountDetailsResponse(
    AccountResponse account,
    int transactionCount,
    BigDecimal totalCredits,
    BigDecimal totalDebits,
    BigDecimal netMovement,
    List<TransactionResponse> transactions
) {
}
