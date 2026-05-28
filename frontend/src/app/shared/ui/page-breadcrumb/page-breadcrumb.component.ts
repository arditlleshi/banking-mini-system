import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type PageBreadcrumbItem } from './page-breadcrumb.types';
import { HlmBreadcrumbImports } from '../spartan/breadcrumb';

@Component({
  selector: 'app-page-breadcrumb',
  imports: [...HlmBreadcrumbImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-breadcrumb.component.html',
})
export class PageBreadcrumbComponent {
  readonly items = input.required<readonly PageBreadcrumbItem[]>();
  readonly ariaLabel = input<string>('Breadcrumb', { alias: 'aria-label' });
}
