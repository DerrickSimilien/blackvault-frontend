import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/cart.service';

/**
 * Shopping-cart icon with an item-count badge. Hovering (or focusing/tapping)
 * it opens a small panel listing the cart with a Checkout button.
 * Renders nothing while the cart is empty.
 */
@Component({
  selector: 'app-cart-button',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    @if (cart.count() > 0) {
      <div class="cb" (mouseleave)="open.set(false)">
        <button type="button" class="cb__btn" (click)="open.update(v => !v)"
                [attr.aria-expanded]="open()" [attr.aria-label]="'Cart, ' + cart.count() + ' item'">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 4h2.2l2.3 11h10.3l2-8H6.1" />
            <circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" />
          </svg>
          <span class="cb__badge">{{ cart.count() }}</span>
        </button>

        <div class="cb__menu" [class.cb__menu--open]="open()">
          <p class="cb__title">Your cart</p>
          @if (cart.item(); as plan) {
            <div class="cb__item">
              <span class="cb__dot" [style.background]="plan.color"></span>
              <div class="cb__info">
                <p class="cb__name">{{ plan.name }} plan</p>
                <p class="cb__sub">{{ plan.tagline }} · monthly</p>
              </div>
              <p class="cb__price">{{ plan.price | currency:'USD' }}</p>
              <button type="button" class="cb__x" aria-label="Remove from cart" (click)="remove()">×</button>
            </div>
            <div class="cb__total"><span>Total / month</span><b>{{ plan.price | currency:'USD' }}</b></div>
          }
          <button type="button" class="cb__checkout" (click)="checkout()">Checkout</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .cb { position: relative; display: inline-block; }
    .cb__btn {
      position: relative; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
      color: var(--bv-text-primary); background: var(--bv-bg-surface); border: 1.5px solid var(--bv-border-hover, var(--bv-border));
      transition: transform 0.18s ease, border-color 0.18s ease;
    }
    .cb__btn:hover { transform: scale(1.06); border-color: var(--bv-text-secondary); }
    .cb__badge {
      position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px;
      display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; background: #e11d2e;
      box-shadow: 0 0 0 2px var(--bv-bg-base, #050507);
    }
    /* padding-top on the menu bridges the gap so it stays open while the mouse travels to it */
    .cb__menu {
      position: absolute; right: 0; top: 100%; padding-top: 12px; width: 300px; z-index: 20;
      opacity: 0; visibility: hidden; transform: translateY(-6px); pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
    }
    .cb:hover .cb__menu, .cb:focus-within .cb__menu, .cb__menu--open { opacity: 1; visibility: visible; transform: none; pointer-events: auto; }
    .cb__menu > * { position: relative; }
    .cb__menu::before {
      content: ''; position: absolute; inset: 12px 0 0 0; border-radius: 16px; z-index: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%), #0a0a10;
      border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 18px 50px rgba(0,0,0,0.5);
    }
    .cb__menu > * { z-index: 1; margin-left: 16px; margin-right: 16px; }
    .cb__title { margin-top: 16px; margin-bottom: 10px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a9aab; }
    .cb__item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .cb__dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }
    .cb__info { flex: 1; min-width: 0; }
    .cb__name { margin: 0; font-size: 14px; font-weight: 700; color: #fff; }
    .cb__sub { margin: 2px 0 0; font-size: 12px; color: #9a9aab; }
    .cb__price { margin: 0; font-size: 14px; font-weight: 700; color: #fff; }
    .cb__x { background: none; border: none; color: #9a9aab; font-size: 20px; line-height: 1; cursor: pointer; padding: 0 2px; }
    .cb__x:hover { color: #ff5b7a; }
    .cb__total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 13px; color: #b9b9c8; }
    .cb__total b { color: #fff; }
    .cb__checkout {
      margin-bottom: 16px; width: calc(100% - 32px); padding: 12px 16px; border: none; border-radius: 10px; cursor: pointer;
      font-weight: 700; font-size: 14px; color: #050507; background: linear-gradient(135deg, #7cf7ff 0%, #b38bff 50%, #ff5bd6 100%);
    }
    .cb__checkout:hover { filter: brightness(1.08); }
    @media (max-width: 420px) { .cb__menu { width: min(300px, calc(100vw - 32px)); } }
  `],
})
export class CartButtonComponent {
  cart = inject(CartService);
  private router = inject(Router);
  open = signal(false);

  remove(): void { this.cart.remove(); this.open.set(false); }
  checkout(): void { this.open.set(false); this.router.navigate(['/checkout']); }
}