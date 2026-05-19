package com.ardit.banking.account.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ardit.banking.account.paymentdetails.AccountPaymentDetailsDocument;
import com.ardit.banking.account.paymentdetails.AccountPaymentDetailsPdfGenerator;
import com.ardit.banking.account.paymentdetails.AccountPaymentDetailsService;

@RestController
@RequestMapping("/api/accounts/{accountId}/payment-details")
public class AccountPaymentDetailsController {

    private final AccountPaymentDetailsService accountPaymentDetailsService;
    private final AccountPaymentDetailsPdfGenerator accountPaymentDetailsPdfGenerator;

    public AccountPaymentDetailsController(AccountPaymentDetailsService accountPaymentDetailsService,
                                           AccountPaymentDetailsPdfGenerator accountPaymentDetailsPdfGenerator) {
        this.accountPaymentDetailsService = accountPaymentDetailsService;
        this.accountPaymentDetailsPdfGenerator = accountPaymentDetailsPdfGenerator;
    }

    @GetMapping(produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPaymentDetails(@AuthenticationPrincipal UserDetails user,
                                                         @PathVariable Long accountId) {
        AccountPaymentDetailsDocument document = accountPaymentDetailsService.getPaymentDetailsForUsernameAndAccount(
            user.getUsername(),
            accountId
        );
        byte[] pdf = accountPaymentDetailsPdfGenerator.generate(document);
        String filename = accountPaymentDetailsPdfGenerator.buildFilename(document);

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .body(pdf);
    }
}
