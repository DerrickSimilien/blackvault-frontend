import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private auth = inject(AuthService);

  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);

  isLoading = this.auth.isLoading;
  errorMessage = this.auth.errorMessage;

  async onSignup(): Promise<void> {
    if (this.password() !== this.confirmPassword()) {
      this.auth.errorMessage.set('Passwords do not match.');
      return;
    }
    await this.auth.signupWithEmail(this.email(), this.password());
  }

  async onGoogle(): Promise<void> {
    await this.auth.loginWithGoogle();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}