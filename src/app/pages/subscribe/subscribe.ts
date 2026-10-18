import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Plan, PlanId, PAYMENTS_LIVE, SubscriptionService } from '../../core/subscription.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { FloatingIconsComponent } from '../../shared/floating-icons/floating-icons.component';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ThemeToggleComponent, FloatingIconsComponent],
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

  constructor() {
    // Lets the border's rainbow angle animate smoothly. Harmless if unsupported or already registered.
    try {
      (CSS as unknown as { registerProperty(d: object): void }).registerProperty({
        name: '--sub-angle', syntax: '<angle>', inherits: false, initialValue: '0deg',
      });
    } catch { /* already registered or unsupported */ }
  }

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