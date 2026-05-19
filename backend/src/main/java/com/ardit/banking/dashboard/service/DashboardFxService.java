package com.ardit.banking.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;
import com.ardit.banking.exchange.repository.ExchangeRateRepository;

@Service
public class DashboardFxService {

    private static final int FX_SCALE = 8;

    private final ExchangeRateRepository exchangeRateRepository;

    public DashboardFxService(ExchangeRateRepository exchangeRateRepository) {
        this.exchangeRateRepository = exchangeRateRepository;
    }

    DashboardFxTimelineResolver createResolver(Set<AccountCurrency> involvedCurrencies, Instant effectiveAt) {
        Set<AccountCurrency> currenciesRequiringRates = involvedCurrencies.stream()
            .filter(currency -> currency != AccountCurrency.ALL)
            .collect(Collectors.toCollection(() -> EnumSet.noneOf(AccountCurrency.class)));

        if (currenciesRequiringRates.isEmpty()) {
            return new DashboardFxTimelineResolver(Map.of());
        }

        Map<AccountCurrency, List<ExchangeRateEntity>> ratesByCurrency = exchangeRateRepository
            .findByBaseCurrencyInAndQuoteCurrencyAndValidFromLessThanEqualOrderByBaseCurrencyAscValidFromAscIdAsc(
                currenciesRequiringRates,
                AccountCurrency.ALL,
                effectiveAt
            )
            .stream()
            .collect(Collectors.groupingBy(ExchangeRateEntity::getBaseCurrency));

        return new DashboardFxTimelineResolver(ratesByCurrency);
    }

    static final class DashboardFxTimelineResolver {

        private final Map<AccountCurrency, List<ExchangeRateEntity>> ratesByCurrency;

        private DashboardFxTimelineResolver(Map<AccountCurrency, List<ExchangeRateEntity>> ratesByCurrency) {
            this.ratesByCurrency = ratesByCurrency;
        }

        BigDecimal convert(
            BigDecimal amount,
            AccountCurrency sourceCurrency,
            AccountCurrency targetCurrency,
            Instant effectiveAt
        ) {
            if (sourceCurrency == targetCurrency) {
                return amount.setScale(2, RoundingMode.HALF_EVEN);
            }

            BigDecimal rate = resolveRate(sourceCurrency, targetCurrency, effectiveAt);
            return amount.multiply(rate).setScale(2, RoundingMode.HALF_EVEN);
        }

        private BigDecimal resolveRate(AccountCurrency sourceCurrency, AccountCurrency targetCurrency, Instant effectiveAt) {
            if (sourceCurrency == targetCurrency) {
                return BigDecimal.ONE.setScale(FX_SCALE, RoundingMode.HALF_EVEN);
            }

            if (sourceCurrency == AccountCurrency.ALL) {
                ExchangeRateEntity targetRate = findApplicableAllRate(targetCurrency, effectiveAt);
                return BigDecimal.ONE.divide(targetRate.getSellRate(), FX_SCALE, RoundingMode.HALF_EVEN);
            }

            if (targetCurrency == AccountCurrency.ALL) {
                return findApplicableAllRate(sourceCurrency, effectiveAt).getBuyRate();
            }

            ExchangeRateEntity sourceRate = findApplicableAllRate(sourceCurrency, effectiveAt);
            ExchangeRateEntity targetRate = findApplicableAllRate(targetCurrency, effectiveAt);
            return sourceRate.getBuyRate().divide(targetRate.getSellRate(), FX_SCALE, RoundingMode.HALF_EVEN);
        }

        private ExchangeRateEntity findApplicableAllRate(AccountCurrency currency, Instant effectiveAt) {
            List<ExchangeRateEntity> timeline = ratesByCurrency.get(currency);
            if (timeline == null || timeline.isEmpty()) {
                throw missingRate(currency);
            }

            for (int index = timeline.size() - 1; index >= 0; index--) {
                ExchangeRateEntity rate = timeline.get(index);
                if (!rate.getValidFrom().isAfter(effectiveAt)) {
                    return rate;
                }
            }

            throw missingRate(currency);
        }

        private static ResponseStatusException missingRate(AccountCurrency currency) {
            return new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No exchange rate configured for " + currency + " to ALL"
            );
        }
    }
}
