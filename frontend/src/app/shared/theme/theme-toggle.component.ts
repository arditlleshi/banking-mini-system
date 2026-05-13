import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { HlmLabel } from '../ui/spartan/label';
import { HlmSwitch } from '../ui/spartan/switch';
@Component({
  selector: 'app-theme-toggle',
  imports: [HlmLabel, HlmSwitch],
  template: `
    <div
      class="rounded-lg border border-border/70 px-3 py-2 backdrop-blur-md [background:var(--surface-panel)] [box-shadow:var(--surface-shadow)]"
    >
      <label
        hlmLabel
        for="theme-mode"
        class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
      >
        <span>Night mode</span>
        <hlm-switch
          inputId="theme-mode"
          [checked]="theme.isDark()"
          (checkedChange)="theme.setMode($event ? 'dark' : 'light')"
          aria-label="Toggle color theme"
        />
      </label>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
