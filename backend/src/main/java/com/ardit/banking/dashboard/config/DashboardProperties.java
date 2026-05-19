package com.ardit.banking.dashboard.config;

import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.ardit.banking.account.domain.AccountCurrency;

@ConfigurationProperties(prefix = "banking.dashboard")
public record DashboardProperties(
    ZoneId reportingZone,
    AccountCurrency defaultBaseCurrency
) {

    public DashboardProperties {
        reportingZone = reportingZone == null ? ZoneId.of("Europe/Tirane") : reportingZone;
        defaultBaseCurrency = defaultBaseCurrency == null ? AccountCurrency.ALL : defaultBaseCurrency;
    }
}
