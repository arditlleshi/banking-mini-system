import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_AUTH_INTERCEPTOR } from './auth-http-context';

export type LoginRequest = {
  username: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly skipAuthContext = new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true);

  login(payload: LoginRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/auth/login`, payload, {
      context: this.skipAuthContext,
      withCredentials: true
    });
  }

  refresh(): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(
      `${this.baseUrl}/auth/refresh`,
      {},
      { context: this.skipAuthContext, withCredentials: true }
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/auth/logout`,
      {},
      { context: this.skipAuthContext, withCredentials: true }
    );
  }
}
