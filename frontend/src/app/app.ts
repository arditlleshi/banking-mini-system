import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly items = signal<Array<{ id: number; name: string }>>([]);
  protected readonly title = signal('Banking Mini System');
  protected readonly status = signal('Checking backend connection...');

  ngOnInit(): void {
    this.http
      .get<{
        status: string;
        message: string;
        items: Array<{ id: number; name: string }>;
      }>('http://localhost:8080/api/test')
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
