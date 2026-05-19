package com.ardit.banking.transaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import com.ardit.banking.transaction.dto.PaymentBeneficiaryResponse;
import com.ardit.banking.transaction.dto.PaymentResponse;

import jakarta.persistence.EntityManager;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:payments-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class PaymentControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void resolvesBeneficiaryDetailsForAnotherUsersActiveAccount() throws Exception {
        UserEntity sender = persistUser("sender-user", "Sender User");
        UserEntity beneficiaryOwner = persistUser("beneficiary-user", "Beneficiary User");
        persistAccount(sender, "123456CUR01", "Sender Current", new BigDecimal("500.00"));
        AccountEntity beneficiaryAccount = persistAccount(
            beneficiaryOwner,
            "654321CUR01",
            "Beneficiary Main",
            new BigDecimal("120.00")
        );
        entityManager.flush();
        entityManager.clear();

        String responseBody = mockMvc.perform(
                get("/api/payments/beneficiary/{accountNumber}", beneficiaryAccount.getAccountNumber())
                    .with(user("sender-user"))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        PaymentBeneficiaryResponse response = objectMapper.readValue(responseBody, PaymentBeneficiaryResponse.class);

        assertThat(response.accountNumber()).isEqualTo("654321CUR01");
        assertThat(response.beneficiaryName()).isEqualTo("Beneficiary User");
        assertThat(response.accountName()).isEqualTo("Beneficiary Main");
        assertThat(response.currency()).isEqualTo("EUR");
    }

    @Test
    void createsPaymentAndCreditsBeneficiaryAccount() throws Exception {
        UserEntity sender = persistUser("sender-user", "Sender User");
        UserEntity beneficiaryOwner = persistUser("beneficiary-user", "Beneficiary User");
        AccountEntity sourceAccount = persistAccount(sender, "123456CUR01", "Sender Current", new BigDecimal("500.00"));
        AccountEntity beneficiaryAccount = persistAccount(
            beneficiaryOwner,
            "654321CUR01",
            "Beneficiary Main",
            new BigDecimal("120.00")
        );
        entityManager.flush();

        String responseBody = mockMvc.perform(
                post("/api/payments")
                    .with(user("sender-user"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "sourceAccountId": %d,
                          "amount": 125.00,
                          "description": "Rent contribution",
                          "counterpartyName": "Beneficiary User",
                          "counterpartyAccount": "654321CUR01"
                        }
                        """.formatted(sourceAccount.getId()))
            )
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        entityManager.flush();
        entityManager.clear();

        AccountEntity refreshedSource = entityManager.find(AccountEntity.class, sourceAccount.getId());
        AccountEntity refreshedBeneficiary = entityManager.find(AccountEntity.class, beneficiaryAccount.getId());
        PaymentResponse response = objectMapper.readValue(responseBody, PaymentResponse.class);

        assertThat(response.counterpartyName()).isEqualTo("Beneficiary User");
        assertThat(response.counterpartyAccount()).isEqualTo("654321CUR01");
        assertThat(refreshedSource.getAvailableBalance()).isEqualByComparingTo("375.00");
        assertThat(refreshedSource.getCurrentBalance()).isEqualByComparingTo("375.00");
        assertThat(refreshedBeneficiary.getAvailableBalance()).isEqualByComparingTo("245.00");
        assertThat(refreshedBeneficiary.getCurrentBalance()).isEqualByComparingTo("245.00");
    }

    @Test
    void rejectsOwnAccountsAsBeneficiaries() throws Exception {
        UserEntity sender = persistUser("sender-user", "Sender User");
        AccountEntity sourceAccount = persistAccount(sender, "123456CUR01", "Sender Current", new BigDecimal("500.00"));
        entityManager.flush();

        mockMvc.perform(
                get("/api/payments/beneficiary/{accountNumber}", sourceAccount.getAccountNumber())
                    .with(user("sender-user"))
            )
            .andExpect(status().isConflict());
    }

    private UserEntity persistUser(String username, String fullName) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "fullName", fullName);
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$payment-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", UserRole.USER);
        entityManager.persist(user);
        return user;
    }

    private AccountEntity persistAccount(UserEntity owner, String accountNumber, String name, BigDecimal openingBalance) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            "AL47" + accountNumber,
            "123456",
            "CUR",
            1,
            AccountType.CURRENT,
            AccountCurrency.EUR,
            name,
            openingBalance,
            openingBalance,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        entityManager.persist(account);
        return account;
    }
}
