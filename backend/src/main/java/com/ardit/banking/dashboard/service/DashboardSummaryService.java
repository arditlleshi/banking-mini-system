package com.ardit.banking.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.dashboard.config.DashboardProperties;
import com.ardit.banking.dashboard.dto.DashboardSummaryResponse;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.repository.TransactionRepository;

@Service
public class DashboardSummaryService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final DashboardFxService dashboardFxService;
    private final DashboardProperties dashboardProperties;
    private final Clock clock;

    public DashboardSummaryService(
        UserRepository userRepository,
        AccountRepository accountRepository,
        TransactionRepository transactionRepository,
        DashboardFxService dashboardFxService,
        DashboardProperties dashboardProperties,
        Clock clock
    ) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.dashboardFxService = dashboardFxService;
        this.dashboardProperties = dashboardProperties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummaryForUsername(String username, AccountCurrency requestedBaseCurrency) {
        UserEntity owner = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        AccountCurrency baseCurrency = requestedBaseCurrency == null
            ? dashboardProperties.defaultBaseCurrency()
            : requestedBaseCurrency;
        Instant calculatedAt = clock.instant();
        ZoneId reportingZone = dashboardProperties.reportingZone();
        LocalDate today = LocalDate.now(clock.withZone(reportingZone));
        LocalDate periodStartDate = today.withDayOfMonth(1);
        Instant periodStartInstant = periodStartDate.atStartOfDay(reportingZone).toInstant();
        Instant periodEndInstant = today.plusDays(1).atStartOfDay(reportingZone).toInstant();

        List<AccountRepository.DashboardAccountBalanceProjection> accountBalances =
            accountRepository.findDashboardBalancesByOwnerId(owner.getId());
        List<TransactionRepository.DashboardCashFlowProjection> monthlyTransactions =
            transactionRepository.findDashboardCashFlowEntries(
                owner.getId(),
                TransactionStatus.BOOKED,
                periodStartInstant,
                periodEndInstant
            );

        DashboardFxService.DashboardFxTimelineResolver fxTimelineResolver = dashboardFxService.createResolver(
            collectCurrencies(accountBalances, monthlyTransactions, baseCurrency),
            calculatedAt
        );

        BigDecimal netWorth = accountBalances.stream()
            .map(account -> fxTimelineResolver.convert(
                account.getCurrentBalance(),
                account.getCurrency(),
                baseCurrency,
                calculatedAt
            ))
            .reduce(ZERO_MONEY, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_EVEN);

        BigDecimal incomeThisMonth = monthlyTransactions.stream()
            .filter(DashboardCashFlowRules::countsTowardIncome)
            .map(transaction -> fxTimelineResolver.convert(
                transaction.getAmount(),
                transaction.getCurrency(),
                baseCurrency,
                transaction.getBookingTimestamp()
            ))
            .reduce(ZERO_MONEY, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_EVEN);

        BigDecimal expensesThisMonth = monthlyTransactions.stream()
            .filter(DashboardCashFlowRules::countsTowardExpenses)
            .map(transaction -> fxTimelineResolver.convert(
                transaction.getAmount(),
                transaction.getCurrency(),
                baseCurrency,
                transaction.getBookingTimestamp()
            ))
            .reduce(ZERO_MONEY, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_EVEN);

        return new DashboardSummaryResponse(
            baseCurrency.name(),
            reportingZone.getId(),
            calculatedAt,
            periodStartDate,
            today,
            netWorth,
            incomeThisMonth,
            expensesThisMonth
        );
    }

    private static Set<AccountCurrency> collectCurrencies(
        List<AccountRepository.DashboardAccountBalanceProjection> accountBalances,
        List<TransactionRepository.DashboardCashFlowProjection> monthlyTransactions,
        AccountCurrency baseCurrency
    ) {
        EnumSet<AccountCurrency> currencies = EnumSet.of(baseCurrency);
        accountBalances.stream()
            .map(AccountRepository.DashboardAccountBalanceProjection::getCurrency)
            .forEach(currencies::add);
        monthlyTransactions.stream()
            .map(TransactionRepository.DashboardCashFlowProjection::getCurrency)
            .forEach(currencies::add);
        return currencies;
    }
}
