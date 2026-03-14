import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  showDropdown = signal(false);

  displayName = computed(() => {
    const user = this.currentUser();
    if (!user || !user.displayName) return null;
    const parts = user.displayName.trim().split(' ');
    if (parts.length < 2) return user.displayName;
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${lastName}, ${firstName}`;
  });

  onScanClick(): void {
    if (this.currentUser()) {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.router.navigateByUrl('/auth/login');
    }
  }

  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
  }

  async logout(): Promise<void> {
    this.showDropdown.set(false);
    await this.auth.logout();
  }
}