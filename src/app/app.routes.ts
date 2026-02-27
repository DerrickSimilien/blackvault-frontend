import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Intro } from './pages/intro/intro';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'intro' },
  { path: 'intro', component: Intro },
  { path: 'home', component: Landing }, // or keep '' for landing if you prefer
  { path: '**', redirectTo: 'intro' },
];