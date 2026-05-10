import { Directive } from '@angular/core';
import { BrnDialogTrigger } from '@spartan-ng/brain/dialog';

@Directive({
  selector: 'button[hlmDialogTrigger]',
  hostDirectives: [{ directive: BrnDialogTrigger, inputs: ['id', 'type'] }],
  host: {
    'data-slot': 'dialog-trigger'
  }
})
export class HlmDialogTrigger {}
