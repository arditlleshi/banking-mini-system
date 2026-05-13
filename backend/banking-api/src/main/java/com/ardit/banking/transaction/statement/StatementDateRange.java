package com.ardit.banking.transaction.statement;

import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record StatementDateRange(LocalDate fromDate, LocalDate toDate) {

    public static StatementDateRange of(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDate must be before or equal to toDate");
        }
        return new StatementDateRange(fromDate, toDate);
    }
}
