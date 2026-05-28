import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCreditCard,
  lucideLandmark,
  lucideSmartphone,
  lucideZap,
} from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan/icon';
import { toast } from '@spartan-ng/brain/sonner';
import { startWith } from 'rxjs';

import {
  AccountApiService,
  type AccountCurrency,
  type AccountResponse,
} from '../../core/services/account-api.service';
import {
  ExchangeRateApiService,
  type ExchangeRateResponse,
} from '../../core/services/exchange-rate-api.service';
import {
  PaymentApiService,
  type PaymentBeneficiaryResponse,
  type PaymentResponse,
} from '../../core/services/payment-api.service';
import {
  TransferApiService,
  type TransferResponse,
} from '../../core/services/transfer-api.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '../../shared/ui/spartan/card';
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';
import {
  HlmSelect,
  HlmSelectContent,
  HlmSelectItem,
  HlmSelectPortal,
  HlmSelectTrigger,
  HlmSelectValue,
} from '../../shared/ui/spartan/select';
import {
  PaymentConfirmationDialogComponent,
  type PaymentConfirmation,
} from './payment-confirmation-dialog.component';

type AccountOption = {
  readonly value: number;
  readonly label: string;
};

type PaymentActionId =
  | 'own-accounts'
  | 'bank-account'
  | 'utilities'
  | 'mobile-top-up'
  | 'credit-card';

type PaymentAction = {
  readonly id: PaymentActionId;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly available: boolean;
};

type FxPreview = {
  readonly rate: number;
  readonly targetAmount: number;
  readonly note: string;
};

type PendingTransferConfirmation = PaymentConfirmation & {
  readonly kind: 'own-transfer';
  readonly sourceAccountId: number;
  readonly targetAccountId: number;
  readonly bookingDescription: string;
};

type PendingBankPaymentConfirmation = PaymentConfirmation & {
  readonly kind: 'bank-payment';
  readonly sourceAccountId: number;
  readonly counterpartyName: string;
  readonly counterpartyAccount: string;
  readonly bookingDescription: string;
};

type PendingConfirmation = PendingTransferConfirmation | PendingBankPaymentConfirmation;

