import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AccountCurrency } from './account-api.service';

export type DashboardSummaryResponse = {
  baseCurrency: AccountCurrency;
  reportingZone: string;
  calculatedAt: string;
  periodStartDate: string;
  periodEndDate: string;
  netWorth: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
};

export type DashboardMonthlyCashFlowMonthResponse = {
  month: string;
  monthStartDate: string;
  income: number;
  expenses: number;
};

export type DashboardMonthlyCashFlowResponse = {
  baseCurrency: AccountCurrency;
  reportingZone: string;
  calculatedAt: string;
  monthsRequested: number;
  periodStartMonthDate: string;
  periodEndMonthDate: string;
  months: DashboardMonthlyCashFlowMonthResponse[];
};

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getDashboardSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.baseUrl}/dashboard/summary`);
  }

  getDashboardMonthlyCashFlow(months = 6): Observable<DashboardMonthlyCashFlowResponse> {
    return this.http.get<DashboardMonthlyCashFlowResponse>(`${this.baseUrl}/dashboard/monthly-cash-flow`, {
      params: { months }
    });
  }
}
