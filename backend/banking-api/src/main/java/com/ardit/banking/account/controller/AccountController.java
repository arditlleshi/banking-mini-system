package com.ardit.banking.account.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.account.dto.AccountResponse;
import com.ardit.banking.account.dto.CreateAccountRequest;
import com.ardit.banking.account.dto.UpdateAccountRequest;
import com.ardit.banking.account.service.AccountService;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse createMyAccount(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody CreateAccountRequest request
    ) {
        return accountService.createAccountForUsername(user.getUsername(), request);
    }

    @GetMapping
    public List<AccountResponse> getMyAccounts(@AuthenticationPrincipal UserDetails user) {
        return accountService.getAccountsForUsername(user.getUsername());
    }

    @GetMapping("/{accountId}")
    public AccountResponse getMyAccountById(@AuthenticationPrincipal UserDetails user, @PathVariable Long accountId) {
        return accountService.getAccountForUsername(user.getUsername(), accountId);
    }

    @PutMapping("/{accountId}")
    public AccountResponse updateMyAccount(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable Long accountId,
        @Valid @RequestBody UpdateAccountRequest request
    ) {
        return accountService.updateAccountForUsername(user.getUsername(), accountId, request);
    }

    @DeleteMapping("/{accountId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void closeMyAccount(@AuthenticationPrincipal UserDetails user, @PathVariable Long accountId) {
        accountService.closeAccountForUsername(user.getUsername(), accountId);
    }
}
