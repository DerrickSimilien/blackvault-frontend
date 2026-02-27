import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro implements OnInit {
  typedBlack = '';
  typedVault = '';

  isBlinking = true;
  flareActive = false;

  private readonly BLACK = 'Black';
  private readonly VAULT = 'VAULT';

  // Timing knobs (easy to tweak later)
  private readonly BLINK_TOTAL_MS = 900; // roughly 2 blinks
  private readonly TYPE_SPEED_MS = 90;
  private readonly PAUSE_BETWEEN_WORDS_MS = 180;
  private readonly HOLD_AFTER_TYPING_MS = 1000;
  private readonly FLARE_DURATION_MS = 600;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.runIntroSequence();
  }

  private async runIntroSequence(): Promise<void> {
    // 1) Cursor blinks twice (we keep blinking class on initially)
    await this.sleep(this.BLINK_TOTAL_MS);
    this.isBlinking = false;

    // 2) Type "Black"
    await this.typeWord(this.BLACK, (val) => (this.typedBlack = val));

    // 3) Small pause
    await this.sleep(this.PAUSE_BETWEEN_WORDS_MS);

    // 4) Type "VAULT"
    await this.typeWord(this.VAULT, (val) => (this.typedVault = val));

    // 5) Hold (you asked: after typing finished, literally a second later...)
    await this.sleep(this.HOLD_AFTER_TYPING_MS);

    // 6) Flare transition
    this.flareActive = true;
    await this.sleep(this.FLARE_DURATION_MS);

    // 7) Navigate to landing
    this.router.navigateByUrl('/home');
  }

  private async typeWord(word: string, setValue: (val: string) => void): Promise<void> {
    let current = '';
    for (const ch of word) {
      current += ch;
      setValue(current);
      await this.sleep(this.TYPE_SPEED_MS);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}