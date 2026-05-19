package com.ardit.banking.dashboard.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.dashboard.dto.DashboardMonthlyCashFlowResponse;
import com.ardit.banking.dashboard.dto.DashboardSummaryResponse;
import com.ardit.banking.dashboard.service.DashboardMonthlyCashFlowService;
import com.ardit.banking.dashboard.service.DashboardSummaryService;

@RestController
@Validated
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardSummaryService dashboardSummaryService;
    private final DashboardMonthlyCashFlowService dashboardMonthlyCashFlowService;

    public DashboardController(
        DashboardSummaryService dashboardSummaryService,
        DashboardMonthlyCashFlowService dashboardMonthlyCashFlowService
    ) {
        this.dashboardSummaryService = dashboardSummaryService;
        this.dashboardMonthlyCashFlowService = dashboardMonthlyCashFlowService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse getDashboardSummary(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam(required = false) AccountCurrency baseCurrency
    ) {
        return dashboardSummaryService.getSummaryForUsername(user.getUsername(), baseCurrency);
    }

    @GetMapping("/monthly-cash-flow")
    public DashboardMonthlyCashFlowResponse getDashboardMonthlyCashFlow(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam(required = false) AccountCurrency baseCurrency,
        @RequestParam(defaultValue = "12") @Min(1) @Max(24) int months
    ) {
        return dashboardMonthlyCashFlowService.getMonthlyCashFlowForUsername(
            user.getUsername(),
            baseCurrency,
            months
        );
    }
}
