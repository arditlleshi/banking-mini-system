package com.ardit.banking.account.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountCurrency;

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

    @Query("""
        select account.currency as currency, count(account.id) as accountCount
        from AccountEntity account
        where account.owner.id = :ownerId
        group by account.currency
        """)
    List<AccountCurrencyCountProjection> findAccountCountByCurrencyForOwnerId(@Param("ownerId") Long ownerId);

    interface AccountCurrencyCountProjection {
        AccountCurrency getCurrency();

        long getAccountCount();
    }

    @Query("""
        select account.currency as currency, account.currentBalance as currentBalance
        from AccountEntity account
        where account.owner.id = :ownerId
        """)
    List<DashboardAccountBalanceProjection> findDashboardBalancesByOwnerId(@Param("ownerId") Long ownerId);

    interface DashboardAccountBalanceProjection {
        AccountCurrency getCurrency();

        java.math.BigDecimal getCurrentBalance();
    }
}
