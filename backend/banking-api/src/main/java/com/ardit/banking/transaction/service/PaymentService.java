package com.ardit.banking.transaction.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.dto.CreatePaymentRequest;
import com.ardit.banking.transaction.dto.PaymentResponse;

@Service
public class PaymentService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;

    public PaymentService(AccountRepository accountRepository, UserRepository userRepository,
                          TransactionService transactionService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
    }

    @Transactional
    public PaymentResponse createPayment(String username, CreatePaymentRequest request) {
        UserEntity owner = getOwnerByUsername(username);
        AccountEntity sourceAccount = getOwnedAccount(owner.getId(), request.sourceAccountId());
        BigDecimal amount = request.amount().setScale(2, java.math.RoundingMode.HALF_EVEN);
        Instant bookedAt = Instant.now();
        LocalDate valueDate = LocalDate.now();
        String paymentReference = UUID.randomUUID().toString();

        try {
            sourceAccount.debit(amount);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw mapDomainFailure(ex);
        }

        transactionService.recordBookedTransaction(
            sourceAccount,
            paymentReference,
            normalizeExternalReference(request.externalReference(), paymentReference),
            TransactionType.PAYMENT,
            TransactionDirection.DEBIT,
            amount,
            request.description(),
            request.counterpartyName(),
            request.counterpartyAccount(),
            bookedAt,
            valueDate,
            sourceAccount.getCurrentBalance(),
            null,
            null,
            null
        );

        return new PaymentResponse(
            paymentReference,
            sourceAccount.getId(),
            sourceAccount.getCurrency().name(),
            amount,
            request.description(),
            request.counterpartyName(),
            request.counterpartyAccount(),
            sourceAccount.getCurrentBalance(),
            bookedAt
        );
    }

    private UserEntity getOwnerByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private AccountEntity getOwnedAccount(Long ownerId, Long accountId) {
        return accountRepository.findByIdAndOwnerId(accountId, ownerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private static String normalizeExternalReference(String providedReference, String fallbackReference) {
        if (providedReference == null || providedReference.isBlank()) {
            return fallbackReference;
        }
        return providedReference.trim();
    }

    private static ResponseStatusException mapDomainFailure(RuntimeException ex) {
        String message = ex.getMessage();
        if ("Insufficient available balance".equals(message)) {
            return new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
        if ("Account is not active".equals(message)) {
            return new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, ex);
    }
}
