import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideCreditCard, lucideHistory, lucideLandmark, lucideSmartphone, lucideZap } from '@ng-icons/lucide';
import { startWith } from 'rxjs';

import { AccountApiService, type AccountCurrency, type AccountResponse } from '../../core/services/account-api.service';
import { ExchangeRateApiService, type ExchangeRateResponse } from '../../core/services/exchange-rate-api.service';
import { TransferApiService, type TransferResponse } from '../../core/services/transfer-api.service';
import { PageBreadcrumbComponent, type PageBreadcrumbItem } from '../../shared/ui/page-breadcrumb';
import { HlmButton } from '../../shared/ui/spartan/button';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '../../shared/ui/spartan/card';
import { HlmIconImports } from '@spartan/icon';
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';
import { HlmSelect, HlmSelectContent, HlmSelectItem, HlmSelectPortal, HlmSelectTrigger, HlmSelectValue } from '../../shared/ui/spartan/select';

type AccountOption = {
  readonly value: number;
  readonly label: string;
};

type PaymentAction = {
  readonly id: 'own-accounts' | 'bank-account' | 'utilities' | 'mobile-top-up' | 'credit-card';
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly available: boolean;
};

@Component({
  selector: 'app-payments-page',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    PageBreadcrumbComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmIconImports,
    HlmInput,
    HlmLabel,
    HlmSelect,
    HlmSelectContent,
    HlmSelectItem,
    HlmSelectPortal,
    HlmSelectTrigger,
    HlmSelectValue
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCreditCard,
      lucideHistory,
      lucideLandmark,
      lucideSmartphone,
      lucideZap
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments-page.component.html'
})
export class PaymentsPageComponent {
  private readonly fb = new FormBuilder();
  private readonly accountApi = inject(AccountApiService);
  private readonly exchangeRateApi = inject(ExchangeRateApiService);
  private readonly transferApi = inject(TransferApiService);

  private readonly accountsLoading = signal(true);
  private readonly ratesLoading = signal(true);
  protected readonly loading = computed(() => this.accountsLoading() || this.ratesLoading());
  protected readonly submitting = signal(false);
  protected readonly accountsLoadError = signal<string | null>(null);
  protected readonly transferError = signal<string | null>(null);
  protected readonly exchangeRateLoadWarning = signal<string | null>(null);
  protected readonly successTransfer = signal<TransferResponse | null>(null);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly exchangeRates = signal<ExchangeRateResponse[]>([]);
  protected readonly breadcrumbItems: readonly PageBreadcrumbItem[] = [
    { label: 'Home', link: '/home' },
    { label: 'Payments' }
  ];
  protected readonly compactControlClass =
    'h-10 rounded-lg border border-border/80 px-4 text-sm text-foreground shadow-sm transition-[background-color,border-color,box-shadow] [background:var(--surface-control)] hover:[background:var(--surface-control-hover)] focus-visible:ring-4 focus-visible:ring-ring/20 disabled:[background:var(--surface-control-disabled)]';
  protected readonly activePaymentAction = signal<PaymentAction['id']>('own-accounts');
  protected readonly paymentActions: readonly PaymentAction[] = [
    {
      id: 'own-accounts',
      label: 'Own Accounts',
      description: 'Move money between your eligible bank accounts.',
      icon: 'lucideLandmark',
      available: true
    },
    {
      id: 'bank-account',
      label: 'Another Account',
      description: 'Send money to a saved or new bank beneficiary.',
      icon: 'lucideBuilding2',
      available: false
    },
    {
      id: 'utilities',
      label: 'Utilities',
      description: 'Pay household bills from approved providers.',
      icon: 'lucideZap',
      available: false
    },
    {
      id: 'mobile-top-up',
      label: 'Mobile Top-Up',
      description: 'Reload a phone number from your account balance.',
      icon: 'lucideSmartphone',
      available: false
    },
    {
      id: 'credit-card',
      label: 'Credit Card',
      description: 'Pay your card balance or a selected statement.',
      icon: 'lucideCreditCard',
      available: false
    }
  ];

  protected readonly form = this.fb.nonNullable.group({
    sourceAccountId: [0, [Validators.required, Validators.min(1)]],
    targetAccountId: [0, [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required, Validators.maxLength(280)]]
  });

