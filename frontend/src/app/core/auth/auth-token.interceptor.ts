import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthSessionService } from './auth-session.service';
import { SKIP_AUTH_INTERCEPTOR } from './auth-http-context';
import { AuthStateService } from './auth-state.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  const accessToken = authState.getAccessToken();
  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        },
        withCredentials: true
      })
    : req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => error);
      }

      return authSession.refreshTokens().pipe(
        switchMap((tokens) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${tokens.accessToken}`
            },
            withCredentials: true
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          router.navigateByUrl('/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};
