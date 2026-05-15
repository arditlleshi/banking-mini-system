import { Directive, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { classes } from '@spartan/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

export const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-surface)] border font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0 [box-shadow:inset_0_1px_0_var(--surface-inset-highlight)]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [box-shadow:var(--surface-shadow)] hover:[background:var(--button-primary-hover)] focus-visible:[background:var(--button-primary-hover)] active:[background:var(--button-primary-active)]',
        outline:
          'border-border bg-card text-foreground shadow-none hover:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] hover:text-accent-foreground focus-visible:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] focus-visible:text-accent-foreground',
        secondary:
          'border-border bg-secondary text-secondary-foreground shadow-none hover:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] hover:text-accent-foreground focus-visible:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] focus-visible:text-accent-foreground',
        ghost:
          'border-transparent bg-transparent text-foreground shadow-none hover:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] hover:text-accent-foreground focus-visible:bg-[color-mix(in_oklab,var(--accent)_72%,var(--card)_28%)] focus-visible:text-accent-foreground',
        destructive:
          'border-transparent bg-destructive [color:var(--destructive-foreground)] [box-shadow:var(--surface-shadow)] hover:[background:var(--button-destructive-hover)] focus-visible:[background:var(--button-destructive-hover)] active:[background:var(--button-destructive-active)]',
        link: 'border-transparent bg-transparent p-0 text-primary shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        xs: 'h-8 px-3 py-1.5 text-xs',
        sm: 'h-9 px-3.5 py-2 text-sm',
        lg: 'h-11 px-5 py-2.5 text-sm',
        icon: 'h-10 w-10 rounded-[var(--radius-surface)] p-0',
        'icon-xs': 'h-7 w-7 rounded-[var(--radius-surface)] p-0',
        'icon-sm': 'h-8 w-8 rounded-[var(--radius-surface)] p-0',
        'icon-lg': 'h-11 w-11 rounded-[var(--radius-surface)] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
  selector: 'button[hlmBtn], a[hlmBtn]',
  exportAs: 'hlmBtn',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: {
    'data-slot': 'button',
  },
})
export class HlmButton {
  private readonly config = injectBrnButtonConfig();
  private readonly additionalClasses = signal<ClassValue>('');

  readonly variant = input<ButtonVariants['variant']>(this.config.variant);
  readonly size = input<ButtonVariants['size']>(this.config.size);

  constructor() {
    classes(() => [
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.additionalClasses(),
    ]);
  }

  setClass(classesValue: string): void {
    this.additionalClasses.set(classesValue);
  }
}
