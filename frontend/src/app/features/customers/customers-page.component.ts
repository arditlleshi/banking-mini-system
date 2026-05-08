import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspacePageContent } from '../workspace/workspace-page-content';
import { WorkspaceSectionShellComponent } from '../workspace/workspace-section-shell.component';

@Component({
  selector: 'app-customers-page',
  imports: [WorkspaceSectionShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-workspace-section-shell [content]="content" />'
})
export class CustomersPageComponent {
  protected readonly content: WorkspacePageContent = {
    section: 'Customers',
    eyebrow: 'Client intelligence',
    headline: 'Unified customer records for onboarding, due diligence, and relationship servicing.',
    summary: 'Use this area for client profiles, household structures, risk documentation, and service history.',
    highlights: ['Identity verification', 'Relationship hierarchy', 'Compliance notes']
  };
}
