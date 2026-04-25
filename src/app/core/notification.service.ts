import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  type: 'scan_complete' | 'reanalyze_complete' | 'scan_deleted';
  title: string;
  message: string;
  scanId?: string;
  riskLevel?: string;
  riskScore?: number;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = 'http://localhost:3000/api';
  private auth = inject(AuthService);

  notifications = signal<Notification[]>([]);
  isOpen = signal(false);

  unreadCount = () => this.notifications().filter(n => !n.read).length;

  async load(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) return;

    try {
      const res = await fetch(`${this.apiUrl}/scan/notifications/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      this.notifications.set(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  async markRead(notificationId: string): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) return;

    try {
      await fetch(
        `${this.apiUrl}/scan/notifications/${userId}/${notificationId}/read`,
        { method: 'PATCH' }
      );
      this.notifications.update(ns =>
        ns.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }

  async markAllRead(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) return;

    try {
      await fetch(
        `${this.apiUrl}/scan/notifications/${userId}/read-all`,
        { method: 'PATCH' }
      );
      this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  async clearAll(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) return;

    try {
      await fetch(
        `${this.apiUrl}/scan/notifications/${userId}`,
        { method: 'DELETE' }
      );
      this.notifications.set([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }

  toggle(): void {
    this.isOpen.set(!this.isOpen());
  }

  close(): void {
    this.isOpen.set(false);
  }

  getRiskColor(level?: string): string {
    const map: Record<string, string> = {
      critical: '#ff3b3b', high: '#ff8c00',
      medium: '#ffd36a', low: '#7cf7ff', clean: '#00e887',
    };
    return map[level ?? ''] ?? '#7cf7ff';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      scan_complete: '📄',
      reanalyze_complete: '🤖',
      scan_deleted: '🗑',
    };
    return map[type] ?? '🔔';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}