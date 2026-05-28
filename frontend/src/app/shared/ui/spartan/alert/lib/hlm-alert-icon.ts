import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmAlertIcon]',
  host: {
    'data-slot': 'alert-icon',
  },
})
export class HlmAlertIcon {
  constructor() {
    classes(() => 'size-4 shrink-0');
  }
}
