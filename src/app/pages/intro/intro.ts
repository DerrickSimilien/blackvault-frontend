import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro {
  constructor(private router: Router) {
    setTimeout(() => {
      this.router.navigateByUrl('/home'); // or '/' depending on what you chose above
    }, 2500);
  }
}