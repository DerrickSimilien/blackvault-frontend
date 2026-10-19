import { Injectable, computed, signal } from '@angular/core';
import { PLANS, Plan, PlanId } from './subscription.service';

const KEY = 'bv.cart';

/** One-item cart: a user can only be on one plan at a time. Holds only the plan id. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private planId = signal<PlanId | null>(this.load());

  readonly count = computed(() => (this.planId() ? 1 : 0));
  readonly item = computed<Plan | null>(() => PLANS.find(p => p.id === this.planId()) ?? null);

  add(id: PlanId): void { this.planId.set(id); this.save(); }
  remove(): void { this.planId.set(null); this.save(); }
  clear(): void { this.remove(); }
  has(id: PlanId): boolean { return this.planId() === id; }

  private load(): PlanId | null {
    try {
      const v = sessionStorage.getItem(KEY);
      return v === 'basic' || v === 'pro' || v === 'premium' ? v : null;
    } catch { return null; }
  }

  private save(): void {
    try {
      const v = this.planId();
      if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY);
    } catch { /* storage blocked */ }
  }
}