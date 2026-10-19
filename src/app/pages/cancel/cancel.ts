import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { PLANS, SubscriptionService } from '../../core/subscription.service';
import { FloatingIconsComponent } from '../../shared/floating-icons/floating-icons.component';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-cancel-subscription',
  standalone: true,
  imports: [CurrencyPipe, FloatingIconsComponent, ThemeToggleComponent],
  templateUrl: './cancel.html',
  styleUrl: './cancel.scss',
})
export class CancelSubscription {
  private subs = inject(SubscriptionService);
  private router = inject(Router);

  /** Remembered so the plan name is still available after cancelling. */
  private cancelled = signal<string | null>(null);
  done = signal(false);

  current = computed(() => PLANS.find(p => p.id === this.subs.plan()) ?? null);
  planName = computed(() => this.current()?.name ?? this.cancelled() ?? '');

  keep(): void { this.router.navigate(['/settings']); }

  unsubscribe(): void {
    this.cancelled.set(this.current()?.name ?? null);
    // TODO(payments): cancel the real subscription on your backend / Stripe first.
    this.subs.cancel();
    this.done.set(true);
  }

  goHome(): void { this.router.navigate(['/home']); }
}