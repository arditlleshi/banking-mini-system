import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { HomePageComponent } from './features/home/home-page.component';
import { LoginPageComponent } from './features/login/login-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'home', component: HomePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'home' }
];
