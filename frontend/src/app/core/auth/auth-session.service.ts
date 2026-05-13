import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, throwError, tap } from 'rxjs';

import { AuthApiService, AuthTokens } from './auth-api.service';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private refreshInFlight$: Observable<AuthTokens> | null = null;

  constructor(
    private readonly authApi: AuthApiService,
    private readonly authState: AuthStateService
  ) {}

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
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.refreshInFlight$;
  }

  logoutAndClear(): Observable<void> {
    return this.authApi.logout().pipe(
      catchError(() => of(void 0)),
      finalize(() => this.authState.clear())
    );
  }
}
