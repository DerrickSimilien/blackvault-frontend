import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

/**
 * Day/night switch shown as a padlock (Phosphor "lock-key" icons, MIT):
 *   locked   = night mode
 *   unlocked = day mode
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="theme-toggle"
      [class.theme-toggle--light]="themeService.theme() === 'light'"
      (click)="themeService.toggle()"
      [attr.aria-label]="themeService.theme() === 'light' ? 'Switch to night mode (lock)' : 'Switch to day mode (unlock)'"
      [attr.title]="themeService.theme() === 'light' ? 'Switch to night mode' : 'Switch to day mode'"
    >
      @if (themeService.theme() === 'light') {
        <!-- UNLOCKED → day mode -->
        <svg class="theme-toggle__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/>
        </svg>
      } @else {
        <!-- LOCKED → night mode -->
        <svg class="theme-toggle__icon" viewBox="0 0 256 256" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="bvLockGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#7cf7ff"/>
              <stop offset="50%" stop-color="#b38bff"/>
              <stop offset="100%" stop-color="#ff5bd6"/>
            </linearGradient>
          </defs>
          <path fill="url(#bvLockGrad)" d="M128,112a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Zm80-72H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"/>
        </svg>
      }
    </button>
  `,
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}