package com.ardit.banking.account.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ardit.banking.account.domain.AccountEntity;

public interface AccountRepository extends JpaRepository<AccountEntity, Long> {

    List<AccountEntity> findAllByOwnerIdOrderByOpenedAtAsc(Long ownerId);

    Optional<AccountEntity> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<AccountEntity> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);
}
