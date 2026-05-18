package com.ardit.banking.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.dashboard.config.DashboardProperties;
import com.ardit.banking.dashboard.dto.DashboardMonthlyCashFlowMonthResponse;
import com.ardit.banking.dashboard.dto.DashboardMonthlyCashFlowResponse;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.repository.TransactionRepository;

@Service
public class DashboardMonthlyCashFlowService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final DashboardFxService dashboardFxService;
    private final DashboardProperties dashboardProperties;
    private final Clock clock;

    public DashboardMonthlyCashFlowService(
        UserRepository userRepository,
        TransactionRepository transactionRepository,
        DashboardFxService dashboardFxService,
        DashboardProperties dashboardProperties,
        Clock clock
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.dashboardFxService = dashboardFxService;
        this.dashboardProperties = dashboardProperties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardMonthlyCashFlowResponse getMonthlyCashFlowForUsername(
        String username,
        AccountCurrency requestedBaseCurrency,
        int monthsRequested
    ) {
        UserEntity owner = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        AccountCurrency baseCurrency = Optional.ofNullable(requestedBaseCurrency)
            .orElse(dashboardProperties.defaultBaseCurrency());
        Instant calculatedAt = clock.instant();
        ZoneId reportingZone = dashboardProperties.reportingZone();
        YearMonth currentMonth = YearMonth.from(LocalDate.now(clock.withZone(reportingZone)));
        YearMonth startMonth = currentMonth.minusMonths(monthsRequested - 1L);
        Instant periodStartInstant = startMonth.atDay(1).atStartOfDay(reportingZone).toInstant();
        Instant periodEndInstant = currentMonth.plusMonths(1).atDay(1).atStartOfDay(reportingZone).toInstant();

        List<TransactionRepository.DashboardCashFlowProjection> transactions =
            transactionRepository.findDashboardCashFlowEntries(
                owner.getId(),
                TransactionStatus.BOOKED,
                periodStartInstant,
                periodEndInstant
            );

        EnumSet<AccountCurrency> involvedCurrencies = EnumSet.of(baseCurrency);
        transactions.stream()
            .map(TransactionRepository.DashboardCashFlowProjection::getCurrency)
            .forEach(involvedCurrencies::add);

        DashboardFxService.DashboardFxTimelineResolver fxTimelineResolver =
            dashboardFxService.createResolver(involvedCurrencies, calculatedAt);

        Map<YearMonth, MonthlyCashFlowAccumulator> monthlyCashFlow = initializeMonthlyBuckets(startMonth, currentMonth);

        for (TransactionRepository.DashboardCashFlowProjection transaction : transactions) {
            YearMonth monthBucket = YearMonth.from(transaction.getBookingTimestamp().atZone(reportingZone));
            MonthlyCashFlowAccumulator accumulator = monthlyCashFlow.get(monthBucket);
            if (accumulator == null) {
                continue;
            }

            BigDecimal convertedAmount = fxTimelineResolver.convert(
                transaction.getAmount(),
                transaction.getCurrency(),
                baseCurrency,
                transaction.getBookingTimestamp()
            );

            if (DashboardCashFlowRules.countsTowardIncome(transaction)) {
                accumulator.addIncome(convertedAmount);
                continue;
            }
            if (DashboardCashFlowRules.countsTowardExpenses(transaction)) {
                accumulator.addExpenses(convertedAmount);
            }
        }

        List<DashboardMonthlyCashFlowMonthResponse> months = monthlyCashFlow.entrySet().stream()
            .map(entry -> new DashboardMonthlyCashFlowMonthResponse(
                entry.getKey().toString(),
                entry.getKey().atDay(1),
                entry.getValue().income(),
                entry.getValue().expenses()
            ))
            .toList();

        return new DashboardMonthlyCashFlowResponse(
            baseCurrency.name(),
            reportingZone.getId(),
            calculatedAt,
            monthsRequested,
            startMonth.atDay(1),
            currentMonth.atDay(1),
            months
        );
    }

    private static Map<YearMonth, MonthlyCashFlowAccumulator> initializeMonthlyBuckets(
        YearMonth startMonth,
        YearMonth endMonth
    ) {
        Map<YearMonth, MonthlyCashFlowAccumulator> buckets = new LinkedHashMap<>();
        YearMonth month = startMonth;

        while (!month.isAfter(endMonth)) {
            buckets.put(month, new MonthlyCashFlowAccumulator());
            month = month.plusMonths(1);
        }

        return buckets;
    }

    private static final class MonthlyCashFlowAccumulator {

        private BigDecimal income = ZERO_MONEY;
        private BigDecimal expenses = ZERO_MONEY;

        private void addIncome(BigDecimal amount) {
            income = income.add(amount);
        }

        private void addExpenses(BigDecimal amount) {
            expenses = expenses.add(amount);
        }

        private BigDecimal income() {
            return income.setScale(2, RoundingMode.HALF_EVEN);
        }

        private BigDecimal expenses() {
            return expenses.setScale(2, RoundingMode.HALF_EVEN);
        }
    }
}
