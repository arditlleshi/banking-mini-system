package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.repository.TransactionRepository;

@Service
public class AccountStatementService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public AccountStatementService(AccountRepository accountRepository, UserRepository userRepository,
                                   TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public AccountStatement getStatementForUsernameAndAccount(String username, Long accountId,
                                                              LocalDate fromDate, LocalDate toDate) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        AccountEntity account = getOwnedAccountById(username, accountId);
        return buildStatement(account, username, dateRange);
    }

    @Transactional(readOnly = true)
    public AccountStatement getStatementForUsernameAndAccountNumber(String username, String accountNumber,
                                                                    LocalDate fromDate, LocalDate toDate) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        AccountEntity account = getOwnedAccountByNumber(username, accountNumber);
        return buildStatement(account, username, dateRange);
    }

    private AccountStatement buildStatement(AccountEntity account, String username, StatementDateRange dateRange) {
        List<TransactionEntity> statementEntries = transactionRepository.findStatementEntries(
            account.getId(),
            dateRange.fromDate(),
            dateRange.toDate()
        );

        List<AccountStatementTransaction> transactions = statementEntries.stream()
            .map(AccountStatementService::toStatementTransaction)
            .toList();

        BigDecimal totalCredits = sumTransactions(statementEntries, TransactionDirection.CREDIT);
        BigDecimal totalDebits = sumTransactions(statementEntries, TransactionDirection.DEBIT);
        BigDecimal openingBalance = resolveOpeningBalance(account, statementEntries, dateRange);
        BigDecimal closingBalance = resolveClosingBalance(account, openingBalance, dateRange);

        return new AccountStatement(
            account.getId(),
            account.getAccountNumber(),
            account.getIban(),
            account.getName(),
            account.getType().name(),
            account.getCurrency().name(),
            account.getStatus().name(),
            normalizeMoney(account.getCurrentBalance()),
            normalizeMoney(account.getAvailableBalance()),
            account.getOwner().getFullName(),
            username,
            dateRange.fromDate(),
            dateRange.toDate(),
            Instant.now(),
            transactions.size(),
            totalCredits,
            totalDebits,
            normalizeMoney(totalCredits.subtract(totalDebits)),
            openingBalance,
            closingBalance,
            transactions
        );
    }

    private AccountEntity getOwnedAccountById(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private AccountEntity getOwnedAccountByNumber(String username, String accountNumber) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByAccountNumberAndOwnerId(accountNumber, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private UserEntity getOwnerByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private BigDecimal resolveOpeningBalance(AccountEntity account, List<TransactionEntity> statementEntries,
                                             StatementDateRange dateRange) {
        if (dateRange.fromDate() != null) {
            return transactionRepository
                .findTopByAccountIdAndValueDateLessThanOrderByValueDateDescBookingTimestampDescIdDesc(
                    account.getId(),
                    dateRange.fromDate()
                )
                .map(TransactionEntity::getBalanceAfter)
                .map(AccountStatementService::normalizeMoney)
                .orElse(ZERO_MONEY);
        }

        if (!statementEntries.isEmpty()) {
            TransactionEntity oldestTransaction = statementEntries.get(statementEntries.size() - 1);
            return deriveBalanceBefore(oldestTransaction);
        }

        return normalizeMoney(account.getCurrentBalance());
    }

    private BigDecimal resolveClosingBalance(AccountEntity account, BigDecimal openingBalance, StatementDateRange dateRange) {
        if (dateRange.toDate() == null) {
            return normalizeMoney(account.getCurrentBalance());
        }

        return transactionRepository
            .findTopByAccountIdAndValueDateLessThanEqualOrderByValueDateDescBookingTimestampDescIdDesc(
                account.getId(),
                dateRange.toDate()
            )
            .map(TransactionEntity::getBalanceAfter)
            .map(AccountStatementService::normalizeMoney)
            .orElse(openingBalance);
    }

    private static BigDecimal deriveBalanceBefore(TransactionEntity transaction) {
        BigDecimal balanceBefore = transaction.getDirection() == TransactionDirection.CREDIT
            ? transaction.getBalanceAfter().subtract(transaction.getAmount())
            : transaction.getBalanceAfter().add(transaction.getAmount());
        return normalizeMoney(balanceBefore);
    }

    private static BigDecimal sumTransactions(List<TransactionEntity> transactions, TransactionDirection direction) {
        return normalizeMoney(
            transactions.stream()
                .filter(transaction -> transaction.getDirection() == direction)
                .map(TransactionEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
        );
    }

    private static BigDecimal normalizeMoney(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_EVEN);
    }

    private static AccountStatementTransaction toStatementTransaction(TransactionEntity transaction) {
        return new AccountStatementTransaction(
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
}
