import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmAlertAction]',
  host: {
    'data-slot': 'alert-action',
  },
})
export class HlmAlertAction {
  constructor() {
    classes(() => 'mt-2');
  }
}
