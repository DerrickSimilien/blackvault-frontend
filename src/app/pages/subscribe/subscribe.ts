import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Plan, PlanId, PAYMENTS_LIVE, SubscriptionService } from '../../core/subscription.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { FloatingIconsComponent } from '../../shared/floating-icons/floating-icons.component';
import { CartButtonComponent } from '../../shared/cart-button/cart-button.component';
import { CartService } from '../../core/cart.service';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ThemeToggleComponent, FloatingIconsComponent, CartButtonComponent],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.scss',
})
export class Subscribe {
  subs = inject(SubscriptionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  cart = inject(CartService);
  /** The plan the user has clicked (it shrinks and shows an Add to Cart button). */
  selected = signal<PlanId | null>(null);

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
    this.message.set('');
    this.selected.set(plan.id);
  }

  /** Back to the plain "Choose …" state; also drops the plan from the cart if it was added. */
  unselect(plan: Plan): void {
    this.selected.set(null);
    if (this.cart.has(plan.id)) this.cart.remove();
  }

  addToCart(plan: Plan): void {
    this.cart.add(plan.id);
  }

  isCurrent(id: PlanId): boolean { return this.subs.plan() === id; }

  resetDemo(): void {
    this.subs.reset();
    this.message.set('Back to the free tier with 2 fresh scans.');
  }
}