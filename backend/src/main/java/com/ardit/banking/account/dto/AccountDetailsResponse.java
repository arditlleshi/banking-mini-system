package com.ardit.banking.account.dto;

import java.math.BigDecimal;
import java.util.List;

public record AccountDetailsResponse(
    AccountResponse account,
    int transactionCount,
    BigDecimal totalCredits,
    BigDecimal totalDebits,
    BigDecimal netMovement,
    List<AccountHistoryTransactionResponse> transactions
) {
}
