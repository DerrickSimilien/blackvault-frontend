import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { ScanReport } from '../results/results';

interface ScanMode {
  id: string;
  icon: string;
  title: string;
  description: string;
  tag: string;
  gradient: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private scanService = inject(ScanService);

  currentUser = this.auth.currentUser;
  recentScans = signal<ScanReport[]>([]);
  isLoadingScans = signal(true);

  displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'there';
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      return parts[0];
    }
    return user.email?.split('@')[0] ?? 'there';
  });

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
      this.recentScans.set(scans.slice(0, 5));
    } catch (err) {
      console.error('Failed to load recent scans:', err);
    } finally {
      this.isLoadingScans.set(false);
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

  onScanModeClick(mode: ScanMode): void {
    this.router.navigate(['/scan', mode.id]);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}