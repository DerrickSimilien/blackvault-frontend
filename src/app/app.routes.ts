import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  blackText = signal('');
  vaultText = signal('');
  showCursor = signal(true);

  ngOnInit(): void {
    const next = this.route.snapshot.queryParamMap.get('next') ?? '/home';

    // Run typing
    this.runTyping().then(() => {
      // after typing finishes, go to next route
      this.router.navigateByUrl(next);
    });
  }

  private async runTyping(): Promise<void> {
    // Keep your existing typing logic here.
    // IMPORTANT: this must actually await delays so it types letter by letter.
  }
}