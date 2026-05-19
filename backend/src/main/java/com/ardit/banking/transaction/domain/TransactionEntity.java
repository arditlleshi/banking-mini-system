package com.ardit.banking.transaction.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "transactions")
public class TransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private AccountEntity account;

    @Column(name = "transaction_reference", nullable = false, unique = true, length = 64)
    private String transactionReference;

    @Column(name = "external_reference", length = 64)
    private String externalReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_status", nullable = false, length = 20)
    private TransactionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 10)
    private TransactionDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", nullable = false, length = 3)
    private AccountCurrency currency;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 280)
    private String description;

    @Column(name = "counterparty_name", length = 140)
    private String counterpartyName;

    @Column(name = "counterparty_account", length = 34)
    private String counterpartyAccount;

    @Column(name = "booking_timestamp", nullable = false)
    private Instant bookingTimestamp;

    @Column(name = "value_date", nullable = false)
    private LocalDate valueDate;

    @Column(name = "balance_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "fx_rate", precision = 19, scale = 8)
    private BigDecimal fxRate;

    @Column(name = "fx_reference_amount", precision = 19, scale = 2)
    private BigDecimal fxReferenceAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "fx_reference_currency", length = 3)
    private AccountCurrency fxReferenceCurrency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TransactionEntity() {
    }

    public static TransactionEntity book(
        AccountEntity account,
        String transactionReference,
        String externalReference,
        TransactionType type,
        TransactionStatus status,
        TransactionDirection direction,
        AccountCurrency currency,
        BigDecimal amount,
        String description,
        String counterpartyName,
        String counterpartyAccount,
        Instant bookingTimestamp,
        LocalDate valueDate,
        BigDecimal balanceAfter,
        BigDecimal fxRate,
        BigDecimal fxReferenceAmount,
        AccountCurrency fxReferenceCurrency
    ) {
        TransactionEntity transaction = new TransactionEntity();
        transaction.account = Objects.requireNonNull(account, "account must not be null");
        transaction.transactionReference = normalizeRequiredText(transactionReference, "transactionReference");
        transaction.externalReference = normalizeOptionalText(externalReference);
        transaction.type = Objects.requireNonNull(type, "type must not be null");
        transaction.status = Objects.requireNonNull(status, "status must not be null");
        transaction.direction = Objects.requireNonNull(direction, "direction must not be null");
        transaction.currency = Objects.requireNonNull(currency, "currency must not be null");
        transaction.amount = normalizeMoney(amount);
        transaction.description = normalizeRequiredText(description, "description");
        transaction.counterpartyName = normalizeOptionalText(counterpartyName);
        transaction.counterpartyAccount = normalizeOptionalText(counterpartyAccount);
        transaction.bookingTimestamp = Objects.requireNonNull(bookingTimestamp, "bookingTimestamp must not be null");
        transaction.valueDate = Objects.requireNonNull(valueDate, "valueDate must not be null");
        transaction.balanceAfter = normalizeMoney(balanceAfter);
        transaction.fxRate = normalizeOptionalRate(fxRate);
        transaction.fxReferenceAmount = normalizeOptionalMoney(fxReferenceAmount);
        transaction.fxReferenceCurrency = fxReferenceCurrency;
        return transaction;
    }

    public Long getId() {
        return id;
    }

    public AccountEntity getAccount() {
        return account;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public TransactionType getType() {
        return type;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public TransactionDirection getDirection() {
        return direction;
    }

    public AccountCurrency getCurrency() {
        return currency;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public String getCounterpartyName() {
        return counterpartyName;
    }

    public String getCounterpartyAccount() {
        return counterpartyAccount;
    }

    public Instant getBookingTimestamp() {
        return bookingTimestamp;
    }

    public LocalDate getValueDate() {
        return valueDate;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public BigDecimal getFxRate() {
        return fxRate;
    }

    public BigDecimal getFxReferenceAmount() {
        return fxReferenceAmount;
    }

    public AccountCurrency getFxReferenceCurrency() {
        return fxReferenceCurrency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    private static BigDecimal normalizeMoney(BigDecimal amount) {
        return Objects.requireNonNull(amount, "amount must not be null").setScale(2, RoundingMode.HALF_EVEN);
    }

    private static BigDecimal normalizeOptionalMoney(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        return amount.setScale(2, RoundingMode.HALF_EVEN);
    }

    private static BigDecimal normalizeOptionalRate(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(8, RoundingMode.HALF_EVEN);
    }

    private static String normalizeRequiredText(String value, String fieldName) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return normalized;
    }

    private static String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
