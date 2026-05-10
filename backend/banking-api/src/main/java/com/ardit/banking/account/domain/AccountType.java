package com.ardit.banking.account.domain;

public enum AccountType {
    CURRENT("351"),
    SAVINGS("380"),
    SAVINGS_PLAN("384");

    private final String accountClassCode;

    AccountType(String accountClassCode) {
        this.accountClassCode = accountClassCode;
    }

    public String accountClassCode() {
        return accountClassCode;
    }
}
