import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideChevronUp,
  lucideCreditCard,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideSettings2,
  lucideUsers,
  lucideWalletCards,
} from '@ng-icons/lucide';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { ThemeService } from '../theme/theme.service';
import { PageBreadcrumbComponent, type PageBreadcrumbItem } from '../../shared/ui/page-breadcrumb';
import { HlmButton } from '@spartan/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@spartan/dropdown-menu';
import { HlmIconImports } from '@spartan/icon';
import { HlmLabel } from '@spartan/label';
import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarFooter,
  HlmSidebarGroup,
  HlmSidebarGroupContent,
  HlmSidebarGroupLabel,
  HlmSidebarHeader,
  HlmSidebarInset,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarTrigger,
  HlmSidebarWrapper,
  provideHlmSidebarConfig,
} from '@spartan/sidebar';
import { HlmSwitch } from '@spartan/switch';

type NavigationItem = {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact?: boolean;
};

@Component({
  selector: 'app-banking-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    PageBreadcrumbComponent,
    HlmButton,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuLabel,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    HlmIconImports,
    HlmLabel,
    HlmSidebar,
    HlmSidebarContent,
    HlmSidebarFooter,
    HlmSidebarGroup,
    HlmSidebarGroupContent,
    HlmSidebarGroupLabel,
    HlmSidebarHeader,
    HlmSidebarInset,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarTrigger,
    HlmSidebarWrapper,
    HlmSwitch,
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideChevronUp,
      lucideCreditCard,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideSettings2,
      lucideUsers,
      lucideWalletCards,
    }),
    provideHlmSidebarConfig({
      sidebarWidth: '16rem',
      sidebarWidthMobile: '20rem',
      sidebarWidthIcon: '3.875rem',
      mobileBreakpoint: '1024px',
      closeMobileSidebarOnMenuButtonClick: true,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banking-shell.component.html',
})
export class BankingShellComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly navigation = signal<readonly NavigationItem[]>([
    {
      path: '/home',
      label: 'Overview',
      icon: 'lucideLayoutDashboard',
      exact: true,
    },
    {
      path: '/accounts',
      label: 'Accounts',
      icon: 'lucideWalletCards',
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: 'lucideUsers',
    },
    {
      path: '/payments',
      label: 'Payments',
      icon: 'lucideCreditCard',
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'lucideSettings2',
    },
  ]);
  protected readonly activePath = signal(this.router.url);
  protected readonly primarySegments = computed(() =>
    this.resolvePrimarySegments(this.activePath()),
  );
  protected readonly currentPrimaryPath = computed(() => {
    const path = this.primarySegments().join('/');
    return path ? `/${path}` : '/home';
  });
  protected readonly breadcrumbItems = computed<readonly PageBreadcrumbItem[]>(() =>
    this.resolveBreadcrumbItems(this.primarySegments()),
  );
  protected readonly userInitials = computed(() => 'AL');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.activePath.set(event.urlAfterRedirects);
      });
  }

  protected logout(): void {
    this.authSession.logoutAndClear().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }

  protected matchesRoute(path: string, exact: boolean): boolean {
    const currentPath = this.currentPrimaryPath();
    return exact
      ? currentPath === path
      : currentPath === path || currentPath.startsWith(`${path}/`);
  }

  protected toggleTheme(isDark: boolean): void {
    this.theme.setMode(isDark ? 'dark' : 'light');
  }

  private resolvePrimarySegments(url: string): readonly string[] {
    return (
      this.router.parseUrl(url).root.children['primary']?.segments.map((segment) => segment.path) ??
      []
    );
  }

  private resolveBreadcrumbItems(segments: readonly string[]): readonly PageBreadcrumbItem[] {
    const section = segments[0] ?? 'home';

    switch (section) {
      case 'accounts': {
        const accountNumber = segments[1];
        if (accountNumber) {
          return [
            { label: 'Home', link: '/home' },
            { label: 'Accounts', link: '/accounts' },
            { label: `Account ${this.formatBreadcrumbSegment(accountNumber)}` },
          ];
        }

        return [{ label: 'Home', link: '/home' }, { label: 'Accounts' }];
      }
      case 'customers':
        return [{ label: 'Home', link: '/home' }, { label: 'Customers' }];
      case 'payments':
        return [{ label: 'Home', link: '/home' }, { label: 'Payments' }];
      case 'settings':
        return [{ label: 'Home', link: '/home' }, { label: 'Settings' }];
      case 'home':
      default:
        return [{ label: 'Home' }];
    }
  }

  private formatBreadcrumbSegment(segment: string): string {
    return decodeURIComponent(segment).replace(/[-_]+/g, ' ');
  }
}
