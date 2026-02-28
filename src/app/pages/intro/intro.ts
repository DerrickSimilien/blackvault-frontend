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

    // 5) Mark typing done — triggers shine/glow state in template
    this.typingComplete.set(true);

    // 6) Hold so user can appreciate it
    await this.sleep(900);

    // 7) Mark intro as played so the guard won't redirect again
    this.introState.hasPlayedIntro = true;

    // 8) Navigate
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