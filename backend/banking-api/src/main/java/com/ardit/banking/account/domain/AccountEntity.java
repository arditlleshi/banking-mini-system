package com.ardit.banking.account.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.transaction.domain.TransactionEntity;

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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "accounts")
public class AccountEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_number", nullable = false, unique = true, length = 34)
    private String accountNumber;

    @Column(name = "iban", unique = true, length = 34)
    private String iban;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 30)
    private AccountType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", nullable = false, length = 3)
    private AccountCurrency currency;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;

    @Column(name = "current_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal currentBalance;

    @Column(name = "available_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal availableBalance;

    @Column(name = "overdraft_limit", nullable = false, precision = 19, scale = 2)
    private BigDecimal overdraftLimit;

    @Column(name = "annual_interest_rate", precision = 7, scale = 4)
    private BigDecimal annualInterestRate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private UserEntity owner;

    @OneToMany(mappedBy = "account", fetch = FetchType.LAZY)
    private Set<TransactionEntity> transactions = new LinkedHashSet<>();

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected AccountEntity() {
    }

    public static AccountEntity open(
        String accountNumber,
        String iban,
        AccountType type,
        AccountCurrency currency,
        String name,
        BigDecimal openingBalance,
        BigDecimal availableBalance,
        BigDecimal overdraftLimit,
        BigDecimal annualInterestRate,
        UserEntity owner
    ) {
        AccountEntity account = new AccountEntity();
        account.accountNumber = normalizeRequiredText(accountNumber, "accountNumber");
        account.iban = normalizeOptionalText(iban);
        account.type = Objects.requireNonNull(type, "type must not be null");
        account.currency = Objects.requireNonNull(currency, "currency must not be null");
        account.name = normalizeRequiredText(name, "name");
        account.status = AccountStatus.ACTIVE;
        account.currentBalance = normalizeMoney(openingBalance);
        account.availableBalance = normalizeMoney(availableBalance);
        account.overdraftLimit = normalizeMoney(overdraftLimit == null ? BigDecimal.ZERO : overdraftLimit);
        account.annualInterestRate = normalizeRate(annualInterestRate);
        account.owner = Objects.requireNonNull(owner, "owner must not be null");
        account.openedAt = Instant.now();
        return account;
    }

    public Long getId() {
        return id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getIban() {
        return iban;
    }

    public AccountType getType() {
        return type;
    }

    public AccountCurrency getCurrency() {
        return currency;
    }

    public String getName() {
        return name;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public BigDecimal getAvailableBalance() {
        return availableBalance;
    }

    public BigDecimal getOverdraftLimit() {
        return overdraftLimit;
    }

    public BigDecimal getAnnualInterestRate() {
        return annualInterestRate;
    }

    public UserEntity getOwner() {
        return owner;
    }

    public Set<TransactionEntity> getTransactions() {
        return Collections.unmodifiableSet(transactions);
    }

    public Instant getOpenedAt() {
        return openedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void rename(String name) {
        this.name = normalizeRequiredText(name, "name");
    }

    public void updateBalances(BigDecimal currentBalance, BigDecimal availableBalance) {
        this.currentBalance = normalizeMoney(currentBalance);
        this.availableBalance = normalizeMoney(availableBalance);
    }

    public void debit(BigDecimal amount) {
        ensureOperational();
        BigDecimal normalizedAmount = normalizePositiveMoney(amount, "amount");
        BigDecimal nextAvailableBalance = availableBalance.subtract(normalizedAmount);
        BigDecimal allowedFloor = overdraftLimit.negate();
        if (nextAvailableBalance.compareTo(allowedFloor) < 0) {
            throw new IllegalStateException("Insufficient available balance");
        }

        currentBalance = currentBalance.subtract(normalizedAmount);
        availableBalance = nextAvailableBalance;
    }

    public void credit(BigDecimal amount) {
        ensureOperational();
        BigDecimal normalizedAmount = normalizePositiveMoney(amount, "amount");
        currentBalance = currentBalance.add(normalizedAmount);
        availableBalance = availableBalance.add(normalizedAmount);
    }

    public void updateOverdraftLimit(BigDecimal overdraftLimit) {
        this.overdraftLimit = normalizeMoney(overdraftLimit);
    }

    public void updateAnnualInterestRate(BigDecimal annualInterestRate) {
        this.annualInterestRate = normalizeRate(annualInterestRate);
    }

    public void block() {
        this.status = AccountStatus.BLOCKED;
    }

    public void markDormant() {
        this.status = AccountStatus.DORMANT;
    }

    public void close(Instant closedAt) {
        this.status = AccountStatus.CLOSED;
        this.closedAt = closedAt == null ? Instant.now() : closedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (openedAt == null) {
            openedAt = now;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    private static BigDecimal normalizeMoney(BigDecimal amount) {
        return Objects.requireNonNull(amount, "amount must not be null").setScale(2, RoundingMode.HALF_EVEN);
    }

    private static BigDecimal normalizePositiveMoney(BigDecimal amount, String fieldName) {
        BigDecimal normalizedAmount = normalizeMoney(amount);
        if (normalizedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than zero");
        }
        return normalizedAmount;
    }

    private void ensureOperational() {
        if (status != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Account is not active");
        }
    }

    private static BigDecimal normalizeRate(BigDecimal rate) {
        if (rate == null) {
            return null;
        }
        return rate.setScale(4, RoundingMode.HALF_EVEN);
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
