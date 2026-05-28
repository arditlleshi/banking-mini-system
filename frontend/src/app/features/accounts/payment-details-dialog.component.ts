import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideDownload, lucideShare2 } from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan/icon';

import { type AccountResponse } from '../../core/services/account-api.service';
import { CopyFeedbackComponent } from '../../shared/ui/copy-feedback';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@spartan/dialog';

@Component({
  selector: 'app-payment-details-dialog',
  imports: [
    CopyFeedbackComponent,
    HlmButton,
    HlmIconImports,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  providers: [provideIcons({ lucideCopy, lucideDownload, lucideShare2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog
      [state]="open() ? 'open' : 'closed'"
      (stateChanged)="handleDialogStateChanged($event)"
    >
      <hlm-dialog-content
        *hlmDialogPortal="let ctx"
        class="flex max-h-[min(92vh,56rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden border-border/70 p-0 backdrop-blur-xl [background:color-mix(in_oklab,var(--surface-panel-strong)_94%,var(--background)_6%)]"
      >
        <div
          class="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5"
        >
          <div hlmDialogHeader class="min-w-0 gap-1 p-0 text-left">
            <h2
              hlmDialogTitle
              class="truncate text-base font-semibold tracking-[-0.02em] text-foreground"
            >
              Payment Details
            </h2>
            <p hlmDialogDescription class="max-w-2xl text-sm leading-5 text-muted-foreground">
              Preview the document before sharing or downloading it.
            </p>
          </div>
        </div>

        <section
          class="flex min-h-0 flex-1 [background:color-mix(in_oklab,var(--surface-inset-strong)_82%,var(--background)_18%)]"
        >
          @if (loading()) {
            <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <div
                class="h-12 w-12 animate-spin rounded-full border-2 border-border/80 border-t-primary/70"
              ></div>
              <div class="space-y-1">
                <p class="text-sm font-semibold text-foreground">Preparing PDF...</p>
                <p class="max-w-sm text-xs leading-5 text-muted-foreground">
                  The document preview is loading.
                </p>
              </div>
            </div>
          } @else if (errorMessage()) {
            <div class="flex flex-1 items-center justify-center p-6">
              <p
                aria-live="polite"
                class="max-w-md rounded-(--radius-surface) border px-4 py-3 text-sm leading-6 border-(--status-danger-border) [background:var(--status-danger-surface)] text-(--status-danger-foreground)"
              >
                {{ errorMessage() }}
              </p>
            </div>
          } @else if (previewUrl()) {
            <div class="flex flex-1 overflow-auto p-4 sm:p-5">
              <div
                class="mx-auto flex min-h-full w-full max-w-4xl overflow-hidden rounded-(--radius-surface) bg-white shadow-[0_28px_56px_rgba(0,0,0,0.22)]"
              >
                <object
                  aria-label="Payment details PDF preview"
                  class="block min-h-128 w-full flex-1 bg-white"
                  [data]="previewUrl()"
                  type="application/pdf"
                >
                  <div class="flex min-h-128 w-full items-center justify-center p-6 text-center">
                    <div class="space-y-3">
                      <p class="text-sm font-semibold text-foreground">
                        Preview is unavailable here.
                      </p>
                      <p class="max-w-sm text-xs leading-5 text-muted-foreground">
                        Use the download action below to open the payment details PDF.
                      </p>
                    </div>
                  </div>
                </object>
              </div>
            </div>
          } @else {
            <div class="flex flex-1 items-center justify-center px-6 text-center">
              <p class="max-w-sm text-sm leading-6 text-muted-foreground">
                The preview will appear here once the document is ready.
              </p>
            </div>
          }
        </section>

        <div class="border-t border-border/70 px-4 py-3 sm:px-5">
          @if (actionTone() === 'error' && actionMessage()) {
            <p
              aria-live="polite"
              class="mb-3 rounded-(--radius-surface) border px-4 py-3 text-sm leading-6 border-(--status-danger-border) [background:var(--status-danger-surface)] text-(--status-danger-foreground)"
            >
              {{ actionMessage() }}
            </p>
          }

          <div hlmDialogFooter class="items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2">
              @if (canUseNativeShare()) {
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  class="h-10 gap-2 px-4 text-sm"
                  [disabled]="loading() || !account() || !!errorMessage()"
                  (click)="share.emit()"
                >
                  <ng-icon name="lucideShare2" size="14" aria-hidden="true" />
                  Share
                </button>
              }
              <app-copy-feedback
                #ibanCopyFeedback="copyFeedback"
                [textToCopy]="ibanToCopy()"
                copiedText="Copied!"
                [duration]="1700"
              >
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  class="h-10 gap-2 px-4 text-sm"
                  [disabled]="!ibanToCopy()"
                  (click)="ibanCopyFeedback.copy()"
                >
                  <ng-icon name="lucideCopy" size="14" aria-hidden="true" />
                  Copy IBAN
                </button>
              </app-copy-feedback>
              <app-copy-feedback
                #detailsCopyFeedback="copyFeedback"
                [textToCopy]="paymentDetailsText()"
                copiedText="Copied!"
                [duration]="1700"
              >
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  class="h-10 gap-2 px-4 text-sm"
                  [disabled]="!paymentDetailsText()"
                  (click)="detailsCopyFeedback.copy()"
                >
                  <ng-icon name="lucideCopy" size="14" aria-hidden="true" />
                  Copy Details
                </button>
              </app-copy-feedback>
            </div>

            <button
              hlmBtn
              type="button"
              class="h-10 gap-2 px-4 text-sm"
              [disabled]="loading() || !previewUrl() || !!errorMessage()"
              (click)="download.emit()"
            >
              <ng-icon name="lucideDownload" size="14" aria-hidden="true" />
              Download PDF
            </button>
          </div>
        </div>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class PaymentDetailsDialogComponent {
  readonly open = input.required<boolean>();
  readonly loading = input.required<boolean>();
  readonly account = input<AccountResponse | null>(null);
  readonly previewUrl = input<SafeResourceUrl | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly actionMessage = input<string | null>(null);
  readonly actionTone = input<'success' | 'error' | null>(null);
  readonly canUseNativeShare = input(false);

  readonly openChange = output<boolean>();
  readonly share = output<void>();
  readonly download = output<void>();

  protected readonly ibanToCopy = computed(() => formatIban(this.account()?.iban ?? null));
  protected readonly paymentDetailsText = computed(() => buildPaymentDetailsText(this.account()));

  protected handleDialogStateChanged(state: string): void {
    this.openChange.emit(state === 'open');
  }
}

function formatIban(iban: string | null): string {
  if (!iban) {
    return '';
  }

  return iban
    .replace(/\s+/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function buildPaymentDetailsText(account: AccountResponse | null): string {
  if (!account) {
    return '';
  }

  return [
    'Payment Details',
    `Account Name: ${account.name}`,
    `Account Number: ${account.accountNumber}`,
    `IBAN: ${account.iban ? formatIban(account.iban) : 'Pending'}`,
    `Currency: ${account.currency}`,
  ].join('\n');
}
