package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.service.OwnedAccountAccessService;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.repository.TransactionRepository;

@Service
public class AccountStatementService {

    public static final int DEFAULT_BOOKED_TRANSACTION_PAGE_SIZE = 5;

    private final OwnedAccountAccessService ownedAccountAccessService;
    private final TransactionRepository transactionRepository;

    public AccountStatementService(OwnedAccountAccessService ownedAccountAccessService,
                                   TransactionRepository transactionRepository) {
        this.ownedAccountAccessService = ownedAccountAccessService;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public AccountStatement getStatementForUsernameAndAccount(String username, Long accountId,
                                                              LocalDate fromDate, LocalDate toDate,
                                                              TransactionDirection directionFilter) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        AccountEntity account = ownedAccountAccessService.getOwnedAccountById(username, accountId);
        return buildStatement(account, username, dateRange, directionFilter);
    }

    @Transactional(readOnly = true)
    public AccountStatement getStatementForAccount(AccountEntity account, String username,
                                                   LocalDate fromDate, LocalDate toDate,
                                                   TransactionDirection directionFilter) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        return buildStatement(account, username, dateRange, directionFilter);
    }

    @Transactional(readOnly = true)
    public AccountStatement getStatementForUsernameAndAccountNumber(String username, String accountNumber,
                                                                    LocalDate fromDate, LocalDate toDate,
                                                                    TransactionDirection directionFilter) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        AccountEntity account = ownedAccountAccessService.getOwnedAccountByNumber(username, accountNumber);
        return buildStatement(account, username, dateRange, directionFilter);
    }

    @Transactional(readOnly = true)
    public AccountStatementPage getPagedStatementForUsernameAndAccount(
        String username,
        Long accountId,
        LocalDate fromDate,
        LocalDate toDate,
        TransactionDirection directionFilter,
        int pageNumber,
        int pageSize
    ) {
        StatementDateRange dateRange = StatementDateRange.of(fromDate, toDate);
        AccountEntity account = ownedAccountAccessService.getOwnedAccountById(username, accountId);
        return buildPagedStatement(account, dateRange, directionFilter, pageNumber, pageSize);
    }

    private AccountStatement buildStatement(AccountEntity account,
                                            String username,
                                            StatementDateRange dateRange,
                                            TransactionDirection directionFilter) {
        List<TransactionEntity> statementEntries = transactionRepository.findStatementEntries(
            account.getId(),
            dateRange.fromDate(),
            dateRange.toDate(),
            directionFilter
        );

        List<AccountStatementTransaction> transactions = statementEntries.stream()
            .map(AccountStatementService::toStatementTransaction)
            .collect(Collectors.toCollection(ArrayList::new));
        Collections.reverse(transactions);

        BigDecimal totalCredits = sumTransactions(statementEntries, TransactionDirection.CREDIT);
        BigDecimal totalDebits = sumTransactions(statementEntries, TransactionDirection.DEBIT);

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
            account.getOpenedAt(),
            directionFilter,
            dateRange.fromDate(),
            dateRange.toDate(),
            Instant.now(),
            transactions.size(),
            totalCredits,
            totalDebits,
            normalizeMoney(totalCredits.subtract(totalDebits)),
            transactions
        );
    }

    private AccountStatementPage buildPagedStatement(
        AccountEntity account,
        StatementDateRange dateRange,
        TransactionDirection directionFilter,
        int pageNumber,
        int pageSize
    ) {
        int normalizedPageNumber = Math.max(pageNumber, 1);
        int normalizedPageSize = Math.max(pageSize, 1);
        var pageable = PageRequest.of(
            normalizedPageNumber - 1,
            normalizedPageSize,
            Sort.by(Sort.Order.desc("bookingTimestamp"), Sort.Order.desc("id"))
        );

        var statementPage = transactionRepository.findStatementEntries(
            account.getId(),
            dateRange.fromDate(),
            dateRange.toDate(),
            directionFilter,
            pageable
        );

        if (statementPage.getTotalPages() > 0 && normalizedPageNumber > statementPage.getTotalPages()) {
            pageable = PageRequest.of(
                statementPage.getTotalPages() - 1,
                normalizedPageSize,
                Sort.by(Sort.Order.desc("bookingTimestamp"), Sort.Order.desc("id"))
            );
            statementPage = transactionRepository.findStatementEntries(
                account.getId(),
                dateRange.fromDate(),
                dateRange.toDate(),
                directionFilter,
                pageable
            );
            normalizedPageNumber = statementPage.getTotalPages();
        }

        List<AccountStatementTransaction> transactions = statementPage.stream()
            .map(AccountStatementService::toStatementTransaction)
            .toList();

        BigDecimal totalCredits = normalizeMoney(
            transactionRepository.sumStatementAmountByDirection(
                account.getId(),
                dateRange.fromDate(),
                dateRange.toDate(),
                TransactionDirection.CREDIT
            )
        );
        BigDecimal totalDebits = normalizeMoney(
            transactionRepository.sumStatementAmountByDirection(
                account.getId(),
                dateRange.fromDate(),
                dateRange.toDate(),
                TransactionDirection.DEBIT
            )
        );

        return new AccountStatementPage(
            normalizedPageNumber,
            normalizedPageSize,
            Math.toIntExact(statementPage.getTotalElements()),
            totalCredits,
            totalDebits,
            normalizeMoney(totalCredits.subtract(totalDebits)),
            transactions
        );
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
