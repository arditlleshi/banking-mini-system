import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AccountApiService, type AccountDetailsResponse, type AccountTransactionResponse } from '../../core/services/account-api.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '../../shared/ui/spartan/card';

@Component({
  selector: 'app-account-details-page',
  imports: [DatePipe, DecimalPipe, SlicePipe, RouterLink, HlmButton, HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-details-page.component.html'
})
export class AccountDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly accountApi = inject(AccountApiService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly details = signal<AccountDetailsResponse | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(switchMap((params) => this.accountApi.getAccountDetails(params.get('accountNumber') ?? '')))
      .subscribe({
        next: (details) => {
          this.details.set(details);
          this.loading.set(false);
          this.errorMessage.set(null);
        },
        error: (error: HttpErrorResponse) => {
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
}
