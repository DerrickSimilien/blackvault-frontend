import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { ToastService } from '../../core/toast.service';
import { ScanReport } from '../results/results';

@Component({
  selector: 'app-my-scans',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './my-scans.html',
  styleUrl: './my-scans.scss',
})
export class MyScans implements OnInit {
  private auth = inject(AuthService);
  private scanService = inject(ScanService);
  private toast = inject(ToastService);

  currentUser = this.auth.currentUser;
  isLoading = signal(true);
  scans = signal<ScanReport[]>([]);
  deletingId = signal<string | null>(null);

  readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  async ngOnInit(): Promise<void> {
    try {
      const scans = await this.scanService.getUserScans();
      this.scans.set(scans);
    } catch (err) {
      console.error('Failed to load scans:', err);
      this.toast.error('Failed to load scans. Please refresh.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteScan(event: MouseEvent, scanId: string): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (this.deletingId()) return;

    this.deletingId.set(scanId);
    try {
      await this.scanService.deleteScan(scanId);
      this.scans.update(scans => scans.filter(s => s.scanId !== scanId));
      this.toast.success('Scan deleted successfully.');
    } catch (err) {
      console.error('Failed to delete scan:', err);
      this.toast.error('Failed to delete scan. Please try again.');
    } finally {
      this.deletingId.set(null);
    }
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

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}