  private readonly sourceAccountIdValue = toSignal(
    this.form.controls.sourceAccountId.valueChanges.pipe(startWith(this.form.controls.sourceAccountId.value)),
    { initialValue: this.form.controls.sourceAccountId.value }
  );
  private readonly targetAccountIdValue = toSignal(
    this.form.controls.targetAccountId.valueChanges.pipe(startWith(this.form.controls.targetAccountId.value)),
    { initialValue: this.form.controls.targetAccountId.value }
  );
  private readonly amountValue = toSignal(this.form.controls.amount.valueChanges.pipe(startWith(this.form.controls.amount.value)), {
    initialValue: this.form.controls.amount.value
  });

  protected readonly sourceAccount = computed(() =>
    this.accounts().find((account) => account.id === this.sourceAccountIdValue()) ?? null
  );

  protected readonly targetAccount = computed(() =>
    this.accounts().find((account) => account.id === this.targetAccountIdValue()) ?? null
  );

  protected readonly fxPreview = computed(() => {
    const source = this.sourceAccount();
    const target = this.targetAccount();
    if (!source || !target) {
      return null;
    }

    if (source.currency === target.currency) {
      return {
        rate: 1,
        targetAmount: this.amountValue() || 0,
        note: 'Same currency transfer'
      };
    }

    const rate = this.resolveExchangeRate(source.currency, target.currency);
    if (rate == null) {
      return null;
    }

    const amount = this.amountValue() || 0;
    return {
      rate,
      targetAmount: Number((amount * rate).toFixed(2)),
      note: 'Estimated target amount'
    };
  });

  protected readonly accountOptions = computed<readonly AccountOption[]>(() =>
    this.accounts().map((account) => ({ value: account.id, label: this.accountLabel(account) }))
  );
  protected readonly targetAccountOptions = computed<readonly AccountOption[]>(() => {
    const sourceAccountId = this.sourceAccountIdValue();
    return this.accountOptions().filter((option) => option.value !== sourceAccountId);
  });
  protected readonly sameAccountSelected = computed(() => {
    const source = this.sourceAccountIdValue();
    const target = this.targetAccountIdValue();
    return source > 0 && target > 0 && source === target;
  });
  protected readonly insufficientFunds = computed(() => {
    const source = this.sourceAccount();
    if (!source) {
      return false;
    }
    return (this.amountValue() || 0) > source.availableBalance;
  });

  constructor() {
    this.loadData();
  }

  protected submitTransfer(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const source = this.sourceAccount();
    const target = this.targetAccount();
    if (!source || !target) {
      this.transferError.set('Choose both debit and credit accounts before submitting.');
      return;
    }
    if (source.id === target.id) {
      this.transferError.set('Source and target accounts must be different.');
      return;
    }
    const raw = this.form.getRawValue();
    if (Number(raw.amount) > source.availableBalance) {
      this.transferError.set('Transfer amount cannot be greater than the available balance of the debit account.');
      return;
    }

    this.submitting.set(true);
    this.transferError.set(null);
    this.successTransfer.set(null);
    this.transferApi
      .createTransfer({
        sourceAccountId: raw.sourceAccountId,
        targetAccountId: raw.targetAccountId,
        amount: Number(raw.amount),
        description: raw.description.trim()
      })
      .subscribe({
        next: (response) => {
          this.successTransfer.set(response);
          this.submitting.set(false);
          this.form.controls.amount.setValue(0);
          this.form.controls.description.setValue('');
          this.loadAccountsOnly();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          if (error.status === 0) {
            this.transferError.set('Backend is not reachable. Start backend and try again.');
            return;
          }
          this.transferError.set(error.error?.message ?? 'Transfer failed. Please review your inputs and try again.');
        }
      });
  }

  protected accountLabel(account: AccountResponse): string {
    return `${account.name} - ${account.currency} - ${account.accountNumber}`;
  }

  protected readonly accountValueToLabel = (value: number | null): string => {
    if (!value) return '';
    const match = this.accountOptions().find((option) => option.value === value);
    return match ? match.label : String(value);
  };

  protected handleSourceAccountChange(nextSourceAccountId: number): void {
    this.form.controls.sourceAccountId.setValue(nextSourceAccountId);
    if (this.form.controls.targetAccountId.value === nextSourceAccountId) {
      const nextTarget = this.accounts().find((account) => account.id !== nextSourceAccountId);
      if (nextTarget) {
        this.form.controls.targetAccountId.setValue(nextTarget.id);
      }
    }
  }

  protected handleTargetAccountChange(nextTargetAccountId: number): void {
    this.form.controls.targetAccountId.setValue(nextTargetAccountId);
  }

  protected trackByAccountId(_: number, account: AccountResponse): number {
    return account.id;
  }

