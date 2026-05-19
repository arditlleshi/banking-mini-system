import { Directive, input } from '@angular/core';
import { classes } from '@spartan/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

export const alertVariants = cva(
  'grid gap-2 rounded-[var(--radius-surface)] border px-4 py-4 shadow-[var(--surface-shadow-inline)]',
  {
    variants: {
      variant: {
        default: 'border-(--status-success-border) [background:var(--status-success-surface)] text-(--status-success-foreground)',
        destructive:
          'border-(--status-danger-border) [background:var(--status-danger-surface)] text-(--status-danger-foreground)'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

@Directive({
  selector: '[hlmAlert],hlm-alert',
  host: {
    'data-slot': 'alert'
  }
})
export class HlmAlert {
  readonly variant = input<AlertVariants['variant']>('default');

  constructor() {
    classes(() => alertVariants({ variant: this.variant() }));
  }
}
