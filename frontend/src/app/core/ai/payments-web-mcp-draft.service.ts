import { Injectable, signal } from '@angular/core';

export type OwnTransferDraft = {
  readonly sourceAccountId: number;
  readonly targetAccountId: number;
  readonly amount: number;
  readonly description: string;
};

export type BankPaymentDraft = {
  readonly sourceAccountId: number;
  readonly beneficiaryAccountNumber: string;
  readonly amount: number;
  readonly description: string;
};

@Injectable({ providedIn: 'root' })
export class PaymentsWebMcpDraftService {
  private readonly ownTransferDraftState = signal<OwnTransferDraft | null>(null);
  private readonly bankPaymentDraftState = signal<BankPaymentDraft | null>(null);

  readonly ownTransferDraft = this.ownTransferDraftState.asReadonly();
  readonly bankPaymentDraft = this.bankPaymentDraftState.asReadonly();

  queueOwnTransferDraft(draft: OwnTransferDraft): void {
    this.ownTransferDraftState.set(draft);
  }

  consumeOwnTransferDraft(): OwnTransferDraft | null {
    const draft = this.ownTransferDraftState();
    this.ownTransferDraftState.set(null);
    return draft;
  }

  queueBankPaymentDraft(draft: BankPaymentDraft): void {
    this.bankPaymentDraftState.set(draft);
  }

  consumeBankPaymentDraft(): BankPaymentDraft | null {
    const draft = this.bankPaymentDraftState();
    this.bankPaymentDraftState.set(null);
    return draft;
  }
}
