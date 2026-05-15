import { Directive, input } from '@angular/core';
import { classes } from '@spartan/utils';
import { type HlmCardConfig, injectHlmCardConfig } from './hlm-card.token';

@Directive({
  selector: '[hlmCard],hlm-card',
  host: {
    'data-slot': 'card',
    '[attr.data-size]': 'size()',
  },
})
export class HlmCard {
  private readonly defaultConfig = injectHlmCardConfig();

  readonly size = input<HlmCardConfig['size']>(this.defaultConfig.size);

  constructor() {
    classes(
      () =>
        'group/card flex flex-col rounded-[var(--radius-surface)] border border-border bg-card text-card-foreground shadow-[var(--surface-shadow)]',
    );
  }
}
