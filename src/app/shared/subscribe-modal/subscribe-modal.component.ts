import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../core/subscription.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-subscribe-modal',
  standalone: true,
  template: `
    @if (subs.modalOpen()) {
      <div class="sm__backdrop" (click)="close()">
        <div class="sm__wrap" role="dialog" aria-modal="true" aria-labelledby="sm-title" (click)="$event.stopPropagation()">
          <!-- glowing rainbow border: a blurred copy underneath + a crisp ring on top -->
          <span class="sm__glow" aria-hidden="true"></span>
          <span class="sm__ring" aria-hidden="true"></span>

          <div class="sm__card">
            <p class="sm__eyebrow">
              @if (subs.blockReason() === 'daily') { Daily limit reached } @else { Free scans used }
            </p>
            <h2 class="sm__title" id="sm-title">
              @if (subs.blockReason() === 'daily') { Ready to upgrade? } @else { Ready to subscribe? }
            </h2>
            <p class="sm__text">
              @if (subs.blockReason() === 'daily') {
                You've used all {{ subs.basicDailyLimit }} of today's scans. Upgrade for unlimited scanning.
              } @else {
                You've used your {{ subs.freeLimit }} free scans. Subscribe to keep scanning and unlock
                more scans, wide scans by AI agents, and instant threat alerts.
              }
            </p>

            <div class="sm__choices">
              <button type="button" class="sm__sq sm__sq--yes" (click)="subscribe()">Subscribe</button>
              <button type="button" class="sm__sq sm__sq--no" (click)="no()">Not now</button>
            </div>

            @if (declined()) {
              <p class="sm__note">A subscription is required to keep scanning.</p>
            }
            <button type="button" class="sm__close" (click)="close()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sm__backdrop {
      position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 20px;
      background: rgba(3, 3, 8, 0.78); backdrop-filter: blur(6px);
      animation: sm-fade 0.25s ease both;
    }
    .sm__wrap { position: relative; width: min(440px, 100%); animation: sm-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

    .sm__ring, .sm__glow {
      position: absolute; inset: -3px; border-radius: 27px; pointer-events: none;
      background: conic-gradient(from var(--sm-angle), #7cf7ff, #b38bff, #ff5bd6, #ffd36a, #00e887, #7cf7ff);
      animation: sm-spin 6s linear infinite;
    }
    .sm__glow { filter: blur(20px); opacity: 0.75; inset: -6px; }

    .sm__card {
      position: relative; z-index: 1; border-radius: 24px; padding: 40px 32px 26px; text-align: center;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 40%),
        #05050a;
    }
    .sm__eyebrow { margin: 0 0 10px; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #b38bff; }
    .sm__title {
      margin: 0 0 12px; color: #fff; font-weight: 700; letter-spacing: -0.01em;
      font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: clamp(30px, 6vw, 38px);
    }
    .sm__text { margin: 0 auto 28px; max-width: 320px; color: #a9a9b8; font-size: 14px; line-height: 1.65; }

    .sm__choices { display: flex; justify-content: center; gap: 22px; margin-bottom: 18px; }
    .sm__sq {
      width: 118px; height: 118px; border-radius: 18px; border: 2px solid; cursor: pointer;
      font-family: 'Playfair Display', Georgia, serif; font-size: 19px; font-weight: 700; color: #fff; padding: 0 6px;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .sm__sq:hover { transform: translateY(-3px) scale(1.04); }
    .sm__sq:active { transform: scale(0.98); }
    .sm__sq:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
    .sm__sq--yes {   /* sapphire */
      border-color: #5b9bff;
      background: radial-gradient(circle at 30% 25%, #3d78ff 0%, #0f3fb5 60%, #0a2a80 100%);
      box-shadow: 0 0 18px rgba(47, 123, 255, 0.7), 0 0 44px rgba(47, 123, 255, 0.45), inset 0 1px 0 rgba(255,255,255,0.35);
    }
    .sm__sq--yes:hover { box-shadow: 0 0 26px rgba(47, 123, 255, 0.95), 0 0 64px rgba(47, 123, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.4); }
    .sm__sq--no {    /* burning magenta */
      border-color: #ff4fd0;
      background: radial-gradient(circle at 30% 25%, #ff2bb8 0%, #b0007a 60%, #6a004a 100%);
      box-shadow: 0 0 18px rgba(255, 0, 170, 0.7), 0 0 44px rgba(255, 0, 170, 0.45), inset 0 1px 0 rgba(255,255,255,0.3);
      animation: sm-burn 1.6s ease-in-out infinite;
    }
    .sm__sq--no:hover { animation: none; box-shadow: 0 0 28px rgba(255, 0, 170, 1), 0 0 70px rgba(255, 0, 170, 0.65), inset 0 1px 0 rgba(255,255,255,0.4); }

    .sm__note { margin: 0 0 6px; font-size: 13px; color: #ff7ad9; }
    .sm__close { margin-top: 8px; background: none; border: none; color: #6f6f80; font-size: 12px; cursor: pointer; }
    .sm__close:hover { color: #cfcfdc; }

    @keyframes sm-spin { to { --sm-angle: 360deg; } }
    @keyframes sm-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sm-pop { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
    @keyframes sm-burn {
      0%, 100% { box-shadow: 0 0 16px rgba(255, 0, 170, 0.65), 0 0 40px rgba(255, 0, 170, 0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
      50%      { box-shadow: 0 0 24px rgba(255, 60, 140, 0.95), 0 0 62px rgba(255, 0, 170, 0.6), inset 0 1px 0 rgba(255,255,255,0.3); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sm__ring, .sm__glow, .sm__sq--no, .sm__wrap, .sm__backdrop { animation: none !important; }
    }
    @media (max-width: 420px) { .sm__sq { width: 100px; height: 100px; } .sm__choices { gap: 14px; } }
  `],
})
export class SubscribeModalComponent {
  subs = inject(SubscriptionService);
  private router = inject(Router);
  private auth = inject(AuthService);
  declined = signal(false);

  constructor() {
    // Lets the border colours rotate smoothly (animatable angle). Harmless if unsupported or already registered.
    try {
      (CSS as unknown as { registerProperty(d: object): void }).registerProperty({
        name: '--sm-angle', syntax: '<angle>', inherits: false, initialValue: '0deg',
      });
    } catch { /* already registered or unsupported */ }
  }

  /** Signed in → straight to the plans. Signed out → sign in first, then the plans. */
  subscribe(): void {
    this.close();
    if (this.auth.currentUser()) {
      this.router.navigate(['/subscribe']);
    } else {
      this.auth.setReturnUrl('/subscribe');
      this.router.navigate(['/auth/login']);
    }
  }

  no(): void { this.declined.set(true); }

  close(): void {
    this.declined.set(false);
    this.subs.closeModal();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.subs.modalOpen()) this.close(); }
}