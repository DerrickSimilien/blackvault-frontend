import {
  Injectable, inject, signal, computed,
  ApplicationRef, EnvironmentInjector, createComponent, ComponentRef,
} from '@angular/core';
import { AuthService } from './auth.service';

export type PlanId = 'basic' | 'pro' | 'premium';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number;          // per month, USD
  color: string;          // accent colour used on the subscribe page
  features: string[];
}

/** Free users get this many scans in total before the subscribe modal appears. */
export const FREE_SCAN_LIMIT = 2;
/** The Blue (basic) plan allows this many scans per day. */
export const BASIC_DAILY_LIMIT = 10;

/**
 * Flip to true once real payments (e.g. Stripe Checkout) are wired up.
 * While false, "Choose plan" activates the plan locally for testing and no
 * money is taken.
 */
export const PAYMENTS_LIVE = false;

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Blue',
    tagline: 'Basic',
    price: 20.99,
    color: '#2f7bff',
    features: [
      'Up to 10 scans per day',
      'All scan modes: document, resume, code & contract',
      'Scan history and risk timeline',
    ],
  },
  {
    id: 'pro',
    name: 'Pink',
    tagline: 'Plus',
    price: 30.99,
    color: '#ff4fb8',
    features: [
      'Unlimited scans every day',
      'Automatic wide scan twice a day by our AI agents',
      'Weekly Security Digest: a plain-English report of your risk trend',
      'Priority AI analysis queue',
    ],
  },
  {
    id: 'premium',
    name: 'Purple',
    tagline: 'Premium',
    price: 40.99,
    color: '#a05bff',
    features: [
      'Unlimited scans',
      'Manual wide scan whenever you choose',
      'AI agents watching your account and phone 24/7 against hackers',
      'Alerts if something looks off, and when a scan has run successfully',
    ],
  },
];

interface Usage { ids: string[]; days: Record<string, number>; }

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private auth = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);

  readonly plans = PLANS;
  readonly freeLimit = FREE_SCAN_LIMIT;
  readonly basicDailyLimit = BASIC_DAILY_LIMIT;

  /** Bumped whenever stored data changes so the computed values refresh. */
  private tick = signal(0);
  modalOpen = signal(false);
  private modalRef: ComponentRef<unknown> | null = null;

  private key(kind: 'plan' | 'usage'): string {
    const uid = this.auth.currentUser()?.uid ?? 'anon';
    return `bv.${kind}.${uid}`;
  }

  private read<T>(kind: 'plan' | 'usage', fallback: T): T {
    try {
      const raw = localStorage.getItem(this.key(kind));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  }

  private write(kind: 'plan' | 'usage', value: unknown): void {
    try { localStorage.setItem(this.key(kind), JSON.stringify(value)); } catch { /* storage blocked */ }
    this.tick.update(n => n + 1);
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  plan = computed<PlanId | null>(() => {
    this.tick(); this.auth.currentUser();
    return this.read<PlanId | null>('plan', null);
  });

  private usage = computed<Usage>(() => {
    this.tick(); this.auth.currentUser();
    return this.read<Usage>('usage', { ids: [], days: {} });
  });

  totalUsed = computed(() => this.usage().ids.length);
  usedToday = computed(() => this.usage().days[this.today()] ?? 0);
  freeLeft = computed(() => Math.max(0, FREE_SCAN_LIMIT - this.totalUsed()));

  /** Why scanning is blocked right now, or null if it isn't. */
  blockReason = computed<'free' | 'daily' | null>(() => {
    const plan = this.plan();
    if (plan === 'pro' || plan === 'premium') return null;
    if (plan === 'basic') return this.usedToday() >= BASIC_DAILY_LIMIT ? 'daily' : null;
    return this.totalUsed() >= FREE_SCAN_LIMIT ? 'free' : null;
  });

  canScan(): boolean { return this.blockReason() === null; }

  /** Counts a finished scan (once per scan id). */
  recordScan(scanId: string): void {
    if (!scanId) return;
    const u = this.read<Usage>('usage', { ids: [], days: {} });
    if (u.ids.includes(scanId)) return;
    u.ids.push(scanId);
    u.days[this.today()] = (u.days[this.today()] ?? 0) + 1;
    this.write('usage', u);
  }

  /**
   * Turns a plan on. With PAYMENTS_LIVE = false this is a local test switch.
   * When you add Stripe, call it from your webhook-confirmed success page.
   */
  activate(plan: PlanId): void { this.write('plan', plan); }

  /** Test helper: back to the free tier with a fresh scan allowance. */
  reset(): void {
    try {
      localStorage.removeItem(this.key('plan'));
      localStorage.removeItem(this.key('usage'));
    } catch { /* ignore */ }
    this.tick.update(n => n + 1);
  }

  /** Shows the "Ready to subscribe?" modal, creating it on first use. */
  async openModal(): Promise<void> {
    if (!this.modalRef) {
      // Loaded lazily to avoid a circular import with the modal component.
      const { SubscribeModalComponent } = await import('../shared/subscribe-modal/subscribe-modal.component');
      const ref = createComponent(SubscribeModalComponent, { environmentInjector: this.envInjector });
      this.appRef.attachView(ref.hostView);
      document.body.appendChild(ref.location.nativeElement);
      this.modalRef = ref;
    }
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); }
}