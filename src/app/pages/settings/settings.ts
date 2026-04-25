import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { updateProfile } from 'firebase/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  currentUser = this.auth.currentUser;
  isSaving = signal(false);
  editingName = signal(false);
  newDisplayName = signal('');

  readonly accentColors = [
    { label: 'Cyan',   value: '#7cf7ff', bg: 'rgba(124,247,255,0.12)' },
    { label: 'Purple', value: '#b38bff', bg: 'rgba(179,139,255,0.12)' },
    { label: 'Pink',   value: '#ff5bd6', bg: 'rgba(255,91,214,0.12)'  },
    { label: 'Gold',   value: '#ffd36a', bg: 'rgba(255,211,106,0.12)' },
    { label: 'Green',  value: '#00e887', bg: 'rgba(0,232,135,0.12)'   },
    { label: 'Red',    value: '#ff3b3b', bg: 'rgba(255,59,59,0.12)'   },
  ];

  selectedAccent = signal('#7cf7ff');

  displayName = computed(() => {
    const user = this.currentUser();
    return user?.displayName ?? '';
  });

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
    if (!name) {
      this.toast.error('Display name cannot be empty.');
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    try {
      await updateProfile(user, { displayName: name });
      this.editingName.set(false);
      this.toast.success('Display name updated successfully.');
    } catch (err) {
      console.error('Failed to update name:', err);
      this.toast.error('Failed to update display name.');
    } finally {
      this.isSaving.set(false);
    }
  }

  selectAccent(color: string): void {
    this.selectedAccent.set(color);
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('bv-accent', color);
    this.toast.success('Accent color updated.');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newDisplayName.set(input.value);
  }
}