@Component({
  selector: 'app-payments-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmIconImports,
    HlmInput,
    HlmLabel,
    PaymentConfirmationDialogComponent,
    HlmSelect,
    HlmSelectContent,
    HlmSelectItem,
    HlmSelectPortal,
    HlmSelectTrigger,
    HlmSelectValue,
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCreditCard,
      lucideLandmark,
      lucideSmartphone,
      lucideZap,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments-page.component.html',
})
export class PaymentsPageComponent {
  private static readonly descriptionPattern = /^[A-Za-z0-9][A-Za-z0-9 .,'()\/\-]*$/;
  private static readonly accountNumberPattern = /^[A-Za-z0-9]+$/;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountApi = inject(AccountApiService);
  private readonly exchangeRateApi = inject(ExchangeRateApiService);
  private readonly transferApi = inject(TransferApiService);
  private readonly paymentApi = inject(PaymentApiService);

  private readonly accountsLoading = signal(true);
  private readonly ratesLoading = signal(true);
  protected readonly loading = computed(() => this.accountsLoading() || this.ratesLoading());
  protected readonly submitting = signal(false);
  protected readonly beneficiaryLookupLoading = signal(false);
  protected readonly accountsLoadError = signal<string | null>(null);
  protected readonly transferError = signal<string | null>(null);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly beneficiaryLookupError = signal<string | null>(null);
  protected readonly exchangeRateLoadWarning = signal<string | null>(null);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly exchangeRates = signal<ExchangeRateResponse[]>([]);
  protected readonly beneficiary = signal<PaymentBeneficiaryResponse | null>(null);
  protected readonly confirmationOpen = signal(false);
  protected readonly pendingConfirmation = signal<PendingConfirmation | null>(null);
  private readonly resolvedBeneficiaryAccountNumber = signal<string | null>(null);
  protected readonly compactControlClass =
    'h-10 rounded-lg border border-border/80 px-4 text-sm text-foreground shadow-sm transition-[background-color,border-color,box-shadow] [background:var(--surface-control)] hover:[background:var(--surface-control-hover)] focus-visible:ring-4 focus-visible:ring-ring/20 disabled:[background:var(--surface-control-disabled)]';
  protected readonly activePaymentAction = signal<PaymentActionId>('own-accounts');
  protected readonly paymentActions: readonly PaymentAction[] = [
    {
      id: 'own-accounts',
      label: 'Own Accounts',
      description: 'Move money between your eligible bank accounts.',
      icon: 'lucideLandmark',
      available: true,
    },
    {
      id: 'bank-account',
      label: 'Another Account',
      description: 'Send money to another customer account after verification.',
      icon: 'lucideBuilding2',
      available: true,
    },
    {
      id: 'utilities',
      label: 'Utilities',
      description: 'Pay household bills from approved providers.',
      icon: 'lucideZap',
      available: false,
    },
    {
      id: 'mobile-top-up',
      label: 'Mobile Top-Up',
      description: 'Reload a phone number from your account balance.',
      icon: 'lucideSmartphone',
      available: false,
    },
    {
      id: 'credit-card',
      label: 'Credit Card',
      description: 'Pay your card balance or a selected statement.',
      icon: 'lucideCreditCard',
      available: false,
    },
  ];

  protected readonly ownTransferForm = this.fb.nonNullable.group(
    {
      sourceAccountId: [0, [Validators.required, Validators.min(1)]],
      targetAccountId: [0, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0.01), Validators.max(1_000_000)]],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(280),
          Validators.pattern(PaymentsPageComponent.descriptionPattern),
        ],
      ],
    },
    { validators: [PaymentsPageComponent.differentAccountsValidator] },
  );

  protected readonly paymentForm = this.fb.nonNullable.group({
    sourceAccountId: [0, [Validators.required, Validators.min(1)]],
    beneficiaryAccountNumber: [
      '',
      [
        Validators.required,
        Validators.maxLength(34),
        Validators.pattern(PaymentsPageComponent.accountNumberPattern),
      ],
    ],
    amount: [0, [Validators.required, Validators.min(0.01), Validators.max(1_000_000)]],
    description: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(280),
        Validators.pattern(PaymentsPageComponent.descriptionPattern),
      ],
    ],
  });

  private readonly ownSourceAccountIdValue = toSignal(
    this.ownTransferForm.controls.sourceAccountId.valueChanges.pipe(
      startWith(this.ownTransferForm.controls.sourceAccountId.value),
    ),
    { initialValue: this.ownTransferForm.controls.sourceAccountId.value },
  );
  private readonly ownTargetAccountIdValue = toSignal(
    this.ownTransferForm.controls.targetAccountId.valueChanges.pipe(
      startWith(this.ownTransferForm.controls.targetAccountId.value),
    ),
    { initialValue: this.ownTransferForm.controls.targetAccountId.value },
  );
  private readonly ownAmountValue = toSignal(
    this.ownTransferForm.controls.amount.valueChanges.pipe(
      startWith(this.ownTransferForm.controls.amount.value),
    ),
    { initialValue: this.ownTransferForm.controls.amount.value },
  );
  private readonly paymentSourceAccountIdValue = toSignal(
    this.paymentForm.controls.sourceAccountId.valueChanges.pipe(
      startWith(this.paymentForm.controls.sourceAccountId.value),
    ),
    { initialValue: this.paymentForm.controls.sourceAccountId.value },
  );
  private readonly paymentAmountValue = toSignal(
    this.paymentForm.controls.amount.valueChanges.pipe(
      startWith(this.paymentForm.controls.amount.value),
    ),
    { initialValue: this.paymentForm.controls.amount.value },
  );

  protected readonly sourceAccount = computed(
    () => this.accounts().find((account) => account.id === this.ownSourceAccountIdValue()) ?? null,
  );
  protected readonly targetAccount = computed(
    () => this.accounts().find((account) => account.id === this.ownTargetAccountIdValue()) ?? null,
  );
  protected readonly paymentSourceAccount = computed(
    () =>
      this.accounts().find((account) => account.id === this.paymentSourceAccountIdValue()) ?? null,
  );
  protected readonly ownFxPreview = computed(() =>
    this.buildFxPreview(
      this.sourceAccount()?.currency ?? null,
      this.targetAccount()?.currency ?? null,
      this.ownAmountValue() || 0,
    ),
  );
  protected readonly beneficiaryFxPreview = computed(() => {
    const beneficiaryCurrency = this.beneficiary()?.currency ?? null;
    return this.buildFxPreview(
      this.paymentSourceAccount()?.currency ?? null,
      beneficiaryCurrency as AccountCurrency | null,
      this.paymentAmountValue() || 0,
    );
  });
  protected readonly accountOptions = computed<readonly AccountOption[]>(() =>
    this.accounts().map((account) => ({ value: account.id, label: this.accountLabel(account) })),
  );
  protected readonly targetAccountOptions = computed<readonly AccountOption[]>(() => {
    const sourceAccountId = this.ownSourceAccountIdValue();
    return this.accountOptions().filter((option) => option.value !== sourceAccountId);
  });
  protected readonly sameAccountSelected = computed(() => {
    const source = this.ownSourceAccountIdValue();
    const target = this.ownTargetAccountIdValue();
    return source > 0 && target > 0 && source === target;
  });
  protected readonly insufficientFunds = computed(() => {
    const source = this.sourceAccount();
    if (!source) {
      return false;
    }
    return (this.ownAmountValue() || 0) > source.availableBalance;
  });
  protected readonly paymentInsufficientFunds = computed(() => {
    const source = this.paymentSourceAccount();
    if (!source) {
      return false;
    }
    return (this.paymentAmountValue() || 0) > source.availableBalance;
  });

  constructor() {
    this.initializePaymentAction();
    this.monitorBeneficiaryAccountNumber();
    this.loadData();
  }

  protected ownControlHasError(
    controlName: 'sourceAccountId' | 'targetAccountId' | 'amount' | 'description',
  ): boolean {
    const control = this.ownTransferForm.controls[controlName];
    return control.invalid && control.touched;
  }

  protected paymentControlHasError(
    controlName: 'sourceAccountId' | 'beneficiaryAccountNumber' | 'amount' | 'description',
  ): boolean {
    const control = this.paymentForm.controls[controlName];
    return control.invalid && control.touched;
  }

  protected ownAmountErrorMessage(): string | null {
    const control = this.ownTransferForm.controls.amount;
    if (!this.ownControlHasError('amount')) return null;
    if (control.hasError('required')) return 'Amount is required.';
    if (control.hasError('min')) return 'Amount must be at least 0.01.';
    if (control.hasError('max')) return 'Amount cannot be greater than 1,000,000.';
    return 'Enter a valid payment amount.';
  }

  protected paymentAmountErrorMessage(): string | null {
    const control = this.paymentForm.controls.amount;
    if (!this.paymentControlHasError('amount')) return null;
    if (control.hasError('required')) return 'Amount is required.';
    if (control.hasError('min')) return 'Amount must be at least 0.01.';
    if (control.hasError('max')) return 'Amount cannot be greater than 1,000,000.';
    return 'Enter a valid payment amount.';
  }

  protected ownDescriptionErrorMessage(): string | null {
    const control = this.ownTransferForm.controls.description;
    if (!this.ownControlHasError('description')) return null;
    if (control.hasError('required')) return 'Description is required.';
    if (control.hasError('minlength')) return 'Description must be at least 5 characters.';
    if (control.hasError('maxlength')) return 'Description cannot exceed 280 characters.';
    if (control.hasError('pattern'))
      return 'Description must start with a letter or number and use valid characters only.';
    return 'Enter a valid description.';
  }

  protected paymentDescriptionErrorMessage(): string | null {
    const control = this.paymentForm.controls.description;
    if (!this.paymentControlHasError('description')) return null;
    if (control.hasError('required')) return 'Description is required.';
    if (control.hasError('minlength')) return 'Description must be at least 5 characters.';
    if (control.hasError('maxlength')) return 'Description cannot exceed 280 characters.';
    if (control.hasError('pattern'))
      return 'Description must start with a letter or number and use valid characters only.';
    return 'Enter a valid description.';
  }

  protected beneficiaryAccountNumberErrorMessage(): string | null {
    const control = this.paymentForm.controls.beneficiaryAccountNumber;
    if (!this.paymentControlHasError('beneficiaryAccountNumber')) return null;
    if (control.hasError('required')) return 'Beneficiary account number is required.';
    if (control.hasError('maxlength'))
      return 'Beneficiary account number cannot exceed 34 characters.';
    if (control.hasError('pattern'))
      return 'Use letters and numbers only in the beneficiary account number.';
    return 'Enter a valid beneficiary account number.';
  }

  protected accountSelectionErrorMessage(): string | null {
    if (!this.ownTransferForm.hasError('sameAccount')) return null;
    const sourceTouched = this.ownTransferForm.controls.sourceAccountId.touched;
    const targetTouched = this.ownTransferForm.controls.targetAccountId.touched;
    if (!sourceTouched && !targetTouched) return null;
    return 'Debit and credit accounts must be different.';
  }

  protected submitTransfer(): void {
    const confirmation = this.prepareTransferConfirmation();
    if (!confirmation) {
      return;
    }

    this.transferError.set(null);
    this.paymentError.set(null);
    this.pendingConfirmation.set(confirmation);
    this.confirmationOpen.set(true);
  }

  protected lookupBeneficiary(): void {
    const control = this.paymentForm.controls.beneficiaryAccountNumber;
    if (control.invalid || this.beneficiaryLookupLoading()) {
      control.markAsTouched();
      return;
    }

    const normalizedAccountNumber = this.normalizeAccountNumber(control.getRawValue());
    if (!normalizedAccountNumber) {
      control.markAsTouched();
      return;
    }
    if (this.resolvedBeneficiaryAccountNumber() === normalizedAccountNumber && this.beneficiary()) {
      return;
    }

    this.beneficiaryLookupLoading.set(true);
    this.beneficiaryLookupError.set(null);
    this.paymentError.set(null);

    this.paymentApi.lookupBeneficiary(normalizedAccountNumber).subscribe({
      next: (beneficiary) => {
        this.beneficiary.set(beneficiary);
        this.resolvedBeneficiaryAccountNumber.set(beneficiary.accountNumber);
        control.setValue(beneficiary.accountNumber, { emitEvent: false });
        this.beneficiaryLookupLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.beneficiary.set(null);
        this.resolvedBeneficiaryAccountNumber.set(null);
        this.beneficiaryLookupLoading.set(false);
        this.beneficiaryLookupError.set(
          this.extractApiError(error, 'Beneficiary account could not be verified right now.'),
        );
      },
    });
  }

  protected handleBeneficiaryAccountBlur(): void {
    const normalized = this.normalizeAccountNumber(
      this.paymentForm.controls.beneficiaryAccountNumber.getRawValue(),
    );
    if (!normalized || normalized === this.resolvedBeneficiaryAccountNumber()) {
      return;
    }
    this.lookupBeneficiary();
  }

  protected submitPayment(): void {
    const confirmation = this.preparePaymentConfirmation();
    if (!confirmation) {
      return;
    }

    this.paymentError.set(null);
    this.transferError.set(null);
    this.pendingConfirmation.set(confirmation);
    this.confirmationOpen.set(true);
  }

  protected handleConfirmationOpenChange(open: boolean): void {
    if (!open && this.submitting()) {
      this.confirmationOpen.set(true);
      return;
    }

    this.confirmationOpen.set(open);
    if (!open && !this.submitting()) {
      this.pendingConfirmation.set(null);
    }
  }

  protected confirmPendingConfirmation(): void {
    const confirmation = this.pendingConfirmation();
    if (!confirmation || this.submitting()) {
      return;
    }

    if (confirmation.kind === 'own-transfer') {
      this.executeTransfer(confirmation);
      return;
    }

    this.executePayment(confirmation);
  }

  protected readonly accountValueToLabel = (value: number | null): string => {
    if (!value) return '';
    const match = this.accountOptions().find((option) => option.value === value);
    return match ? match.label : String(value);
  };

  protected handleSourceAccountChange(nextSourceAccountId: number): void {
    this.ownTransferForm.controls.sourceAccountId.setValue(nextSourceAccountId);
    if (this.ownTransferForm.controls.targetAccountId.value === nextSourceAccountId) {
      const nextTarget = this.accounts().find((account) => account.id !== nextSourceAccountId);
      if (nextTarget) {
        this.ownTransferForm.controls.targetAccountId.setValue(nextTarget.id);
      }
    }
  }

  protected handleTargetAccountChange(nextTargetAccountId: number): void {
    this.ownTransferForm.controls.targetAccountId.setValue(nextTargetAccountId);
  }

  protected handlePaymentSourceAccountChange(nextSourceAccountId: number): void {
    this.paymentForm.controls.sourceAccountId.setValue(nextSourceAccountId);
  }

  protected selectPaymentAction(action: PaymentAction): void {
    if (!action.available) {
      return;
    }

    this.activePaymentAction.set(action.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: action.id },
      queryParamsHandling: 'merge',
    });
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

  protected accountLabel(account: AccountResponse): string {
    return `${account.name} - ${account.currency} - ${account.accountNumber}`;
  }

  protected accountConfirmationData(account: AccountResponse): { name: string; number: string } {
    return {
      name: account.name,
      number: account.accountNumber,
    };
  }

  private initializePaymentAction(): void {
    const requestedMode = this.route.snapshot.queryParamMap.get('mode');
    if (!requestedMode) {
      return;
    }

    const matchedAction = this.paymentActions.find(
      (action) => action.id === requestedMode && action.available,
    );
    if (matchedAction) {
      this.activePaymentAction.set(matchedAction.id);
    }
  }

  private monitorBeneficiaryAccountNumber(): void {
    this.paymentForm.controls.beneficiaryAccountNumber.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const normalized = this.normalizeAccountNumber(value);
        if (normalized === this.resolvedBeneficiaryAccountNumber()) {
          return;
        }

        this.beneficiary.set(null);
        this.resolvedBeneficiaryAccountNumber.set(null);
        this.beneficiaryLookupError.set(null);
      });
  }

  private buildFxPreview(
    sourceCurrency: AccountCurrency | null,
    targetCurrency: AccountCurrency | null,
    amount: number,
  ): FxPreview | null {
    if (!sourceCurrency || !targetCurrency) {
      return null;
    }
    if (sourceCurrency === targetCurrency) {
      return {
        rate: 1,
        targetAmount: amount,
        note: 'Same currency transfer',
      };
    }

    const rate = this.resolveExchangeRate(sourceCurrency, targetCurrency);
    if (rate == null) {
      return null;
    }

    return {
      rate,
      targetAmount: Number((amount * rate).toFixed(2)),
      note: 'Estimated credit amount',
    };
  }

  private loadData(): void {
    this.accountsLoading.set(true);
    this.ratesLoading.set(true);
    this.accountsLoadError.set(null);
    this.exchangeRateLoadWarning.set(null);

    this.loadAccountsOnly();
    this.exchangeRateApi.getExchangeRates().subscribe({
      next: (rates) => {
        this.exchangeRates.set(rates);
        this.ratesLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.ratesLoading.set(false);
        if (error.status === 403) {
          this.exchangeRateLoadWarning.set(
            'Live exchange rate preview is not available for your current role.',
          );
          return;
        }
        if (error.status === 0) {
          this.exchangeRateLoadWarning.set(
            'Exchange rates are currently unavailable because backend is unreachable.',
          );
          return;
        }
        this.exchangeRateLoadWarning.set('Exchange rate preview is currently unavailable.');
      },
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

        this.ensureOwnTransferDefaults(sorted);
        this.ensurePaymentDefaults(sorted);
      },
      error: (error: HttpErrorResponse) => {
        this.accountsLoading.set(false);
        this.accountsLoadError.set(
          this.extractApiError(error, 'Accounts could not be loaded at the moment.'),
        );
      },
    });
  }

  private ensureOwnTransferDefaults(accounts: AccountResponse[]): void {
    const sourceSelected = accounts.some(
      (account) => account.id === this.ownTransferForm.controls.sourceAccountId.value,
    );
    const targetSelected = accounts.some(
      (account) => account.id === this.ownTransferForm.controls.targetAccountId.value,
    );

    if (!sourceSelected) {
      this.ownTransferForm.controls.sourceAccountId.setValue(accounts[0].id);
    }
    if (!targetSelected) {
      const fallback = accounts.length > 1 ? accounts[1].id : accounts[0].id;
      this.ownTransferForm.controls.targetAccountId.setValue(fallback);
    }
    if (
      this.ownTransferForm.controls.sourceAccountId.value ===
        this.ownTransferForm.controls.targetAccountId.value &&
      accounts.length > 1
    ) {
      const currentSource = this.ownTransferForm.controls.sourceAccountId.value;
      const fallbackTarget = accounts.find((account) => account.id !== currentSource);
      if (fallbackTarget) {
        this.ownTransferForm.controls.targetAccountId.setValue(fallbackTarget.id);
      }
    }
  }

  private ensurePaymentDefaults(accounts: AccountResponse[]): void {
    const sourceSelected = accounts.some(
      (account) => account.id === this.paymentForm.controls.sourceAccountId.value,
    );
    if (!sourceSelected) {
      this.paymentForm.controls.sourceAccountId.setValue(accounts[0].id);
    }
  }

  private resetOwnTransferDraft(): void {
    this.ownTransferForm.reset({
      sourceAccountId: this.ownTransferForm.controls.sourceAccountId.value,
      targetAccountId: this.ownTransferForm.controls.targetAccountId.value,
      amount: 0,
      description: '',
    });
  }

  private resetPaymentDraft(): void {
    this.paymentForm.reset({
      sourceAccountId: this.paymentForm.controls.sourceAccountId.value,
      beneficiaryAccountNumber: this.paymentForm.controls.beneficiaryAccountNumber.value,
      amount: 0,
      description: '',
    });
  }

  private resolveExchangeRate(
    sourceCurrency: AccountCurrency,
    targetCurrency: AccountCurrency,
  ): number | null {
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

  private findLatestRate(
    baseCurrency: AccountCurrency,
    quoteCurrency: AccountCurrency,
  ): ExchangeRateResponse | null {
    const candidates = this.exchangeRates()
      .filter((rate) => rate.baseCurrency === baseCurrency && rate.quoteCurrency === quoteCurrency)
      .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
    return candidates[0] ?? null;
  }

  private normalizeAccountNumber(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }

  private prepareTransferConfirmation(): PendingTransferConfirmation | null {
    if (this.ownTransferForm.invalid || this.submitting()) {
      this.ownTransferForm.markAllAsTouched();
      return null;
    }

    const source = this.sourceAccount();
    const target = this.targetAccount();
    if (!source || !target) {
      this.transferError.set(
        'Choose both debit and credit accounts before reviewing the transfer.',
      );
      return null;
    }
    if (this.ownTransferForm.hasError('sameAccount') || source.id === target.id) {
      this.transferError.set('Source and target accounts must be different.');
      return null;
    }

    const raw = this.ownTransferForm.getRawValue();
    const amount = Number(raw.amount);
    if (amount > source.availableBalance) {
      this.transferError.set(
        'Transfer amount cannot be greater than the available balance of the debit account.',
      );
      return null;
    }

    const fxPreview = this.ownFxPreview();
    const debitAccount = this.accountConfirmationData(source);
    const creditAccount = this.accountConfirmationData(target);
    return {
      kind: 'own-transfer',
      title: 'Confirm Transfer',
      description: 'Review the booking details before continuing.',
      confirmLabel: 'Confirm Transfer',
      amount,
      debitCurrency: source.currency,
      creditCurrency: target.currency,
      exchangeRate: fxPreview?.rate ?? null,
      estimatedCreditAmount: fxPreview?.targetAmount ?? null,
      debitAccountName: debitAccount.name,
      debitAccountNumber: debitAccount.number,
      creditAccountName: creditAccount.name,
      creditAccountNumber: creditAccount.number,
      sourceAccountId: raw.sourceAccountId,
      targetAccountId: raw.targetAccountId,
      bookingDescription: raw.description.trim(),
    };
  }

  private preparePaymentConfirmation(): PendingBankPaymentConfirmation | null {
    if (this.paymentForm.invalid || this.submitting()) {
      this.paymentForm.markAllAsTouched();
      return null;
    }

    const source = this.paymentSourceAccount();
    const beneficiary = this.beneficiary();
    if (!source) {
      this.paymentError.set('Choose a debit account before reviewing the payment.');
      return null;
    }
    if (!beneficiary) {
      this.paymentError.set('Verify the beneficiary account before reviewing the payment.');
      return null;
    }

    const raw = this.paymentForm.getRawValue();
    const amount = Number(raw.amount);
    if (amount > source.availableBalance) {
      this.paymentError.set(
        'Payment amount cannot be greater than the available balance of the debit account.',
      );
      return null;
    }

    const fxPreview = this.beneficiaryFxPreview();
    const debitAccount = this.accountConfirmationData(source);
    return {
      kind: 'bank-payment',
      title: 'Confirm Payment',
      description: 'Review the booking details before continuing.',
      confirmLabel: 'Confirm Payment',
      amount,
      debitCurrency: source.currency,
      creditCurrency: beneficiary.currency,
      exchangeRate: fxPreview?.rate ?? null,
      estimatedCreditAmount: fxPreview?.targetAmount ?? null,
      debitAccountName: debitAccount.name,
      debitAccountNumber: debitAccount.number,
      creditAccountName: beneficiary.beneficiaryName,
      creditAccountNumber: beneficiary.accountNumber,
      sourceAccountId: raw.sourceAccountId,
      counterpartyName: beneficiary.beneficiaryName,
      counterpartyAccount: beneficiary.accountNumber,
      bookingDescription: raw.description.trim(),
    };
  }

  private executeTransfer(confirmation: PendingTransferConfirmation): void {
    this.submitting.set(true);
    this.transferError.set(null);
    this.paymentError.set(null);

    this.transferApi
      .createTransfer({
        sourceAccountId: confirmation.sourceAccountId,
        targetAccountId: confirmation.targetAccountId,
        amount: confirmation.amount,
        description: confirmation.bookingDescription,
      })
      .subscribe({
        next: () => {
          this.showSuccessToast();
          this.submitting.set(false);
          this.confirmationOpen.set(false);
          this.pendingConfirmation.set(null);
          this.resetOwnTransferDraft();
          this.loadAccountsOnly();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.confirmationOpen.set(false);
          this.pendingConfirmation.set(null);
          this.transferError.set(
            this.extractApiError(
              error,
              'Transfer failed. Please review your inputs and try again.',
            ),
          );
        },
      });
  }

  private executePayment(confirmation: PendingBankPaymentConfirmation): void {
    this.submitting.set(true);
    this.paymentError.set(null);
    this.transferError.set(null);

    this.paymentApi
      .createPayment({
        sourceAccountId: confirmation.sourceAccountId,
        amount: confirmation.amount,
        description: confirmation.bookingDescription,
        counterpartyName: confirmation.counterpartyName,
        counterpartyAccount: confirmation.counterpartyAccount,
      })
      .subscribe({
        next: () => {
          this.showSuccessToast();
          this.submitting.set(false);
          this.confirmationOpen.set(false);
          this.pendingConfirmation.set(null);
          this.resetPaymentDraft();
          this.loadAccountsOnly();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.confirmationOpen.set(false);
          this.pendingConfirmation.set(null);
          this.paymentError.set(
            this.extractApiError(error, 'Payment failed. Please review your inputs and try again.'),
          );
        },
      });
  }

  private extractApiError(error: HttpErrorResponse, fallbackMessage: string): string {
    if (error.status === 0) {
      return 'Backend is not reachable. Start backend and try again.';
    }

    const payload = error.error;
    if (payload && typeof payload === 'object') {
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail;
      }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error;
      }
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    return fallbackMessage;
  }

  private showSuccessToast(): void {
    toast.success('Payment completed successfully');
  }

  private static differentAccountsValidator(control: AbstractControl): ValidationErrors | null {
    const sourceAccountId = control.get('sourceAccountId')?.value;
    const targetAccountId = control.get('targetAccountId')?.value;
    if (!sourceAccountId || !targetAccountId) {
      return null;
    }
    return sourceAccountId === targetAccountId ? { sameAccount: true } : null;
  }
}
