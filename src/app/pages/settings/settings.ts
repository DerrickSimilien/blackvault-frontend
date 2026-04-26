import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { NotificationService } from '../../core/notification.service';
import { NotificationsComponent } from '../../shared/notifications/notifications.component';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from 'firebase/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink, NotificationsComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  notifService = inject(NotificationService);

  currentUser = this.auth.currentUser;
  isSaving = signal(false);
  editingName = signal(false);
  newDisplayName = signal('');

  // Password change state
  showPasswordSection = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  isChangingPassword = signal(false);
  showCurrentPw = signal(false);
  showNewPw = signal(false);
  showConfirmPw = signal(false);

  // Whether this is a Google-only account
  isGoogleOnlyAccount = signal(false);
  hasPasswordProvider = signal(false);

  readonly accentColors = [
    { label: 'Cyan',   value: '#7cf7ff', bg: 'rgba(124,247,255,0.12)' },
    { label: 'Purple', value: '#b38bff', bg: 'rgba(179,139,255,0.12)' },
    { label: 'Pink',   value: '#ff5bd6', bg: 'rgba(255,91,214,0.12)'  },
    { label: 'Gold',   value: '#ffd36a', bg: 'rgba(255,211,106,0.12)' },
    { label: 'Green',  value: '#00e887', bg: 'rgba(0,232,135,0.12)'   },
    { label: 'Red',    value: '#ff3b3b', bg: 'rgba(255,59,59,0.12)'   },
  ];

  selectedAccent = signal('#7cf7ff');

  displayName = computed(() => this.currentUser()?.displayName ?? '');

  avatarLetter = computed(() => {
    const user = this.currentUser();
    return (user?.displayName?.charAt(0) ?? user?.email?.charAt(0) ?? '?').toUpperCase();
  });

  memberSince = computed(() => {
    const user = this.currentUser();
    if (!user?.metadata?.creationTime) return 'Unknown';
    return new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  });

  passwordStrength = computed(() => {
    const pw = this.newPassword();
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Too short', color: '#ff3b3b', width: 20 };
    if (pw.length < 8) return { label: 'Weak', color: '#ff8c00', width: 40 };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score === 0) return { label: 'Fair', color: '#ffd36a', width: 55 };
    if (score === 1) return { label: 'Good', color: '#7cf7ff', width: 70 };
    if (score === 2) return { label: 'Strong', color: '#00e887', width: 85 };
    return { label: 'Very Strong', color: '#00e887', width: 100 };
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      const providers = user.providerData.map(p => p.providerId);
      const hasGoogle = providers.includes('google.com');
      const hasPassword = providers.includes('password');
      this.hasPasswordProvider.set(hasPassword);
      this.isGoogleOnlyAccount.set(hasGoogle && !hasPassword);
    }
    this.notifService.load();
  }

  // ── NAME ─────────────────────────────────────────────────
  startEditingName(): void {
    this.newDisplayName.set(this.displayName());
    this.editingName.set(true);
  }

  cancelEditingName(): void {
    this.editingName.set(false);
    this.newDisplayName.set('');
  }

  async saveName(): Promise<void> {
    const name = this.newDisplayName().trim();
    if (!name) { this.toast.error('Display name cannot be empty.'); return; }
    const user = this.currentUser();
    if (!user) return;
    this.isSaving.set(true);
    try {
      await updateProfile(user, { displayName: name });
      this.editingName.set(false);
      this.toast.success('Display name updated successfully.');
    } catch (err) {
      this.toast.error('Failed to update display name.');
    } finally {
      this.isSaving.set(false);
    }
  }

  onNameInput(event: Event): void {
    this.newDisplayName.set((event.target as HTMLInputElement).value);
  }

  // ── PASSWORD ──────────────────────────────────────────────
  togglePasswordSection(): void {
    this.showPasswordSection.update(v => !v);
    this.resetPasswordFields();
  }

  resetPasswordFields(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showCurrentPw.set(false);
    this.showNewPw.set(false);
    this.showConfirmPw.set(false);
  }

  onCurrentPwInput(event: Event): void {
    this.currentPassword.set((event.target as HTMLInputElement).value);
  }

  onNewPwInput(event: Event): void {
    this.newPassword.set((event.target as HTMLInputElement).value);
  }

  onConfirmPwInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
  }

  async changePassword(): Promise<void> {
    const user = this.currentUser();
    if (!user || !user.email) return;

    const newPw = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (newPw.length < 6) {
      this.toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirm) {
      this.toast.error('New passwords do not match.');
      return;
    }

    this.isChangingPassword.set(true);

    try {
      if (this.isGoogleOnlyAccount()) {
        // Google-only account — link password credential via Google re-auth popup
        const googleProvider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, googleProvider);
        const credential = EmailAuthProvider.credential(user.email, newPw);
        await linkWithCredential(user, credential);
        this.hasPasswordProvider.set(true);
        this.isGoogleOnlyAccount.set(false);
        this.toast.success('Password set! You can now sign in with email + password too.');
      } else {
        // Email+password account — re-auth with current password then update
        const current = this.currentPassword().trim();
        if (!current) {
          this.toast.error('Please enter your current password.');
          this.isChangingPassword.set(false);
          return;
        }
        if (current === newPw) {
          this.toast.error('New password must be different from your current password.');
          this.isChangingPassword.set(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPw);
        this.toast.success('Password changed successfully!');
      }

      this.showPasswordSection.set(false);
      this.resetPasswordFields();
    } catch (err: any) {
      console.error('Password error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        this.toast.error('Current password is incorrect.');
      } else if (err.code === 'auth/weak-password') {
        this.toast.error('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/requires-recent-login') {
        this.toast.error('Session expired. Please sign out and sign in again.');
      } else if (err.code === 'auth/provider-already-linked') {
        this.toast.error('A password is already linked to this account.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        this.toast.error('Google sign-in was cancelled.');
      } else {
        this.toast.error('Failed to set password. Please try again.');
      }
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  // ── ACCENT ────────────────────────────────────────────────
  selectAccent(color: string): void {
    this.selectedAccent.set(color);
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('bv-accent', color);
    this.toast.success('Accent color updated.');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}