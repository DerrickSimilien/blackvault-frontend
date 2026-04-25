import { Component, inject, signal, computed, OnInit, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { ToastService } from '../../core/toast.service';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import html2canvas from 'html2canvas';

export type FindingSource = 'rule' | 'ai';

export interface Finding {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  source: FindingSource;
}

export interface ScoreBreakdown {
  ruleScore: number;
  aiScore: number;
  criticalOverride: boolean;
  finalScore: number;
}

export interface ScanReport {
  scanId: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  scannedAt: Date;
  scanDuration: string;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'clean';
  findings: Finding[];
  summary: string;
  aiSummary?: string;
  scoreBreakdown?: ScoreBreakdown;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scanService = inject(ScanService);
  private toast = inject(ToastService);
  private elRef = inject(ElementRef);

  currentUser = this.auth.currentUser;
  activeTab = signal<'findings' | 'recommendations' | 'metadata'>('findings');
  isLoading = signal(true);
  loadError = signal('');
  exportMenuOpen = signal(false);
  isReanalyzing = signal(false);

  // Ring animation
  readonly ringRadius = 54;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;
  animatedOffset = signal(2 * Math.PI * 54);
  animatedScore = signal(0);

  private cameFromMyScans = false;

  report = signal<ScanReport | null>(null);

  criticalCount = computed(() =>
    this.report()?.findings.filter(f => f.severity === 'critical').length ?? 0
  );
  highCount = computed(() =>
    this.report()?.findings.filter(f => f.severity === 'high').length ?? 0
  );
  mediumCount = computed(() =>
    this.report()?.findings.filter(f => f.severity === 'medium').length ?? 0
  );
  lowCount = computed(() =>
    this.report()?.findings.filter(f => f.severity === 'low').length ?? 0
  );

  ruleFindings = computed(() =>
    this.report()?.findings.filter(f => f.source === 'rule') ?? []
  );

  aiFindings = computed(() =>
    this.report()?.findings.filter(f => f.source === 'ai') ?? []
  );

  sortedFindings = computed(() =>
    [...(this.report()?.findings ?? [])].sort(
      (a, b) => this.getSeverityOrder(a.severity) - this.getSeverityOrder(b.severity)
    )
  );

  async ngOnInit(): Promise<void> {
    const nav = this.router.getCurrentNavigation();
    const referrer = nav?.previousNavigation?.finalUrl?.toString() ?? '';
    this.cameFromMyScans = referrer.includes('my-scans');

    const scanId = this.route.snapshot.paramMap.get('scanId');
    if (!scanId) {
      this.loadError.set('No scan ID provided.');
      this.isLoading.set(false);
      return;
    }

    try {
      const report = await this.scanService.getReport(scanId);
      this.report.set(report);
    } catch (err) {
      this.loadError.set(
        err instanceof Error ? err.message : 'Failed to load scan report.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    const interval = setInterval(() => {
      const r = this.report();
      if (r) {
        clearInterval(interval);
        this.animateRing(r.riskScore);
      }
    }, 50);
  }

  private animateRing(targetScore: number): void {
    const duration = 1200;
    const startTime = performance.now();
    const circumference = this.ringCircumference;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedScore.set(Math.round(eased * targetScore));
      const filled = (targetScore / 100) * circumference;
      this.animatedOffset.set(circumference - eased * filled);

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  async reanalyze(): Promise<void> {
    const report = this.report();
    if (!report || this.isReanalyzing()) return;

    this.isReanalyzing.set(true);
    try {
      const updated = await this.scanService.reanalyzeScan(report.scanId);
      this.report.set(updated);
      this.animatedOffset.set(this.ringCircumference);
      this.animatedScore.set(0);
      setTimeout(() => this.animateRing(updated.riskScore), 100);
      this.toast.success('AI re-analysis complete.');
    } catch (err) {
      console.error('Re-analyze error:', err);
      this.toast.error('Failed to re-analyze. Please try again.');
    } finally {
      this.isReanalyzing.set(false);
    }
  }

  rescan(): void {
    const report = this.report();
    if (!report) return;
    const ext = report.fileName.split('.').pop()?.toLowerCase() ?? '';
    const modeMap: Record<string, string> = {
      pdf: 'document', docx: 'document', txt: 'document',
      json: 'code', js: 'code', ts: 'code',
      py: 'code', yaml: 'code', yml: 'code', env: 'code',
    };
    const mode = modeMap[ext] ?? 'document';
    this.router.navigate(['/scan', mode]);
  }

  goBack(): void {
    if (this.cameFromMyScans || window.history.length > 1) {
      this.router.navigate(['/my-scans']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elRef.nativeElement.querySelector('.export-wrapper')?.contains(target)) {
      this.exportMenuOpen.set(false);
    }
  }

  toggleExportMenu(): void {
    this.exportMenuOpen.set(!this.exportMenuOpen());
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

  getSourceLabel(source: FindingSource): string {
    return source === 'ai' ? 'AI' : 'Rule';
  }

  getSourceColor(source: FindingSource): string {
    return source === 'ai' ? '#b38bff' : '#7cf7ff';
  }

  getSourceBg(source: FindingSource): string {
    return source === 'ai'
      ? 'rgba(179,139,255,0.12)'
      : 'rgba(124,247,255,0.12)';
  }

  setTab(tab: 'findings' | 'recommendations' | 'metadata'): void {
    this.activeTab.set(tab);
  }

  exportAsTxt(): void {
    const report = this.report();
    if (!report) return;
    this.exportMenuOpen.set(false);

    const content = [
      'BLACKVAULT SECURITY REPORT',
      '===========================',
      `File: ${report.fileName}`,
      `Scanned: ${report.scannedAt.toLocaleString()}`,
      `Risk Score: ${report.riskScore}/100`,
      `Risk Level: ${report.riskLevel.toUpperCase()}`,
      '',
      ...(report.aiSummary ? [
        'AI EXECUTIVE SUMMARY',
        '----------------------------',
        report.aiSummary,
        '',
      ] : []),
      ...(report.scoreBreakdown ? [
        'SCORE BREAKDOWN',
        '----------------------------',
        `Rule-Based Score: ${report.scoreBreakdown.ruleScore}/100`,
        `AI Score: ${report.scoreBreakdown.aiScore}/100`,
        `Critical Override: ${report.scoreBreakdown.criticalOverride ? 'Yes' : 'No'}`,
        `Final Score: ${report.scoreBreakdown.finalScore}/100`,
        '',
      ] : []),
      `FINDINGS (${report.findings.length})`,
      '----------------------------',
      ...report.findings.map(f =>
        `[${f.severity.toUpperCase()}] [${f.source === 'ai' ? 'AI' : 'RULE'}] ${f.title}\n  ${f.description}\n  Location: ${f.location}\n  Recommendation: ${f.recommendation}`
      ),
      '',
      'Generated by BlackVault AI Security Scanner',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackvault-report-${report.scanId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportAsPdf(): void {
    const report = this.report();
    if (!report) return;
    this.exportMenuOpen.set(false);

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    const line = (text: string, size = 11, bold = false, color: [number, number, number] = [255, 255, 255]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, pageW - 40);
      doc.text(lines, 20, y);
      y += lines.length * (size * 0.45) + 4;
      if (y > 270) { doc.addPage(); y = 20; }
    };

    doc.setFillColor(5, 5, 7);
    doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

    line('BLACKVAULT SECURITY REPORT', 18, true, [124, 247, 255]);
    y += 4;
    line(`File: ${report.fileName}`, 10, false, [200, 200, 200]);
    line(`Scanned: ${report.scannedAt.toLocaleString()}`, 10, false, [200, 200, 200]);
    line(`Risk Score: ${report.riskScore}/100  |  Risk Level: ${report.riskLevel.toUpperCase()}`, 10, true, [255, 211, 106]);
    y += 6;

    if (report.aiSummary) {
      line('AI Executive Summary', 12, true, [179, 139, 255]);
      line(report.aiSummary, 10, false, [200, 200, 200]);
      y += 4;
    }

    if (report.scoreBreakdown) {
      line('Score Breakdown', 12, true, [124, 247, 255]);
      line(
        `Rule-Based: ${report.scoreBreakdown.ruleScore}/100  |  AI: ${report.scoreBreakdown.aiScore}/100  |  Final: ${report.scoreBreakdown.finalScore}/100`,
        10, false, [200, 200, 200]
      );
      if (report.scoreBreakdown.criticalOverride) {
        line('! Critical override applied', 9, false, [255, 59, 59]);
      }
      y += 4;
    }

    line(`FINDINGS (${report.findings.length})`, 13, true, [124, 247, 255]);
    y += 2;

    for (const f of this.sortedFindings()) {
      const severityColors: Record<string, [number, number, number]> = {
        critical: [255, 59, 59], high: [255, 140, 0],
        medium: [255, 211, 106], low: [124, 247, 255],
      };
      const color = severityColors[f.severity] ?? [255, 255, 255];
      line(`[${f.severity.toUpperCase()}] [${f.source === 'ai' ? 'AI' : 'RULE'}] ${f.title}`, 11, true, color);
      line(f.description, 10, false, [180, 180, 180]);
      line(`Location: ${f.location}`, 9, false, [140, 140, 140]);
      line(`Recommendation: ${f.recommendation}`, 9, false, [140, 140, 140]);
      y += 4;
    }

    y += 6;
    line('Generated by BlackVault AI Security Scanner', 9, false, [100, 100, 100]);
    doc.save(`blackvault-report-${report.scanId.slice(0, 8)}.pdf`);
  }

  async exportAsDocx(): Promise<void> {
    const report = this.report();
    if (!report) return;
    this.exportMenuOpen.set(false);

    const children = [
      new Paragraph({ text: 'BLACKVAULT SECURITY REPORT', heading: HeadingLevel.TITLE }),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: 'File: ', bold: true }), new TextRun(report.fileName)] }),
      new Paragraph({ children: [new TextRun({ text: 'Scanned: ', bold: true }), new TextRun(report.scannedAt.toLocaleString())] }),
      new Paragraph({ children: [new TextRun({ text: 'Risk Score: ', bold: true }), new TextRun(`${report.riskScore}/100`)] }),
      new Paragraph({ children: [new TextRun({ text: 'Risk Level: ', bold: true }), new TextRun(report.riskLevel.toUpperCase())] }),
      new Paragraph({ text: '' }),
      ...(report.aiSummary ? [
        new Paragraph({ text: 'AI Executive Summary', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: report.aiSummary }),
        new Paragraph({ text: '' }),
      ] : []),
      ...(report.scoreBreakdown ? [
        new Paragraph({ text: 'Score Breakdown', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: 'Rule-Based Score: ', bold: true }), new TextRun(`${report.scoreBreakdown.ruleScore}/100`)] }),
        new Paragraph({ children: [new TextRun({ text: 'AI Score: ', bold: true }), new TextRun(`${report.scoreBreakdown.aiScore}/100`)] }),
        new Paragraph({ children: [new TextRun({ text: 'Final Score: ', bold: true }), new TextRun(`${report.scoreBreakdown.finalScore}/100`)] }),
        new Paragraph({ text: '' }),
      ] : []),
      new Paragraph({ text: `Findings (${report.findings.length})`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' }),
      ...this.sortedFindings().flatMap(f => [
        new Paragraph({ children: [new TextRun({ text: `[${f.severity.toUpperCase()}] [${f.source === 'ai' ? 'AI' : 'RULE'}] ${f.title}`, bold: true })] }),
        new Paragraph({ text: f.description }),
        new Paragraph({ children: [new TextRun({ text: 'Location: ', bold: true }), new TextRun(f.location)] }),
        new Paragraph({ children: [new TextRun({ text: 'Recommendation: ', bold: true }), new TextRun(f.recommendation)] }),
        new Paragraph({ text: '' }),
      ]),
      new Paragraph({ text: 'Generated by BlackVault AI Security Scanner' }),
    ];

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackvault-report-${report.scanId.slice(0, 8)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportAsImage(): Promise<void> {
    const report = this.report();
    if (!report) return;
    this.exportMenuOpen.set(false);

    const el = this.elRef.nativeElement.querySelector('.main') as HTMLElement;
    if (!el) return;

    const canvas = await html2canvas(el, {
      backgroundColor: '#050507',
      scale: 2,
      useCORS: true,
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackvault-report-${report.scanId.slice(0, 8)}.png`;
    a.click();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}