import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspacePageContent } from '../workspace/workspace-page-content';
import { WorkspaceSectionShellComponent } from '../workspace/workspace-section-shell.component';

@Component({
  selector: 'app-transactions-page',
  imports: [WorkspaceSectionShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-workspace-section-shell [content]="content" />'
})
export class TransactionsPageComponent {
  protected readonly content: WorkspacePageContent = {
    section: 'Transactions',
    eyebrow: 'Transaction monitoring',
    headline: 'Transaction oversight with clear controls and investigation-ready detail.',
    summary: 'This surface is ready for payment queues, exception handling, and transaction review workflows.',
    highlights: ['Wire review', 'Exception queues', 'Approval trails']
  };
}
