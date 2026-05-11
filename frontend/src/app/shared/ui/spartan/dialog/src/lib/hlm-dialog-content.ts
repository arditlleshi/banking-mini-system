import type { BooleanInput } from '@angular/cdk/coercion';
import { NgComponentOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmIconImports } from '@spartan/icon';
import { classes } from '@spartan/utils';
import { HlmDialogClose } from './hlm-dialog-close';

@Component({
  selector: 'hlm-dialog-content',
  imports: [NgComponentOutlet, HlmIconImports, HlmButton, HlmDialogClose],
  providers: [provideIcons({ lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'dialog-content',
    '[attr.data-state]': 'state()'
  },
  template: `
    @if (component) {
      <ng-container [ngComponentOutlet]="component" />
    } @else {
      <ng-content />
    }

    @if (showCloseButton()) {
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        class="absolute right-4 top-4 rounded-lg"
        hlmDialogClose
        type="button"
      >
        <span class="sr-only">Close</span>
        <ng-icon hlm size="sm" name="lucideX" />
      </button>
    }
  `
})
export class HlmDialogContent {
  private readonly dialogRef = inject(BrnDialogRef);
  private readonly dialogContext = injectBrnDialogContext({ optional: true });

  public readonly showCloseButton = input<boolean, BooleanInput>(this.dialogContext?.$showCloseButton ?? true, {
    transform: booleanAttribute
  });

  protected readonly state = computed(() => this.dialogRef?.state() ?? 'closed');
  protected readonly component = this.dialogContext?.$component;
  private readonly dynamicComponentClass = this.dialogContext?.$dynamicComponentClass;

  constructor() {
    classes(() => [
      'fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border/80 bg-card shadow-2xl shadow-black/18 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:duration-200 data-[state=open]:duration-200 sm:w-full',
      this.dynamicComponentClass
    ]);
  }
}
