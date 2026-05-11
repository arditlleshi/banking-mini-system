import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getAccounts(): Observable<AccountResponse[]> {
    return this.http.get<AccountResponse[]>(`${this.baseUrl}/accounts`);
  }

  createAccount(payload: CreateAccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/accounts`, payload);
  }
}
