import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';

/**
 * Scroll-reveal that REPEATS: the element rises 32px and fades in whenever it
 * scrolls into view, and quietly resets once it is fully out of view, so the
 * effect plays again every time you scroll back to it (up or down), in both
 * day and night mode.
 *
 * Only opacity + transform are animated (GPU-composited, no layout/paint),
 * and the compositor layer is released as soon as each animation finishes.
 */
@Directive({
  selector: '[appFadeIn]',
  standalone: true,
})
export class FadeInDirective implements OnInit, OnDestroy {
  /** Delay in ms before the animation plays — stagger siblings with 0, 120, 240 etc. */
  @Input() fadeDelay: number = 0;
  /** How much of the element must be visible before it reveals (0–1) */
  @Input() fadeThreshold: number = 0.12;
  /**
   * Shrinks the trigger zone from the bottom of the viewport so the reveal
   * happens while the user can actually SEE it, not before.
   */
  @Input() fadeRootMargin: string = '0px 0px -8% 0px';

  private observer: IntersectionObserver | null = null;
  private doneTimer: ReturnType<typeof setTimeout> | null = null;
  private revealed = false;
  private readonly duration = 650;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const el = this.el.nativeElement;

    // Respect users who ask for less motion, and old browsers without IO.
    const reduceMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.hide(el);

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= this.fadeThreshold && !this.revealed) {
            this.reveal(el);
          } else if (entry.intersectionRatio === 0 && this.revealed) {
            // Fully out of view: reset invisibly so it can play again later.
            this.hide(el);
          }
          // Anything in between is ignored, which avoids flicker at the edges.
        }
      },
      {
        // 0 detects "fully left the screen"; fadeThreshold detects "visible enough".
        threshold: [0, this.fadeThreshold],
        rootMargin: this.fadeRootMargin,
      }
    );

    this.observer.observe(el);
  }

  private hide(el: HTMLElement): void {
    this.revealed = false;
    if (this.doneTimer) { clearTimeout(this.doneTimer); this.doneTimer = null; }
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translate3d(0, 32px, 0)';
    el.style.willChange = '';
  }

  private reveal(el: HTMLElement): void {
    this.revealed = true;
    const d = this.duration;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.willChange = 'opacity, transform';
    el.style.transition =
      `opacity ${d}ms ${ease} ${this.fadeDelay}ms, transform ${d}ms ${ease} ${this.fadeDelay}ms`;
    el.style.opacity = '1';
    el.style.transform = 'translate3d(0, 0, 0)';

    // Release the GPU layer once the animation has finished.
    this.doneTimer = setTimeout(() => {
      el.style.willChange = '';
    }, this.fadeDelay + d + 50);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.doneTimer) clearTimeout(this.doneTimer);
  }
}