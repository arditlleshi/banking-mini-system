package com.ardit.banking.account.paymentdetails;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.account.service.OwnedAccountAccessService;
import com.ardit.banking.common.document.InstitutionDocumentProperties;
import com.ardit.banking.security.user.domain.UserEntity;

@ExtendWith(MockitoExtension.class)
class AccountPaymentDetailsServiceTests {

    @Mock
    private OwnedAccountAccessService ownedAccountAccessService;

    private final InstitutionDocumentProperties institutionDocumentProperties = new InstitutionDocumentProperties(
        "Banking Mini System",
        "Rruga Ismail Qemali",
        "Tirane",
        "Albania",
        "BMSIALTR",
        "support@banking.local",
        "+355 4 000 0000"
    );

    @Test
    void buildsPaymentDetailsDocumentForOwnedActiveAccount() {
        AccountEntity account = createAccount("payment-user", "Payment User", "AL4721211009000000123456");
        when(ownedAccountAccessService.getOwnedAccountById("payment-user", 7L)).thenReturn(account);

        AccountPaymentDetailsService service = new AccountPaymentDetailsService(
            ownedAccountAccessService,
            institutionDocumentProperties
        );

        AccountPaymentDetailsDocument document = service.getPaymentDetailsForUsernameAndAccount("payment-user", 7L);

        assertThat(document.accountId()).isEqualTo(7L);
        assertThat(document.beneficiaryName()).isEqualTo("Payment User");
        assertThat(document.accountName()).isEqualTo("Main Account");
        assertThat(document.accountNumber()).isEqualTo("123456CUR01");
        assertThat(document.iban()).isEqualTo("AL4721211009000000123456");
        assertThat(document.bic()).isEqualTo("BMSIALTR");
        assertThat(document.institutionName()).isEqualTo("Banking Mini System");
        assertThat(document.institutionAddressLine()).isEqualTo("Rruga Ismail Qemali");
        assertThat(document.institutionCityCountry()).isEqualTo("Tirane, Albania");
        assertThat(document.currency()).isEqualTo("EUR");
        assertThat(document.generatedAt()).isNotNull();
    }

    @Test
    void fallsBackToUsernameWhenFullNameIsBlank() {
        AccountEntity account = createAccount("payment-user", "   ", "AL4721211009000000123456");
        when(ownedAccountAccessService.getOwnedAccountById("payment-user", 7L)).thenReturn(account);

        AccountPaymentDetailsService service = new AccountPaymentDetailsService(
            ownedAccountAccessService,
            institutionDocumentProperties
        );

        AccountPaymentDetailsDocument document = service.getPaymentDetailsForUsernameAndAccount("payment-user", 7L);

        assertThat(document.beneficiaryName()).isEqualTo("payment-user");
    }

    @Test
    void rejectsNonActiveAccounts() {
        AccountEntity account = createAccount("payment-user", "Payment User", "AL4721211009000000123456");
        account.block();
        when(ownedAccountAccessService.getOwnedAccountById("payment-user", 7L)).thenReturn(account);

        AccountPaymentDetailsService service = new AccountPaymentDetailsService(
            ownedAccountAccessService,
            institutionDocumentProperties
        );

        assertThatThrownBy(() -> service.getPaymentDetailsForUsernameAndAccount("payment-user", 7L))
            .isInstanceOf(ResponseStatusException.class)
            .extracting("statusCode")
            .hasToString("409 CONFLICT");
    }

    @Test
    void rejectsAccountsWithoutIban() {
        AccountEntity account = createAccount("payment-user", "Payment User", null);
        when(ownedAccountAccessService.getOwnedAccountById("payment-user", 7L)).thenReturn(account);

        AccountPaymentDetailsService service = new AccountPaymentDetailsService(
            ownedAccountAccessService,
            institutionDocumentProperties
        );

        assertThatThrownBy(() -> service.getPaymentDetailsForUsernameAndAccount("payment-user", 7L))
            .isInstanceOf(ResponseStatusException.class)
            .extracting("statusCode")
            .hasToString("409 CONFLICT");
    }

    private static AccountEntity createAccount(String username, String fullName, String iban) {
        UserEntity owner = new UserEntity();
        ReflectionTestUtils.setField(owner, "id", 11L);
        ReflectionTestUtils.setField(owner, "username", username);
        ReflectionTestUtils.setField(owner, "email", username + "@example.com");
        ReflectionTestUtils.setField(owner, "fullName", fullName);
        ReflectionTestUtils.setField(owner, "passwordHash", "$2a$10$payment-test-hash");
        ReflectionTestUtils.setField(owner, "active", Boolean.TRUE);
        ReflectionTestUtils.setField(owner, "role", "USER");

        AccountEntity account = AccountEntity.open(
            "123456CUR01",
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
        ReflectionTestUtils.setField(account, "id", 7L);
        return account;
    }
}
