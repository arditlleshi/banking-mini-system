import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { HlmButton } from '../../shared/ui/spartan/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle
} from '../../shared/ui/spartan/card';
import { HlmSeparator } from '../../shared/ui/spartan/separator';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';

type NavigationItem = {
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly badge: string;
  readonly exact?: boolean;
};

@Component({
  selector: 'app-banking-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggleComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmSeparator
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banking-shell.component.html',
  styleUrl: './banking-shell.component.css'
})
export class BankingShellComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);
  protected readonly navigation = signal<readonly NavigationItem[]>([
    {
      path: '/home',
      label: 'Overview',
      description: 'Executive summary and live platform status.',
      badge: '01',
      exact: true
    },
    {
      path: '/accounts',
      label: 'Accounts',
      description: 'Balances, limits, product states, and servicing.',
      badge: '02'
    },
    {
      path: '/customers',
      label: 'Customers',
      description: 'Client records, relationships, and compliance context.',
      badge: '03'
    },
    {
      path: '/transactions',
      label: 'Transactions',
      description: 'Payment review, approvals, and investigations.',
      badge: '04'
    },
    {
      path: '/settings',
      label: 'Settings',
      description: 'Policy, preferences, and operational governance.',
      badge: '05'
    }
  ]);
  protected readonly activePath = signal(this.router.url);
  protected readonly activeItem = computed(
    () => this.navigation().find((item) => this.matchesRoute(item.path, item.exact ?? false)) ?? this.navigation()[0]
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.activePath.set(event.urlAfterRedirects);
        this.sidebarOpen.set(false);
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected logout(): void {
    this.authSession.logoutAndClear().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  protected matchesRoute(path: string, exact: boolean): boolean {
    return exact ? this.activePath() === path : this.activePath().startsWith(path);
  }
}
