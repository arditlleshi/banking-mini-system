package com.ardit.banking.transaction.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.ardit.banking.account.domain.AccountStatus;
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
import com.ardit.banking.transaction.dto.CreatePaymentRequest;
import com.ardit.banking.transaction.dto.PaymentBeneficiaryResponse;
import com.ardit.banking.transaction.dto.PaymentResponse;

@Service
public class PaymentService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final ExchangeRateService exchangeRateService;

    public PaymentService(AccountRepository accountRepository, UserRepository userRepository,
                          TransactionService transactionService, ExchangeRateService exchangeRateService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
        this.exchangeRateService = exchangeRateService;
    }

    @Transactional(readOnly = true)
    public PaymentBeneficiaryResponse getPaymentBeneficiary(String username, String accountNumber) {
        UserEntity requester = getOwnerByUsername(username);
        return toBeneficiaryResponse(getBeneficiaryAccount(requester.getId(), accountNumber));
    }

    @Transactional
    public PaymentResponse createPayment(String username, CreatePaymentRequest request) {
        UserEntity requester = getOwnerByUsername(username);
        AccountEntity sourceAccount = getOwnedAccount(requester.getId(), request.sourceAccountId());
        AccountEntity beneficiaryAccount = getBeneficiaryAccount(requester.getId(), request.counterpartyAccount());
        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_EVEN);

        if (amount.compareTo(sourceAccount.getAvailableBalance()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient available balance");
        }

        Instant bookedAt = Instant.now();
        LocalDate valueDate = LocalDate.now();
        String paymentReference = UUID.randomUUID().toString();
        ExchangeRateService.FxQuote fxQuote = exchangeRateService.getRequiredFxQuote(
            sourceAccount.getCurrency(),
            beneficiaryAccount.getCurrency(),
            bookedAt
        );
        BigDecimal targetAmount = amount.multiply(fxQuote.rate()).setScale(2, RoundingMode.HALF_EVEN);
        String beneficiaryName = beneficiaryAccount.getOwner().getFullName();

        try {
            sourceAccount.debit(amount);
            beneficiaryAccount.credit(targetAmount);
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
            beneficiaryName,
            beneficiaryAccount.getAccountNumber(),
            bookedAt,
            valueDate,
            sourceAccount.getCurrentBalance(),
            fxQuote.rate(),
            targetAmount,
            beneficiaryAccount.getCurrency()
        );
        transactionService.recordBookedTransaction(
            beneficiaryAccount,
            UUID.randomUUID().toString(),
            paymentReference,
            TransactionType.TRANSFER_IN,
            TransactionDirection.CREDIT,
            targetAmount,
            request.description(),
            requester.getFullName(),
            sourceAccount.getAccountNumber(),
            bookedAt,
            valueDate,
            beneficiaryAccount.getCurrentBalance(),
            fxQuote.rate(),
            amount,
            sourceAccount.getCurrency()
        );

        return new PaymentResponse(
            paymentReference,
            sourceAccount.getId(),
            sourceAccount.getCurrency().name(),
            amount,
            request.description(),
            beneficiaryName,
            beneficiaryAccount.getAccountNumber(),
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

    private AccountEntity getBeneficiaryAccount(Long requesterId, String accountNumber) {
        String normalizedAccountNumber = normalizeAccountNumber(accountNumber);
        AccountEntity beneficiaryAccount = accountRepository.findByAccountNumber(normalizedAccountNumber)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary account not found"));

        if (beneficiaryAccount.getOwner().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Use own account transfer for your own accounts");
        }
        if (beneficiaryAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Beneficiary account is not active");
        }

        return beneficiaryAccount;
    }

    private static String normalizeAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Beneficiary account number is required");
        }
        return accountNumber.trim();
    }

    private static PaymentBeneficiaryResponse toBeneficiaryResponse(AccountEntity beneficiaryAccount) {
        return new PaymentBeneficiaryResponse(
            beneficiaryAccount.getId(),
            beneficiaryAccount.getAccountNumber(),
            beneficiaryAccount.getIban(),
            beneficiaryAccount.getOwner().getFullName(),
            beneficiaryAccount.getName(),
            beneficiaryAccount.getCurrency().name()
        );
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
