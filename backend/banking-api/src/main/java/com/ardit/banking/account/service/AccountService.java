package com.ardit.banking.account.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountStatus;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.account.dto.CreateAccountRequest;
import com.ardit.banking.account.dto.AccountResponse;
import com.ardit.banking.account.dto.UpdateAccountRequest;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.service.TransactionService;

@Service
public class AccountService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");
    private static final int ACCOUNT_NUMBER_LENGTH = 16;

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AccountService(AccountRepository accountRepository, UserRepository userRepository,
                          TransactionService transactionService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
    }

    @Transactional
    public AccountResponse createAccountForUsername(String username, CreateAccountRequest request) {
        UserEntity owner = getOwnerByUsername(username);

        BigDecimal initialDeposit = request.initialDeposit().setScale(2, java.math.RoundingMode.HALF_EVEN);
        AccountEntity account = AccountEntity.open(
            generateAccountNumber(),
            null,
            request.type(),
            request.currency(),
            request.name(),
            initialDeposit,
            initialDeposit,
            ZERO_MONEY,
            defaultAnnualInterestRate(request.type()),
            owner
        );

        AccountEntity savedAccount = accountRepository.save(account);
        transactionService.recordOpeningDeposit(savedAccount, initialDeposit);
        return toResponse(savedAccount);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsForUsername(String username) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findAllByOwnerIdOrderByOpenedAtAsc(owner.getId()).stream()
            .map(AccountService::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountForUsername(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .map(AccountService::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional
    public AccountResponse updateAccountForUsername(String username, Long accountId, UpdateAccountRequest request) {
        AccountEntity account = getOwnedAccount(username, accountId);
        ensureAccountEditable(account);
        account.rename(request.name());
        return toResponse(account);
    }

    @Transactional
    public void closeAccountForUsername(String username, Long accountId) {
        AccountEntity account = getOwnedAccount(username, accountId);
        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already closed");
        }
        if (account.getCurrentBalance().compareTo(BigDecimal.ZERO) != 0
            || account.getAvailableBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Account must have zero balances before closure"
            );
        }

        account.close(null);
    }

    private UserEntity getOwnerByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private AccountEntity getOwnedAccount(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private static void ensureAccountEditable(AccountEntity account) {
        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed accounts cannot be updated");
        }
    }

    private String generateAccountNumber() {
        String candidate;
        do {
            StringBuilder builder = new StringBuilder(ACCOUNT_NUMBER_LENGTH);
            for (int index = 0; index < ACCOUNT_NUMBER_LENGTH; index++) {
                builder.append(secureRandom.nextInt(10));
            }
            candidate = builder.toString();
        } while (accountRepository.existsByAccountNumber(candidate));

        return candidate;
    }

    private static BigDecimal defaultAnnualInterestRate(AccountType accountType) {
        return switch (accountType) {
            case CURRENT -> ZERO_MONEY.setScale(4, java.math.RoundingMode.HALF_EVEN);
            case SAVINGS -> new BigDecimal("1.2500");
            case SAVINGS_PLAN -> new BigDecimal("2.1000");
        };
    }

    private static AccountResponse toResponse(AccountEntity account) {
        return new AccountResponse(
            account.getId(),
            account.getAccountNumber(),
            account.getIban(),
            account.getType().name(),
            account.getCurrency().name(),
            account.getName(),
            account.getStatus().name(),
            account.getCurrentBalance(),
            account.getAvailableBalance(),
            account.getOverdraftLimit(),
            account.getAnnualInterestRate(),
            account.getOpenedAt(),
            account.getClosedAt()
        );
    }
}
