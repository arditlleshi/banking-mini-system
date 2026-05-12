package com.ardit.banking.exchange.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.exchange.dto.ExchangeRateResponse;
import com.ardit.banking.exchange.dto.UpsertExchangeRateRequest;
import com.ardit.banking.exchange.service.ExchangeRateService;

@RestController
@RequestMapping("/api/admin/exchange-rates")
public class ExchangeRateAdminController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateAdminController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping
    public List<ExchangeRateResponse> getExchangeRates() {
        return exchangeRateService.getExchangeRates();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ExchangeRateResponse createExchangeRate(@Valid @RequestBody UpsertExchangeRateRequest request) {
        return exchangeRateService.createExchangeRate(request);
    }
}
