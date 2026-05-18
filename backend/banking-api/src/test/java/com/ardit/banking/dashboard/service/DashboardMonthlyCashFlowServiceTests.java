package com.ardit.banking.dashboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.dashboard.config.DashboardProperties;
import com.ardit.banking.dashboard.dto.DashboardMonthlyCashFlowMonthResponse;
import com.ardit.banking.dashboard.dto.DashboardMonthlyCashFlowResponse;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;
import com.ardit.banking.exchange.repository.ExchangeRateRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class DashboardMonthlyCashFlowServiceTests {

    private static final Instant NOW = Instant.parse("2026-05-18T10:15:30Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ExchangeRateRepository exchangeRateRepository;

    private DashboardMonthlyCashFlowService dashboardMonthlyCashFlowService;

    @BeforeEach
    void setUp() {
        DashboardProperties dashboardProperties = new DashboardProperties(
            ZoneId.of("Europe/Tirane"),
            AccountCurrency.ALL
        );
        DashboardFxService dashboardFxService = new DashboardFxService(exchangeRateRepository);
        dashboardMonthlyCashFlowService = new DashboardMonthlyCashFlowService(
            userRepository,
            transactionRepository,
            dashboardFxService,
            dashboardProperties,
            Clock.fixed(NOW, ZoneId.of("UTC"))
        );
    }

    @Test
    void returnsMonthlyIncomeAndExpensesForRequestedRangeWithTransferExclusion() {
        UserEntity user = new UserEntity();

        when(userRepository.findByUsername("dashboard-user")).thenReturn(Optional.of(user));
        when(transactionRepository.findDashboardCashFlowEntries(
            any(),
            eq(TransactionStatus.BOOKED),
            any(),
            any()
        )).thenReturn(List.of(
            new CashFlowProjection(
                TransactionType.DEPOSIT,
                TransactionDirection.CREDIT,
                AccountCurrency.EUR,
                new BigDecimal("100.00"),
                Instant.parse("2026-03-03T08:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.PAYMENT,
                TransactionDirection.DEBIT,
                AccountCurrency.USD,
                new BigDecimal("10.00"),
                Instant.parse("2026-04-10T09:30:00Z")
            ),
            new CashFlowProjection(
                TransactionType.TRANSFER_IN,
                TransactionDirection.CREDIT,
                AccountCurrency.ALL,
                new BigDecimal("500.00"),
                Instant.parse("2026-05-05T12:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.FEE,
                TransactionDirection.DEBIT,
                AccountCurrency.ALL,
                new BigDecimal("5.00"),
                Instant.parse("2026-05-08T14:15:00Z")
            ),
            new CashFlowProjection(
                TransactionType.INTEREST,
                TransactionDirection.CREDIT,
                AccountCurrency.ALL,
                new BigDecimal("2.00"),
                Instant.parse("2026-05-09T07:00:00Z")
            )
        ));
        when(exchangeRateRepository.findByBaseCurrencyInAndQuoteCurrencyAndValidFromLessThanEqualOrderByBaseCurrencyAscValidFromAscIdAsc(
            any(),
            eq(AccountCurrency.ALL),
            eq(NOW)
        )).thenReturn(List.of(
            ExchangeRateEntity.create(
                AccountCurrency.EUR,
                AccountCurrency.ALL,
                new BigDecimal("95.00000000"),
                new BigDecimal("95.80000000"),
                "TEST",
                Instant.parse("2026-03-01T00:00:00Z")
            ),
            ExchangeRateEntity.create(
                AccountCurrency.USD,
                AccountCurrency.ALL,
                new BigDecimal("80.00000000"),
                new BigDecimal("81.00000000"),
                "TEST",
                Instant.parse("2026-04-01T00:00:00Z")
            )
        ));

        DashboardMonthlyCashFlowResponse response = dashboardMonthlyCashFlowService
            .getMonthlyCashFlowForUsername("dashboard-user", null, 3);

        assertThat(response.baseCurrency()).isEqualTo("ALL");
        assertThat(response.reportingZone()).isEqualTo("Europe/Tirane");
        assertThat(response.monthsRequested()).isEqualTo(3);
        assertThat(response.periodStartMonthDate()).isEqualTo(java.time.LocalDate.of(2026, 3, 1));
        assertThat(response.periodEndMonthDate()).isEqualTo(java.time.LocalDate.of(2026, 5, 1));
        assertThat(response.months()).hasSize(3);

        DashboardMonthlyCashFlowMonthResponse march = response.months().get(0);
        DashboardMonthlyCashFlowMonthResponse april = response.months().get(1);
        DashboardMonthlyCashFlowMonthResponse may = response.months().get(2);

        assertThat(march.month()).isEqualTo("2026-03");
        assertThat(march.income()).isEqualByComparingTo("9500.00");
        assertThat(march.expenses()).isEqualByComparingTo("0.00");

        assertThat(april.month()).isEqualTo("2026-04");
        assertThat(april.income()).isEqualByComparingTo("0.00");
        assertThat(april.expenses()).isEqualByComparingTo("800.00");

        assertThat(may.month()).isEqualTo("2026-05");
        assertThat(may.income()).isEqualByComparingTo("2.00");
        assertThat(may.expenses()).isEqualByComparingTo("5.00");
    }

    private record CashFlowProjection(
        TransactionType type,
        TransactionDirection direction,
        AccountCurrency currency,
        BigDecimal amount,
        Instant bookingTimestamp
    ) implements TransactionRepository.DashboardCashFlowProjection {
        @Override
        public TransactionType getType() {
            return type;
        }

        @Override
        public TransactionDirection getDirection() {
            return direction;
        }

        @Override
        public AccountCurrency getCurrency() {
            return currency;
        }

        @Override
        public BigDecimal getAmount() {
            return amount;
        }

        @Override
        public Instant getBookingTimestamp() {
            return bookingTimestamp;
        }
    }
}
