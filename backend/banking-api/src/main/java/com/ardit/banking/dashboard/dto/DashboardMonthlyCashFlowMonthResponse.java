package com.ardit.banking.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardMonthlyCashFlowMonthResponse(
    String month,
    LocalDate monthStartDate,
    BigDecimal income,
    BigDecimal expenses
) {
}
