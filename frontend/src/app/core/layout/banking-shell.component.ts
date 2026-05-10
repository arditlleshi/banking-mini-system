import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideBadgeEuro,
  lucideBuilding2,
  lucideChevronUp,
  lucideChevronRight,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideSettings2,
  lucideUsers,
  lucideWalletCards
} from '@ng-icons/lucide';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { ThemeService } from '../theme/theme.service';
import { HlmButton } from '@spartan/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger
} from '@spartan/dropdown-menu';
import {
  HlmIconImports
} from '@spartan/icon';
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
  HlmSidebarMenuBadge,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarTrigger,
  HlmSidebarWrapper,
  provideHlmSidebarConfig
} from '@spartan/sidebar';
import { HlmSwitch } from '@spartan/switch';

type NavigationItem = {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly badge: string;
  readonly exact?: boolean;
};

@Component({
  selector: 'app-banking-shell',
  imports: [
    RouterLink,
    RouterOutlet,
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
    HlmSidebarMenuBadge,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarTrigger,
    HlmSidebarWrapper,
    HlmSwitch
  ],
  providers: [
    provideIcons({
      lucideArrowLeftRight,
      lucideBadgeEuro,
      lucideBuilding2,
      lucideChevronUp,
      lucideChevronRight,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideSettings2,
      lucideUsers,
      lucideWalletCards
    }),
    provideHlmSidebarConfig({
      sidebarWidth: '16rem',
      sidebarWidthMobile: '20rem',
      sidebarWidthIcon: '3.875rem',
      mobileBreakpoint: '1024px',
      closeMobileSidebarOnMenuButtonClick: true
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banking-shell.component.html'
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
      badge: '01',
      exact: true
    },
    {
      path: '/accounts',
      label: 'Accounts',
      icon: 'lucideWalletCards',
      badge: '02'
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: 'lucideUsers',
      badge: '03'
    },
    {
      path: '/transactions',
      label: 'Transactions',
      icon: 'lucideArrowLeftRight',
      badge: '04'
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'lucideSettings2',
      badge: '05'
    }
  ]);
  protected readonly activePath = signal(this.router.url);
  protected readonly activeItem = computed(
    () => this.navigation().find((item) => this.matchesRoute(item.path, item.exact ?? false)) ?? this.navigation()[0]
  );
  protected readonly userInitials = computed(() => 'AL');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.activePath.set(event.urlAfterRedirects);
      });
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

  protected toggleTheme(isDark: boolean): void {
    this.theme.setMode(isDark ? 'dark' : 'light');
  }
}
