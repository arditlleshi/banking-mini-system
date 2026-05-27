package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.util.List;

public record AccountStatementPage(
    int pageNumber,
    int pageSize,
    int transactionCount,
    BigDecimal totalCredits,
    BigDecimal totalDebits,
    BigDecimal netMovement,
    List<AccountStatementTransaction> transactions
) {
}
