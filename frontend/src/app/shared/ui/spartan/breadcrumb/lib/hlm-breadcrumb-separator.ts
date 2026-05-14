import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan/icon';
import { classes } from '@spartan/utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[hlmBreadcrumbSeparator]',
  imports: [NgIcon, HlmIcon],
  providers: [provideIcons({ lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'breadcrumb-separator',
    role: 'presentation',
    'aria-hidden': 'true'
  },
  template: `
    <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center leading-none">
      <ng-content>
        <ng-icon hlm size="sm" name="lucideChevronRight" />
      </ng-content>
    </span>
  `
})
export class HlmBreadcrumbSeparator {
  constructor() {
    classes(() => 'spartan-breadcrumb-separator inline-flex items-center justify-center text-muted-foreground');
  }
}
