package com.ardit.banking.transaction.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.transaction.statement.AccountStatement;
import com.ardit.banking.transaction.statement.AccountStatementPdfGenerator;
import com.ardit.banking.transaction.statement.AccountStatementService;

@RestController
@RequestMapping("/api/accounts/{accountId}/statement")
public class TransactionStatementController {

    private final AccountStatementService accountStatementService;
    private final AccountStatementPdfGenerator accountStatementPdfGenerator;

    public TransactionStatementController(AccountStatementService accountStatementService,
                                          AccountStatementPdfGenerator accountStatementPdfGenerator) {
        this.accountStatementService = accountStatementService;
        this.accountStatementPdfGenerator = accountStatementPdfGenerator;
    }

    @GetMapping(produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadAccountStatement(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable Long accountId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        AccountStatement statement = accountStatementService.getStatementForUsernameAndAccount(
            user.getUsername(),
            accountId,
            fromDate,
            toDate
        );
        byte[] pdf = accountStatementPdfGenerator.generate(statement);
        String filename = accountStatementPdfGenerator.buildFilename(statement);

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
            .body(pdf);
    }
}
