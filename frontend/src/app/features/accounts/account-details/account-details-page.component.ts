import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import {
  AccountApiService,
  type AccountDetailsResponse,
  type AccountHistoryTransactionResponse,
  type AccountStatementFilters,
} from '../../../core/services/account-api.service';
import { HlmButton } from '../../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '../../../shared/ui/spartan/card';
import { HlmNumberedPaginationQueryParams } from '../../../shared/ui/spartan/pagination';
import {
  AccountStatementDialogComponent,
  type StatementPeriodOption,
  type StatementTransactionDirectionOption,
} from './account-statement-dialog.component';

type StatementSummary = {
  readonly transactionCount: number;
  readonly totalCredits: number;
  readonly totalDebits: number;
  readonly netMovement: number;
};

type StatementFiltersForm = FormGroup<{
  period: FormControl<StatementPeriodOption>;
  direction: FormControl<StatementTransactionDirectionOption>;
  fromDate: FormControl<Date | null>;
  toDate: FormControl<Date | null>;
}>;

const DEFAULT_STATEMENT_PERIOD: StatementPeriodOption = 'LAST_MONTH';
const DEFAULT_STATEMENT_DIRECTION: StatementTransactionDirectionOption = 'BOTH';

@Component({
  selector: 'app-account-details-page',
  imports: [
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmNumberedPaginationQueryParams,
    AccountStatementDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-details-page.component.html',
})
export class AccountDetailsPageComponent {
  private static readonly dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  private static readonly numberFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly fb = new FormBuilder();
  private readonly route = inject(ActivatedRoute);
  private readonly accountApi = inject(AccountApiService);

  protected readonly loading = signal(true);
  protected readonly downloadingStatement = signal(false);
  protected readonly statementLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statementErrorMessage = signal<string | null>(null);
  protected readonly details = signal<AccountDetailsResponse | null>(null);
  protected readonly statementTransactions = signal<AccountHistoryTransactionResponse[]>([]);
  protected readonly transactionPage = signal(1);
  protected readonly transactionPageSize = signal(5);
  protected readonly statementDialogOpen = signal(false);
  private readonly loadedAccountNumber = signal<string | null>(null);
  protected readonly statementFiltersForm: StatementFiltersForm = this.fb.group({
    period: this.fb.nonNullable.control<StatementPeriodOption>(DEFAULT_STATEMENT_PERIOD),
    direction: this.fb.nonNullable.control<StatementTransactionDirectionOption>(DEFAULT_STATEMENT_DIRECTION),
    fromDate: this.fb.control<Date | null>(null),
    toDate: this.fb.control<Date | null>(null),
  });

  private readonly periodValue = toSignal(
    this.statementFiltersForm.controls.period.valueChanges.pipe(
      startWith(this.statementFiltersForm.controls.period.value),
    ),
    { initialValue: this.statementFiltersForm.controls.period.value },
  );
  private readonly directionValue = toSignal(
    this.statementFiltersForm.controls.direction.valueChanges.pipe(
      startWith(this.statementFiltersForm.controls.direction.value),
    ),
    { initialValue: this.statementFiltersForm.controls.direction.value },
  );

  private readonly fromDateValue = toSignal(
    this.statementFiltersForm.controls.fromDate.valueChanges.pipe(
      startWith(this.statementFiltersForm.controls.fromDate.value),
    ),
    { initialValue: this.statementFiltersForm.controls.fromDate.value },
  );
  private readonly toDateValue = toSignal(
    this.statementFiltersForm.controls.toDate.valueChanges.pipe(
      startWith(this.statementFiltersForm.controls.toDate.value),
    ),
    { initialValue: this.statementFiltersForm.controls.toDate.value },
  );

  protected readonly customPeriodSelected = computed(() => this.periodValue() === 'CUSTOM');
  protected readonly canResetStatementFilters = computed(() =>
    this.periodValue() !== DEFAULT_STATEMENT_PERIOD ||
    this.directionValue() !== DEFAULT_STATEMENT_DIRECTION ||
    this.fromDateValue() !== null ||
    this.toDateValue() !== null,
  );
  protected readonly statementRangeError = computed(() => {
    if (this.periodValue() !== 'CUSTOM') {
      return null;
    }

    const fromDate = this.fromDateValue();
    const toDate = this.toDateValue();

    if (!fromDate || !toDate) {
      return 'Select both dates for a custom statement period.';
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return 'The start date must be before or equal to the end date.';
    }

    return null;
  });
  protected readonly statementSummary = computed<StatementSummary>(() => {
    const details = this.details();
    if (!details) {
      return {
        transactionCount: 0,
        totalCredits: 0,
        totalDebits: 0,
        netMovement: 0,
      };
    }

    return {
      transactionCount: details.transactionCount,
      totalCredits: details.totalCredits,
      totalDebits: details.totalDebits,
      netMovement: details.netMovement,
    };
  });

  constructor() {
    this.statementFiltersForm.controls.period.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((period) => {
        if (period === 'CUSTOM') {
          return;
        }

        this.statementFiltersForm.patchValue(
          {
            fromDate: null,
            toDate: null,
          }
        );
      });

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, queryParams]) => ({
          accountNumber: params.get('accountNumber') ?? '',
          page: this.parsePageNumber(queryParams.get('page')),
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.accountNumber === current.accountNumber && previous.page === current.page,
        ),
        tap(({ accountNumber, page }) => {
          this.transactionPage.set(page);

          const isSameAccount = this.loadedAccountNumber() === accountNumber;
          this.statementErrorMessage.set(null);

          if (isSameAccount) {
            this.statementLoading.set(true);
            return;
          }

          this.loading.set(true);
          this.statementLoading.set(true);
          this.errorMessage.set(null);
          this.details.set(null);
          this.statementTransactions.set([]);
          this.applyDefaultStatementFilters();
          this.statementErrorMessage.set(null);
        }),
        switchMap(({ accountNumber, page }) => {
          const isSameAccount = this.loadedAccountNumber() === accountNumber;

          return this.accountApi.getAccountDetails(accountNumber, page).pipe(
            map((details) => ({ details, isSameAccount })),
            catchError((error: HttpErrorResponse) => {
              this.handleAccountLoadError(error, isSameAccount);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ details }) => {
          this.details.set(details);
          this.statementTransactions.set(details.transactions);
          this.transactionPage.set(details.transactionPage);
          this.transactionPageSize.set(details.transactionPageSize);
          this.loadedAccountNumber.set(details.account.accountNumber);
          this.loading.set(false);
          this.statementLoading.set(false);
          this.errorMessage.set(null);
          this.statementErrorMessage.set(null);
        },
      });
  }

  protected resetStatementFilters(): void {
    if (this.downloadingStatement()) {
      return;
    }

    this.applyDefaultStatementFilters();
    this.statementErrorMessage.set(null);
  }

  protected downloadStatement(): void {
    if (this.downloadingStatement()) {
      return;
    }

    const rangeError = this.statementRangeError();
    if (rangeError) {
      this.statementErrorMessage.set(rangeError);
      return;
    }

    const details = this.details();
    if (!details) {
      return;
    }

    const filters = this.currentStatementFilters();
    this.downloadingStatement.set(true);
    this.statementErrorMessage.set(null);

    this.accountApi
      .downloadAccountStatement(details.account.id, filters)
      .pipe(finalize(() => this.downloadingStatement.set(false)))
      .subscribe({
        next: (statementFile) => {
          this.saveStatementFile(
            statementFile,
            this.buildStatementFileName(details.account.accountNumber, filters),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.statementErrorMessage.set(this.resolveStatementErrorMessage(error));
        },
      });
  }

  protected openStatementDialog(): void {
    this.statementDialogOpen.set(true);
  }

  protected handleStatementDialogStateChanged(open: boolean): void {
    this.statementDialogOpen.set(open);
  }

  protected trackByTransactionId(
    _: number,
    transaction: AccountHistoryTransactionResponse,
  ): number {
    return transaction.id;
  }

  protected movementSign(transaction: AccountHistoryTransactionResponse): '+' | '-' {
    return transaction.direction === 'CREDIT' ? '+' : '-';
  }

  protected movementTone(transaction: AccountHistoryTransactionResponse): string {
    return transaction.direction === 'CREDIT'
      ? '[color:var(--status-inflow-foreground)]'
      : '[color:var(--status-outflow-foreground)]';
  }

  protected senderDescription(
    details: AccountDetailsResponse,
    transaction: AccountHistoryTransactionResponse,
  ): string {
    if (transaction.direction === 'CREDIT') {
      return transaction.counterpartyName ?? transaction.counterpartyAccount ?? 'External sender';
    }
    return details.account.name;
  }

  protected senderNumber(
    details: AccountDetailsResponse,
    transaction: AccountHistoryTransactionResponse,
  ): string {
    if (transaction.direction === 'CREDIT') {
      return transaction.counterpartyAccount ?? 'Account unavailable';
    }
    return details.account.accountNumber;
  }

  protected receiverDescription(
    details: AccountDetailsResponse,
    transaction: AccountHistoryTransactionResponse,
  ): string {
    if (transaction.direction === 'DEBIT') {
      return transaction.counterpartyName ?? transaction.counterpartyAccount ?? 'External receiver';
    }
    return details.account.name;
  }

  protected receiverNumber(
    details: AccountDetailsResponse,
    transaction: AccountHistoryTransactionResponse,
  ): string {
    if (transaction.direction === 'DEBIT') {
      return transaction.counterpartyAccount ?? 'Account unavailable';
    }
    return details.account.accountNumber;
  }

  protected formatDateTime(value: string): string {
    return AccountDetailsPageComponent.dateTimeFormatter.format(new Date(value));
  }

  protected formatMoney(value: number, currency?: string): string {
    const formattedNumber = AccountDetailsPageComponent.numberFormatter.format(value);
    return currency ? `${formattedNumber} ${currency}` : formattedNumber;
  }

  protected formatAccountType(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  protected shortReference(reference: string): string {
    return reference.slice(0, 8);
  }

  private handleAccountLoadError(error: HttpErrorResponse, statementLoad: boolean): void {
    if (statementLoad) {
      this.statementLoading.set(false);
    } else {
      this.loading.set(false);
      this.statementLoading.set(false);
    }

    if (error.status === 0) {
      if (statementLoad) {
        this.statementErrorMessage.set('Backend is not reachable. Start backend and retry.');
        return;
      }
      this.errorMessage.set('Backend is not reachable. Start backend and refresh the page.');
      return;
    }
    if (error.status === 404) {
      if (statementLoad) {
        this.statementErrorMessage.set(
          'Booked transactions could not be loaded for the selected page.',
        );
        return;
      }
      this.errorMessage.set('Account was not found or is not accessible for this user.');
      return;
    }
    if (statementLoad) {
      this.statementErrorMessage.set('Booked transactions could not be loaded at the moment.');
      return;
    }
    this.errorMessage.set('Account details could not be loaded at the moment.');
  }

  private currentStatementFilters(): AccountStatementFilters {
    const rawValue = this.statementFiltersForm.getRawValue();
    const dateRange = this.resolveStatementDateRange(rawValue.period, rawValue.fromDate, rawValue.toDate);

    return {
      fromDate: this.formatStatementDate(dateRange.fromDate),
      toDate: this.formatStatementDate(dateRange.toDate),
      direction: rawValue.direction === 'BOTH' ? null : rawValue.direction,
    };
  }

  private resolveStatementErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Backend is not reachable. Start backend and try again.';
    }
    if (error.status === 400) {
      return error.error?.message ?? 'Review the statement dates and try again.';
    }
    return 'The statement request could not be completed at the moment.';
  }

  private buildStatementFileName(accountNumber: string, filters: AccountStatementFilters): string {
    const fromDate = filters.fromDate ?? 'all';
    const toDate = filters.toDate ?? 'latest';
    const directionSuffix = filters.direction ? `-${filters.direction.toLowerCase()}` : '';
    return `statement-${accountNumber}-${fromDate}-to-${toDate}${directionSuffix}.pdf`;
  }

  private parsePageNumber(value: string | null): number {
    const parsed = Number.parseInt(value ?? '', 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return 1;
    }

    return parsed;
  }

  private formatStatementDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveStatementDateRange(
    period: StatementPeriodOption,
    fromDate: Date | null,
    toDate: Date | null,
  ): { fromDate: Date | null; toDate: Date | null } {
    if (period === 'ALL') {
      return { fromDate: null, toDate: null };
    }

    if (period === 'CUSTOM') {
      return { fromDate, toDate };
    }

    return this.previousMonthDateRange();
  }

  private previousMonthDateRange(): { fromDate: Date; toDate: Date } {
    const today = new Date();
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      fromDate: previousMonthStart,
      toDate: previousMonthEnd,
    };
  }

  private applyDefaultStatementFilters(): void {
    this.statementFiltersForm.reset({
      period: DEFAULT_STATEMENT_PERIOD,
      direction: DEFAULT_STATEMENT_DIRECTION,
      fromDate: null,
      toDate: null,
    });
  }

  private saveStatementFile(statementFile: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(statementFile);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
