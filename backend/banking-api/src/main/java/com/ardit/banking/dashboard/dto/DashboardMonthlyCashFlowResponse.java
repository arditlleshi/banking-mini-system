package com.ardit.banking.dashboard.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record DashboardMonthlyCashFlowResponse(
    String baseCurrency,
    String reportingZone,
    Instant calculatedAt,
    int monthsRequested,
    LocalDate periodStartMonthDate,
    LocalDate periodEndMonthDate,
    List<DashboardMonthlyCashFlowMonthResponse> months
) {
}
