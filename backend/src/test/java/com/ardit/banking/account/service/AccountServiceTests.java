package com.ardit.banking.account.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.ardit.banking.account.config.AccountNumberingProperties;
import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.account.dto.AccountDetailsResponse;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.statement.AccountStatementPage;
import com.ardit.banking.transaction.statement.AccountStatementService;
import com.ardit.banking.transaction.statement.AccountStatementTransaction;
import com.ardit.banking.transaction.service.TransactionService;
import com.ardit.banking.account.repository.AccountRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTests {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private AccountStatementService accountStatementService;

    @Mock
    private AccountNumberingProperties accountNumberingProperties;

    @Mock
    private OwnedAccountAccessService ownedAccountAccessService;

    @InjectMocks
    private AccountService accountService;

    @Test
    void getAccountDetailsByNumberReturnsTransactionsNewestFirstForHistoryTable() {
        UserEntity user = createUser(11L, "details-user", "Details User");
        AccountEntity account = createAccount(7L, user, "123456STD01", new BigDecimal("1150.00"));
        AccountStatementTransaction oldest = createStatementTransaction(
            2L,
            "ref-credit",
            "CREDIT",
            new BigDecimal("200.00"),
            new BigDecimal("1200.00"),
            LocalDate.of(2026, 5, 3),
            Instant.parse("2026-05-03T09:00:00Z")
        );
        AccountStatementTransaction newest = createStatementTransaction(
            3L,
            "ref-debit",
            "DEBIT",
            new BigDecimal("50.00"),
            new BigDecimal("1150.00"),
            LocalDate.of(2026, 5, 4),
            Instant.parse("2026-05-04T09:00:00Z")
        );

        when(ownedAccountAccessService.getOwnedAccountByNumber("details-user", "123456STD01")).thenReturn(account);
        when(accountStatementService.getPagedStatementForUsernameAndAccount("details-user", 7L, null, null, 1, 10))
            .thenReturn(new AccountStatementPage(
                1,
                10,
                2,
                new BigDecimal("200.00"),
                new BigDecimal("50.00"),
                new BigDecimal("150.00"),
                List.of(newest, oldest)
            ));

        AccountDetailsResponse response = accountService.getAccountDetailsByNumberForUsername(
            "details-user",
            "123456STD01",
            1
        );

        assertThat(response.transactionPage()).isEqualTo(1);
        assertThat(response.transactionPageSize()).isEqualTo(10);
        assertThat(response.transactions()).extracting(transaction -> transaction.transactionReference())
            .containsExactly("ref-debit", "ref-credit");
        assertThat(response.transactions().getFirst().counterpartyAccount()).isEqualTo("AL0000000000000000000000");
    }

    private static UserEntity createUser(Long id, String username, String fullName) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "fullName", fullName);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$account-details-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", UserRole.USER);
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

    private static AccountStatementTransaction createStatementTransaction(Long id, String reference, String direction,
                                                                         BigDecimal amount, BigDecimal balanceAfter,
                                                                         LocalDate valueDate, Instant bookingTimestamp) {
        return new AccountStatementTransaction(
            id,
            reference,
            reference,
            "PAYMENT",
            "BOOKED",
            direction,
            "EUR",
            amount,
            "History table transaction",
            "Counterparty",
            "AL0000000000000000000000",
            bookingTimestamp,
            valueDate,
            balanceAfter,
            null,
            null,
            null
        );
    }
}
