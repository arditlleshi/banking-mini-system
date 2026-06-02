import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import {
  AuthApiService,
  type AuthenticatedUser,
  type UpdateCurrentUserRequest,
} from './auth-api.service';
import { ThemeService } from '../theme/theme.service';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly authApi = inject(AuthApiService);
  private readonly theme = inject(ThemeService);
  private readonly currentUserSignal = signal<AuthenticatedUser | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();

  loadCurrentUser(force = false): Observable<AuthenticatedUser> {
    const cachedUser = this.currentUserSignal();
    if (cachedUser && !force) {
      this.theme.setMode(cachedUser.theme === 'DARK' ? 'dark' : 'light');
      return of(cachedUser);
    }

    return this.authApi.getCurrentUser().pipe(tap((user) => this.storeCurrentUser(user)));
  }

  updateCurrentUser(payload: UpdateCurrentUserRequest): Observable<AuthenticatedUser> {
    return this.authApi
      .updateCurrentUser(payload)
      .pipe(tap((user) => this.storeCurrentUser(user)));
  }

  clear(): void {
    this.currentUserSignal.set(null);
  }

  private storeCurrentUser(user: AuthenticatedUser): void {
    this.currentUserSignal.set(user);
    this.theme.setMode(user.theme === 'DARK' ? 'dark' : 'light');
  }
}
