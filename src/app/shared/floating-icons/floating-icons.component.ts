import { Component, ChangeDetectionStrategy } from '@angular/core';

/** Phosphor Icons (MIT) — "regular" weight, viewBox 0 0 256 256 — https://phosphoricons.com */
const PATHS: string[] = [
  // shield-check
  'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z',
  // lock-key-open
  'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z',
  // fingerprint
  'M72,128a134.63,134.63,0,0,1-14.16,60.47,8,8,0,1,1-14.32-7.12A118.8,118.8,0,0,0,56,128,71.73,71.73,0,0,1,83,71.8,8,8,0,1,1,93,84.29,55.76,55.76,0,0,0,72,128Zm56-8a8,8,0,0,0-8,8,184.12,184.12,0,0,1-23,89.1,8,8,0,0,0,14,7.76A200.19,200.19,0,0,0,136,128,8,8,0,0,0,128,120Zm0-32a40,40,0,0,0-40,40,8,8,0,0,0,16,0,24,24,0,0,1,48,0,214.09,214.09,0,0,1-20.51,92A8,8,0,1,0,146,226.83,230,230,0,0,0,168,128,40,40,0,0,0,128,88Zm0-64A104.11,104.11,0,0,0,24,128a87.76,87.76,0,0,1-5,29.33,8,8,0,0,0,15.09,5.33A103.9,103.9,0,0,0,40,128a88,88,0,0,1,176,0,282.24,282.24,0,0,1-5.29,54.45,8,8,0,0,0,6.3,9.4,8.22,8.22,0,0,0,1.55.15,8,8,0,0,0,7.84-6.45A298.37,298.37,0,0,0,232,128,104.12,104.12,0,0,0,128,24ZM94.4,152.17A8,8,0,0,0,85,158.42a151,151,0,0,1-17.21,45.44,8,8,0,0,0,13.86,8,166.67,166.67,0,0,0,19-50.25A8,8,0,0,0,94.4,152.17ZM128,56a72.85,72.85,0,0,0-9,.56,8,8,0,0,0,2,15.87A56.08,56.08,0,0,1,184,128a252.12,252.12,0,0,1-1.92,31A8,8,0,0,0,189,168a8.39,8.39,0,0,0,1,.06,8,8,0,0,0,7.92-7,266.48,266.48,0,0,0,2-33A72.08,72.08,0,0,0,128,56Zm57.93,128.25a8,8,0,0,0-9.75,5.75c-1.46,5.69-3.15,11.4-5,17a8,8,0,0,0,5,10.13,7.88,7.88,0,0,0,2.55.42,8,8,0,0,0,7.58-5.46c2-5.92,3.79-12,5.35-18.05A8,8,0,0,0,185.94,184.26Z',
  // vault
  'M216,40H40A16,16,0,0,0,24,56V192a16,16,0,0,0,16,16H56v16a8,8,0,0,0,16,0V208H184v16a8,8,0,0,0,16,0V208h16a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,152H40V56H216v64H199.32a48,48,0,1,0,0,16H216v56Zm-50.16-72a16,16,0,1,0,0,16H183a32,32,0,1,1,0-16Z',
  // key
  'M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z',
  // shield-warning
  'M120,136V96a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,48a12,12,0,1,0-12-12A12,12,0,0,0,128,184ZM224,56v56c0,52.72-25.52,84.67-46.93,102.19-23.06,18.86-46,25.27-47,25.53a8,8,0,0,1-4.2,0c-1-.26-23.91-6.67-47-25.53C57.52,196.67,32,164.72,32,112V56A16,16,0,0,1,48,40H208A16,16,0,0,1,224,56Zm-16,0L48,56l0,56c0,37.3,13.82,67.51,41.07,89.81A128.25,128.25,0,0,0,128,223.62a129.3,129.3,0,0,0,39.41-22.2C194.34,179.16,208,149.07,208,112Z',
  // lock-simple-open
  'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Z',
  // keyhole
  'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-104a40,40,0,1,0-65.94,30.44L88.68,172.77A8,8,0,0,0,96,184h64a8,8,0,0,0,7.32-11.23l-13.38-30.33A40.14,40.14,0,0,0,168,112ZM136.68,143l11,25.05H108.27l11-25.05A8,8,0,0,0,116,132.79a24,24,0,1,1,24,0A8,8,0,0,0,136.68,143Z',
  // fingerprint-simple
  'M184,128a246.64,246.64,0,0,1-18.54,94.24,8,8,0,0,1-7.4,5,8.19,8.19,0,0,1-3-.6,8,8,0,0,1-4.36-10.45A230.67,230.67,0,0,0,168,128a8,8,0,0,1,16,0ZM128,88a40.06,40.06,0,0,1,29.81,13.33,8,8,0,1,0,11.92-10.67A56,56,0,0,0,72,128a136.06,136.06,0,0,1-17,65.85,8,8,0,1,0,14,7.76A152.14,152.14,0,0,0,88,128,40,40,0,0,1,128,88Zm0-64a103.75,103.75,0,0,0-34.67,5.92A8,8,0,0,0,98.67,45,88.05,88.05,0,0,1,216,128a281.31,281.31,0,0,1-6.94,62.23,8,8,0,0,0,6,9.57,7.77,7.77,0,0,0,1.78.2,8,8,0,0,0,7.8-6.23A298.11,298.11,0,0,0,232,128,104.11,104.11,0,0,0,128,24ZM69.34,62.42A8,8,0,1,0,58.67,50.49,104.16,104.16,0,0,0,24,128a87.29,87.29,0,0,1-8,36.66,8,8,0,0,0,14.54,6.68A103.17,103.17,0,0,0,40,128,88.13,88.13,0,0,1,69.34,62.42Zm44.58,138.32a8,8,0,0,0-10.61,3.93c-1.92,4.2-4,8.39-6.29,12.44A8,8,0,0,0,100.14,228a7.88,7.88,0,0,0,3.87,1,8,8,0,0,0,7-4.12c2.44-4.41,4.74-9,6.84-13.52A8,8,0,0,0,113.92,200.74ZM128,120a8,8,0,0,0-8,8,185.07,185.07,0,0,1-5.79,46,8,8,0,0,0,5.75,9.74,8.12,8.12,0,0,0,2,.25,8,8,0,0,0,7.74-6,200.68,200.68,0,0,0,6.3-50A8,8,0,0,0,128,120Z',
  // lock-laminated-open
  'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM48,128H208v16H48Zm0,32H208v16H48ZM208,96v16H48V96Zm0,112H48V192H208v16Z',
  // prohibit
  'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128ZM40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z',
  // hand-palm
  'M188,88a27.75,27.75,0,0,0-12,2.71V60a28,28,0,0,0-41.36-24.6A28,28,0,0,0,80,44v6.71A27.75,27.75,0,0,0,68,48,28,28,0,0,0,40,76v76a88,88,0,0,0,176,0V116A28,28,0,0,0,188,88Zm12,64a72,72,0,0,1-144,0V76a12,12,0,0,1,24,0v44a8,8,0,0,0,16,0V44a12,12,0,0,1,24,0v68a8,8,0,0,0,16,0V60a12,12,0,0,1,24,0v68.67A48.08,48.08,0,0,0,120,176a8,8,0,0,0,16,0,32,32,0,0,1,32-32,8,8,0,0,0,8-8V116a12,12,0,0,1,24,0Z',
];

