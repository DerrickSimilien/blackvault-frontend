import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { NotificationService } from '../../core/notification.service';
import { NotificationsComponent } from '../../shared/notifications/notifications.component';
import { ScanReport, Finding } from '../results/results';

interface MonthGroup {
  label: string;
  scans: ScanReport[];
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe, NotificationsComponent],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private scanService = inject(ScanService);
  notifService = inject(NotificationService);

  currentUser = this.auth.currentUser;
  isLoading = signal(true);
  scans = signal<ScanReport[]>([]);
  activeIndex = signal(0);

  private highlightInterval: ReturnType<typeof setInterval> | null = null;

  monthGroups = computed<MonthGroup[]>(() => {
    const all = this.scans();
    const map = new Map<string, ScanReport[]>();

    for (const scan of all) {
      const date = new Date(scan.scannedAt);
      const label = date.toLocaleDateString('en-US', {
        month: 'long', year: 'numeric'
      });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(scan);
    }

    return [...map.entries()].map(([label, scans]) => ({ label, scans }));
  });

  allScans = computed(() =>
    this.monthGroups().flatMap(g => g.scans)
  );

  async ngOnInit(): Promise<void> {
    try {
      const scans = await this.scanService.getUserScans();
      this.scans.set(scans);
      this.startHighlight();
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      this.isLoading.set(false);
    }
    await this.notifService.load();
  }

  ngOnDestroy(): void {
    this.stopHighlight();
  }

  private startHighlight(): void {
    this.highlightInterval = setInterval(() => {
      const total = this.allScans().length;
      if (total === 0) return;
      this.activeIndex.update(i => (i + 1) % total);
    }, 2500);
  }

  private stopHighlight(): void {
    if (this.highlightInterval) {
      clearInterval(this.highlightInterval);
      this.highlightInterval = null;
    }
  }

  setActive(index: number): void {
    this.activeIndex.set(index);
    this.stopHighlight();
    setTimeout(() => this.startHighlight(), 5000);
  }

  getGlobalIndex(groupIdx: number, scanIdx: number): number {
    let count = 0;
    for (let i = 0; i < groupIdx; i++) {
      count += this.monthGroups()[i].scans.length;
    }
    return count + scanIdx;
  }

  countBySeverity(findings: Finding[], severity: string): number {
    return findings.filter(f => f.severity === severity).length;
  }

  getRiskColor(level: string): string {
    const map: Record<string, string> = {
      critical: '#ff3b3b', high: '#ff8c00',
      medium: '#ffd36a', low: '#7cf7ff', clean: '#00e887',
    };
    return map[level] ?? '#fff';
  }

  getRiskBg(level: string): string {
    const map: Record<string, string> = {
      critical: 'rgba(255,59,59,0.08)', high: 'rgba(255,140,0,0.08)',
      medium: 'rgba(255,211,106,0.08)', low: 'rgba(124,247,255,0.08)',
      clean: 'rgba(0,232,135,0.08)',
    };
    return map[level] ?? 'rgba(255,255,255,0.04)';
  }

  getRiskIcon(level: string): string {
    const map: Record<string, string> = {
      critical: '🔴', high: '🟠', medium: '🟡',
      low: '🔵', clean: '✅',
    };
    return map[level] ?? '⬡';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}