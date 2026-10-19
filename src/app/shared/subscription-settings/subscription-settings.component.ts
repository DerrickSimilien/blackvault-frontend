import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { PLANS, SubscriptionService } from '../../core/subscription.service';

/**
 * "Subscription" card for the Settings page. Drop <app-subscription-settings />
 * between the "About BlackVault" and "Account" sections.
 */
@Component({
  selector: 'app-subscription-settings',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <section class="ss">
      <header class="ss__head">
        <span class="ss__icon" aria-hidden="true">💎</span>
        <h2 class="ss__title">Subscription</h2>
      </header>

      <div class="ss__row">
        <div class="ss__text">
          @if (current(); as plan) {
            <p class="ss__name">{{ plan.name }} plan <span class="ss__tag">{{ plan.tagline }}</span></p>
            <p class="ss__desc">
              {{ plan.price | currency:'USD' }} per month. {{ summary() }}
            </p>
          } @else {
            <p class="ss__name">Free plan</p>
            <p class="ss__desc">
              Includes {{ subs.freeLimit }} scans in total. You have {{ subs.freeLeft() }} left.
              Subscribe for more scans and automatic protection.
            </p>
          }
        </div>

        @if (current()) {
          <button type="button" class="ss__unsub" (click)="unsubscribe()">Unsubscribe</button>
        } @else {
          <a class="ss__link" routerLink="/subscribe">View plans</a>
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .ss {
      border-radius: 16px; padding: 24px 28px;
      background: var(--bv-bg-card); border: 1px solid var(--bv-border);
    }
    .ss__head { display: flex; align-items: center; gap: 10px; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--bv-border); }
    .ss__icon { font-size: 16px; }
    .ss__title { margin: 0; font-size: 15px; font-weight: 700; color: var(--bv-text-primary); }
    .ss__row { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .ss__name { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--bv-text-primary); }
    .ss__tag { margin-left: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--bv-text-tertiary); }
    .ss__desc { margin: 0; max-width: 640px; font-size: 13px; line-height: 1.6; color: var(--bv-text-secondary); }
    /* Plain red text: only the pointer changes on hover, no resize or glow */
    .ss__unsub { background: none; border: none; padding: 0; font: inherit; font-size: 14px; font-weight: 700; color: #e11d2e; cursor: pointer; }
    .ss__link { font-size: 14px; font-weight: 600; color: var(--bv-text-secondary); text-decoration: underline; }
    @media (max-width: 640px) { .ss__row { flex-direction: column; align-items: flex-start; } }
  `],
})
export class SubscriptionSettingsComponent {
  subs = inject(SubscriptionService);
  private router = inject(Router);

  current = computed(() => PLANS.find(p => p.id === this.subs.plan()) ?? null);
  summary = computed(() => this.current()?.features.filter(f => !f.endsWith(':')).slice(0, 2).join('. ') + '.');

  unsubscribe(): void { this.router.navigate(['/cancel-subscription']); }
}