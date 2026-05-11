import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnSelectTrigger } from '@spartan-ng/brain/select';
import { hlm } from '@spartan/utils';
import type { ClassValue } from 'clsx';

@Component({
  selector: 'hlm-select-trigger',
  imports: [NgIcon, BrnSelectTrigger, BrnFieldControlDescribedBy],
  providers: [provideIcons({ lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents'
  },
  template: `
    <button
      brnSelectTrigger
      brnFieldControlDescribedBy
      [id]="buttonId()"
      [class]="_computedClass()"
      [attr.data-size]="size()"
      data-slot="select-trigger"
      type="button"
    >
      <ng-content />
      <ng-icon name="lucideChevronDown" class="pointer-events-none text-base text-muted-foreground" aria-hidden="true" />
    </button>
  `
})
export class HlmSelectTrigger {
  private static nextId = 0;

  readonly userClass = input<ClassValue>('', { alias: 'class' });
  readonly buttonId = input<string>(`hlm-select-trigger-${HlmSelectTrigger.nextId++}`);
  readonly size = input<'default' | 'sm' | 'lg'>('default');

  protected readonly _computedClass = computed(() =>
    hlm(
      'flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pl-2.5 pr-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50',
      'flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pl-2.5 pr-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-10 data-[size=sm]:h-9 data-[size=lg]:h-11 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50',
      'data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:ring-3 data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:border-destructive/50 dark:data-[matches-spartan-invalid=true]:ring-destructive/40',
      this.userClass()
    )
  );
}
