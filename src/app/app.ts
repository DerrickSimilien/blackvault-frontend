import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { PhantomComponent } from './shared/phantom/phantom.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, PhantomComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}