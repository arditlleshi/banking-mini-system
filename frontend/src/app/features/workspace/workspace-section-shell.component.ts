import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '../../shared/ui/spartan/card';
import { WorkspacePageContent } from './workspace-page-content';

@Component({
  selector: 'app-workspace-section-shell',
  imports: [HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-section-shell.component.html',
})
export class WorkspaceSectionShellComponent {
  readonly content = input.required<WorkspacePageContent>();
}
