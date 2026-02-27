import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // temporary timer (will replace this with the real typing completion)
    setTimeout(() => {
      this.router.navigateByUrl('/home');
    }, 2500);
  }
}