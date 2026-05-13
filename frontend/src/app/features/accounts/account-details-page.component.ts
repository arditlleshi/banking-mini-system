import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, finalize, map, startWith, switchMap, tap } from 'rxjs';

import {
  AccountApiService,
  type AccountDetailsResponse,
  type AccountStatementFilters,
  type AccountTransactionResponse
} from '../../core/services/account-api.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '../../shared/ui/spartan/card';
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';

type StatementSummary = {
  readonly transactionCount: number;
  readonly totalCredits: number;
  readonly totalDebits: number;
  readonly netMovement: number;
};

@Component({
  selector: 'app-account-details-page',
  imports: [ReactiveFormsModule, RouterLink, HlmButton, HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle, HlmInput, HlmLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-details-page.component.html'
})
export class AccountDetailsPageComponent {
  private static readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  private static readonly dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  private static readonly numberFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  private readonly fb = new FormBuilder();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountApi = inject(AccountApiService);

  protected readonly loading = signal(true);
  protected readonly statementLoading = signal(false);
  protected readonly downloadingStatement = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statementErrorMessage = signal<string | null>(null);
  protected readonly statementSuccessMessage = signal<string | null>(null);
  protected readonly details = signal<AccountDetailsResponse | null>(null);
  protected readonly statementTransactions = signal<AccountTransactionResponse[]>([]);
  protected readonly compactControlClass =
    'h-10 rounded-lg border border-border/80 px-4 text-sm text-foreground shadow-sm transition-[background-color,border-color,box-shadow] [background:var(--surface-control)] hover:[background:var(--surface-control-hover)] focus-visible:ring-4 focus-visible:ring-ring/20 disabled:[background:var(--surface-control-disabled)]';
  protected readonly statementFiltersForm = this.fb.nonNullable.group({
    fromDate: [''],
    toDate: ['']
  });

  private readonly fromDateValue = toSignal(
    this.statementFiltersForm.controls.fromDate.valueChanges.pipe(startWith(this.statementFiltersForm.controls.fromDate.value)),
    { initialValue: this.statementFiltersForm.controls.fromDate.value }
  );
  private readonly toDateValue = toSignal(
    this.statementFiltersForm.controls.toDate.valueChanges.pipe(startWith(this.statementFiltersForm.controls.toDate.value)),
    { initialValue: this.statementFiltersForm.controls.toDate.value }
  );

  protected readonly hasDateFilters = computed(() => Boolean(this.fromDateValue() || this.toDateValue()));
  protected readonly statementRangeError = computed(() => {
    const fromDate = this.fromDateValue();
    const toDate = this.toDateValue();

    if (fromDate && toDate && fromDate > toDate) {
      return 'The start date must be before or equal to the end date.';
    }

    return null;
  });
  protected readonly statementSummary = computed<StatementSummary>(() => {
    const transactions = this.statementTransactions();
    const totalCredits = transactions
      .filter((transaction) => transaction.direction === 'CREDIT')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalDebits = transactions
      .filter((transaction) => transaction.direction === 'DEBIT')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      transactionCount: transactions.length,
      totalCredits,
      totalDebits,
      netMovement: totalCredits - totalDebits
    };
  });
  protected readonly statementRangeLabel = computed(() => {
    const fromDate = this.fromDateValue();
    const toDate = this.toDateValue();

    if (!fromDate && !toDate) {
      return 'Full booked history';
    }

    const fromLabel = fromDate ? this.formatDateValue(fromDate) : 'Account opening';
    const toLabel = toDate ? this.formatDateValue(toDate) : 'Latest booking';
    return `${fromLabel} to ${toLabel}`;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('accountNumber') ?? ''),
        distinctUntilChanged(),
        tap(() => this.prepareForAccountLoad()),
        switchMap((accountNumber) =>
          this.accountApi.getAccountDetails(accountNumber).pipe(
            catchError((error: HttpErrorResponse) => {
              this.handleAccountLoadError(error);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (details) => {
          this.details.set(details);
          this.statementTransactions.set(details.transactions);
          this.loading.set(false);
          this.errorMessage.set(null);
          if (this.hasDateFilters()) {
            this.applyStatementFilters();
          }
        }
      });
  }

  protected applyStatementFilters(): void {
    if (this.statementLoading() || this.downloadingStatement()) {
      return;
    }

    const rangeError = this.statementRangeError();
    if (rangeError) {
      this.statementErrorMessage.set(rangeError);
      this.statementSuccessMessage.set(null);
      return;
    }

    const accountId = this.details()?.account.id;
    if (!accountId) {
      return;
    }

    this.statementLoading.set(true);
    this.statementErrorMessage.set(null);
    this.statementSuccessMessage.set(null);

    const filters = this.currentStatementFilters();
    this.updateStatementQueryParams(filters);
    this.accountApi
      .getAccountTransactions(accountId, filters)
      .pipe(finalize(() => this.statementLoading.set(false)))
      .subscribe({
        next: (transactions) => {
          this.statementTransactions.set(transactions);
        },
        error: (error: HttpErrorResponse) => {
          this.statementErrorMessage.set(this.resolveStatementErrorMessage(error));
        }
      });
  }

  protected resetStatementFilters(): void {
    if (this.statementLoading() || this.downloadingStatement()) {
      return;
    }

    this.statementFiltersForm.reset({ fromDate: '', toDate: '' });
    this.updateStatementQueryParams({ fromDate: null, toDate: null });
    this.statementErrorMessage.set(null);
    this.statementSuccessMessage.set(null);
    this.statementTransactions.set(this.details()?.transactions ?? []);
  }

  protected downloadStatement(): void {
    if (this.downloadingStatement() || this.statementLoading()) {
      return;
    }

    const rangeError = this.statementRangeError();
    if (rangeError) {
      this.statementErrorMessage.set(rangeError);
      this.statementSuccessMessage.set(null);
      return;
    }

    const details = this.details();
    if (!details) {
      return;
    }

    const filters = this.currentStatementFilters();
    this.downloadingStatement.set(true);
    this.statementErrorMessage.set(null);
    this.statementSuccessMessage.set(null);

    this.accountApi
      .downloadAccountStatement(details.account.id, filters)
      .pipe(finalize(() => this.downloadingStatement.set(false)))
      .subscribe({
        next: (statementFile) => {
          this.saveStatementFile(statementFile, this.buildStatementFileName(details.account.accountNumber, filters));
          this.statementSuccessMessage.set('Statement download started.');
        },
        error: (error: HttpErrorResponse) => {
          this.statementErrorMessage.set(this.resolveStatementErrorMessage(error));
        }
      });
  }

  protected trackByTransactionId(_: number, transaction: AccountTransactionResponse): number {
    return transaction.id;
  }

  protected movementSign(transaction: AccountTransactionResponse): '+' | '-' {
    return transaction.direction === 'CREDIT' ? '+' : '-';
  }

  protected movementTone(transaction: AccountTransactionResponse): string {
    return transaction.direction === 'CREDIT'
      ? '[color:var(--status-inflow-foreground)]'
      : '[color:var(--status-outflow-foreground)]';
  }

  protected senderLabel(details: AccountDetailsResponse, transaction: AccountTransactionResponse): string {
    if (transaction.direction === 'CREDIT') {
      return transaction.counterpartyName ?? transaction.counterpartyAccount ?? 'External sender';
    }
    return details.account.name;
  }

  protected receiverLabel(details: AccountDetailsResponse, transaction: AccountTransactionResponse): string {
    if (transaction.direction === 'DEBIT') {
      return transaction.counterpartyName ?? transaction.counterpartyAccount ?? 'External receiver';
    }
    return details.account.name;
  }

  protected formatDateTime(value: string): string {
    return AccountDetailsPageComponent.dateTimeFormatter.format(new Date(value));
  }

  protected formatMoney(value: number, currency?: string): string {
    const formattedNumber = AccountDetailsPageComponent.numberFormatter.format(value);
    return currency ? `${formattedNumber} ${currency}` : formattedNumber;
  }

  protected shortReference(reference: string): string {
    return reference.slice(0, 8);
  }

  private prepareForAccountLoad(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.statementErrorMessage.set(null);
    this.statementSuccessMessage.set(null);
    this.details.set(null);
    this.statementTransactions.set([]);
    this.statementFiltersForm.reset({
      fromDate: this.route.snapshot.queryParamMap.get('fromDate') ?? '',
      toDate: this.route.snapshot.queryParamMap.get('toDate') ?? ''
    });
  }

  private updateStatementQueryParams(filters: AccountStatementFilters): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        fromDate: filters.fromDate ?? null,
        toDate: filters.toDate ?? null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private handleAccountLoadError(error: HttpErrorResponse): void {
    this.loading.set(false);
    if (error.status === 0) {
      this.errorMessage.set('Backend is not reachable. Start backend and refresh the page.');
      return;
    }
    if (error.status === 404) {
      this.errorMessage.set('Account was not found or is not accessible for this user.');
      return;
    }
    this.errorMessage.set('Account details could not be loaded at the moment.');
  }

  private currentStatementFilters(): AccountStatementFilters {
    const rawValue = this.statementFiltersForm.getRawValue();
    return {
      fromDate: rawValue.fromDate || null,
      toDate: rawValue.toDate || null
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
    return `statement-${accountNumber}-${fromDate}-to-${toDate}.pdf`;
  }

  private saveStatementFile(statementFile: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(statementFile);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.click();
    URL.revokeObjectURL(objectUrl);
  }

  private formatDateValue(value: string): string {
    return AccountDetailsPageComponent.dateFormatter.format(new Date(`${value}T00:00:00`));
  }
}
