import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type CreateTransferRequest = {
  sourceAccountId: number;
  targetAccountId: number;
  amount: number;
  description: string;
};

export type TransferResponse = {
  transferReference: string;
  sourceAccountId: number;
  targetAccountId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  appliedExchangeRate: number;
  sourceBalanceAfter: number;
  targetBalanceAfter: number;
  bookedAt: string;
};

@Injectable({ providedIn: 'root' })
export class TransferApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createTransfer(payload: CreateTransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(`${this.baseUrl}/transfers`, payload);
  }
}
