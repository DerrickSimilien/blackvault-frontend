import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';

/**
 * Scroll-reveal: the element rises 32px and fades in as it scrolls into view.
 * Only opacity + transform are animated (GPU-composited, no layout/paint),
 * and the compositor layer is released as soon as the animation finishes.
 */
@Directive({
  selector: '[appFadeIn]',
  standalone: true,
})
export class FadeInDirective implements OnInit, OnDestroy {
  /** Delay in ms before the animation plays — stagger siblings with 0, 120, 240 etc. */
  @Input() fadeDelay: number = 0;
  /** How much of the element must be visible before triggering (0–1) */
  @Input() fadeThreshold: number = 0.12;
  /**
   * Shrinks the trigger zone from the bottom of the viewport so the reveal
   * happens while the user can actually SEE it, not before.
   */
  @Input() fadeRootMargin: string = '0px 0px -8% 0px';

  private observer: IntersectionObserver | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

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

    const duration = 650;

    el.style.opacity = '0';
    el.style.transform = 'translate3d(0, 32px, 0)';
    el.style.willChange = 'opacity, transform';

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          // Set the transition at reveal time so it can't affect anything earlier.
          el.style.transition =
            `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${this.fadeDelay}ms, ` +
            `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${this.fadeDelay}ms`;
          el.style.opacity = '1';
          el.style.transform = 'translate3d(0, 0, 0)';

          this.observer?.unobserve(el);

          // Free the GPU layer and drop the inline styles once finished,
          // so hover transforms etc. on the element behave normally again.
          this.cleanupTimer = setTimeout(() => {
            el.style.willChange = '';
            el.style.transition = '';
            el.style.transform = '';
            el.style.opacity = '';
          }, this.fadeDelay + duration + 50);
        }
      },
      { threshold: this.fadeThreshold, rootMargin: this.fadeRootMargin }
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
  }
}