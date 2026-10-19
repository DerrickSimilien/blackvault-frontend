import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { PAYMENTS_LIVE, Plan, SubscriptionService } from '../../core/subscription.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle/theme-toggle.component';
import { FloatingIconsComponent } from '../../shared/floating-icons/floating-icons.component';
import { CartButtonComponent } from '../../shared/cart-button/cart-button.component';

type Step = 1 | 2 | 3;
type Method = 'card' | 'paypal' | 'apple' | 'phone';
type Outcome = 'active' | 'pending';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule, ThemeToggleComponent, FloatingIconsComponent, CartButtonComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private auth = inject(AuthService);
  private router = inject(Router);
  private subs = inject(SubscriptionService);
  cart = inject(CartService);

  readonly paymentsLive = PAYMENTS_LIVE;
  readonly steps = ['Your details', 'Billing', 'Review'];
  readonly methods: { id: Method; label: string; hint: string }[] = [
    { id: 'card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, Amex, Discover' },
    { id: 'paypal', label: 'PayPal', hint: 'Pay with your PayPal account' },
    { id: 'apple', label: 'Apple Pay', hint: 'Pay with Face ID or Touch ID' },
    { id: 'phone', label: 'Pay by phone', hint: 'Book a call with a BlackVAULT representative' },
  ];
  readonly times = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
  readonly minDate = new Date().toISOString().slice(0, 10);

  step = signal<Step>(1);
  errors = signal<Record<string, string>>({});
  outcome = signal<Outcome | null>(null);
  purchased = signal<Plan | null>(null);

  // Plain objects bound with ngModel. Card details live only in memory and are cleared on submit.
  form = { fullName: '', firstName: '', middleName: '', lastName: '', email: '', phone: '' };
  pay = {
    method: 'card' as Method,
    cardName: '', cardNumber: '', expiry: '', cvc: '', zip: '',
    apptDate: '', apptTime: '', apptPhone: '', apptNote: '',
  };

  constructor() {
    try {
      (CSS as unknown as { registerProperty(d: object): void }).registerProperty({
        name: '--sub-angle', syntax: '<angle>', inherits: false, initialValue: '0deg',
      });
    } catch { /* already registered or unsupported */ }

    const user = this.auth.currentUser();
    const parts = (user?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    this.form.fullName = parts.join(' ');
    this.form.firstName = parts[0] ?? '';
    this.form.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    this.form.email = user?.email ?? '';
  }

  // ── navigation ──
  next(): void {
    const errs = this.step() === 1 ? this.validateDetails() : this.validateBilling();
    this.errors.set(errs);
    if (Object.keys(errs).length) return;
    if (this.step() === 1 && !this.pay.apptPhone) this.pay.apptPhone = this.form.phone;
    this.step.update(s => (s < 3 ? ((s + 1) as Step) : s));
  }

  back(): void {
    this.errors.set({});
    if (this.step() === 1) this.router.navigate(['/subscribe']);
    else this.step.update(s => ((s - 1) as Step));
  }

  goTo(step: Step): void { this.errors.set({}); this.step.set(step); }

  // ── validation ──
  private validateDetails(): Record<string, string> {
    const e: Record<string, string> = {};
    const f = this.form;
    if (!f.fullName.trim()) e['fullName'] = 'Enter your full name.';
    if (!f.firstName.trim()) e['firstName'] = 'Enter your first name.';
    if (!f.lastName.trim()) e['lastName'] = 'Enter your last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e['email'] = 'Enter a valid email address.';
    if (f.phone.replace(/\D/g, '').length < 7) e['phone'] = 'Enter a valid phone number.';
    return e;
  }

  private validateBilling(): Record<string, string> {
    const e: Record<string, string> = {};
    const p = this.pay;
    if (p.method === 'card') {
      if (!p.cardName.trim()) e['cardName'] = 'Enter the name on the card.';
      if (!this.luhn(p.cardNumber)) e['cardNumber'] = 'Enter a valid card number.';
      if (!this.validExpiry(p.expiry)) e['expiry'] = 'Use MM/YY, a future date.';
      if (!/^\d{3,4}$/.test(p.cvc)) e['cvc'] = '3 or 4 digits.';
      if (p.zip.trim().length < 3) e['zip'] = 'Enter your billing ZIP / postal code.';
    } else if (p.method === 'phone') {
      if (!p.apptDate) e['apptDate'] = 'Pick a date.';
      if (!p.apptTime) e['apptTime'] = 'Pick a time.';
      if (p.apptPhone.replace(/\D/g, '').length < 7) e['apptPhone'] = 'Enter the number to call.';
    }
    return e;
  }

  private luhn(raw: string): boolean {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }

  private validExpiry(v: string): boolean {
    const m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    const month = Number(m[1]);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const year = 2000 + Number(m[2]);
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }

  // ── input formatting ──
  onCardInput(v: string): void {
    const digits = v.replace(/\D/g, '').slice(0, 19);
    this.pay.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  onExpiryInput(v: string): void {
    const d = v.replace(/\D/g, '').slice(0, 4);
    this.pay.expiry = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  onCvcInput(v: string): void { this.pay.cvc = v.replace(/\D/g, '').slice(0, 4); }

  // ── review helpers ──
  methodLabel(): string { return this.methods.find(m => m.id === this.pay.method)?.label ?? ''; }
  maskedCard(): string {
    const last4 = this.pay.cardNumber.replace(/\D/g, '').slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  // ── submit ──
  submit(): void {
    const plan = this.cart.item();
    if (!plan) return;

    // TODO(payments): send this to your backend / Stripe (PaymentIntent) and only continue once the
    // payment is confirmed. Never send raw card numbers to your own server; use Stripe Elements.
    if (this.pay.method === 'phone') {
      this.outcome.set('pending');            // a representative collects payment, then activates the plan
    } else {
      this.subs.activate(plan.id);            // test mode: activates immediately
      this.outcome.set('active');
    }
    this.purchased.set(plan);
    this.cart.clear();

    // Don't keep card details around after submitting.
    this.pay.cardNumber = '';
    this.pay.cvc = '';
    this.pay.expiry = '';
  }

  toDashboard(): void { this.router.navigate(['/dashboard']); }
}