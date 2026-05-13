package com.ardit.banking.transaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
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

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:statement-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class TransactionStatementControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Test
    void downloadsStatementPdfForOwnedAccount() throws Exception {
        UserEntity owner = persistUser("statement-user");
        AccountEntity account = persistAccount(owner, "123456STD01");
        persistTransaction(
            account,
            "stmt-ref-1",
            TransactionDirection.CREDIT,
            new BigDecimal("200.00"),
            new BigDecimal("1200.00"),
            LocalDate.of(2026, 5, 2),
            Instant.parse("2026-05-02T09:00:00Z")
        );
        persistTransaction(
            account,
            "stmt-ref-2",
            TransactionDirection.DEBIT,
            new BigDecimal("50.00"),
            new BigDecimal("1150.00"),
            LocalDate.of(2026, 5, 5),
            Instant.parse("2026-05-05T09:00:00Z")
        );

        entityManager.flush();
        entityManager.clear();

        byte[] responseBody = mockMvc.perform(
                get("/api/accounts/{accountId}/statement", account.getId())
                    .with(user("statement-user"))
                    .param("fromDate", "2026-05-01")
                    .param("toDate", "2026-05-31")
            )
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment;")))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

        try (PDDocument document = Loader.loadPDF(responseBody)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Transaction Statement");
            assertThat(text).contains("123456STD01");
            assertThat(text).contains("stmt-r");
            assertThat(text).contains("09:00:00");
            assertThat(text).contains("Debit amount");
            assertThat(text).contains("Credit amount");
            assertThat(text).contains("Blocked amount");
            assertThat(text).contains("Available amount");
            assertThat(text).contains("Statement User");
            assertThat(text.indexOf("02 May 2026 09:00:00")).isLessThan(text.indexOf("05 May 2026 09:00:00"));
            assertThat(text).contains("(1)");
        }
    }

    @Test
    void rejectsInvalidDateRange() throws Exception {
        UserEntity owner = persistUser("statement-user");
        AccountEntity account = persistAccount(owner, "123456STD01");
        entityManager.flush();

        mockMvc.perform(
                get("/api/accounts/{accountId}/statement", account.getId())
                    .with(user("statement-user"))
                    .param("fromDate", "2026-05-31")
                    .param("toDate", "2026-05-01")
            )
            .andExpect(status().isBadRequest());
    }

    private UserEntity persistUser(String username) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "fullName", "Statement User");
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$statement-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", "USER");
        entityManager.persist(user);
        return user;
    }

    private AccountEntity persistAccount(UserEntity owner, String accountNumber) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            "AL4721211009000000000000",
            "123456",
            "STD",
            1,
            AccountType.CURRENT,
            AccountCurrency.EUR,
            "Main Account",
            new BigDecimal("1150.00"),
            new BigDecimal("1150.00"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        entityManager.persist(account);
        return account;
    }

    private void persistTransaction(AccountEntity account, String reference, TransactionDirection direction,
                                    BigDecimal amount, BigDecimal balanceAfter, LocalDate valueDate,
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
            "Statement integration transaction",
            "Counterparty",
            "AL000000000000000000001",
            bookingTimestamp,
            valueDate,
            balanceAfter,
            null,
            null,
            null
        );
        entityManager.persist(transaction);
    }
}
