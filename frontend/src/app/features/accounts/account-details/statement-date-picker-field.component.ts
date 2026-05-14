import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { BrnCalendarImports } from '@spartan-ng/brain/calendar';
import { BrnPopoverImports } from '@spartan-ng/brain/popover';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';

import { HlmButton } from '../../../shared/ui/spartan/button';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function cloneDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number): Date {
  const nextDate = cloneDate(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function buildCalendarWeeks(anchorDate: Date): Date[][] {
  const firstDayOfMonth = startOfMonth(anchorDate);
  const startDay = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
  const lastDayOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const endDay = addDays(lastDayOfMonth, 6 - lastDayOfMonth.getDay());

  const weeks: Date[][] = [];
  let cursor = startDay;

  while (cursor <= endDay) {
    const week: Date[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      week.push(addDays(cursor, offset));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

@Component({
  selector: 'app-statement-date-picker-field',
  imports: [...BrnPopoverImports, ...BrnCalendarImports, HlmButton],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #popover="brnPopover"
      brnPopover
      class="flex flex-col gap-2"
      [state]="open() ? 'open' : 'closed'"
      [align]="'start'"
      [sideOffset]="10"
      (stateChanged)="handlePopoverStateChanged($event)"
    >
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {{ label() }}
      </p>

      <button
        hlmBtn
        type="button"
        variant="outline"
        class="w-full justify-between gap-4 rounded-lg px-4 py-2.5 text-left font-normal shadow-sm"
        [brnPopoverTriggerFor]="popover"
        [id]="buttonId()"
        [attr.aria-label]="label()"
        (click)="prepareForOpen()"
      >
        <span class="min-w-0">
          <span class="block text-sm leading-5" [class.text-foreground]="value()" [class.text-muted-foreground]="!value()">
            {{ displayValue() }}
          </span>
        </span>
        <span class="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {{ value() ? 'Change' : 'Select' }}
        </span>
      </button>

      <ng-template brnPopoverContent>
        <div class="mt-2 w-[20rem] rounded-xl border border-border/70 bg-card p-4 shadow-2xl">
          <div
            brnCalendar
            class="space-y-3"
            [date]="value() ?? undefined"
            [defaultFocusedDate]="visibleDate()"
            [min]="min() ?? undefined"
            [max]="max() ?? undefined"
            (dateChange)="handleDateSelection($event)"
          >
            <div brnCalendarHeader class="flex items-center justify-between gap-3">
              <button
                hlmBtn
                type="button"
                variant="outline"
                size="icon-sm"
                class="h-8 w-8 rounded-lg border-border/70 p-0 text-muted-foreground"
                (click)="goToPreviousMonth()"
                aria-label="Previous month"
              >
                <span aria-hidden="true">&#8249;</span>
              </button>

              <p class="text-sm font-semibold tracking-[-0.02em] text-foreground">
                {{ monthYearLabel() }}
              </p>

              <button
                hlmBtn
                type="button"
                variant="outline"
                size="icon-sm"
                class="h-8 w-8 rounded-lg border-border/70 p-0 text-muted-foreground"
                (click)="goToNextMonth()"
                aria-label="Next month"
              >
                <span aria-hidden="true">&#8250;</span>
              </button>
            </div>

            <div brnCalendarGrid class="space-y-2">
              <div class="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                @for (weekday of weekdayLabels; track weekday) {
                  <span>{{ weekday }}</span>
                }
              </div>

              @for (week of weeks(); track week[0].getTime()) {
                <div class="grid grid-cols-7 gap-1">
                  @for (day of week; track day.getTime()) {
                    <div brnCalendarCell>
                      <button
                        brnCalendarCellButton
                        type="button"
                        [date]="day"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-sm font-medium tabular-nums transition-colors outline-none data-[outside]:text-muted-foreground data-[today]:border-border data-[today]:font-semibold data-[selected]:border-transparent data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 hover:bg-accent hover:text-accent-foreground focus-visible:ring-4 focus-visible:ring-ring/20"
                        [class.opacity-60]="!isSameMonth(day, visibleDate())"
                      >
                        {{ day.getDate() }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class StatementDatePickerFieldComponent {
  readonly label = input.required<string>();
  readonly buttonId = input.required<string>();
  readonly value = input<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly open = signal(false);
  readonly visibleDate = signal(new Date());

  readonly valueChange = output<Date | null>();

  protected readonly weekdayLabels = WEEKDAY_LABELS;

  private readonly selectedDateFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  private readonly monthYearFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  });

  protected readonly weeks = computed(() => buildCalendarWeeks(this.visibleDate()));
  protected readonly monthYearLabel = computed(() => this.monthYearFormatter.format(this.visibleDate()));

  protected displayValue(): string {
    return this.value() ? this.selectedDateFormatter.format(this.value()!) : 'Select date';
  }

  protected prepareForOpen(): void {
    this.visibleDate.set(this.value() ?? this.min() ?? this.max() ?? new Date());
  }

  protected handlePopoverStateChanged(state: string): void {
    this.open.set(state === 'open');
  }

  protected goToPreviousMonth(): void {
    this.visibleDate.set(addMonths(this.visibleDate(), -1));
  }

  protected goToNextMonth(): void {
    this.visibleDate.set(addMonths(this.visibleDate(), 1));
  }

  protected handleDateSelection(selectedDate: Date | undefined): void {
    this.valueChange.emit(selectedDate ?? null);
    this.visibleDate.set(selectedDate ?? this.visibleDate());
    this.open.set(false);
  }

  protected isSameMonth(day: Date, monthAnchor: Date): boolean {
    return isSameMonth(day, monthAnchor);
  }
}
