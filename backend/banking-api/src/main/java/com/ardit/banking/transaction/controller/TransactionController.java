package com.ardit.banking.transaction.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.transaction.dto.TransactionResponse;
import com.ardit.banking.transaction.service.TransactionService;

@RestController
@RequestMapping("/api/accounts/{accountId}/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public List<TransactionResponse> getAccountTransactions(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable Long accountId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return transactionService.getTransactionsForUsernameAndAccount(user.getUsername(), accountId, fromDate, toDate);
    }

    @GetMapping("/{transactionId}")
    public TransactionResponse getAccountTransaction(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable Long accountId,
        @PathVariable Long transactionId
    ) {
        return transactionService.getTransactionForUsernameAndAccount(user.getUsername(), accountId, transactionId);
    }
}
