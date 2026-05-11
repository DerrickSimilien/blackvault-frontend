import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      class="theme-toggle"
      [class.theme-toggle--light]="themeService.theme() === 'light'"
      (click)="themeService.toggle()"
      [attr.aria-label]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
      [attr.title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
    >
      <span class="theme-toggle__track">
        <span class="theme-toggle__thumb"></span>
      </span>
      <span class="theme-toggle__label">
        {{ themeService.theme() === 'light' ? '☀️' : '🌙' }}
      </span>
    </button>
  `,
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}