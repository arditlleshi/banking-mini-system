package com.ardit.banking.exchange.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;
import com.ardit.banking.exchange.dto.ExchangeRateResponse;
import com.ardit.banking.exchange.dto.UpsertExchangeRateRequest;
import com.ardit.banking.exchange.repository.ExchangeRateRepository;

@Service
public class ExchangeRateService {

    private final ExchangeRateRepository exchangeRateRepository;

    public ExchangeRateService(ExchangeRateRepository exchangeRateRepository) {
        this.exchangeRateRepository = exchangeRateRepository;
    }

    @Transactional
    public ExchangeRateResponse createExchangeRate(UpsertExchangeRateRequest request) {
        ExchangeRateEntity entity = ExchangeRateEntity.create(
            request.baseCurrency(),
            request.quoteCurrency(),
            request.buyRate(),
            request.sellRate(),
            request.source(),
            request.validFrom()
        );
        return toResponse(exchangeRateRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateResponse> getExchangeRates() {
        return exchangeRateRepository.findAll().stream()
            .map(ExchangeRateService::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public FxQuote getRequiredFxQuote(AccountCurrency sourceCurrency, AccountCurrency targetCurrency, Instant effectiveAt) {
        if (sourceCurrency == targetCurrency) {
            return new FxQuote(
                sourceCurrency,
                targetCurrency,
                BigDecimal.ONE.setScale(8, RoundingMode.HALF_EVEN),
                "PAR",
                BigDecimal.ONE.setScale(8, RoundingMode.HALF_EVEN)
            );
        }

        if (sourceCurrency == AccountCurrency.ALL) {
            ExchangeRateEntity targetRate = getLekPair(targetCurrency, effectiveAt);
            return new FxQuote(
                sourceCurrency,
                targetCurrency,
                BigDecimal.ONE.divide(targetRate.getSellRate(), 8, RoundingMode.HALF_EVEN),
                "SELL",
                targetRate.getSellRate()
            );
        }

        if (targetCurrency == AccountCurrency.ALL) {
            ExchangeRateEntity sourceRate = getLekPair(sourceCurrency, effectiveAt);
            return new FxQuote(
                sourceCurrency,
                targetCurrency,
                sourceRate.getBuyRate(),
                "BUY",
                sourceRate.getBuyRate()
            );
        }

        ExchangeRateEntity sourceRate = getLekPair(sourceCurrency, effectiveAt);
        ExchangeRateEntity targetRate = getLekPair(targetCurrency, effectiveAt);
        return new FxQuote(
            sourceCurrency,
            targetCurrency,
            sourceRate.getBuyRate().divide(targetRate.getSellRate(), 8, RoundingMode.HALF_EVEN),
            "CROSS_VIA_ALL",
            sourceRate.getBuyRate().divide(targetRate.getSellRate(), 8, RoundingMode.HALF_EVEN)
        );
    }

    private ExchangeRateEntity getLekPair(AccountCurrency foreignCurrency, Instant effectiveAt) {
        return exchangeRateRepository
            .findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
                foreignCurrency,
                AccountCurrency.ALL,
                effectiveAt
            )
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No exchange rate configured for " + foreignCurrency + " to ALL"
            ));
    }

    private static ExchangeRateResponse toResponse(ExchangeRateEntity entity) {
        return new ExchangeRateResponse(
            entity.getId(),
            entity.getBaseCurrency().name(),
            entity.getQuoteCurrency().name(),
            entity.getBuyRate(),
            entity.getSellRate(),
            entity.getSource(),
            entity.getValidFrom(),
            entity.getUpdatedAt()
        );
    }

    public record FxQuote(
        AccountCurrency baseCurrency,
        AccountCurrency quoteCurrency,
        BigDecimal rate,
        String pricingMode,
        BigDecimal marketRateUsed
    ) {
    }
}
