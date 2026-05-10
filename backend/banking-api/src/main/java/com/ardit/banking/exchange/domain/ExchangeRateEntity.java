package com.ardit.banking.exchange.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

import com.ardit.banking.account.domain.AccountCurrency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "exchange_rates")
public class ExchangeRateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "base_currency", nullable = false, length = 3)
    private AccountCurrency baseCurrency;

    @Enumerated(EnumType.STRING)
    @Column(name = "quote_currency", nullable = false, length = 3)
    private AccountCurrency quoteCurrency;

    @Column(name = "buy_rate", nullable = false, precision = 19, scale = 8)
    private BigDecimal buyRate;

    @Column(name = "sell_rate", nullable = false, precision = 19, scale = 8)
    private BigDecimal sellRate;

    @Column(nullable = false, length = 80)
    private String source;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExchangeRateEntity() {
    }

    public static ExchangeRateEntity create(AccountCurrency baseCurrency, AccountCurrency quoteCurrency,
                                            BigDecimal buyRate, BigDecimal sellRate, String source, Instant validFrom) {
        ExchangeRateEntity entity = new ExchangeRateEntity();
        entity.baseCurrency = Objects.requireNonNull(baseCurrency, "baseCurrency must not be null");
        entity.quoteCurrency = Objects.requireNonNull(quoteCurrency, "quoteCurrency must not be null");
        if (entity.baseCurrency == entity.quoteCurrency) {
            throw new IllegalArgumentException("Base and quote currencies must differ");
        }
        entity.buyRate = normalizeRate(buyRate, "buyRate");
        entity.sellRate = normalizeRate(sellRate, "sellRate");
        if (entity.sellRate.compareTo(entity.buyRate) < 0) {
            throw new IllegalArgumentException("sellRate must be greater than or equal to buyRate");
        }
        entity.source = normalizeRequiredText(source, "source");
        entity.validFrom = Objects.requireNonNull(validFrom, "validFrom must not be null");
        return entity;
    }

    public Long getId() {
        return id;
    }

    public AccountCurrency getBaseCurrency() {
        return baseCurrency;
    }

    public AccountCurrency getQuoteCurrency() {
        return quoteCurrency;
    }

    public BigDecimal getBuyRate() {
        return buyRate;
    }

    public BigDecimal getSellRate() {
        return sellRate;
    }

    public String getSource() {
        return source;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(BigDecimal buyRate, BigDecimal sellRate, String source, Instant validFrom) {
        this.buyRate = normalizeRate(buyRate, "buyRate");
        this.sellRate = normalizeRate(sellRate, "sellRate");
        if (this.sellRate.compareTo(this.buyRate) < 0) {
            throw new IllegalArgumentException("sellRate must be greater than or equal to buyRate");
        }
        this.source = normalizeRequiredText(source, "source");
        this.validFrom = Objects.requireNonNull(validFrom, "validFrom must not be null");
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    private static BigDecimal normalizeRate(BigDecimal value, String fieldName) {
        BigDecimal normalized = Objects.requireNonNull(value, fieldName + " must not be null").setScale(8, RoundingMode.HALF_EVEN);
        if (normalized.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than zero");
        }
        return normalized;
    }

    private static String normalizeRequiredText(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value.trim();
    }
}
