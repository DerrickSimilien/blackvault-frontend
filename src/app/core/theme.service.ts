import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'bv-theme';

  theme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply on every change
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
    localStorage.setItem(this.STORAGE_KEY, this.theme());
  }

  /** Call from app root to restore persisted theme before first render */
  init(): void {
    this.applyTheme(this.theme());
  }

  private loadTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    return saved === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: Theme): void {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
  }
}