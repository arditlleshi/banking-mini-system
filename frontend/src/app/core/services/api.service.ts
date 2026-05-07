import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type TestItem = { id: number; name: string };
export type TestResponse = {
  status: string;
  message: string;
  items: TestItem[];
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getTest() {
    return this.http.get<TestResponse>(`${this.baseUrl}/test`);
  }
}

