import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AccountApiService, type AccountCurrency, type AccountResponse, type AccountType } from '../../core/services/account-api.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle
} from '../../shared/ui/spartan/card';
import { CreateAccountDialogComponent } from './create-account-dialog.component';

type AccountFormOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

@Component({
  selector: 'app-accounts-page',
  imports: [
    DatePipe,
    DecimalPipe,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    CreateAccountDialogComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-page.component.html'
})
export class AccountsPageComponent {
  private readonly accountApi = inject(AccountApiService);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitErrorMessage = signal<string | null>(null);
  protected readonly accounts = signal<AccountResponse[]>([]);

  protected readonly typeOptions: readonly AccountFormOption<AccountType>[] = [
    { value: 'CURRENT', label: 'Current account' },
    { value: 'SAVINGS', label: 'Savings account' },
    { value: 'SAVINGS_PLAN', label: 'Savings plan' }
  ];

  protected readonly currencyOptions: readonly AccountFormOption<AccountCurrency>[] = [
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'ALL', label: 'Albanian Lek (ALL)' }
  ];

  constructor() {
    this.loadAccounts();
  }

  protected openCreateSheet(): void {
    this.submitErrorMessage.set(null);
    this.dialogOpen.set(true);
  }

  protected handleDialogOpenChange(open: boolean): void {
    this.dialogOpen.set(open);
    if (!open) {
      this.submitErrorMessage.set(null);
    }
  }

  protected submitCreateAccount(payload: { name: string; type: AccountType; currency: AccountCurrency; initialDeposit: number }): void {
    this.submitting.set(true);
    this.submitErrorMessage.set(null);

    this.accountApi.createAccount(payload).subscribe({
      next: (createdAccount) => {
        this.accounts.update((accounts) => [...accounts, createdAccount]);
        this.accounts.update((accounts) => [...accounts].sort((left, right) => left.openedAt.localeCompare(right.openedAt)));
        this.submitting.set(false);
        this.handleDialogOpenChange(false);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        if (error.status === 0) {
          this.submitErrorMessage.set('Backend is not reachable. Start backend and try again.');
          return;
        }
        this.submitErrorMessage.set(error.error?.message ?? 'Account creation failed. Please review the data and try again.');
      }
    });
  }

  protected totalCurrentBalance(): number {
    return this.accounts().reduce((sum, account) => sum + account.currentBalance, 0);
  }

  protected totalAvailableBalance(): number {
    return this.accounts().reduce((sum, account) => sum + account.availableBalance, 0);
  }

  protected activeAccountCount(): number {
    return this.accounts().filter((account) => account.status === 'ACTIVE').length;
  }

  protected trackByAccountId(_: number, account: AccountResponse): number {
    return account.id;
  }

  private loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.accountApi.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set([...accounts].sort((left, right) => left.openedAt.localeCompare(right.openedAt)));
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 0) {
          this.errorMessage.set('Backend is not reachable. Start backend and refresh the page.');
          return;
        }
        this.errorMessage.set('Accounts could not be loaded at the moment.');
      }
    });
  }
}
