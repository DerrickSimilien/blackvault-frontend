import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';

@Directive({
  selector: '[appFadeIn]',
  standalone: true,
})
export class FadeInDirective implements OnInit, OnDestroy {
  /** Delay in ms before the animation plays — stagger children with 100, 200, 300 etc. */
  @Input() fadeDelay: number = 0;
  /** How far into the viewport the element must be before triggering (0–1) */
  @Input() fadeThreshold: number = 0.15;
  /**
   * How far below the viewport the trigger zone extends, so the fade
   * completes BEFORE the element is actually scrolled into view instead
   * of racing the user's scroll. Standard CSS margin shorthand.
   */
  @Input() fadeRootMargin: string = '0px 0px 200px 0px';

  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const el = this.el.nativeElement;

    // Start invisible and slightly below
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.willChange = 'opacity, transform';
    el.style.transition = `opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${this.fadeDelay}ms,
                           transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${this.fadeDelay}ms`;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            // Once triggered, stop watching
            this.observer?.unobserve(el);
          }
        });
      },
      {
        threshold: this.fadeThreshold,
        // Extend the observed area past the bottom of the viewport so the
        // animation starts while the element is still below the fold —
        // by the time it's actually visible, it's already faded in.
        rootMargin: this.fadeRootMargin,
      }
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
