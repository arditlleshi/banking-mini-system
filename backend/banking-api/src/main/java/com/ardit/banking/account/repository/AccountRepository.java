package com.ardit.banking.account.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ardit.banking.account.domain.AccountEntity;

public interface AccountRepository extends JpaRepository<AccountEntity, Long> {

    List<AccountEntity> findAllByOwnerIdOrderByOpenedAtAsc(Long ownerId);

    Optional<AccountEntity> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<AccountEntity> findByAccountNumber(String accountNumber);
    
    Optional<AccountEntity> findByAccountNumberAndOwnerId(String accountNumber, Long ownerId);

    boolean existsByAccountNumber(String accountNumber);

    @Query("""
        select max(account.serialNumber)
        from AccountEntity account
        where account.owner.id = :ownerId
          and account.accountClassCode = :accountClassCode
        """)
    Integer findMaxSerialNumberByOwnerIdAndAccountClassCode(
        @Param("ownerId") Long ownerId,
        @Param("accountClassCode") String accountClassCode
    );
}
