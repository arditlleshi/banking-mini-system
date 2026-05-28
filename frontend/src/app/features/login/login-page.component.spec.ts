import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApiService } from '../../core/auth/auth-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  const login = vi.fn();
  const register = vi.fn();
  const setTokens = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    register.mockReset();
    setTokens.mockReset();

    login.mockReturnValue(of({ accessToken: 'token-123' }));
    register.mockReturnValue(
      of({
        id: 1,
        fullName: 'Jane Doe',
        username: 'jane.doe',
        email: 'jane.doe@example.com',
        active: true,
        role: 'USER',
        createdAt: '2026-05-19T08:00:00Z',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthApiService,
          useValue: {
            login,
            register,
          },
        },
        {
          provide: AuthStateService,
          useValue: {
            setTokens,
          },
        },
      ],
    }).compileComponents();
  });

  it('creates an account and returns the user to sign in mode', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      switchPanel: (panel: 'login' | 'register') => void;
      submitRegistration: () => void;
      activePanel: () => 'login' | 'register';
      registrationSuccessMessage: () => string | null;
      registerForm: {
        setValue: (value: {
          fullName: string;
          email: string;
          username: string;
          password: string;
          confirmPassword: string;
        }) => void;
      };
      loginForm: {
        getRawValue: () => { username: string; password: string };
      };
    };

    component.switchPanel('register');
    component.registerForm.setValue({
      fullName: 'Jane Doe',
      email: 'jane.doe@example.com',
      username: 'jane.doe',
      password: 'secretpass123',
      confirmPassword: 'secretpass123',
    });

    component.submitRegistration();

    expect(register).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane.doe@example.com',
      username: 'jane.doe',
      password: 'secretpass123',
    });
    expect(component.activePanel()).toBe('login');
    expect(component.registrationSuccessMessage()).toBe('Account created. You can sign in now.');
    expect(component.loginForm.getRawValue()).toEqual({ username: 'jane.doe', password: '' });
  });

  it('surfaces backend registration conflicts', () => {
    register.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { detail: 'Username is already in use' },
      })),
    );

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      switchPanel: (panel: 'login' | 'register') => void;
      submitRegistration: () => void;
      registerErrorMessage: () => string | null;
      registerForm: {
        setValue: (value: {
          fullName: string;
          email: string;
          username: string;
          password: string;
          confirmPassword: string;
        }) => void;
      };
    };

    component.switchPanel('register');
    component.registerForm.setValue({
      fullName: 'Jane Doe',
      email: 'jane.doe@example.com',
      username: 'jane.doe',
      password: 'secretpass123',
      confirmPassword: 'secretpass123',
    });

    component.submitRegistration();

    expect(component.registerErrorMessage()).toBe('Username is already in use');
  });
});
