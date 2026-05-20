import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type AccountType = 'CURRENT' | 'SAVINGS' | 'SAVINGS_PLAN';
export type AccountCurrency = 'EUR' | 'USD' | 'GBP' | 'ALL';
export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'DORMANT' | 'CLOSED';

export type AccountResponse = {
  id: number;
  accountNumber: string;
  iban: string | null;
  type: AccountType;
  currency: AccountCurrency;
  name: string;
  status: AccountStatus;
  currentBalance: number;
  availableBalance: number;
  overdraftLimit: number;
  annualInterestRate: number | null;
  openedAt: string;
  closedAt: string | null;
};

export type CreateAccountRequest = {
  type: AccountType;
  currency: AccountCurrency;
  name: string;
  initialDeposit: number;
};

export type AccountTransactionResponse = {
  id: number;
  transactionReference: string;
  externalReference: string | null;
  type: string;
  status: string;
  direction: 'DEBIT' | 'CREDIT';
  currency: AccountCurrency;
  amount: number;
  description: string;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  bookingTimestamp: string;
  valueDate: string;
  balanceAfter: number;
  fxRate: number | null;
  fxReferenceAmount: number | null;
  fxReferenceCurrency: AccountCurrency | null;
};

export type AccountHistoryTransactionResponse = {
  id: number;
  transactionReference: string;
  type: string;
  direction: 'DEBIT' | 'CREDIT';
  currency: AccountCurrency;
  amount: number;
  description: string;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  bookingTimestamp: string;
  balanceAfter: number;
};

export type AccountDetailsResponse = {
  account: AccountResponse;
  transactionCount: number;
  totalCredits: number;
  totalDebits: number;
  netMovement: number;
  transactions: AccountHistoryTransactionResponse[];
};

export type AccountStatementFilters = {
  readonly fromDate?: string | null;
  readonly toDate?: string | null;
};

export type AccountCurrencyDistributionResponse = {
  currency: AccountCurrency;
  accountCount: number;
};

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getAccounts(): Observable<AccountResponse[]> {
    return this.http.get<AccountResponse[]>(`${this.baseUrl}/accounts`);
  }

  getAccountCurrencyDistribution(): Observable<AccountCurrencyDistributionResponse[]> {
    return this.http.get<AccountCurrencyDistributionResponse[]>(`${this.baseUrl}/accounts/currency-distribution`);
  }

  createAccount(payload: CreateAccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/accounts`, payload);
  }

  getAccountDetails(accountNumber: string): Observable<AccountDetailsResponse> {
    return this.http.get<AccountDetailsResponse>(`${this.baseUrl}/accounts/${accountNumber}/details`);
  }

  getAccountTransactions(accountId: number, filters: AccountStatementFilters = {}): Observable<AccountTransactionResponse[]> {
    return this.http.get<AccountTransactionResponse[]>(`${this.baseUrl}/accounts/${accountId}/transactions`, {
      params: this.buildStatementParams(filters)
    });
  }

  downloadAccountStatement(accountId: number, filters: AccountStatementFilters = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/accounts/${accountId}/statement`, {
      params: this.buildStatementParams(filters),
      responseType: 'blob'
    });
  }

  downloadPaymentDetails(accountId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/accounts/${accountId}/payment-details`, {
      responseType: 'blob'
    });
  }

  private buildStatementParams(filters: AccountStatementFilters): HttpParams {
    let params = new HttpParams();

    if (filters.fromDate) {
      params = params.set('fromDate', filters.fromDate);
    }
    if (filters.toDate) {
      params = params.set('toDate', filters.toDate);
    }

    return params;
  }
}
