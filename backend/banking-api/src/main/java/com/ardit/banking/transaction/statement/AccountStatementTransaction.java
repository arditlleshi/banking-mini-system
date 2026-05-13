package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.ardit.banking.transaction.dto.TransactionResponse;

public record AccountStatementTransaction(
    Long id,
    String transactionReference,
    String externalReference,
    String type,
    String status,
    String direction,
    String currency,
    BigDecimal amount,
    String description,
    String counterpartyName,
    String counterpartyAccount,
    Instant bookingTimestamp,
    LocalDate valueDate,
    BigDecimal balanceAfter,
    BigDecimal fxRate,
    BigDecimal fxReferenceAmount,
    String fxReferenceCurrency
) {

    public TransactionResponse toTransactionResponse() {
        return new TransactionResponse(
            id,
            transactionReference,
            externalReference,
            type,
            status,
            direction,
            currency,
            amount,
            description,
            counterpartyName,
            counterpartyAccount,
            bookingTimestamp,
            valueDate,
            balanceAfter,
            fxRate,
            fxReferenceAmount,
            fxReferenceCurrency
        );
    }
}
