import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApiService } from '../../core/auth/auth-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardFooter,
  HlmCardHeader,
  HlmCardTitle,
} from '../../shared/ui/spartan/card';
import { HlmInput } from '../../shared/ui/spartan/input';
import { HlmLabel } from '../../shared/ui/spartan/label';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardFooter,
    HlmCardHeader,
    HlmCardTitle,
    HlmInput,
    HlmLabel,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly activePanel = signal<'login' | 'register'>('login');
  protected readonly loginLoading = signal(false);
  protected readonly registerLoading = signal(false);
  protected readonly loginErrorMessage = signal<string | null>(null);
  protected readonly registerErrorMessage = signal<string | null>(null);
  protected readonly registrationSuccessMessage = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    username: ['admin', [Validators.required]],
    password: ['123456', [Validators.required]],
  });

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      username: ['', [Validators.required, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  protected switchPanel(panel: 'login' | 'register'): void {
    this.activePanel.set(panel);
    this.loginErrorMessage.set(null);
    this.registerErrorMessage.set(null);

    if (panel === 'register') {
      this.registrationSuccessMessage.set(null);
    }
  }

  protected submitLogin(): void {
    if (this.loginForm.invalid || this.loginLoading()) {
      this.loginForm.markAllAsTouched();
      this.focusFirstInvalidControl(['username', 'password']);
      return;
    }

    this.loginLoading.set(true);
    this.loginErrorMessage.set(null);

    this.authApi.login(this.loginForm.getRawValue()).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens);
        this.loginLoading.set(false);
        this.router.navigateByUrl('/home');
      },
      error: (error: HttpErrorResponse) => {
        this.loginLoading.set(false);
        if (error.status === 401) {
          this.loginErrorMessage.set('Invalid username or password.');
          return;
        }
        if (error.status === 0) {
          this.loginErrorMessage.set('Backend is not reachable. Start backend and try again.');
          return;
        }
        this.loginErrorMessage.set(extractErrorMessage(error, 'Login failed. Please try again.'));
      },
    });
  }

  protected submitRegistration(): void {
    if (this.registerForm.invalid || this.registerLoading()) {
      this.registerForm.markAllAsTouched();
      this.focusFirstInvalidControl([
        'fullName',
        'email',
        'username',
        'password',
        'confirmPassword',
      ]);
      return;
    }

    this.registerLoading.set(true);
    this.registerErrorMessage.set(null);
    this.registrationSuccessMessage.set(null);

    const { fullName, email, username, password } = this.registerForm.getRawValue();

    this.authApi.register({ fullName, email, username, password }).subscribe({
      next: () => {
        this.registerLoading.set(false);
        this.registerForm.reset({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
        });
        this.loginForm.patchValue({ username, password: '' });
        this.registrationSuccessMessage.set('Account created. You can sign in now.');
        this.activePanel.set('login');
      },
      error: (error: HttpErrorResponse) => {
        this.registerLoading.set(false);
        if (error.status === 0) {
          this.registerErrorMessage.set('Backend is not reachable. Start backend and try again.');
          return;
        }
        this.registerErrorMessage.set(
          extractErrorMessage(
            error,
            'Account creation failed. Please review your details and try again.',
          ),
        );
      },
    });
  }

  protected showPasswordMismatch(): boolean {
    return (
      !!this.registerForm.errors?.['passwordMismatch'] &&
      (this.registerForm.controls.confirmPassword.touched ||
        this.registerForm.controls.confirmPassword.dirty)
    );
  }

  protected loginFieldError(controlName: LoginControlName): string | null {
    return resolveFieldError(this.loginForm.controls[controlName], LOGIN_FIELD_ERRORS[controlName]);
  }

  protected registerFieldError(controlName: RegisterControlName): string | null {
    return resolveFieldError(
      this.registerForm.controls[controlName],
      REGISTER_FIELD_ERRORS[controlName],
    );
  }

  private focusFirstInvalidControl(controlNames: readonly string[]): void {
    queueMicrotask(() => {
      const firstInvalidControl = controlNames.find(
        (controlName) =>
          this.loginForm.get(controlName)?.invalid || this.registerForm.get(controlName)?.invalid,
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

const LOGIN_FIELD_ERRORS = {
  username: {
    required: 'Enter your username.',
  },
  password: {
    required: 'Enter your password.',
  },
} as const;

const REGISTER_FIELD_ERRORS = {
  fullName: {
    required: 'Enter your full name.',
    maxlength: 'Use 120 characters or fewer.',
  },
  email: {
    required: 'Enter your email address.',
    email: 'Enter a valid email address.',
    maxlength: 'Use 255 characters or fewer.',
  },
  username: {
    required: 'Choose a username.',
    maxlength: 'Use 50 characters or fewer.',
  },
  password: {
    required: 'Create a password.',
    minlength: 'Use at least 6 characters.',
    maxlength: 'Use 72 characters or fewer.',
  },
  confirmPassword: {
    required: 'Confirm your password.',
  },
} as const;

type LoginControlName = keyof typeof LOGIN_FIELD_ERRORS;
type RegisterControlName = keyof typeof REGISTER_FIELD_ERRORS;

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

function extractErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
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
