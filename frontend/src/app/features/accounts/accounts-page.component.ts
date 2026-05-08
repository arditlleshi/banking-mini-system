import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspacePageContent } from '../workspace/workspace-page-content';
import { WorkspaceSectionShellComponent } from '../workspace/workspace-section-shell.component';

@Component({
  selector: 'app-accounts-page',
  imports: [WorkspaceSectionShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-workspace-section-shell [content]="content" />'
})
export class AccountsPageComponent {
  protected readonly content: WorkspacePageContent = {
    section: 'Accounts',
    eyebrow: 'Portfolio command',
    headline: 'Relationship-led account views for balances, limits, and lifecycle controls.',
    summary: 'This workspace is reserved for account summaries, balance drill-downs, ownership profiles, and operational controls.',
    highlights: ['Deposit accounts', 'Credit facilities', 'Dormancy and status controls']
  };
}
