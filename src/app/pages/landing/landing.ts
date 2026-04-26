import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { NotificationsComponent } from '../../shared/notifications/notifications.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, NotificationsComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  notifService = inject(NotificationService);

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

  async ngOnInit(): Promise<void> {
    if (this.currentUser()) {
      await this.notifService.load();
    }
  }

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