package com.ardit.banking.account.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
import com.ardit.banking.account.dto.AccountCurrencyDistributionResponse;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.domain.UserRole;
import jakarta.persistence.EntityManager;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:account-currency-distribution-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class AccountCurrencyDistributionControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void returnsCurrencyDistributionForAuthenticatedOwner() throws Exception {
        UserEntity owner = persistUser("distribution-user", "Distribution User");
        UserEntity otherOwner = persistUser("other-user", "Other User");

        persistAccount(owner, "111111CUR01", AccountCurrency.EUR);
        persistAccount(owner, "111111CUR02", AccountCurrency.EUR);
        persistAccount(owner, "111111SAV01", AccountCurrency.USD);
        persistAccount(otherOwner, "222222CUR01", AccountCurrency.GBP);
        entityManager.flush();
        entityManager.clear();

        String responseBody = mockMvc.perform(
                get("/api/accounts/currency-distribution")
                    .with(user("distribution-user"))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        List<AccountCurrencyDistributionResponse> distribution = objectMapper.readValue(
            responseBody,
            new TypeReference<List<AccountCurrencyDistributionResponse>>() {}
        );
        Map<String, Long> countsByCurrency = distribution.stream()
            .collect(Collectors.toMap(AccountCurrencyDistributionResponse::currency, AccountCurrencyDistributionResponse::accountCount));

        assertThat(countsByCurrency).containsEntry("EUR", 2L);
        assertThat(countsByCurrency).containsEntry("USD", 1L);
        assertThat(countsByCurrency).containsEntry("GBP", 0L);
        assertThat(countsByCurrency).containsEntry("ALL", 0L);
        assertThat(countsByCurrency.values().stream().mapToLong(Long::longValue).sum()).isEqualTo(3L);
    }

    @Test
    void rejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/accounts/currency-distribution"))
            .andExpect(status().isUnauthorized());
    }

    private UserEntity persistUser(String username, String fullName) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", username + "@example.com");
        ReflectionTestUtils.setField(user, "fullName", fullName);
        ReflectionTestUtils.setField(user, "passwordHash", "$2a$10$currency-distribution-test-hash");
        ReflectionTestUtils.setField(user, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(user, "role", UserRole.USER);
        entityManager.persist(user);
        return user;
    }

    private AccountEntity persistAccount(UserEntity owner, String accountNumber, AccountCurrency currency) {
        AccountEntity account = AccountEntity.open(
            accountNumber,
            "AL4721211009000000" + accountNumber,
            "111111",
            "CUR",
            1,
            AccountType.CURRENT,
            currency,
            "Test Account",
            new BigDecimal("100.00"),
            new BigDecimal("100.00"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            owner
        );
        entityManager.persist(account);
        return account;
    }
}
