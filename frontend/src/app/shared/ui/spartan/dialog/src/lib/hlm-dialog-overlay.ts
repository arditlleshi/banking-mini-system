import { computed, Directive, effect, input, untracked } from '@angular/core';
import { injectCustomClassSettable } from '@spartan-ng/brain/core';
import { BrnDialogOverlay } from '@spartan-ng/brain/dialog';
import { hlm } from '@spartan/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[hlmDialogOverlay],hlm-dialog-overlay',
  hostDirectives: [BrnDialogOverlay],
})
export class HlmDialogOverlay {
  private readonly classSettable = injectCustomClassSettable({ optional: true, host: true });
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly computedClass = computed(() =>
    hlm(
      'fixed inset-0 z-50 [background:var(--surface-scrim)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      this.userClass(),
    ),
  );

  constructor() {
    effect(() => {
      const classValue = this.computedClass();
      untracked(() => this.classSettable?.setClassToCustomElement(classValue));
    });
  }
}
