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
  {
    path: 'my-scans',
    loadComponent: () => import('./pages/my-scans/my-scans').then(m => m.MyScans),
    canActivate: [authGuard]
  },
  {
    path: 'scan',
    canActivate: [authGuard],
    children: [
      {
        path: 'document',
        loadComponent: () => import('./pages/scan/document/document-scan').then(m => m.DocumentScan)
      },
      {
        path: 'resume',
        loadComponent: () => import('./pages/scan/resume/resume-scan').then(m => m.ResumeScan)
      },
      {
        path: 'code',
        loadComponent: () => import('./pages/scan/code/code-scan').then(m => m.CodeScan)
      },
      {
        path: 'contract',
        loadComponent: () => import('./pages/scan/contract/contract-scan').then(m => m.ContractScan)
      },
    ]
  },
  {
    path: 'results/:scanId',
    loadComponent: () => import('./pages/results/results').then(m => m.Results),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'home' },
];