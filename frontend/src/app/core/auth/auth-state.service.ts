import { Injectable, computed, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));

  readonly isAuthenticated = computed(() => !!this.accessToken());

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setTokens(tokens: { accessToken: string }): void {
    this.accessToken.set(tokens.accessToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  clear(): void {
    this.accessToken.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}
