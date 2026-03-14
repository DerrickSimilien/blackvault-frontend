import { Routes } from '@angular/router';
import { requireIntroGuard } from './core/require-intro.guard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'intro', pathMatch: 'full' },
  {
    path: 'intro',
    loadComponent: () => import('./pages/intro/intro').then(m => m.Intro)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
    canActivate: [requireIntroGuard]
  },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login').then(m => m.Login)
      },
      {
        path: 'signup',
        loadComponent: () => import('./pages/auth/signup/signup').then(m => m.Signup)
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'home' },
];