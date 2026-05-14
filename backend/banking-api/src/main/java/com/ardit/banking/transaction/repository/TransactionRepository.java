package com.ardit.banking.transaction.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ardit.banking.transaction.domain.TransactionEntity;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query("""
        select transaction
        from TransactionEntity transaction
        where transaction.account.id = :accountId
          and transaction.valueDate >= coalesce(:fromDate, transaction.valueDate)
          and transaction.valueDate <= coalesce(:toDate, transaction.valueDate)
        order by transaction.bookingTimestamp desc, transaction.id desc
        """)
    List<TransactionEntity> findStatementEntries(
        @Param("accountId") Long accountId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );

    Optional<TransactionEntity> findTopByAccountIdOrderByValueDateAscBookingTimestampAscIdAsc(Long accountId);

    Optional<TransactionEntity> findByIdAndAccountId(Long id, Long accountId);
}
