import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, throwError, tap } from 'rxjs';

import { AuthApiService, AuthTokens } from './auth-api.service';
import { AuthStateService } from './auth-state.service';
import { CurrentUserService } from './current-user.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly currentUser = inject(CurrentUserService);
  private refreshInFlight$: Observable<AuthTokens> | null = null;

  refreshTokens(): Observable<AuthTokens> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.authApi.refresh().pipe(
      tap((tokens) => {
        this.authState.setTokens(tokens);
      }),
      catchError((error) => {
        this.authState.clear();
        this.currentUser.clear();
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshInFlight$;
  }

  logoutAndClear(): Observable<void> {
    return this.authApi.logout().pipe(
      catchError(() => of(void 0)),
      finalize(() => {
        this.authState.clear();
        this.currentUser.clear();
      }),
    );
  }
}
