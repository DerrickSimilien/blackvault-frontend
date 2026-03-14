import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

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
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  showToast = signal(false);
  toastMessage = signal('');

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

  onScanModeClick(mode: ScanMode): void {
    this.toastMessage.set(`${mode.title} — Coming Soon`);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}