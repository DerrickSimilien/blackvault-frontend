import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Extra scan options shown under "SELECT A SCAN MODE" on the dashboard:
 *  - phones/tablets: scan with the camera
 *  - desktops/laptops: scan the screen
 *  - everyone: device safety scan
 */
@Component({
  selector: 'app-extra-scan-tools',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="xt" aria-label="More ways to scan">
      <p class="xt__label">More ways to scan</p>
      <div class="xt__grid">
        <a class="xt__card xt__card--capture" routerLink="/scan/capture">
          <span class="xt__icon" aria-hidden="true">{{ isMobile ? '📷' : '🖥️' }}</span>
          <div class="xt__body">
            <h3 class="xt__title">
              {{ isMobile ? 'Scan with Camera' : 'Scan My Screen' }}
              <span class="xt__tag">{{ isMobile ? 'MOBILE' : 'DESKTOP' }}</span>
            </h3>
            <p class="xt__desc">
              @if (isMobile) {
                Take a picture of a document, resume, code, or contract. Results open automatically.
              } @else {
                Share a window or screen and BlackVault reads and analyzes what’s on it.
              }
            </p>
          </div>
          <span class="xt__arrow" aria-hidden="true">→</span>
        </a>

        <a class="xt__card xt__card--device" routerLink="/scan/device">
          <span class="xt__icon" aria-hidden="true">🛡️</span>
          <div class="xt__body">
            <h3 class="xt__title">Device Safety Scan <span class="xt__tag">SECURITY</span></h3>
            <p class="xt__desc">Run a browser and connection security checkup on this device and see how it holds up.</p>
          </div>
          <span class="xt__arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; margin-top: 28px; }

    .xt__label {
      font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--bv-text-tertiary); margin: 0 0 12px;
    }

    .xt__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }

    .xt__card {
      display: flex; align-items: center; gap: 16px; padding: 20px 22px;
      border-radius: 16px; text-decoration: none; color: inherit;
      border: 1px solid var(--bv-border);
      background: var(--bv-bg-card);
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(179, 139, 255, 0.5);
        background: var(--bv-bg-card-hover);
        box-shadow: 0 0 24px rgba(179, 139, 255, 0.18);
      }
      &--capture { background-image: linear-gradient(135deg, rgba(124, 247, 255, 0.07), transparent 60%); }
      &--device  { background-image: linear-gradient(135deg, rgba(255, 91, 214, 0.07), transparent 60%); }
    }

    .xt__icon { font-size: 30px; line-height: 1; flex-shrink: 0; }
    .xt__body { flex: 1; min-width: 0; }
    .xt__title {
      margin: 0 0 6px; font-size: 16px; font-weight: 700; color: var(--bv-text-primary);
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .xt__tag {
      font-size: 10px; letter-spacing: 0.1em; padding: 2px 8px; border-radius: 5px;
      color: var(--bv-text-secondary); background: var(--bv-bg-badge); font-weight: 600;
    }
    .xt__desc { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bv-text-secondary); }
    .xt__arrow { color: var(--bv-text-tertiary); font-size: 18px; flex-shrink: 0; }
  `],
})
export class ExtraScanToolsComponent {
  readonly isMobile =
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches &&
    navigator.maxTouchPoints > 0;
}