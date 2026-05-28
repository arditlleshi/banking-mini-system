import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspacePageContent } from '../workspace/workspace-page-content';
import { WorkspaceSectionShellComponent } from '../workspace/workspace-section-shell.component';

@Component({
  selector: 'app-settings-page',
  imports: [WorkspaceSectionShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-workspace-section-shell [content]="content" />',
})
export class SettingsPageComponent {
  protected readonly content: WorkspacePageContent = {
    section: 'Settings',
    eyebrow: 'Platform governance',
    headline: 'Operational preferences, access control, and system policies in one workspace.',
    summary:
      'Reserve this area for permissions, environment controls, audit settings, and product configuration.',
    highlights: ['Role policies', 'Session governance', 'Operational defaults'],
  };
}
