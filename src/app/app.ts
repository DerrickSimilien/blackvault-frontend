import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { PhantomComponent } from './shared/phantom/phantom.component';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, PhantomComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private themeService = inject(ThemeService);

  ngOnInit(): void {
    // Restore persisted theme before first render
    this.themeService.init();
  }
}