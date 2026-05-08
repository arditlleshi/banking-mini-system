import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly items = signal<Array<{ id: number; name: string }>>([]);
  protected readonly status = signal('Checking backend connection...');

  ngOnInit(): void {
    this.apiService.getTest().subscribe({
      next: (response) => {
        this.status.set(`Connected: ${response.message}`);
        this.items.set(response.items ?? []);
      },
      error: () => {
        this.status.set('Backend not reachable');
        this.items.set([]);
      }
    });
  }

  protected logout(): void {
    this.authSession.logoutAndClear().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }
}

