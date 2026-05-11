import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: 'brn-switch-thumb[hlm],[hlmSwitchThumb]',
})
export class HlmSwitchThumb {
  constructor() {
    classes(
      () =>
        'bg-background dark:group-data-[state=unchecked]:bg-foreground dark:group-data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 shadow-sm transition-transform group-data-[state=checked]:translate-x-[calc(100%-4px)] data-[state=unchecked]:translate-x-[2px]'
    );
  }
}
