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
    class: 'contents',
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
      <ng-icon
        name="lucideChevronDown"
        class="pointer-events-none text-base text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  `,
})
export class HlmSelectTrigger {
  private static nextId = 0;

  readonly userClass = input<ClassValue>('', { alias: 'class' });
  readonly buttonId = input<string>(`hlm-select-trigger-${HlmSelectTrigger.nextId++}`);
  readonly size = input<'default' | 'sm' | 'lg'>('default');

  protected readonly _computedClass = computed(() =>
    hlm(
      'flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pl-2.5 pr-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [background:var(--select-trigger-surface)] hover:[background:var(--select-trigger-surface-hover)] disabled:[background:var(--surface-control-disabled)] data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
      'flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pl-2.5 pr-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [background:var(--select-trigger-surface)] hover:[background:var(--select-trigger-surface-hover)] disabled:[background:var(--surface-control-disabled)] data-[size=default]:h-10 data-[size=sm]:h-9 data-[size=lg]:h-11 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
      'data-[matches-spartan-invalid=true]:[border-color:var(--status-danger-border)] data-[matches-spartan-invalid=true]:shadow-[0_0_0_4px_var(--status-danger-ring)]',
      this.userClass(),
    ),
  );
}