interface FloatIcon {
  d: string;
  x: number;          // starting left, % of viewport
  y: number;          // starting top, % of viewport
  size: number;       // px
  travelX: number;    // wander distance, vw
  travelY: number;    // wander distance, vh
  durX: number;       // seconds per horizontal sweep
  durY: number;       // seconds per vertical sweep
  durR: number;       // seconds per rotation swing
  rot: number;        // degrees each way
  delayX: number;
  delayY: number;
  delayR: number;
  colorDelay: number; // staggers the color cycle
  hideOnMobile: boolean;
}

/** Small seeded PRNG so the layout is random-looking but identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 10;
const ROWS = 6; // 60 icons

function buildIcons(): FloatIcon[] {
  const rand = mulberry32(2026);
  const between = (a: number, b: number) => a + rand() * (b - a);
  const list: FloatIcon[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = r * COLS + c;
      list.push({
        d: PATHS[(n * 5) % PATHS.length],            // spreads the 12 shapes around evenly
        x: ((c + between(0.1, 0.9)) / COLS) * 100,
        y: ((r + between(0.1, 0.9)) / ROWS) * 100,
        size: Math.round(between(34, 80)),
        travelX: between(10, 22),
        travelY: between(10, 20),
        durX: between(11, 19),
        durY: between(8, 14),
        durR: between(9, 16),
        rot: between(18, 40),
        delayX: -between(0, 20),
        delayY: -between(0, 20),
        delayR: -between(0, 20),
        colorDelay: -between(0, 16),
        hideOnMobile: n % 3 !== 0, // phones keep every 3rd icon (20)
      });
    }
  }
  return list;
}

/**
 * Decorative floating icons for the landing page background.
 * Night mode: cycle through the brand colors. Day mode: solid black.
 * Each icon wanders across the screen on three independent, out-of-phase
 * animations (horizontal sweep, vertical sweep, rotation), so the paths look
 * organic instead of bouncing back and forth along a line.
 * Fixed behind the content and never blocks clicks.
 */
