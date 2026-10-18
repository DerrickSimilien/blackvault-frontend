import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Plan, PlanId, PAYMENTS_LIVE, SubscriptionService } from '../../core/subscription.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ThemeToggleComponent],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.scss',
})
export class Subscribe {
  subs = inject(SubscriptionService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly plans = this.subs.plans;
  readonly paymentsLive = PAYMENTS_LIVE;
  isSignedIn = () => !!this.auth.currentUser();
  message = signal('');

  choose(plan: Plan): void {
    if (!this.isSignedIn()) {
      this.router.navigate(['/auth/signup']);
      return;
    }
    // TODO(payments): replace with Stripe Checkout; call activate() only after payment is confirmed.
    this.subs.activate(plan.id);
    this.message.set(`${plan.name} plan is now active (test mode, no payment taken). You can scan again.`);
  }

  isCurrent(id: PlanId): boolean { return this.subs.plan() === id; }

  resetDemo(): void {
    this.subs.reset();
    this.message.set('Back to the free tier with 2 fresh scans.');
  }
}