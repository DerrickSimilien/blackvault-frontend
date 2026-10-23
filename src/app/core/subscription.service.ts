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

/** Free users get this many document-style scans (document, resume, code, contract) in total. */
export const FREE_SCAN_LIMIT = 2;
/** Plus one free "Scan My Screen" and one free "Device Safety Scan", each used only once. */
export const FREE_CAPTURE_LIMIT = 1;
export const FREE_DEVICE_LIMIT = 1;
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
      'Automatic wide scan twice a day, run by our AI agents',
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
      'Everything in Pink, plus:',
      'Wide scan on demand: run a full sweep whenever you choose',
      'AI agents guarding your account and phone 24/7 against hackers',
      'Instant threat alerts, plus a confirmation after every scan',
      'Deep-dive AI reports with step-by-step fixes and PDF export',
      'Priority human support',
    ],
  },
];

/** Which kind of scan a limit check is about. */
export type ScanKind = 'document' | 'capture' | 'device';

interface Usage {
  /** Ids of document-style scans (these count toward the free limit of 2). */
  ids: string[];
  days: Record<string, number>;
  /** Ids of "Scan My Screen" scans (their own free allowance). */
  captureIds?: string[];
  /** True once the free Device Safety Scan has been completed. */
  deviceUsed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private auth = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);

  readonly plans = PLANS;
  readonly freeLimit = FREE_SCAN_LIMIT;
  /** Which scan the open modal is about (changes its wording). */
  modalKind = signal<ScanKind>('document');
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

  captureUsed = computed(() => (this.usage().captureIds?.length ?? 0) >= FREE_CAPTURE_LIMIT);
  deviceUsed = computed(() => !!this.usage().deviceUsed);

  /** Why a given kind of scan is blocked right now, or null if it isn't. */
  blockReasonFor(kind: ScanKind): 'free' | 'daily' | null {
    const plan = this.plan();
    if (plan === 'pro' || plan === 'premium') return null;
    if (plan === 'basic') {
      // Device Safety Scan stays open to every subscriber; other scans share the daily limit.
      if (kind === 'device') return null;
      return this.usedToday() >= BASIC_DAILY_LIMIT ? 'daily' : null;
    }
    // Free tier: each kind has its own allowance.
    if (kind === 'capture') return this.captureUsed() ? 'free' : null;
    if (kind === 'device') return this.deviceUsed() ? 'free' : null;
    return this.totalUsed() >= FREE_SCAN_LIMIT ? 'free' : null;
  }

  /** Document-style scans (kept for existing callers). */
  blockReason = computed<'free' | 'daily' | null>(() => {
    this.tick(); this.auth.currentUser();
    return this.blockReasonFor('document');
  });

  canScan(kind: ScanKind = 'document'): boolean {
    this.tick(); this.auth.currentUser();
    return this.blockReasonFor(kind) === null;
  }

  /** Reason for the scan type the open modal is about (never null, so the modal always has wording). */
  modalReason = computed<'free' | 'daily'>(() => {
    this.tick(); this.auth.currentUser();
    return this.blockReasonFor(this.modalKind()) ?? 'free';
  });

  /** Counts a finished scan (once per scan id). */
  recordScan(scanId: string, kind: 'document' | 'capture' = 'document'): void {
    if (!scanId) return;
    const u = this.read<Usage>('usage', { ids: [], days: {} });
    const seen = kind === 'capture' ? (u.captureIds ??= []) : u.ids;
    if (seen.includes(scanId)) return;
    seen.push(scanId);
    u.days[this.today()] = (u.days[this.today()] ?? 0) + 1;
    this.write('usage', u);
  }

  /** Counts the free Device Safety Scan once it has finished. */
  recordDeviceScan(): void {
    const u = this.read<Usage>('usage', { ids: [], days: {} });
    if (u.deviceUsed) return;
    u.deviceUsed = true;
    this.write('usage', u);
  }

  /**
   * Turns a plan on. With PAYMENTS_LIVE = false this is a local test switch.
   * When you add Stripe, call it from your webhook-confirmed success page.
   */
  activate(plan: PlanId): void { this.write('plan', plan); }

  /** Ends the subscription. Scans already used still count toward the free limit. */
  cancel(): void {
    try { localStorage.removeItem(this.key('plan')); } catch { /* ignore */ }
    this.tick.update(n => n + 1);
  }

  /** Test helper: back to the free tier with a fresh scan allowance. */
  reset(): void {
    try {
      localStorage.removeItem(this.key('plan'));
      localStorage.removeItem(this.key('usage'));
    } catch { /* ignore */ }
    this.tick.update(n => n + 1);
  }

  /** Shows the "Ready to subscribe?" modal, creating it on first use. */
  async openModal(kind: ScanKind = 'document'): Promise<void> {
    this.modalKind.set(kind);
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