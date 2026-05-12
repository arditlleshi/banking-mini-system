import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnInput } from '@spartan-ng/brain/input';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmInput]',
  hostDirectives: [
    { directive: BrnInput, inputs: ['id', 'forceInvalid'] },
    BrnFieldControlDescribedBy,
  ],
})
export class HlmInput {
  constructor() {
    classes(
      () =>
        'rounded-lg border border-input bg-background/82 px-4 py-2.5 text-sm text-foreground shadow-none transition-[border-color,box-shadow,background-color] hover:bg-[color-mix(in_oklab,var(--background)_86%,var(--card)_14%)] focus-visible:border-[color-mix(in_oklab,var(--ring)_70%,var(--border)_30%)] focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_16%,transparent)] file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    );
  }
}
