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

import { CurrentUserService } from '../auth/current-user.service';
import { AuthSessionService } from '../auth/auth-session.service';
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
  private readonly currentUserService = inject(CurrentUserService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

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
  protected readonly currentUser = this.currentUserService.currentUser;
  protected readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'User';
    }

    return user.fullName.trim() || user.username.trim() || user.email.trim() || 'User';
  });
  protected readonly userMeta = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }

    return user.email.trim() || user.username.trim() || user.role.trim();
  });
  protected readonly userInitials = computed(() => this.buildUserInitials(this.userDisplayName()));

  constructor() {
    this.currentUserService
      .loadCurrentUser()
      .pipe(takeUntilDestroyed())
      .subscribe({
        error: () => this.currentUserService.clear(),
      });

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

  private buildUserInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return 'U';
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
