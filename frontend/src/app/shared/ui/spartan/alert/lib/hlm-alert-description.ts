import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmAlertDescription]',
  host: {
    'data-slot': 'alert-description',
  },
})
export class HlmAlertDescription {
  constructor() {
    classes(() => 'text-sm leading-6');
  }
}
