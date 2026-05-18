package com.ardit.banking.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record DashboardSummaryResponse(
    String baseCurrency,
    String reportingZone,
    Instant calculatedAt,
    LocalDate periodStartDate,
    LocalDate periodEndDate,
    BigDecimal netWorth,
    BigDecimal incomeThisMonth,
    BigDecimal expensesThisMonth
) {
}
