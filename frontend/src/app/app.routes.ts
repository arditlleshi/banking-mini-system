import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login-page.component').then((module) => module.LoginPageComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/banking-shell.component').then((module) => module.BankingShellComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home-page.component').then((module) => module.HomePageComponent)
      },
      {
        path: 'accounts',
        pathMatch: 'full',
        loadComponent: () => import('./features/accounts/accounts-page.component').then((module) => module.AccountsPageComponent)
      },
      {
        path: 'accounts/:accountNumber',
        loadComponent: () =>
          import('./features/accounts/account-details-page.component').then((module) => module.AccountDetailsPageComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers-page.component').then((module) => module.CustomersPageComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions-page.component').then((module) => module.TransactionsPageComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings-page.component').then((module) => module.SettingsPageComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'home' }
];
