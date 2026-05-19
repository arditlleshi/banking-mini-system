package com.ardit.banking.account.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;

@Service
public class OwnedAccountAccessService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public OwnedAccountAccessService(AccountRepository accountRepository, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AccountEntity getOwnedAccountById(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional(readOnly = true)
    public AccountEntity getOwnedAccountByNumber(String username, String accountNumber) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByAccountNumberAndOwnerId(accountNumber, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private UserEntity getOwnerByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }
}
