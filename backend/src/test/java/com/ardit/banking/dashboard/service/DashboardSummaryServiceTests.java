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
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.dashboard.config.DashboardProperties;
import com.ardit.banking.dashboard.dto.DashboardSummaryResponse;
import com.ardit.banking.exchange.domain.ExchangeRateEntity;
import com.ardit.banking.exchange.repository.ExchangeRateRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class DashboardSummaryServiceTests {

    private static final Instant NOW = Instant.parse("2026-05-18T10:15:30Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ExchangeRateRepository exchangeRateRepository;

    private DashboardSummaryService dashboardSummaryService;
    private DashboardFxService dashboardFxService;

    @BeforeEach
    void setUp() {
        DashboardProperties dashboardProperties = new DashboardProperties(
            ZoneId.of("Europe/Tirane"),
            AccountCurrency.ALL
        );
        dashboardFxService = new DashboardFxService(exchangeRateRepository);
        dashboardSummaryService = new DashboardSummaryService(
            userRepository,
            accountRepository,
            transactionRepository,
            dashboardFxService,
            dashboardProperties,
            Clock.fixed(NOW, ZoneId.of("UTC"))
        );
    }

    @Test
    void calculatesNetWorthIncomeAndExpensesWithoutCountingInternalTransfers() {
        UserEntity user = new UserEntity();

        when(userRepository.findByUsername("dashboard-user")).thenReturn(Optional.of(user));
        when(accountRepository.findDashboardBalancesByOwnerId(any())).thenReturn(List.of(
            new AccountBalanceProjection(AccountCurrency.EUR, new BigDecimal("100.00")),
            new AccountBalanceProjection(AccountCurrency.USD, new BigDecimal("50.00")),
            new AccountBalanceProjection(AccountCurrency.ALL, new BigDecimal("1000.00"))
        ));
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
                Instant.parse("2026-05-02T08:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.TRANSFER_IN,
                TransactionDirection.CREDIT,
                AccountCurrency.USD,
                new BigDecimal("20.00"),
                Instant.parse("2026-05-03T09:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.PAYMENT,
                TransactionDirection.DEBIT,
                AccountCurrency.USD,
                new BigDecimal("10.00"),
                Instant.parse("2026-05-04T09:30:00Z")
            ),
            new CashFlowProjection(
                TransactionType.TRANSFER_OUT,
                TransactionDirection.DEBIT,
                AccountCurrency.ALL,
                new BigDecimal("200.00"),
                Instant.parse("2026-05-04T10:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.FEE,
                TransactionDirection.DEBIT,
                AccountCurrency.EUR,
                new BigDecimal("1.00"),
                Instant.parse("2026-05-05T12:00:00Z")
            ),
            new CashFlowProjection(
                TransactionType.INTEREST,
                TransactionDirection.CREDIT,
                AccountCurrency.ALL,
                new BigDecimal("5.00"),
                Instant.parse("2026-05-06T11:00:00Z")
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
                Instant.parse("2026-05-01T00:00:00Z")
            ),
            ExchangeRateEntity.create(
                AccountCurrency.USD,
                AccountCurrency.ALL,
                new BigDecimal("80.00000000"),
                new BigDecimal("81.00000000"),
                "TEST",
                Instant.parse("2026-05-01T00:00:00Z")
            )
        ));

        DashboardSummaryResponse response = dashboardSummaryService.getSummaryForUsername("dashboard-user", null);

        assertThat(response.baseCurrency()).isEqualTo("ALL");
        assertThat(response.reportingZone()).isEqualTo("Europe/Tirane");
        assertThat(response.periodStartDate()).isEqualTo(java.time.LocalDate.of(2026, 5, 1));
        assertThat(response.periodEndDate()).isEqualTo(java.time.LocalDate.of(2026, 5, 18));
        assertThat(response.netWorth()).isEqualByComparingTo("14500.00");
        assertThat(response.incomeThisMonth()).isEqualByComparingTo("9505.00");
        assertThat(response.expensesThisMonth()).isEqualByComparingTo("895.00");
    }

    private record AccountBalanceProjection(
        AccountCurrency currency,
        BigDecimal currentBalance
    ) implements AccountRepository.DashboardAccountBalanceProjection {
        @Override
        public AccountCurrency getCurrency() {
            return currency;
        }

        @Override
        public BigDecimal getCurrentBalance() {
            return currentBalance;
        }
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
