package com.ardit.banking.transaction.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.dto.TransactionResponse;
import com.ardit.banking.transaction.repository.TransactionRepository;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public TransactionService(TransactionRepository transactionRepository, AccountRepository accountRepository,
                              UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void recordOpeningDeposit(AccountEntity account, BigDecimal openingDeposit) {
        if (openingDeposit.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        recordBookedTransaction(
            account,
            nextTransactionReference(),
            null,
            TransactionType.DEPOSIT,
            TransactionDirection.CREDIT,
            openingDeposit,
            "Initial account funding",
            account.getOwner().getFullName(),
            account.getAccountNumber(),
            Instant.now(),
            LocalDate.now(),
            account.getCurrentBalance(),
            null,
            null,
            null
        );
    }

    @Transactional
    public TransactionEntity recordBookedTransaction(AccountEntity account, String transactionReference,
                                                     String externalReference, TransactionType type,
                                                     TransactionDirection direction, BigDecimal amount,
                                                     String description, String counterpartyName,
                                                     String counterpartyAccount, Instant bookingTimestamp,
                                                     LocalDate valueDate, BigDecimal balanceAfter,
                                                     BigDecimal fxRate, BigDecimal fxReferenceAmount,
                                                     AccountCurrency fxReferenceCurrency) {
        TransactionEntity transaction = TransactionEntity.book(
            account,
            transactionReference,
            externalReference,
            type,
            TransactionStatus.BOOKED,
            direction,
            account.getCurrency(),
            amount,
            description,
            counterpartyName,
            counterpartyAccount,
            bookingTimestamp,
            valueDate,
            balanceAfter,
            fxRate,
            fxReferenceAmount,
            fxReferenceCurrency
        );

        return transactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsForUsernameAndAccount(String username, Long accountId,
                                                                          LocalDate fromDate, LocalDate toDate) {
        validateDateRange(fromDate, toDate);
        AccountEntity account = getOwnedAccount(username, accountId);
        return transactionRepository.findStatementEntries(account.getId(), fromDate, toDate).stream()
            .map(TransactionService::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionForUsernameAndAccount(String username, Long accountId, Long transactionId) {
        AccountEntity account = getOwnedAccount(username, accountId);
        return transactionRepository.findByIdAndAccountId(transactionId, account.getId())
            .map(TransactionService::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    private AccountEntity getOwnedAccount(String username, Long accountId) {
        UserEntity owner = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private static void validateDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDate must be before or equal to toDate");
        }
    }

    private static TransactionResponse toResponse(TransactionEntity transaction) {
        return new TransactionResponse(
            transaction.getId(),
            transaction.getTransactionReference(),
            transaction.getExternalReference(),
            transaction.getType().name(),
            transaction.getStatus().name(),
            transaction.getDirection().name(),
            transaction.getCurrency().name(),
            transaction.getAmount(),
            transaction.getDescription(),
            transaction.getCounterpartyName(),
            transaction.getCounterpartyAccount(),
            transaction.getBookingTimestamp(),
            transaction.getValueDate(),
            transaction.getBalanceAfter(),
            transaction.getFxRate(),
            transaction.getFxReferenceAmount(),
            transaction.getFxReferenceCurrency() == null ? null : transaction.getFxReferenceCurrency().name()
        );
    }

    private static String nextTransactionReference() {
        return UUID.randomUUID().toString();
    }
}
