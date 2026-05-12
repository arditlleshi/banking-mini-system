import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  AccountCurrency,
  AccountType,
  CreateAccountRequest,
} from '../../core/services/account-api.service';
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
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';
import {
  HlmSelectContent,
  HlmSelectItem,
  HlmSelectPortal,
  HlmSelectTrigger,
  HlmSelectValue,
  HlmSelect,
} from '../../shared/ui/spartan/select';
type AccountFormOption<T extends string> = { readonly value: T; readonly label: string };
@Component({
  selector: 'app-create-account-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmDialog,
    HlmDialogClose,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmInput,
    HlmLabel,
    HlmSelect,
    HlmSelectContent,
    HlmSelectTrigger,
    HlmSelectValue,
    HlmSelectItem,
    HlmSelectPortal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog [state]="open() ? 'open' : 'closed'" (stateChanged)="handleStateChanged($event)">
      <hlm-dialog-content
        *hlmDialogPortal="let ctx"
        class="flex max-h-[min(88vh,42rem)] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden rounded-lg border-border/70 bg-card/96 p-0 backdrop-blur-xl"
      >
        <div class="flex min-h-0 flex-col">
          <div hlmDialogHeader class="gap-3 border-b border-border/70 px-6 py-6 sm:px-8">
            <h2
              hlmDialogTitle
              class="font-[var(--font-manrope)] font-bold tracking-[-0.03em] text-lg leading-tight tracking-tight text-card-foreground text-balance sm:text-xl"
            >
              Create a new account
            </h2>
            <p hlmDialogDescription class="max-w-xl text-sm leading-6 text-muted-foreground">
              Add a clear account name, choose the product type and currency, and set the opening
              amount.
            </p>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex min-h-0 flex-1 flex-col">
            <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 sm:px-8">
              <div class="flex flex-col gap-2">
                <label
                  hlmLabel
                  for="account-name"
                  class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                  >Description</label
                >
                <input
                  id="account-name"
                  hlmInput
                  type="text"
                  formControlName="name"
                  class="h-10 rounded-lg border-border/80 bg-background/70 px-4 text-sm text-foreground shadow-sm transition focus-visible:ring-4 focus-visible:ring-ring/20"
                  placeholder="e.g. Daily operating account…"
                />
              </div>
              <div class="grid gap-5 md:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <label
                    hlmLabel
                    for="account-type"
                    class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >Type</label
                  >
                  <div
                    hlmSelect
                    [value]="form.controls.type.value"
                    [itemToString]="typeValueToLabel"
                    (valueChange)="form.controls.type.setValue($any($event))"
                  >
                    <hlm-select-trigger buttonId="account-type" [class]="compactControlClass">
                      <span hlmSelectValue placeholder="Choose product type"></span>
                    </hlm-select-trigger>
                    <hlm-select-content *hlmSelectPortal>
                      @for (option of typeOptions(); track option.value) {
                        <hlm-select-item [value]="option.value">
                          {{ option.label }}
                        </hlm-select-item>
                      }
                    </hlm-select-content>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <label
                    hlmLabel
                    for="account-currency"
                    class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >Currency</label
                  >
                  <div
                    hlmSelect
                    [value]="form.controls.currency.value"
                    [itemToString]="currencyValueToLabel"
                    (valueChange)="form.controls.currency.setValue($any($event))"
                  >
                    <hlm-select-trigger buttonId="account-currency" [class]="compactControlClass">
                      <span hlmSelectValue placeholder="Choose currency"></span>
                    </hlm-select-trigger>
                    <hlm-select-content *hlmSelectPortal>
                      @for (option of currencyOptions(); track option.value) {
                        <hlm-select-item [value]="option.value">
                          {{ option.label }}
                        </hlm-select-item>
                      }
                    </hlm-select-content>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label
                  hlmLabel
                  for="initial-deposit"
                  class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                  >Initial deposit</label
                >
                <input
                  id="initial-deposit"
                  hlmInput
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="initialDeposit"
                  class="h-10 rounded-lg border-border/80 bg-background/70 px-4 text-sm text-foreground shadow-sm transition focus-visible:ring-4 focus-visible:ring-ring/20"
                />
              </div>
            </div>
            <div class="border-t border-border/70 px-6 py-5 sm:px-8">
              @if (submitErrorMessage()) {
                <p
                  class="mb-4 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                >
                  {{ submitErrorMessage() }}
                </p>
              }
              <div hlmDialogFooter class="justify-end gap-3">
                <button
                  hlmBtn
                  type="button"
                  variant="outline"
                  class="h-10 rounded-lg px-5 text-sm"
                  hlmDialogClose
                >
                  Cancel
                </button>
                <button
                  hlmBtn
                  type="submit"
                  class="h-10 rounded-lg px-5 text-sm"
                  [disabled]="submitting()"
                >
                  {{ submitting() ? 'Creating…' : 'Create account' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class CreateAccountDialogComponent {
  private readonly fb = new FormBuilder();
  protected readonly compactControlClass =
    'h-10 rounded-lg border-border/80 bg-background/70 px-4 text-sm text-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring/20';
  readonly open = input.required<boolean>();
  readonly submitting = input(false);
  readonly submitErrorMessage = input<string | null>(null);
  readonly typeOptions = input.required<readonly AccountFormOption<AccountType>[]>();
  readonly currencyOptions = input.required<readonly AccountFormOption<AccountCurrency>[]>();
  readonly openChange = output<boolean>();
  readonly createAccount = output<CreateAccountRequest>();
  protected readonly typeValueToLabel = (value: AccountType | null): string => {
    if (!value) return '';
    const match = this.typeOptions().find((option) => option.value === value);
    return match ? match.label : value;
  };
  protected readonly currencyValueToLabel = (value: AccountCurrency | null): string => {
    if (!value) return '';
    const match = this.currencyOptions().find((option) => option.value === value);
    return match ? match.label : value;
  };
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['CURRENT' as AccountType, [Validators.required]],
    currency: ['EUR' as AccountCurrency, [Validators.required]],
    initialDeposit: [0, [Validators.required, Validators.min(0)]],
  });
  protected handleStateChanged(state: string): void {
    const isOpen = state === 'open';
    this.openChange.emit(isOpen);
    if (!isOpen) {
      this.form.reset({ name: '', type: 'CURRENT', currency: 'EUR', initialDeposit: 0 });
    }
  }
  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const rawValue = this.form.getRawValue();
    this.createAccount.emit({
      name: rawValue.name.trim(),
      type: rawValue.type,
      currency: rawValue.currency,
      initialDeposit: Number(rawValue.initialDeposit),
    });
  }
}
