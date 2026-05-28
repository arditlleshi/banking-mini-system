import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthSessionService } from './auth-session.service';
import { SKIP_AUTH_INTERCEPTOR } from './auth-http-context';
import { AuthStateService } from './auth-state.service';

const AUTH_FAILURE_STATUSES = new Set([401, 403]);

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  const skipAuthHandling = req.context.get(SKIP_AUTH_INTERCEPTOR);
  const accessToken = authState.getAccessToken();

  if (skipAuthHandling) {
    return next(req);
  }

  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })
    : req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!accessToken || !AUTH_FAILURE_STATUSES.has(error.status) || req.url.includes('/auth/')) {
        return throwError(() => error);
      }

      return authSession.refreshTokens().pipe(
        switchMap((tokens) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
            withCredentials: true,
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
