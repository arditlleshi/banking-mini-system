package com.ardit.banking.transaction.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.transaction.dto.CreateTransferRequest;
import com.ardit.banking.transaction.dto.TransferResponse;
import com.ardit.banking.transaction.service.TransferService;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse createTransfer(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody CreateTransferRequest request
    ) {
        return transferService.createOwnAccountTransfer(user.getUsername(), request);
    }
}