@Component({
  selector: 'app-floating-icons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="float-layer" aria-hidden="true">
      @for (i of icons; track $index) {
        <span
          class="fi-x"
          [class.fi--hide-mobile]="i.hideOnMobile"
          [style.left.%]="i.x"
          [style.top.%]="i.y"
          [style.--size.px]="i.size"
          [style.--tx.vw]="i.travelX"
          [style.--dur.s]="i.durX"
          [style.--delay.s]="i.delayX"
        >
          <span
            class="fi-y"
            [style.--ty.vh]="i.travelY"
            [style.--dur.s]="i.durY"
            [style.--delay.s]="i.delayY"
          >
            <svg
              viewBox="0 0 256 256"
              fill="currentColor"
              focusable="false"
              [style.--rot.deg]="i.rot"
              [style.--dur.s]="i.durR"
              [style.--delay.s]="i.delayR"
              [style.--cd.s]="i.colorDelay"
            >
              <path [attr.d]="i.d" />
            </svg>
          </span>
        </span>
      }
    </div>
  `,
  styles: [`
    :host {
      /* BlackVault palette — icons cycle through these */
      --fi-cyan:   #7cf7ff;
      --fi-purple: #b38bff;
      --fi-pink:   #ff5bd6;
      --fi-gold:   #ffd36a;
      --fi-opacity: 0.26;
    }

    /* Day mode: same wandering icons, but solid black (no color cycle) and a
       touch fainter so they stay a background detail on the rainbow page. */
    :host-context([data-theme="light"]) {
      --fi-opacity: 0.2;
    }

    :host-context([data-theme="light"]) .fi-y svg {
      color: #0a0a0f;
      animation: fi-swing var(--dur) ease-in-out var(--delay) infinite alternate;
    }

    .float-layer {
      position: fixed;
      inset: 0;
      z-index: -1;            /* host creates the stacking context (see landing.scss) */
      pointer-events: none;
      overflow: hidden;
      contain: layout paint style;
    }

    /* Three nested layers = three independent motions, all GPU-composited */
    .fi-x {
      position: absolute;
      display: block;
      width: var(--size);
      height: var(--size);
      opacity: var(--fi-opacity);
      will-change: translate;
      animation: fi-sweep-x var(--dur) ease-in-out var(--delay) infinite alternate;
    }

    .fi-y {
      display: block;
      width: 100%;
      height: 100%;
      will-change: translate;
      animation: fi-sweep-y var(--dur) ease-in-out var(--delay) infinite alternate;
    }

    .fi-y svg {
      display: block;
      width: 100%;
      height: 100%;
      will-change: rotate;
      animation:
        fi-swing var(--dur) ease-in-out var(--delay) infinite alternate,
        fi-color 14s linear var(--cd) infinite;
    }

    @keyframes fi-sweep-x {
      from { translate: calc(var(--tx) * -1) 0; }
      to   { translate: var(--tx) 0; }
    }

    @keyframes fi-sweep-y {
      from { translate: 0 calc(var(--ty) * -1); }
      to   { translate: 0 var(--ty); }
    }

    @keyframes fi-swing {
      from { rotate: calc(var(--rot) * -1); }
      to   { rotate: var(--rot); }
    }

    @keyframes fi-color {
      0%, 100% { color: var(--fi-cyan); }
      25%      { color: var(--fi-purple); }
      50%      { color: var(--fi-pink); }
      75%      { color: var(--fi-gold); }
    }

    @media (max-width: 768px) {
      .fi--hide-mobile { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      .fi-x, .fi-y, .fi-y svg { animation: none; will-change: auto; }
      .fi-y svg { color: var(--fi-purple); }
      :host-context([data-theme="light"]) .fi-y svg { color: #0a0a0f; animation: none; }
    }
  `],
})
export class FloatingIconsComponent {
  readonly icons: FloatIcon[] = buildIcons();
}