import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmAlertTitle]',
  host: {
    'data-slot': 'alert-title'
  }
})
export class HlmAlertTitle {
  constructor() {
    classes(() => 'text-sm font-semibold leading-none tracking-[-0.02em]');
  }
}
