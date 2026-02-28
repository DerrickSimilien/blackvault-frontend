import { Routes } from '@angular/router';
import { requireIntroGuard } from './core/require-intro.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'intro',
    pathMatch: 'full',
  },
  {
    path: 'intro',
    loadComponent: () =>
      import('./pages/intro/intro').then((m) => m.Intro),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.Landing),
    canActivate: [requireIntroGuard],
  },
  {
    path: '**',
    redirectTo: 'intro',
  },
];