import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);

  email = signal('');
  password = signal('');
  showPassword = signal(false);

  isLoading = this.auth.isLoading;
  errorMessage = this.auth.errorMessage;

  async onLogin(): Promise<void> {
    await this.auth.loginWithEmail(this.email(), this.password());
  }

  async onGoogle(): Promise<void> {
    await this.auth.loginWithGoogle();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}