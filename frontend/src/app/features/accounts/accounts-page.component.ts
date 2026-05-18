import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideShare2 } from '@ng-icons/lucide';
import { HlmAccordion, HlmAccordionContent, HlmAccordionItem, HlmAccordionTrigger } from '@spartan/accordion';
import { HlmIconImports } from '@spartan/icon';

import {
  AccountApiService,
  type AccountCurrency,
  type AccountResponse,
  type AccountStatus,
  type AccountType
} from '../../core/services/account-api.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle
} from '../../shared/ui/spartan/card';
import { CreateAccountDialogComponent } from './create-account-dialog.component';
import { PaymentDetailsDialogComponent } from './payment-details-dialog.component';

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
    CreateAccountDialogComponent,
    PaymentDetailsDialogComponent
  ],
  providers: [provideIcons({ lucideArrowRight, lucideShare2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-page.component.html'
})
export class AccountsPageComponent implements OnDestroy {
  private readonly accountApi = inject(AccountApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly sharingAccountId = signal<number | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly paymentDetailsDialogOpen = signal(false);
  protected readonly paymentDetailsDialogLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly paymentDetailsDialogErrorMessage = signal<string | null>(null);
  protected readonly paymentDetailsActionMessage = signal<string | null>(null);
  protected readonly paymentDetailsActionTone = signal<'success' | 'error' | null>(null);
  protected readonly submitErrorMessage = signal<string | null>(null);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly openedAccountId = signal<number | null>(null);
  protected readonly paymentDetailsPreviewAccount = signal<AccountResponse | null>(null);
  protected readonly paymentDetailsPreviewBlob = signal<Blob | null>(null);
  protected readonly paymentDetailsPreviewUrl = signal<SafeResourceUrl | null>(null);
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

  private previewObjectUrl: string | null = null;

  constructor() {
    this.loadAccounts();
  }

  ngOnDestroy(): void {
    this.clearPaymentDetailsPreview();
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
    if (isOpened) {
      this.openedAccountId.set(accountId);
      return;
    }

    if (this.openedAccountId() === accountId) {
      this.openedAccountId.set(null);
    }
  }

  protected shareAccountDetails(account: AccountResponse): void {
    if (this.sharingAccountId() !== null) {
      return;
    }

    this.clearPaymentDetailsPreview();
    this.paymentDetailsPreviewAccount.set(account);
    this.paymentDetailsDialogOpen.set(true);
    this.paymentDetailsDialogLoading.set(true);
    this.paymentDetailsDialogErrorMessage.set(null);
    this.clearPaymentDetailsActionMessage();
    this.sharingAccountId.set(account.id);

    this.accountApi.downloadPaymentDetails(account.id).subscribe({
      next: (paymentDetailsFile) => {
        this.paymentDetailsPreviewBlob.set(paymentDetailsFile);
        this.paymentDetailsPreviewUrl.set(this.buildPaymentDetailsPreviewUrl(paymentDetailsFile));
        this.paymentDetailsDialogLoading.set(false);
        this.sharingAccountId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.paymentDetailsDialogLoading.set(false);
        this.paymentDetailsDialogErrorMessage.set(this.resolveShareErrorMessage(error));
        this.sharingAccountId.set(null);
      }
    });
  }

  protected isSharingAccount(accountId: number): boolean {
    return this.sharingAccountId() === accountId;
  }

  protected handlePaymentDetailsDialogOpenChange(open: boolean): void {
    this.paymentDetailsDialogOpen.set(open);

    if (!open) {
      this.paymentDetailsDialogLoading.set(false);
      this.paymentDetailsDialogErrorMessage.set(null);
      this.clearPaymentDetailsActionMessage();
      this.paymentDetailsPreviewAccount.set(null);
      this.clearPaymentDetailsPreview();
    }
  }

  protected async sharePreparedPaymentDetails(): Promise<void> {
    const account = this.paymentDetailsPreviewAccount();
    const previewBlob = this.paymentDetailsPreviewBlob();

    if (!account || !previewBlob) {
      return;
    }

    this.clearPaymentDetailsActionMessage();

    try {
      const shareText = this.buildPaymentDetailsShareText(account);
      const shareFile = new File([previewBlob], this.buildPaymentDetailsFileName(account.accountNumber), {
        type: 'application/pdf'
      });

      if (this.canSharePaymentDetailsFile(shareFile)) {
        await navigator.share({
          title: `Payment Details - ${account.name}`,
          text: shareText,
          files: [shareFile]
        });
        return;
      }

      if (this.canUseNativeShare()) {
        await navigator.share({
          title: `Payment Details - ${account.name}`,
          text: shareText
        });
        return;
      }

      this.setPaymentDetailsActionMessage(
        'Native sharing is not available here. Copy the details or download the PDF instead.',
        'error'
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      this.setPaymentDetailsActionMessage(
        'The device share sheet could not be opened right now. Try copying the details or downloading the PDF instead.',
        'error'
      );
    }
  }

  protected downloadPreparedPaymentDetails(): void {
    const account = this.paymentDetailsPreviewAccount();
    const previewBlob = this.paymentDetailsPreviewBlob();

    if (!account || !previewBlob) {
      return;
    }

    this.saveFile(previewBlob, this.buildPaymentDetailsFileName(account.accountNumber));
  }

  protected canUseNativeShare(): boolean {
    return typeof navigator !== 'undefined'
      && typeof navigator.share === 'function';
  }

  protected isAccountOpened(accountId: number, _index: number): boolean {
    return this.openedAccountId() === accountId;
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

  private resolveShareErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Backend is not reachable. Start backend and try again.';
    }
    if (error.status === 404) {
      return 'Account was not found or is not accessible for this user.';
    }
    if (error.status === 409) {
      return error.error?.message ?? 'Payment details are not available for this account right now.';
    }
    return 'The payment details PDF could not be prepared at the moment.';
  }

  private buildPaymentDetailsFileName(accountNumber: string): string {
    return `payment-details-${accountNumber}.pdf`;
  }

  private buildPaymentDetailsPreviewUrl(file: Blob): SafeResourceUrl {
    const objectUrl = URL.createObjectURL(file);
    this.previewObjectUrl = objectUrl;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${objectUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    );
  }

  private buildPaymentDetailsShareText(account: AccountResponse): string {
    return [
      'Payment Details',
      `Account Name: ${account.name}`,
      `Account Number: ${account.accountNumber}`,
      `IBAN: ${account.iban ? this.formatIban(account.iban) : 'Pending'}`,
      `Currency: ${account.currency}`
    ].join('\n');
  }

  private formatIban(iban: string): string {
    return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  private canSharePaymentDetailsFile(file: File): boolean {
    if (!this.canUseNativeShare() || typeof navigator.canShare !== 'function') {
      return false;
    }

    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }

  private setPaymentDetailsActionMessage(message: string, tone: 'success' | 'error'): void {
    this.paymentDetailsActionMessage.set(message);
    this.paymentDetailsActionTone.set(tone);
  }

  private clearPaymentDetailsActionMessage(): void {
    this.paymentDetailsActionMessage.set(null);
    this.paymentDetailsActionTone.set(null);
  }

  private clearPaymentDetailsPreview(): void {
    this.paymentDetailsPreviewBlob.set(null);
    this.paymentDetailsPreviewUrl.set(null);

    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private saveFile(file: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(file);
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
