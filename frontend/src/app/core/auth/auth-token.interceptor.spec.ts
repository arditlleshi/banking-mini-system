import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthSessionService } from './auth-session.service';
import { AuthStateService } from './auth-state.service';

describe('authTokenInterceptor', () => {
  let authState: { getAccessToken: () => string | null };
  let authSession: { refreshTokens: () => Observable<{ accessToken: string }> };
  let router: { navigateByUrl: (url: string) => Promise<boolean> };

  beforeEach(() => {
    authState = {
      getAccessToken: () => 'expired-access-token'
    };
    authSession = {
      refreshTokens: () => of({ accessToken: 'refreshed-access-token' })
    };
    router = {
      navigateByUrl: () => Promise.resolve(true)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStateService, useValue: authState },
        { provide: AuthSessionService, useValue: authSession },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('refreshes and retries a protected request after a 403', async () => {
    const handledRequests: HttpRequest<unknown>[] = [];
    const next: HttpHandlerFn = (request) => {
      handledRequests.push(request);

      if (handledRequests.length === 1) {
        return throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
      }

      return of(new HttpResponse({ status: 200, body: { ok: true } }));
    };

    const response = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authTokenInterceptor(new HttpRequest('GET', '/api/accounts'), next))
    );

    expect((response as HttpResponse<{ ok: boolean }>).body).toEqual({ ok: true });
    expect(handledRequests.length).toBe(2);
    expect(handledRequests[0].headers.get('Authorization')).toBe('Bearer expired-access-token');
    expect(handledRequests[1].headers.get('Authorization')).toBe('Bearer refreshed-access-token');
    expect(handledRequests[1].withCredentials).toBe(true);
  });

  it('does not refresh auth endpoints', async () => {
    const refreshSpy = vi.fn();
    authSession.refreshTokens = refreshSpy;

    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));

    await expect(
      TestBed.runInInjectionContext(() =>
        firstValueFrom(authTokenInterceptor(new HttpRequest<any>('POST' as any, '/api/auth/login'), next))
      )
    ).rejects.toMatchObject({ status: 403 });

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
