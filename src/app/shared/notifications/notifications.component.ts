import { Component, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private elRef = inject(ElementRef);

  async ngOnInit(): Promise<void> {
    await this.notifService.load();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.notifService.close();
    }
  }

  async onMarkAllRead(): Promise<void> {
    await this.notifService.markAllRead();
  }

  async onClearAll(): Promise<void> {
    await this.notifService.clearAll();
  }

  async onNotificationClick(id: string): Promise<void> {
    await this.notifService.markRead(id);
  }
}