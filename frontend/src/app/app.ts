import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly items = signal<Array<{ id: number; name: string }>>([]);
  protected readonly title = signal('Banking Mini System');
  protected readonly status = signal('Checking backend connection...');

  ngOnInit(): void {
    this.apiService
      .getTest()
      .subscribe({
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
