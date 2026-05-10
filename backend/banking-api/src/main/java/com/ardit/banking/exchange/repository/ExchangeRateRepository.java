package com.ardit.banking.exchange.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRateEntity, Long> {

    Optional<ExchangeRateEntity> findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
        AccountCurrency baseCurrency,
        AccountCurrency quoteCurrency,
        Instant effectiveAt
    );
}
