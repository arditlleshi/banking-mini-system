package com.ardit.banking.account.paymentdetails;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountStatus;
import com.ardit.banking.account.service.OwnedAccountAccessService;
import com.ardit.banking.common.document.InstitutionDocumentProperties;

@Service
public class AccountPaymentDetailsService {

    private final OwnedAccountAccessService ownedAccountAccessService;
    private final InstitutionDocumentProperties institutionDocumentProperties;

    public AccountPaymentDetailsService(OwnedAccountAccessService ownedAccountAccessService,
                                        InstitutionDocumentProperties institutionDocumentProperties) {
        this.ownedAccountAccessService = ownedAccountAccessService;
        this.institutionDocumentProperties = institutionDocumentProperties;
    }

    @Transactional(readOnly = true)
    public AccountPaymentDetailsDocument getPaymentDetailsForUsernameAndAccount(String username, Long accountId) {
        AccountEntity account = ownedAccountAccessService.getOwnedAccountById(username, accountId);
        validateShareableAccount(account);

        return new AccountPaymentDetailsDocument(
            account.getId(),
            resolveBeneficiaryName(account, username),
            account.getName(),
            account.getAccountNumber(),
            account.getIban().trim(),
            institutionDocumentProperties.institutionBic(),
            institutionDocumentProperties.institutionName(),
            institutionDocumentProperties.institutionAddressLine(),
            institutionDocumentProperties.institutionCityCountry(),
            account.getCurrency().name(),
            Instant.now()
        );
    }

    private static void validateShareableAccount(AccountEntity account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Payment details are available only for active accounts"
            );
        }
        if (account.getIban() == null || account.getIban().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Payment details are unavailable because the account IBAN is missing"
            );
        }
    }

    private static String resolveBeneficiaryName(AccountEntity account, String username) {
        String fullName = account.getOwner().getFullName();
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        return username;
    }
}
