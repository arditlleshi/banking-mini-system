package com.ardit.banking.exchange.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;
import com.ardit.banking.exchange.repository.ExchangeRateRepository;

@ExtendWith(MockitoExtension.class)
class ExchangeRateServiceTests {

    private static final Instant EFFECTIVE_AT = Instant.parse("2026-05-19T10:00:00Z");

    @Mock
    private ExchangeRateRepository exchangeRateRepository;

    @Test
    void prefersDirectPairWhenConfigured() {
        ExchangeRateService service = new ExchangeRateService(exchangeRateRepository);
        ExchangeRateEntity directPair = ExchangeRateEntity.create(
            AccountCurrency.EUR,
            AccountCurrency.USD,
            new BigDecimal("1.13"),
            new BigDecimal("1.22"),
            "TEST",
            Instant.parse("2026-05-19T00:00:00Z")
        );

        when(exchangeRateRepository.findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
            eq(AccountCurrency.EUR),
            eq(AccountCurrency.USD),
            eq(EFFECTIVE_AT)
        )).thenReturn(Optional.of(directPair));

        ExchangeRateService.FxQuote quote = service.getRequiredFxQuote(
            AccountCurrency.EUR,
            AccountCurrency.USD,
            EFFECTIVE_AT
        );

        assertThat(quote.rate()).isEqualByComparingTo("1.13");
        assertThat(quote.pricingMode()).isEqualTo("DIRECT_PAIR");
        assertThat(quote.marketRateUsed()).isEqualByComparingTo("1.13");
    }

    @Test
    void fallsBackToCrossViaAllWhenDirectPairIsMissing() {
        ExchangeRateService service = new ExchangeRateService(exchangeRateRepository);
        ExchangeRateEntity eurToAll = ExchangeRateEntity.create(
            AccountCurrency.EUR,
            AccountCurrency.ALL,
            new BigDecimal("93.64000000"),
            new BigDecimal("97.46000000"),
            "TEST",
            Instant.parse("2026-05-19T00:00:00Z")
        );
        ExchangeRateEntity usdToAll = ExchangeRateEntity.create(
            AccountCurrency.USD,
            AccountCurrency.ALL,
            new BigDecimal("79.94000000"),
            new BigDecimal("83.21000000"),
            "TEST",
            Instant.parse("2026-05-19T00:00:00Z")
        );

        when(exchangeRateRepository.findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
            eq(AccountCurrency.EUR),
            eq(AccountCurrency.USD),
            eq(EFFECTIVE_AT)
        )).thenReturn(Optional.empty());
        when(exchangeRateRepository.findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
            eq(AccountCurrency.EUR),
            eq(AccountCurrency.ALL),
            eq(EFFECTIVE_AT)
        )).thenReturn(Optional.of(eurToAll));
        when(exchangeRateRepository.findFirstByBaseCurrencyAndQuoteCurrencyAndValidFromLessThanEqualOrderByValidFromDescIdDesc(
            eq(AccountCurrency.USD),
            eq(AccountCurrency.ALL),
            eq(EFFECTIVE_AT)
        )).thenReturn(Optional.of(usdToAll));

        ExchangeRateService.FxQuote quote = service.getRequiredFxQuote(
            AccountCurrency.EUR,
            AccountCurrency.USD,
            EFFECTIVE_AT
        );

        assertThat(quote.rate()).isEqualByComparingTo("1.12534551");
        assertThat(quote.pricingMode()).isEqualTo("CROSS_VIA_ALL");
        assertThat(quote.marketRateUsed()).isEqualByComparingTo("1.12534551");
    }
}
