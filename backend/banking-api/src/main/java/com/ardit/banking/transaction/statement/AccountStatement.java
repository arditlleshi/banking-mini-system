package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AccountStatement(
    Long accountId,
    String accountNumber,
    String iban,
    String accountName,
    String accountType,
    String accountCurrency,
    String accountStatus,
    BigDecimal currentBalance,
    BigDecimal availableBalance,
    String customerName,
    String username,
    LocalDate fromDate,
    LocalDate toDate,
    Instant generatedAt,
    int transactionCount,
    BigDecimal totalCredits,
    BigDecimal totalDebits,
    BigDecimal netMovement,
    BigDecimal openingBalance,
    BigDecimal closingBalance,
    List<AccountStatementTransaction> transactions
) {
}
