package com.ardit.banking.transaction.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.transaction.dto.CreatePaymentRequest;
import com.ardit.banking.transaction.dto.PaymentBeneficiaryResponse;
import com.ardit.banking.transaction.dto.PaymentResponse;
import com.ardit.banking.transaction.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/beneficiary/{accountNumber}")
    public PaymentBeneficiaryResponse getPaymentBeneficiary(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable String accountNumber
    ) {
        return paymentService.getPaymentBeneficiary(user.getUsername(), accountNumber);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse createPayment(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody CreatePaymentRequest request
    ) {
        return paymentService.createPayment(user.getUsername(), request);
    }
}
