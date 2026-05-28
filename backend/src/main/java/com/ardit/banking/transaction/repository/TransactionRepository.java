package com.ardit.banking.transaction.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ardit.banking.account.domain.AccountCurrency;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.domain.TransactionStatus;
import com.ardit.banking.transaction.domain.TransactionType;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query("""
        select transaction
        from TransactionEntity transaction
        where transaction.account.id = :accountId
          and transaction.valueDate >= coalesce(:fromDate, transaction.valueDate)
          and transaction.valueDate <= coalesce(:toDate, transaction.valueDate)
          and (:direction is null or transaction.direction = :direction)
        order by transaction.bookingTimestamp desc, transaction.id desc
        """)
    Page<TransactionEntity> findStatementEntries(
        @Param("accountId") Long accountId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        @Param("direction") TransactionDirection direction,
        Pageable pageable
    );

    @Query("""
        select transaction
        from TransactionEntity transaction
        where transaction.account.id = :accountId
          and transaction.valueDate >= coalesce(:fromDate, transaction.valueDate)
          and transaction.valueDate <= coalesce(:toDate, transaction.valueDate)
          and (:direction is null or transaction.direction = :direction)
        order by transaction.bookingTimestamp desc, transaction.id desc
        """)
    List<TransactionEntity> findStatementEntries(
        @Param("accountId") Long accountId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        @Param("direction") TransactionDirection direction
    );

    @Query("""
        select coalesce(sum(transaction.amount), 0)
        from TransactionEntity transaction
        where transaction.account.id = :accountId
          and transaction.valueDate >= coalesce(:fromDate, transaction.valueDate)
          and transaction.valueDate <= coalesce(:toDate, transaction.valueDate)
          and transaction.direction = :direction
        """)
    BigDecimal sumStatementAmountByDirection(
        @Param("accountId") Long accountId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        @Param("direction") TransactionDirection direction
    );

    Optional<TransactionEntity> findTopByAccountIdOrderByValueDateAscBookingTimestampAscIdAsc(Long accountId);

    Optional<TransactionEntity> findByIdAndAccountId(Long id, Long accountId);

    @Query("""
        select transaction.type as type,
               transaction.direction as direction,
               transaction.currency as currency,
               transaction.amount as amount,
               transaction.bookingTimestamp as bookingTimestamp
        from TransactionEntity transaction
        join transaction.account account
        where account.owner.id = :ownerId
          and transaction.status = :status
          and transaction.bookingTimestamp >= :fromInclusive
          and transaction.bookingTimestamp < :toExclusive
        order by transaction.bookingTimestamp asc, transaction.id asc
        """)
    List<DashboardCashFlowProjection> findDashboardCashFlowEntries(
        @Param("ownerId") Long ownerId,
        @Param("status") TransactionStatus status,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    interface DashboardCashFlowProjection {
        TransactionType getType();

        TransactionDirection getDirection();

        AccountCurrency getCurrency();

        BigDecimal getAmount();

        Instant getBookingTimestamp();
    }
}
