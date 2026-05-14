import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideShare2 } from '@ng-icons/lucide';
import { RouterLink } from '@angular/router';
import {
  AccountApiService,
  type AccountCurrency,
  type AccountResponse,
  type AccountStatus,
  type AccountType
} from '../../core/services/account-api.service';
import { PageBreadcrumbComponent, type PageBreadcrumbItem } from '../../shared/ui/page-breadcrumb';
import { HlmAccordion, HlmAccordionContent, HlmAccordionItem, HlmAccordionTrigger } from '@spartan/accordion';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle
} from '../../shared/ui/spartan/card';
import { HlmIconImports } from '@spartan/icon';
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
    RouterLink,
    PageBreadcrumbComponent,
    HlmAccordion,
    HlmAccordionContent,
    HlmAccordionItem,
    HlmAccordionTrigger,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmIconImports,
    CreateAccountDialogComponent
  ],
  providers: [provideIcons({ lucideArrowRight, lucideShare2 })],
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
  protected readonly openedAccountId = signal<number | null>(null);
  protected readonly breadcrumbItems: readonly PageBreadcrumbItem[] = [
    { label: 'Home', link: '/home' },
    { label: 'Accounts' }
  ];
  protected readonly totalCurrentBalance = computed(() =>
    this.accounts().reduce((sum, account) => sum + account.currentBalance, 0)
  );
  protected readonly totalAvailableBalance = computed(() =>
    this.accounts().reduce((sum, account) => sum + account.availableBalance, 0)
  );
  protected readonly activeAccountCount = computed(() =>
    this.accounts().filter((account) => account.status === 'ACTIVE').length
  );

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
        const nextAccounts = [...this.accounts(), createdAccount].sort((left, right) => left.openedAt.localeCompare(right.openedAt));
        this.accounts.set(nextAccounts);
        this.syncOpenedAccount(nextAccounts);
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

  protected handleAccountOpenChange(accountId: number, isOpened: boolean): void {
    this.openedAccountId.set(isOpened ? accountId : null);
  }

  protected isAccountOpened(accountId: number, index: number): boolean {
    const openedId = this.openedAccountId();
    if (openedId === null) {
      return index === 0;
    }
    return openedId === accountId;
  }

  protected accountTypeLabel(type: AccountType): string {
    switch (type) {
      case 'CURRENT':
        return 'Current Account';
      case 'SAVINGS':
        return 'Savings Account';
      case 'SAVINGS_PLAN':
        return 'Savings Plan';
    }
  }

  protected accountStatusClass(status: AccountStatus): string {
    switch (status) {
      case 'ACTIVE':
        return '[border-color:var(--status-success-border)] [background:var(--status-success-surface)] [color:var(--status-success-foreground)]';
      case 'BLOCKED':
        return '[border-color:var(--status-danger-border)] [background:var(--status-danger-surface)] [color:var(--status-danger-foreground)]';
      case 'DORMANT':
        return 'border-border/70 [background:var(--surface-inset)] text-muted-foreground';
      case 'CLOSED':
        return 'border-border/70 [background:var(--surface-control-disabled)] text-muted-foreground';
    }
  }

  protected trackByAccountId(_: number, account: AccountResponse): number {
    return account.id;
  }

  private loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.accountApi.getAccounts().subscribe({
      next: (accounts) => {
        const sortedAccounts = [...accounts].sort((left, right) => left.openedAt.localeCompare(right.openedAt));
        this.accounts.set(sortedAccounts);
        this.syncOpenedAccount(sortedAccounts);
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

  private syncOpenedAccount(accounts: readonly AccountResponse[]): void {
    const currentOpenedId = this.openedAccountId();
    if (!accounts.length) {
      this.openedAccountId.set(null);
      return;
    }

    if (currentOpenedId !== null && accounts.some((account) => account.id === currentOpenedId)) {
      return;
    }

    this.openedAccountId.set(accounts[0].id);
  }
}
