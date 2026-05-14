import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule, type FormControl, type FormGroup } from '@angular/forms';

import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle
} from '@spartan/dialog';

import { HlmButton } from '../../../shared/ui/spartan/button';
import { StatementDatePickerFieldComponent } from './statement-date-picker-field.component';

type StatementFiltersForm = FormGroup<{
  fromDate: FormControl<Date | null>;
  toDate: FormControl<Date | null>;
}>;

@Component({
  selector: 'app-account-statement-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    StatementDatePickerFieldComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-statement-dialog.component.html'
})
export class AccountStatementDialogComponent {
  readonly open = input.required<boolean>();
  readonly statementFiltersForm = input.required<StatementFiltersForm>();
  readonly statementRangeError = input<string | null>(null);
  readonly statementErrorMessage = input<string | null>(null);
  readonly statementSuccessMessage = input<string | null>(null);
  readonly downloadingStatement = input.required<boolean>();
  readonly hasDateFilters = input.required<boolean>();

  readonly openChange = output<boolean>();
  readonly reset = output<void>();
  readonly download = output<void>();

  protected handleDialogStateChanged(state: string): void {
    this.openChange.emit(state === 'open');
  }

  protected resetStatementFilters(): void {
    this.reset.emit();
  }

  protected downloadStatement(): void {
    this.download.emit();
  }
}
