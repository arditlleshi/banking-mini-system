package com.ardit.banking.transaction.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.exchange.service.ExchangeRateService;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.dto.CreateTransferRequest;
import com.ardit.banking.transaction.dto.TransferResponse;

@Service
public class TransferService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final ExchangeRateService exchangeRateService;

    public TransferService(AccountRepository accountRepository, UserRepository userRepository,
                           TransactionService transactionService, ExchangeRateService exchangeRateService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
        this.exchangeRateService = exchangeRateService;
    }

    @Transactional
    public TransferResponse createOwnAccountTransfer(String username, CreateTransferRequest request) {
        if (request.sourceAccountId().equals(request.targetAccountId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and target accounts must differ");
        }

        UserEntity owner = getOwnerByUsername(username);
        AccountEntity sourceAccount = getOwnedAccount(owner.getId(), request.sourceAccountId());
        AccountEntity targetAccount = getOwnedAccount(owner.getId(), request.targetAccountId());

        BigDecimal amount = request.amount().setScale(2, java.math.RoundingMode.HALF_EVEN);
        Instant bookedAt = Instant.now();
        LocalDate valueDate = LocalDate.now();
        String transferReference = UUID.randomUUID().toString();
        ExchangeRateService.FxQuote fxQuote = exchangeRateService.getRequiredFxQuote(
            sourceAccount.getCurrency(),
            targetAccount.getCurrency(),
            bookedAt
        );
        BigDecimal targetAmount = amount.multiply(fxQuote.rate()).setScale(2, RoundingMode.HALF_EVEN);

        try {
            sourceAccount.debit(amount);
            targetAccount.credit(targetAmount);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw mapDomainFailure(ex);
        }

        transactionService.recordBookedTransaction(
            sourceAccount,
            transferReference,
            transferReference,
            TransactionType.TRANSFER_OUT,
            TransactionDirection.DEBIT,
            amount,
            request.description(),
            targetAccount.getName(),
            targetAccount.getAccountNumber(),
            bookedAt,
            valueDate,
            sourceAccount.getCurrentBalance(),
            fxQuote.rate(),
            targetAmount,
            targetAccount.getCurrency()
        );
        transactionService.recordBookedTransaction(
            targetAccount,
            UUID.randomUUID().toString(),
            transferReference,
            TransactionType.TRANSFER_IN,
            TransactionDirection.CREDIT,
            targetAmount,
            request.description(),
            sourceAccount.getName(),
            sourceAccount.getAccountNumber(),
            bookedAt,
            valueDate,
            targetAccount.getCurrentBalance(),
            fxQuote.rate(),
            amount,
            sourceAccount.getCurrency()
        );

        return new TransferResponse(
            transferReference,
            sourceAccount.getId(),
            targetAccount.getId(),
            sourceAccount.getCurrency().name(),
            targetAccount.getCurrency().name(),
            amount,
            targetAmount,
            fxQuote.rate(),
            sourceAccount.getCurrentBalance(),
            targetAccount.getCurrentBalance(),
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
