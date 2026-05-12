import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AccountCurrency } from './account-api.service';

export type ExchangeRateResponse = {
  id: number;
  baseCurrency: AccountCurrency;
  quoteCurrency: AccountCurrency;
  buyRate: number;
  sellRate: number;
  source: string;
  validFrom: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class ExchangeRateApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getExchangeRates(): Observable<ExchangeRateResponse[]> {
    return this.http.get<ExchangeRateResponse[]>(`${this.baseUrl}/admin/exchange-rates`);
  }
}
