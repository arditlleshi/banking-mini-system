import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';

import {
  type AuthenticatedUser,
  type UpdateCurrentUserRequest,
  type UserTheme,
} from '../../core/auth/auth-api.service';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '../../shared/ui/spartan/card';
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';
import { HlmSeparator } from '../../shared/ui/spartan/separator';

type ThemeOption = {
  readonly value: UserTheme;
  readonly label: string;
  readonly description: string;
};

type SettingsControlName = keyof typeof SETTINGS_FIELD_ERRORS;

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmInput,
    HlmLabel,
    HlmSeparator,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.component.html',
  host: {
    '(window:beforeunload)': 'handleBeforeUnload($event)',
  },
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly currentUser = this.currentUserService.currentUser;

  protected readonly themeOptions: readonly ThemeOption[] = [
    {
      value: 'LIGHT',
      label: 'Light Ledger',
      description: 'Bright surfaces, airy contrast, and a desk-like daylight workspace.',
    },
    {
      value: 'DARK',
      label: 'Night Vault',
      description: 'Low-glare panels with stronger contrast for late-session banking work.',
    },
  ];

  protected readonly savedDetails = [
    {
      title: 'Identity',
      description: 'Full name and email stay aligned with the authenticated customer profile.',
    },
    {
      title: 'Reachability',
      description: 'Phone and address are stored as optional contact details for the simulation.',
    },
    {
      title: 'Theme Preference',
      description: 'The selected appearance is applied when the authenticated workspace loads.',
    },
  ] as const;

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(32)]],
    address: ['', [Validators.maxLength(255)]],
    theme: ['LIGHT' as UserTheme, [Validators.required]],
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly completionCount = computed(() => {
    const value = this.formValue();
    return [
      value.fullName ?? '',
      value.email ?? '',
      value.phone ?? '',
      value.address ?? '',
    ].filter((entry) =>
      entry.trim().length > 0,
    ).length;
  });
  protected readonly profileName = computed(() => {
    const fullName = (this.formValue().fullName ?? '').trim();
    return fullName || this.currentUser()?.username || 'Account Holder';
  });
  protected readonly profileEmail = computed(() => {
    const email = (this.formValue().email ?? '').trim();
    return email || 'No email saved yet';
  });
  protected readonly profilePhone = computed(() => {
    const phone = (this.formValue().phone ?? '').trim();
    return phone || 'No phone saved yet';
  });
  protected readonly profileAddress = computed(() => {
    const address = (this.formValue().address ?? '').trim();
    return address || 'No address saved yet';
  });
  protected readonly profileInitials = computed(() => buildInitials(this.profileName()));
  protected readonly selectedThemeLabel = computed(
    () => this.themeOptions.find((option) => option.value === this.formValue().theme)?.label ?? 'Light Ledger',
  );
  protected readonly memberSinceLabel = computed(() => {
    const createdAt = this.currentUser()?.createdAt;
    if (!createdAt) {
      return 'Unavailable';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(createdAt));
  });

  constructor() {
    this.loadSettings();
  }

  protected currentUsername(): string {
    return this.currentUser()?.username ?? 'anonymous';
  }

  protected retry(): void {
    this.loadSettings(true);
  }

  protected saveSettings(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidControl(['fullName', 'email', 'phone', 'address']);
      return;
    }

    this.saving.set(true);

    const rawValue = this.form.getRawValue();
    const payload: UpdateCurrentUserRequest = {
      fullName: rawValue.fullName.trim(),
      email: rawValue.email.trim(),
      phone: normalizeOptionalText(rawValue.phone),
      address: normalizeOptionalText(rawValue.address),
      theme: rawValue.theme,
    };

    this.currentUserService
      .updateCurrentUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.applyUser(user);
          this.saving.set(false);
          toast.success('Settings saved');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          toast.error(
            extractErrorMessage(
              error,
              'Settings could not be saved. Review your details and try again.',
            ),
          );
        },
      });
  }

  protected fieldError(controlName: SettingsControlName): string | null {
    return resolveFieldError(this.form.controls[controlName], SETTINGS_FIELD_ERRORS[controlName]);
  }

  protected isThemeSelected(theme: UserTheme): boolean {
    return this.formValue().theme === theme;
  }

  protected themeOptionClass(theme: UserTheme): string {
    return this.isThemeSelected(theme)
      ? 'border-(--surface-selected-border) [background:var(--surface-selected)] [box-shadow:var(--surface-shadow-selected)]'
      : 'border-border/60 [background:color-mix(in_oklab,var(--card)_84%,transparent)] hover:-translate-y-0.5 hover:border-border/80 hover:[background:color-mix(in_oklab,var(--surface-inset)_84%,transparent)]';
  }

  protected themePreviewSurfaceClass(theme: UserTheme): string {
    return theme === 'LIGHT'
      ? 'border-border/70 bg-white/85'
      : 'border-white/8 bg-slate-950/88';
  }

  protected themePreviewBadgeClass(theme: UserTheme): string {
    return theme === 'LIGHT'
      ? 'border border-slate-200 bg-slate-100 text-slate-700'
      : 'border border-white/10 bg-slate-800 text-slate-100';
  }

  protected themePreviewPrimaryLineClass(theme: UserTheme): string {
    return theme === 'LIGHT' ? 'w-20 bg-slate-800/80' : 'w-20 bg-white/88';
  }

  protected themePreviewSecondaryLineClass(theme: UserTheme): string {
    return theme === 'LIGHT' ? 'bg-slate-400/65' : 'bg-slate-400/75';
  }

  protected themePreviewAccentClass(theme: UserTheme): string {
    return theme === 'LIGHT' ? 'bg-cyan-800/12' : 'bg-cyan-300/18';
  }

  protected themePreviewPanelClass(theme: UserTheme): string {
    return theme === 'LIGHT'
      ? 'border border-slate-200/80 bg-slate-50/88'
      : 'border border-white/8 bg-white/6';
  }

  protected handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.form.dirty || this.saving()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  private loadSettings(force = false): void {
    this.loading.set(true);
    this.loadErrorMessage.set(null);

    this.currentUserService
      .loadCurrentUser(force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.applyUser(user);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.loadErrorMessage.set(
            extractErrorMessage(
              error,
              'The profile endpoint is unavailable right now. Start the backend and try again.',
            ),
          );
        },
      });
  }

  private applyUser(user: AuthenticatedUser): void {
    this.form.reset({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      address: user.address ?? '',
      theme: user.theme,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private focusFirstInvalidControl(controlNames: readonly string[]): void {
    queueMicrotask(() => {
      const firstInvalidControl = controlNames.find((controlName) =>
        this.form.get(controlName)?.invalid,
      );

      if (!firstInvalidControl) {
        return;
      }

      const invalidElement = this.host.nativeElement.querySelector(
        `[formControlName="${firstInvalidControl}"]`,
      );

      if (invalidElement instanceof HTMLElement) {
        invalidElement.focus();
      }
    });
  }
}

const SETTINGS_FIELD_ERRORS = {
  fullName: {
    required: 'Enter the full name shown on the profile.',
    maxlength: 'Use 120 characters or fewer.',
  },
  email: {
    required: 'Enter the email used for the profile.',
    email: 'Enter a valid email address.',
    maxlength: 'Use 255 characters or fewer.',
  },
  phone: {
    maxlength: 'Use 32 characters or fewer.',
  },
  address: {
    maxlength: 'Use 255 characters or fewer.',
  },
} as const;

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function buildInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'U';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function extractErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
  if (error.status === 0) {
    return 'Backend is not reachable. Start backend and try again.';
  }

  const payload = error.error;
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const detail =
      'detail' in payload && typeof payload.detail === 'string' ? payload.detail : null;
    const message =
      'message' in payload && typeof payload.message === 'string' ? payload.message : null;
    const errorMessage =
      'error' in payload && typeof payload.error === 'string' ? payload.error : null;

    return detail ?? message ?? errorMessage ?? fallbackMessage;
  }

  return fallbackMessage;
}

function resolveFieldError(
  control: AbstractControl | null,
  messages: Record<string, string>,
): string | null {
  if (!control?.errors || (!control.touched && !control.dirty)) {
    return null;
  }

  for (const [errorKey, message] of Object.entries(messages)) {
    if (control.hasError(errorKey)) {
      return message;
    }
  }

  return null;
}
