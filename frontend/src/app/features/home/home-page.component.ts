import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  AccountApiService,
  type AccountCurrencyDistributionResponse,
} from '../../core/services/account-api.service';
import {
  DashboardApiService,
  type DashboardMonthlyCashFlowResponse,
  type DashboardSummaryResponse,
} from '../../core/services/dashboard-api.service';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '../../shared/ui/spartan/card';

@Component({
  selector: 'app-home-page',
  imports: [
    BaseChartDirective,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  private readonly accountApi = inject(AccountApiService);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly moneyFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  private readonly compactMoneyFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    notation: 'compact',
  });
  private readonly shortDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  private readonly monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
  });
  private readonly currencyOrder: readonly string[] = ['EUR', 'USD', 'GBP', 'ALL'];
  private readonly currencyColors: readonly string[] = ['#0B8B87', '#2563EB', '#F59E0B', '#475569'];
  private readonly cashFlowIncomeColor = '#0B8B87';
  private readonly cashFlowExpenseColor = '#E07A2F';

  protected readonly summaryLoading = signal(true);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly summary = signal<DashboardSummaryResponse | null>(null);
  protected readonly monthlyCashFlowLoading = signal(true);
  protected readonly monthlyCashFlowError = signal<string | null>(null);
  protected readonly monthlyCashFlow = signal<DashboardMonthlyCashFlowResponse | null>(null);
  protected readonly currencyDistributionLoading = signal(true);
  protected readonly currencyDistributionError = signal<string | null>(null);
  protected readonly currencyDistribution = signal<AccountCurrencyDistributionResponse[]>([]);
  protected readonly summaryBaseCurrency = computed(() => this.summary()?.baseCurrency ?? 'ALL');
  protected readonly summaryPeriodEndLabel = computed(() => {
    const periodEnd = this.summary()?.periodEndDate;
    return periodEnd ? this.shortDateFormatter.format(new Date(periodEnd)) : null;
  });
  protected readonly hasCurrencyData = computed(() =>
    this.currencyDistribution().some((item) => item.accountCount > 0),
  );
  protected readonly hasMonthlyCashFlowData = computed(() =>
    (this.monthlyCashFlow()?.months ?? []).some((month) => month.income > 0 || month.expenses > 0),
  );
  protected readonly currencyChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: [...this.currencyOrder],
    datasets: [
      {
        data: this.currencyOrder.map((currency) => this.resolveCurrencyCount(currency)),
        backgroundColor: [...this.currencyColors],
        hoverBackgroundColor: [...this.currencyColors],
        borderWidth: 0,
      },
    ],
  }));
  protected readonly monthlyCashFlowChartData = computed<ChartData<'line'>>(() => {
    const months = this.monthlyCashFlow()?.months ?? [];

    return {
      labels: months.map((month) => this.monthFormatter.format(new Date(month.monthStartDate))),
      datasets: [
        {
          label: 'Income',
          data: months.map((month) => month.income),
          borderColor: this.cashFlowIncomeColor,
          backgroundColor: 'rgba(11, 139, 135, 0.18)',
          fill: true,
          tension: 0.38,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 14,
          pointHoverBackgroundColor: this.cashFlowIncomeColor,
          pointHoverBorderColor: '#0F172A',
          pointHoverBorderWidth: 2,
          cubicInterpolationMode: 'monotone',
          spanGaps: true,
        },
        {
          label: 'Expenses',
          data: months.map((month) => month.expenses),
          borderColor: this.cashFlowExpenseColor,
          backgroundColor: 'rgba(224, 122, 47, 0.16)',
          fill: true,
          tension: 0.38,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 14,
          pointHoverBackgroundColor: this.cashFlowExpenseColor,
          pointHoverBorderColor: '#0F172A',
          pointHoverBorderWidth: 2,
          cubicInterpolationMode: 'monotone',
          spanGaps: true,
        },
      ],
    };
  });
  protected readonly currencyChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 5,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label ?? '';
            const value = context.parsed ?? 0;
            const suffix = value === 1 ? 'account' : 'accounts';
            return `${label}: ${value} ${suffix}`;
          },
        },
      },
    },
  };
  protected readonly monthlyCashFlowChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#94A3B8',
          padding: 16,
        },
      },
      tooltip: {
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${this.formatSummaryMoney(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#94A3B8',
          padding: 10,
        },
      },
      y: {
        beginAtZero: true,
        grace: '8%',
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.12)',
          drawTicks: false,
        },
        ticks: {
          color: '#94A3B8',
          padding: 12,
          callback: (value) => this.formatCompactAxisMoney(Number(value)),
        },
      },
    },
  };
  constructor() {
    this.loadDashboardSummary();
    this.loadDashboardMonthlyCashFlow();
    this.loadAccountCurrencyDistribution();
  }

  protected formatSummaryMoney(value: number | null): string {
    if (value === null) {
      return '--';
    }

    return `${this.moneyFormatter.format(value)} ${this.summaryBaseCurrency()}`;
  }

  protected summaryValue(metric: 'netWorth' | 'incomeThisMonth' | 'expensesThisMonth'): string {
    const summary = this.summary();
    if (!summary) {
      return '--';
    }

    return this.formatSummaryMoney(summary[metric]);
  }

  private formatCompactAxisMoney(value: number): string {
    return `${this.compactMoneyFormatter.format(value)} ${this.summaryBaseCurrency()}`;
  }

  private loadDashboardMonthlyCashFlow(): void {
    this.monthlyCashFlowLoading.set(true);
    this.monthlyCashFlowError.set(null);

    this.dashboardApi.getDashboardMonthlyCashFlow(6).subscribe({
      next: (monthlyCashFlow) => {
        this.monthlyCashFlow.set(monthlyCashFlow);
        this.monthlyCashFlowLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.monthlyCashFlowLoading.set(false);
        if (error.status === 0) {
          this.monthlyCashFlowError.set(
            'Backend is not reachable. Start backend and refresh the page.',
          );
          return;
        }
        this.monthlyCashFlowError.set('Monthly cash flow is not available right now.');
      },
    });
  }

  private loadDashboardSummary(): void {
    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.dashboardApi.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.summaryLoading.set(false);
        if (error.status === 0) {
          this.summaryError.set('Backend is not reachable. Start backend and refresh the page.');
          return;
        }
        this.summaryError.set('Dashboard summary is not available right now.');
      },
    });
  }

  private loadAccountCurrencyDistribution(): void {
    this.currencyDistributionLoading.set(true);
    this.currencyDistributionError.set(null);

    this.accountApi.getAccountCurrencyDistribution().subscribe({
      next: (distribution) => {
        this.currencyDistribution.set(distribution);
        this.currencyDistributionLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.currencyDistributionLoading.set(false);
        if (error.status === 0) {
          this.currencyDistributionError.set(
            'Backend is not reachable. Start backend and refresh the page.',
          );
          return;
        }
        this.currencyDistributionError.set(
          'Account currency distribution is not available right now.',
        );
      },
    });
  }

  private resolveCurrencyCount(currency: string): number {
    return (
      this.currencyDistribution().find((item) => item.currency === currency)?.accountCount ?? 0
    );
  }
}
