import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, Toast } from '../../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast"
          [ngClass]="'toast--' + toast.type"
          (click)="toastService.dismiss(toast.id)">
          <span class="toast__icon">{{ getIcon(toast.type) }}</span>
          <span class="toast__message">{{ toast.message }}</span>
          <button class="toast__close"
                  (click)="$event.stopPropagation(); toastService.dismiss(toast.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
    };
    return icons[type] ?? 'ℹ';
  }
}