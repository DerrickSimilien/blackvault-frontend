import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { NotificationService } from '../../core/notification.service';
import { NotificationsComponent } from '../../shared/notifications/notifications.component';
import { ScanReport } from '../results/results';

interface ScanMode {
  id: string;
  icon: string;
  title: string;
  description: string;
  tag: string;
  gradient: string;
}

interface ChartPoint {
  x: number;
  y: number;
  score: number;
  label: string;
  riskLevel: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, NotificationsComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private scanService = inject(ScanService);
  notifService = inject(NotificationService);

  currentUser = this.auth.currentUser;
  recentScans = signal<ScanReport[]>([]);
  isLoadingScans = signal(true);

  readonly chartW = 680;
  readonly chartH = 180;
  readonly padX = 40;
  readonly padY = 24;
  readonly yLabels = [0, 25, 50, 75, 100];

  hoveredPoint = signal<ChartPoint | null>(null);

  displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'there';
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      return parts[0];
    }
    return user.email?.split('@')[0] ?? 'there';
  });

  chartPoints = computed<ChartPoint[]>(() => {
    const scans = [...this.recentScans()]
      .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())
      .slice(-10);

    if (scans.length === 0) return [];

    const innerW = this.chartW - this.padX * 2;
    const innerH = this.chartH - this.padY * 2;

    return scans.map((scan, i) => {
      const x = scans.length === 1
        ? this.padX + innerW / 2
        : this.padX + (i / (scans.length - 1)) * innerW;
      const y = this.padY + innerH - (scan.riskScore / 100) * innerH;
      return {
        x, y,
        score: scan.riskScore,
        label: new Date(scan.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        riskLevel: scan.riskLevel,
      };
    });
  });

  linePoints = computed(() =>
    this.chartPoints().map(p => `${p.x},${p.y}`).join(' ')
  );

  fillPath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const bottom = this.chartH - this.padY;
    return `M${first.x},${bottom} ` +
      pts.map(p => `L${p.x},${p.y}`).join(' ') +
      ` L${last.x},${bottom} Z`;
  });

  avgScore = computed(() => {
    const scans = this.recentScans();
    if (scans.length === 0) return 0;
    return Math.round(scans.reduce((s, r) => s + r.riskScore, 0) / scans.length);
  });

  highestScore = computed(() =>
    this.recentScans().reduce((max, r) => r.riskScore > max ? r.riskScore : max, 0)
  );

  getYPosition(value: number): number {
    const innerH = this.chartH - this.padY * 2;
    return this.padY + innerH - (value / 100) * innerH;
  }

  scanModes: ScanMode[] = [
    {
      id: 'document',
      icon: '📄',
      title: 'Document Scan',
      description: 'Detect exposed secrets, PII leaks, and prompt injections in PDFs, DOCX, TXT, and config files.',
      tag: 'General',
      gradient: 'linear-gradient(135deg, #7cf7ff22, #7cf7ff08)',
    },
    {
      id: 'resume',
      icon: '👤',
      title: 'Resume Scan',
      description: 'Identify over-exposed personal data, contact info, and sensitive career history in resumes.',
      tag: 'Privacy',
      gradient: 'linear-gradient(135deg, #b38bff22, #b38bff08)',
    },
    {
      id: 'code',
      icon: '💻',
      title: 'Code Scan',
      description: 'Surface hardcoded credentials, API keys, insecure patterns, and prompt injection risks in source code.',
      tag: 'Security',
      gradient: 'linear-gradient(135deg, #ff5bd622, #ff5bd608)',
    },
    {
      id: 'contract',
      icon: '📋',
      title: 'Contract Scan',
      description: 'Analyze legal documents for risky clauses, missing protections, and flagged legal language.',
      tag: 'Legal',
      gradient: 'linear-gradient(135deg, #ffd36a22, #ffd36a08)',
    },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const scans = await this.scanService.getUserScans();
      this.recentScans.set(scans.slice(0, 10));
    } catch (err) {
      console.error('Failed to load recent scans:', err);
    } finally {
      this.isLoadingScans.set(false);
    }
    await this.notifService.load();
  }

  onScanModeClick(mode: ScanMode): void {
    this.router.navigate(['/scan', mode.id]);
  }

  getRiskColor(level: string): string {
    const map: Record<string, string> = {
      critical: '#ff3b3b', high: '#ff8c00',
      medium: '#ffd36a', low: '#7cf7ff', clean: '#00e887',
    };
    return map[level] ?? '#7cf7ff';
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