package com.ardit.banking.dashboard.service;

import java.util.EnumSet;
import java.util.Set;

import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionType;
import com.ardit.banking.transaction.repository.TransactionRepository;

final class DashboardCashFlowRules {

    private static final Set<TransactionType> INTERNAL_TRANSFER_TYPES = EnumSet.of(
        TransactionType.TRANSFER_IN,
        TransactionType.TRANSFER_OUT
    );

    private DashboardCashFlowRules() {
    }

    static boolean countsTowardIncome(TransactionRepository.DashboardCashFlowProjection transaction) {
        return transaction.getDirection() == TransactionDirection.CREDIT
            && !INTERNAL_TRANSFER_TYPES.contains(transaction.getType());
    }

    static boolean countsTowardExpenses(TransactionRepository.DashboardCashFlowProjection transaction) {
        return transaction.getDirection() == TransactionDirection.DEBIT
            && !INTERNAL_TRANSFER_TYPES.contains(transaction.getType());
    }
}