  protected selectPaymentAction(action: PaymentAction): void {
    if (!action.available) {
      return;
    }

    this.activePaymentAction.set(action.id);
  }

  protected paymentActionClass(action: PaymentAction): string {
    const base =
      'group flex min-h-28 w-full min-w-0 items-start gap-3 rounded-lg border px-4 py-4 text-left transition-[border-color,background-color,box-shadow] focus-visible:ring-4 focus-visible:ring-ring/20';
    if (!action.available) {
      return `${base} cursor-not-allowed border-border/55 text-muted-foreground opacity-72 [background:var(--surface-control-disabled)]`;
    }
    if (this.activePaymentAction() === action.id) {
      return `${base} text-foreground [border-color:var(--surface-selected-border)] [background:var(--surface-selected)] [box-shadow:var(--surface-shadow-selected)]`;
    }
    return `${base} border-border/70 text-foreground [background:var(--surface-panel)] hover:border-primary/30 hover:[background:var(--surface-selected-hover)]`;
  }

  private loadData(): void {
    this.accountsLoading.set(true);
    this.ratesLoading.set(true);
    this.accountsLoadError.set(null);
    this.exchangeRateLoadWarning.set(null);
    this.successTransfer.set(null);

    this.loadAccountsOnly();
    this.exchangeRateApi.getExchangeRates().subscribe({
      next: (rates) => {
        this.exchangeRates.set(rates);
        this.ratesLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.ratesLoading.set(false);
        if (error.status === 403) {
          this.exchangeRateLoadWarning.set('Live exchange rate preview is not available for your current role.');
          return;
        }
        if (error.status === 0) {
          this.exchangeRateLoadWarning.set('Exchange rates are currently unavailable because backend is unreachable.');
          return;
        }
        this.exchangeRateLoadWarning.set('Exchange rate preview is currently unavailable.');
      }
    });
  }

  private loadAccountsOnly(): void {
    this.accountsLoading.set(true);
    this.accountApi.getAccounts().subscribe({
      next: (accounts) => {
        const sorted = [...accounts].sort((left, right) => left.name.localeCompare(right.name));
        this.accounts.set(sorted);
        this.accountsLoading.set(false);

        if (!sorted.length) {
          return;
        }

        const sourceSelected = sorted.some((account) => account.id === this.form.controls.sourceAccountId.value);
        const targetSelected = sorted.some((account) => account.id === this.form.controls.targetAccountId.value);

        if (!sourceSelected) {
          this.form.controls.sourceAccountId.setValue(sorted[0].id);
        }
        if (!targetSelected) {
          const fallback = sorted.length > 1 ? sorted[1].id : sorted[0].id;
          this.form.controls.targetAccountId.setValue(fallback);
        }
        if (this.form.controls.sourceAccountId.value === this.form.controls.targetAccountId.value && sorted.length > 1) {
          const currentSource = this.form.controls.sourceAccountId.value;
          const fallbackTarget = sorted.find((account) => account.id !== currentSource);
          if (fallbackTarget) {
            this.form.controls.targetAccountId.setValue(fallbackTarget.id);
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        this.accountsLoading.set(false);
        if (error.status === 0) {
          this.accountsLoadError.set('Backend is not reachable. Start backend and refresh the page.');
          return;
        }
        this.accountsLoadError.set('Accounts could not be loaded at the moment.');
      }
    });
  }

  private resolveExchangeRate(sourceCurrency: AccountCurrency, targetCurrency: AccountCurrency): number | null {
    if (sourceCurrency === targetCurrency) {
      return 1;
    }

    const sourceToAll = this.findLatestRate(sourceCurrency, 'ALL');
    const targetToAll = this.findLatestRate(targetCurrency, 'ALL');

    if (sourceCurrency === 'ALL') {
      if (!targetToAll) {
        return null;
      }
      return Number((1 / targetToAll.sellRate).toFixed(8));
    }

    if (targetCurrency === 'ALL') {
      if (!sourceToAll) {
        return null;
      }
      return sourceToAll.buyRate;
    }

    if (!sourceToAll || !targetToAll) {
      return null;
    }

    return Number((sourceToAll.buyRate / targetToAll.sellRate).toFixed(8));
  }

  private findLatestRate(baseCurrency: AccountCurrency, quoteCurrency: AccountCurrency): ExchangeRateResponse | null {
    const candidates = this.exchangeRates()
      .filter((rate) => rate.baseCurrency === baseCurrency && rate.quoteCurrency === quoteCurrency)
      .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
    return candidates[0] ?? null;
  }
}
