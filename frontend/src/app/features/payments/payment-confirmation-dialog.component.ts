import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmDialog,
  HlmDialogClose,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@spartan/dialog';

export type PaymentConfirmation = {
  readonly kind: 'own-transfer' | 'bank-payment';
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly amount: number;
  readonly debitCurrency: string;
  readonly creditCurrency: string;
  readonly exchangeRate: number | null;
  readonly estimatedCreditAmount: number | null;
  readonly debitAccountName: string;
  readonly debitAccountNumber: string;
  readonly creditAccountName: string;
  readonly creditAccountNumber: string;
};

@Component({
  selector: 'app-payment-confirmation-dialog',
  imports: [
    DecimalPipe,
    HlmButton,
    HlmDialog,
    HlmDialogClose,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog
      [state]="open() ? 'open' : 'closed'"
      (stateChanged)="handleDialogStateChanged($event)"
    >
      <hlm-dialog-content
        *hlmDialogPortal="let ctx"
        class="w-[calc(100vw-1rem)] max-w-xl overflow-hidden border-border/70 p-0 shadow-[0_24px_60px_rgba(15,23,42,0.16)] [background:color-mix(in_oklab,var(--surface-panel-strong)_98%,var(--background)_2%)]"
      >
        @if (confirmation(); as model) {
          <div class="border-b border-border/70 px-5 py-4 sm:px-6">
            <div hlmDialogHeader class="min-w-0 gap-1 p-0 text-left">
              <h2
                hlmDialogTitle
                class="font-(--font-manrope) text-lg tracking-[-0.03em] text-foreground sm:text-xl"
              >
                {{ model.title }}
              </h2>
              <p hlmDialogDescription class="text-sm leading-6 text-muted-foreground">
                {{ model.description }}
              </p>
            </div>
          </div>

          <div class="px-5 py-5 sm:px-6 sm:py-6">
            <section class="overflow-hidden rounded-2xl border border-border/70">
              <article class="grid gap-3 px-4 py-4 sm:px-5">
                <div class="flex items-start justify-between gap-4">
                  <p
                    class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    From
                  </p>
                  <p class="text-lg font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                    {{ model.amount | number: '1.2-2' }}
                    <span
                      class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {{ model.debitCurrency }}
                    </span>
                  </p>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-foreground">
                    {{ model.debitAccountName }}
                  </p>
                  <p
                    class="mt-1 wrap-break-word font-mono text-xs tracking-[0.08em] text-muted-foreground"
                  >
                    {{ model.debitAccountNumber }}
                  </p>
                </div>
              </article>

              <div class="mx-4 border-t border-dashed border-border/70 sm:mx-5"></div>

              <article class="grid gap-3 px-4 py-4 sm:px-5">
                <div class="flex items-start justify-between gap-4">
                  <p
                    class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    To
                  </p>
                  <p class="text-lg font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                    @if (model.estimatedCreditAmount !== null) {
                      {{ model.estimatedCreditAmount | number: '1.2-2' }}
                    } @else {
                      —
                    }
                    <span
                      class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {{ model.creditCurrency }}
                    </span>
                  </p>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-foreground">
                    {{ model.creditAccountName }}
                  </p>
                  <p
                    class="mt-1 wrap-break-word font-mono text-xs tracking-[0.08em] text-muted-foreground"
                  >
                    {{ model.creditAccountNumber }}
                  </p>
                </div>
              </article>

              <div class="mx-4 border-t border-dashed border-border/70 sm:mx-5"></div>

              <article class="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                <p
                  class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Exchange Rate
                </p>
                @if (model.exchangeRate !== null) {
                  <p class="text-base font-semibold text-foreground tabular-nums">
                    {{ model.exchangeRate | number: '1.2-2' }}
                  </p>
                } @else {
                  <p class="text-sm text-muted-foreground">Not available</p>
                }
              </article>
            </section>

            @if (submitting()) {
              <p aria-live="polite" class="mt-3 text-sm text-muted-foreground">Booking…</p>
            }
          </div>

          <div class="border-t border-border/70 px-5 py-4 sm:px-6">
            <div hlmDialogFooter class="justify-end gap-2">
              <button
                hlmBtn
                type="button"
                variant="outline"
                class="h-10 px-4 text-sm"
                hlmDialogClose
                [disabled]="submitting()"
              >
                Back
              </button>
              <button
                hlmBtn
                type="button"
                class="h-10 px-4 text-sm"
                [disabled]="submitting()"
                (click)="confirm.emit()"
              >
                {{ submitting() ? 'Booking…' : model.confirmLabel }}
              </button>
            </div>
          </div>
        }
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class PaymentConfirmationDialogComponent {
  readonly open = input.required<boolean>();
  readonly confirmation = input<PaymentConfirmation | null>(null);
  readonly submitting = input(false);

  readonly openChange = output<boolean>();
  readonly confirm = output<void>();

  protected handleDialogStateChanged(state: string): void {
    this.openChange.emit(state === 'open');
  }
}
