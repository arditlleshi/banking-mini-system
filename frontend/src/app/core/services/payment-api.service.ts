import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type PaymentBeneficiaryResponse = {
  accountId: number;
  accountNumber: string;
  iban: string | null;
  beneficiaryName: string;
  accountName: string;
  currency: string;
};

export type CreatePaymentRequest = {
  sourceAccountId: number;
  amount: number;
  description: string;
  counterpartyName: string;
  counterpartyAccount: string;
  externalReference?: string | null;
};

export type PaymentResponse = {
  paymentReference: string;
  sourceAccountId: number;
  currency: string;
  amount: number;
  description: string;
  counterpartyName: string;
  counterpartyAccount: string;
  balanceAfter: number;
  bookedAt: string;
};

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  lookupBeneficiary(accountNumber: string): Observable<PaymentBeneficiaryResponse> {
    return this.http.get<PaymentBeneficiaryResponse>(
      `${this.baseUrl}/payments/beneficiary/${encodeURIComponent(accountNumber)}`,
    );
  }

  createPayment(payload: CreatePaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/payments`, payload);
  }
}
