import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-copy-feedback',
  standalone: true,
  exportAs: 'copyFeedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex',
  },
  template: `
    <ng-content />

    @if (messageVisible()) {
      <span
        aria-live="polite"
        class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-surface)] bg-foreground px-3 py-1.5 text-xs text-background shadow-lg transition-[opacity,transform] duration-200"
        [class]="messageMotionClass()"
      >
        {{ copiedText() }}
      </span>
    }
  `,
})
export class CopyFeedbackComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly textToCopy = input.required<string>();
  readonly copiedText = input('Copied!');
  readonly duration = input(1600);

  protected readonly messageVisible = signal(false);
  protected readonly fadingOut = signal(false);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly messageMotionClass = computed(() =>
    this.fadingOut() ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  async copy(): Promise<void> {
    const text = this.textToCopy().trim();
    if (!text) {
      return;
    }

    const copied = await this.copyText(text);
    if (!copied) {
      return;
    }

    this.clearTimers();
    this.messageVisible.set(true);
    this.fadingOut.set(false);

    const safeDuration = Math.max(this.duration(), 400);
    const fadeLead = 180;
    this.fadeTimer = window.setTimeout(() => {
      this.fadingOut.set(true);
      this.fadeTimer = null;
    }, safeDuration - fadeLead);

    this.hideTimer = window.setTimeout(() => {
      this.messageVisible.set(false);
      this.fadingOut.set(false);
      this.hideTimer = null;
    }, safeDuration);
  }

  private async copyText(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return this.copyTextWithHiddenTextarea(text);
      }
    }

    return this.copyTextWithHiddenTextarea(text);
  }

  private copyTextWithHiddenTextarea(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  private clearTimers(): void {
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
