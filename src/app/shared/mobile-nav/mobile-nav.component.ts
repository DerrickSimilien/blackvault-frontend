import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Bottom tab bar for phones (it only shows on screens 768px wide or less;
 * the styles live in _globals.scss under ".mobile-nav").
 * Drop <app-mobile-nav /> at the bottom of any page that has the sidebar.
 */
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="mobile-nav" aria-label="Main navigation">
      <a class="mobile-nav__item" routerLink="/dashboard"
         routerLinkActive="mobile-nav__item--active" [routerLinkActiveOptions]="{ exact: true }">
        <span class="mobile-nav__icon">⬡</span>
        <span class="mobile-nav__label">Home</span>
      </a>
      <a class="mobile-nav__item" routerLink="/scan/document"
         [class.mobile-nav__item--active]="router.url.startsWith('/scan')">
        <span class="mobile-nav__icon">📄</span>
        <span class="mobile-nav__label">Scan</span>
      </a>
      <a class="mobile-nav__item" routerLink="/my-scans" routerLinkActive="mobile-nav__item--active">
        <span class="mobile-nav__icon">📋</span>
        <span class="mobile-nav__label">My Scans</span>
      </a>
      <a class="mobile-nav__item" routerLink="/timeline" routerLinkActive="mobile-nav__item--active">
        <span class="mobile-nav__icon">📜</span>
        <span class="mobile-nav__label">Timeline</span>
      </a>
      <a class="mobile-nav__item" routerLink="/settings" routerLinkActive="mobile-nav__item--active">
        <span class="mobile-nav__icon">⚙️</span>
        <span class="mobile-nav__label">Settings</span>
      </a>
    </nav>
  `,
})
export class MobileNavComponent {
  router = inject(Router);
}