import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { ScanReport, Finding } from '../results/results';

interface DiffFinding {
  finding: Finding;
  status: 'shared' | 'only-a' | 'only-b';
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class Compare implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scanService = inject(ScanService);

  currentUser = this.auth.currentUser;
  isLoading = signal(true);
  loadError = signal('');

  scanA = signal<ScanReport | null>(null);
  scanB = signal<ScanReport | null>(null);

  // Which scan has higher risk
  winner = computed(() => {
    const a = this.scanA();
    const b = this.scanB();
    if (!a || !b) return null;
    if (a.riskScore > b.riskScore) return 'a';
    if (b.riskScore > a.riskScore) return 'b';
    return 'tie';
  });

  // Score difference
  scoreDiff = computed(() => {
    const a = this.scanA();
    const b = this.scanB();
    if (!a || !b) return 0;
    return Math.abs(a.riskScore - b.riskScore);
  });

  // Findings diff
  findingsDiff = computed<DiffFinding[]>(() => {
    const a = this.scanA();
    const b = this.scanB();
    if (!a || !b) return [];

    const aTitles = new Set(a.findings.map(f => f.title.toLowerCase()));
    const bTitles = new Set(b.findings.map(f => f.title.toLowerCase()));

    const result: DiffFinding[] = [];

    for (const f of a.findings) {
      result.push({
        finding: f,
        status: bTitles.has(f.title.toLowerCase()) ? 'shared' : 'only-a',
      });
    }

    for (const f of b.findings) {
      if (!aTitles.has(f.title.toLowerCase())) {
        result.push({ finding: f, status: 'only-b' });
      }
    }

    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return result.sort((x, y) =>
      (order[x.finding.severity] ?? 4) - (order[y.finding.severity] ?? 4)
    );
  });

  sharedCount = computed(() =>
    this.findingsDiff().filter(d => d.status === 'shared').length
  );

  onlyACount = computed(() =>
    this.findingsDiff().filter(d => d.status === 'only-a').length
  );

  onlyBCount = computed(() =>
    this.findingsDiff().filter(d => d.status === 'only-b').length
  );

  async ngOnInit(): Promise<void> {
    const idA = this.route.snapshot.queryParamMap.get('a');
    const idB = this.route.snapshot.queryParamMap.get('b');

    if (!idA || !idB) {
      this.loadError.set('Two scan IDs are required for comparison.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [a, b] = await Promise.all([
        this.scanService.getReport(idA),
        this.scanService.getReport(idB),
      ]);
      this.scanA.set(a);
      this.scanB.set(b);
    } catch (err) {
      this.loadError.set('Failed to load one or both scans.');
    } finally {
      this.isLoading.set(false);
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

  getSeverityOrder(severity: string): number {
    return { critical: 0, high: 1, medium: 2, low: 3 }[severity] ?? 4;
  }

  getSourceColor(source: string): string {
    return source === 'ai' ? '#b38bff' : '#7cf7ff';
  }

  getSourceBg(source: string): string {
    return source === 'ai'
      ? 'rgba(179,139,255,0.12)'
      : 'rgba(124,247,255,0.12)';
  }

  countBySeverity(scan: ScanReport | null, severity: string): number {
    return scan?.findings.filter(f => f.severity === severity).length ?? 0;
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}