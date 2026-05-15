package com.ardit.banking.account.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

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

import jakarta.persistence.EntityManager;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:payment-details-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class AccountPaymentDetailsControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Test
    void downloadsPaymentDetailsPdfForOwnedActiveAccount() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        entityManager.flush();
        entityManager.clear();

        byte[] responseBody = mockMvc.perform(
                get("/api/accounts/{accountId}/payment-details", account.getId())
                    .with(user("payment-user"))
            )
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("payment-details-123456CUR01.pdf")))
            .andExpect(header().string("Cache-Control", "private, no-store"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

        try (PDDocument document = Loader.loadPDF(responseBody)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(document.getNumberOfPages()).isEqualTo(1);
            assertThat(text).contains("Payment Details");
            assertThat(text).contains("Payment User");
            assertThat(text).contains("AL47 2121 1009 0000 0012 3456");
            assertThat(text).contains("BMSIALTR");
            assertThat(text).contains("123456CUR01");
            assertThat(text).contains("Main Account");
        }
    }

    @Test
    void returnsNotFoundForNonOwnedAccount() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        persistUser("other-user", "Other User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        entityManager.flush();

        mockMvc.perform(
                get("/api/accounts/{accountId}/payment-details", account.getId())
                    .with(user("other-user"))
            )
            .andExpect(status().isNotFound());
    }

    @Test
    void rejectsBlockedAccounts() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        account.block();
        entityManager.flush();

        mockMvc.perform(
                get("/api/accounts/{accountId}/payment-details", account.getId())
                    .with(user("payment-user"))
            )
            .andExpect(status().isConflict());
    }

    @Test
    void rejectsDormantAccounts() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        account.markDormant();
        entityManager.flush();

        mockMvc.perform(
                get("/api/accounts/{accountId}/payment-details", account.getId())
                    .with(user("payment-user"))
            )
            .andExpect(status().isConflict());
    }

    @Test
    void rejectsClosedAccounts() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        account.close(null);
        entityManager.flush();

        mockMvc.perform(
                get("/api/accounts/{accountId}/payment-details", account.getId())
                    .with(user("payment-user"))
            )
            .andExpect(status().isConflict());
    }

    @Test
    void rejectsUnauthenticatedRequests() throws Exception {
        UserEntity owner = persistUser("payment-user", "Payment User");
        AccountEntity account = persistAccount(owner, "123456CUR01", "AL4721211009000000123456");
        entityManager.flush();

        mockMvc.perform(get("/api/accounts/{accountId}/payment-details", account.getId()))
            .andExpect(status().isForbidden());
    }

    private UserEntity persistUser(String username, String fullName) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "fullName", fullName);
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$payment-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", "USER");
        entityManager.persist(user);
        return user;
    }

    private AccountEntity persistAccount(UserEntity owner, String accountNumber, String iban) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            iban,
            "123456",
            "CUR",
            1,
            AccountType.CURRENT,
            AccountCurrency.EUR,
            "Main Account",
            new BigDecimal("1200.00"),
            new BigDecimal("1200.00"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        entityManager.persist(account);
        return account;
    }
}
