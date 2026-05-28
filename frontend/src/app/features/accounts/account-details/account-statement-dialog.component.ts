import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule, type FormControl, type FormGroup } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideRotateCcw } from '@ng-icons/lucide';

import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@spartan/dialog';
import { HlmIconImports } from '@spartan/icon';

import { HlmButton } from '../../../shared/ui/spartan/button';
import {
  HlmSelect,
  HlmSelectContent,
  HlmSelectItem,
  HlmSelectPortal,
  HlmSelectTrigger,
  HlmSelectValue,
} from '../../../shared/ui/spartan/select';
import { StatementDatePickerFieldComponent } from './statement-date-picker-field.component';

export type StatementPeriodOption = 'LAST_MONTH' | 'ALL' | 'CUSTOM';
export type StatementTransactionDirectionOption = 'BOTH' | 'CREDIT' | 'DEBIT';

type StatementFiltersForm = FormGroup<{
  period: FormControl<StatementPeriodOption>;
  direction: FormControl<StatementTransactionDirectionOption>;
  fromDate: FormControl<Date | null>;
  toDate: FormControl<Date | null>;
}>;

type StatementFilterOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

@Component({
  selector: 'app-account-statement-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmIconImports,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmSelect,
    HlmSelectContent,
    HlmSelectItem,
    HlmSelectPortal,
    HlmSelectTrigger,
    HlmSelectValue,
    StatementDatePickerFieldComponent,
  ],
  providers: [provideIcons({ lucideDownload, lucideRotateCcw })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-statement-dialog.component.html',
})
export class AccountStatementDialogComponent {
  readonly open = input.required<boolean>();
  readonly statementFiltersForm = input.required<StatementFiltersForm>();
  readonly statementRangeError = input<string | null>(null);
  readonly statementErrorMessage = input<string | null>(null);
  readonly downloadingStatement = input.required<boolean>();
  readonly canResetFilters = input.required<boolean>();
  readonly customPeriodSelected = input.required<boolean>();

  readonly openChange = output<boolean>();
  readonly reset = output<void>();
  readonly download = output<void>();

  protected readonly compactControlClass =
    'h-10 rounded-lg border border-border/80 px-4 text-sm text-foreground shadow-sm transition-[background-color,border-color,box-shadow] [background:var(--surface-control)] hover:[background:var(--surface-control-hover)] focus-visible:ring-4 focus-visible:ring-ring/20 disabled:[background:var(--surface-control-disabled)]';
  protected readonly periodOptions: readonly StatementFilterOption<StatementPeriodOption>[] = [
    { value: 'LAST_MONTH', label: 'Last Month' },
    { value: 'ALL', label: 'All Transactions' },
    { value: 'CUSTOM', label: 'Specify Period' },
  ];
  protected readonly directionOptions: readonly StatementFilterOption<StatementTransactionDirectionOption>[] =
    [
      { value: 'BOTH', label: 'Incoming and Outgoing' },
      { value: 'CREDIT', label: 'Incoming / Credit' },
      { value: 'DEBIT', label: 'Outgoing / Debit' },
    ];

  protected handleDialogStateChanged(state: string): void {
    this.openChange.emit(state === 'open');
  }

  protected resetStatementFilters(): void {
    this.reset.emit();
  }

  protected downloadStatement(): void {
    this.download.emit();
    this.openChange.emit(false);
  }

  protected readonly periodValueToLabel = (value: StatementPeriodOption | null): string => {
    if (!value) {
      return '';
    }

    return this.periodOptions.find((option) => option.value === value)?.label ?? value;
  };

  protected readonly directionValueToLabel = (
    value: StatementTransactionDirectionOption | null,
  ): string => {
    if (!value) {
      return '';
    }

    return this.directionOptions.find((option) => option.value === value)?.label ?? value;
  };
}
