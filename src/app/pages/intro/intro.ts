import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IntroStateService } from '../../core/intro-state.service';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private introState = inject(IntroStateService);

  blackText = signal('');
  vaultText = signal('');
  showCursor = signal(true);
  typingComplete = signal(false);
  flareActive = signal(false);
  bloomActive = signal(false);

  private readonly blackTarget = 'Black';
  private readonly vaultTarget = 'Vault';

  ngOnInit(): void {
    this.runSequence();
  }

  private async runSequence(): Promise<void> {
    const next = this.route.snapshot.queryParamMap.get('next') ?? '/home';

    // 1) Blink cursor twice before typing starts
    await this.blinkCursor(2);

    // 2) Type "Black"
    await this.typeInto(this.blackTarget, this.blackText, 90);

    // 3) Brief pause between words
    await this.sleep(150);

    // 4) Type "Vault"
    await this.typeInto(this.vaultTarget, this.vaultText, 90);

    // 5) Mark typing done — resting glow kicks in
    this.typingComplete.set(true);
    console.log('[BlackVault] typing complete');

    // 6) Hold so the full word lands
    await this.sleep(600);

    // 7) Hide cursor
    this.showCursor.set(false);
    await this.sleep(100);

    // 8) Fire flare — give it FULL time to animate before moving on
    this.flareActive.set(true);
    console.log('[BlackVault] flare active');
    await this.sleep(1000); // flare animation is 700ms + stagger, give extra headroom

    // 9) Fire bloom — give it FULL time before routing
    this.bloomActive.set(true);
    console.log('[BlackVault] bloom active');
    await this.sleep(900); // bloom animation is 500ms, route fires while it's still visible

    // 10) Mark played and route
    console.log('[BlackVault] navigating to', next);
    this.introState.hasPlayedIntro = true;
    this.router.navigateByUrl(next);
  }

  private async typeInto(
    target: string,
    sig: ReturnType<typeof signal<string>>,
    msPerChar: number
  ): Promise<void> {
    for (let i = 1; i <= target.length; i++) {
      sig.set(target.slice(0, i));
      await this.sleep(msPerChar);
    }
  }

  private async blinkCursor(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      this.showCursor.set(false);
      await this.sleep(350);
      this.showCursor.set(true);
      await this.sleep(350);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}