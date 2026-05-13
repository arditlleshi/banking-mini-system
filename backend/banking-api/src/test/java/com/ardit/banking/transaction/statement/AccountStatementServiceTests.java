package com.ardit.banking.transaction.statement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.repository.TransactionRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountStatementServiceTests {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private AccountStatementService accountStatementService;

    @Test
    void buildsStatementWithTransactionsAndTotalsForRequestedPeriod() {
        UserEntity user = createUser(11L, "statement-user", "Statement User");
        AccountEntity account = createAccount(7L, user, "123456STD01", new BigDecimal("1150.00"));
        LocalDate fromDate = LocalDate.of(2026, 5, 3);
        LocalDate toDate = LocalDate.of(2026, 5, 4);

        TransactionEntity latestInRange = createTransaction(
            3L,
            account,
            "ref-debit",
            TransactionDirection.DEBIT,
            new BigDecimal("50.00"),
            new BigDecimal("1150.00"),
            LocalDate.of(2026, 5, 4),
            Instant.parse("2026-05-04T09:00:00Z")
        );
        TransactionEntity oldestInRange = createTransaction(
            2L,
            account,
            "ref-credit",
            TransactionDirection.CREDIT,
            new BigDecimal("200.00"),
            new BigDecimal("1200.00"),
            LocalDate.of(2026, 5, 3),
            Instant.parse("2026-05-03T09:00:00Z")
        );

        when(userRepository.findByUsername("statement-user")).thenReturn(Optional.of(user));
        when(accountRepository.findByIdAndOwnerId(7L, 11L)).thenReturn(Optional.of(account));
        when(transactionRepository.findStatementEntries(7L, fromDate, toDate))
            .thenReturn(List.of(latestInRange, oldestInRange));

        AccountStatement statement = accountStatementService.getStatementForUsernameAndAccount(
            "statement-user",
            7L,
            fromDate,
            toDate
        );

        assertThat(statement.transactionCount()).isEqualTo(2);
        assertThat(statement.totalCredits()).isEqualByComparingTo("200.00");
        assertThat(statement.totalDebits()).isEqualByComparingTo("50.00");
        assertThat(statement.netMovement()).isEqualByComparingTo("150.00");
        assertThat(statement.transactions()).extracting(AccountStatementTransaction::transactionReference)
            .containsExactly("ref-credit", "ref-debit");
    }

    private static UserEntity createUser(Long id, String username, String fullName) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "fullName", fullName);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$statement-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", "USER");
        return user;
    }

    private static AccountEntity createAccount(Long id, UserEntity owner, String accountNumber, BigDecimal balance) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            "AL4721211009000000000000",
            "123456",
            "STD",
            1,
            AccountType.CURRENT,
            AccountCurrency.EUR,
            "Main Account",
            balance,
            balance,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        ReflectionTestUtils.setField(account, "id", id);
        return account;
    }

    private static TransactionEntity createTransaction(Long id, AccountEntity account, String reference,
                                                       TransactionDirection direction, BigDecimal amount,
                                                       BigDecimal balanceAfter, LocalDate valueDate,
                                                       Instant bookingTimestamp) {
        TransactionEntity transaction = TransactionEntity.book(
            account,
            reference,
            reference,
            direction == TransactionDirection.CREDIT ? TransactionType.DEPOSIT : TransactionType.PAYMENT,
            TransactionStatus.BOOKED,
            direction,
            AccountCurrency.EUR,
            amount,
            "Statement test transaction",
            "Counterparty",
            "AL0000000000000000000000",
            bookingTimestamp,
            valueDate,
            balanceAfter,
            null,
            null,
            null
        );
        ReflectionTestUtils.setField(transaction, "id", id);
        return transaction;
    }
}
