import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmBreadcrumbItem]',
  host: {
    'data-slot': 'breadcrumb-item',
  },
})
export class HlmBreadcrumbItem {
  constructor() {
    classes(() => 'spartan-breadcrumb-item inline-flex items-center');
  }
}
