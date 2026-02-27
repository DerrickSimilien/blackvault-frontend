import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro {
  blackText = signal('');
  vaultText = signal('');

  showCursor = signal(true);

  private readonly blackTarget = 'Black';
  private readonly vaultTarget = 'VAULT';

  constructor(private router: Router) {}

  ngOnInit() {
    this.runSequence();
  }

  private async runSequence() {
    // 1) Blink twice (cursor only)
    await this.blinkCursor(2);

    // 2) Type "Black"
    await this.typeInto(this.blackTarget, this.blackText, 90);

    // tiny pause
    await this.sleep(150);

    // 3) Type "VAULT"
    await this.typeInto(this.vaultTarget, this.vaultText, 90);

    // 4) Shine moment (optional pause before redirect)
    await this.sleep(800);

    // 5) Navigate
    this.router.navigateByUrl('/home');
  }

  private async typeInto(target: string, setter: ReturnType<typeof signal<string>>, msPerChar: number) {
    for (let i = 1; i <= target.length; i++) {
      setter.set(target.slice(0, i));
      await this.sleep(msPerChar);
    }
  }

  private async blinkCursor(times: number) {
    // one blink cycle = off+on
    for (let i = 0; i < times; i++) {
      this.showCursor.set(true);
      await this.sleep(350);
      this.showCursor.set(false);
      await this.sleep(350);
    }
    this.showCursor.set(true);
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}