package com.ardit.banking.transaction.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;

import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:banking;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@Transactional
class TransactionRepositoryTests {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void findStatementEntriesReturnsNewestTransactionsFirst() {
        UserEntity owner = persistUser("ordering-user");
        AccountEntity account = persistAccount(owner, "123456STAT01");

        TransactionEntity older = persistTransaction(account, 1L, Instant.parse("2026-05-10T08:00:00Z"));
        TransactionEntity newer = persistTransaction(account, 2L, Instant.parse("2026-05-12T08:00:00Z"));
        TransactionEntity sameTimestampButLaterId = persistTransaction(
            account,
            3L,
            Instant.parse("2026-05-12T08:00:00Z")
        );

        entityManager.flush();
        entityManager.clear();

        List<TransactionEntity> transactions = transactionRepository.findStatementEntries(account.getId(), null, null);

        assertThat(transactions).extracting(TransactionEntity::getId)
            .containsExactly(sameTimestampButLaterId.getId(), newer.getId(), older.getId());
    }

    private UserEntity persistUser(String username) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "fullName", "Ordering User");
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$ordering-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", "USER");
        entityManager.persist(user);
        return user;
    }

    private AccountEntity persistAccount(UserEntity owner, String accountNumber) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            null,
            "123456",
            "STD",
            1,
            AccountType.CURRENT,
            AccountCurrency.EUR,
            "Ordering Account",
            new BigDecimal("1000.00"),
            new BigDecimal("1000.00"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        entityManager.persist(account);
        return account;
    }

    private TransactionEntity persistTransaction(AccountEntity account, Long referenceSuffix, Instant bookingTimestamp) {
        TransactionEntity transaction = TransactionEntity.book(
            account,
            "ref-" + referenceSuffix,
            null,
            TransactionType.ADJUSTMENT,
            TransactionStatus.BOOKED,
            TransactionDirection.CREDIT,
            AccountCurrency.EUR,
            new BigDecimal("10.00"),
            "Ordering test transaction",
            null,
            null,
            bookingTimestamp,
            bookingTimestamp.atZone(ZoneOffset.UTC).toLocalDate(),
            new BigDecimal("1010.00"),
            null,
            null,
            null
        );
        entityManager.persist(transaction);
        return transaction;
    }
}
