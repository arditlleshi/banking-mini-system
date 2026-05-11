import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '../../shared/ui/spartan/card';
import { HlmSeparator } from '../../shared/ui/spartan/separator';

@Component({
  selector: 'app-home-page',
  imports: [HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle, HlmSeparator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authState = inject(AuthStateService);

  protected readonly items = signal<Array<{ id: number; name: string }>>([]);
  protected readonly status = signal('Checking backend connection…');
  protected readonly itemCount = computed(() => this.items().length);
  protected readonly sessionState = computed(() => this.authState.isAuthenticated() ? 'Active' : 'Expired');
  protected readonly accessMode = computed(() => this.authState.isAuthenticated() ? 'Protected' : 'Guest');

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
}

