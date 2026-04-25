import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ScanService } from '../../../core/scan.service';
import { NotificationService } from '../../../core/notification.service';
import { NotificationsComponent } from '../../../shared/notifications/notifications.component';

type ScanState = 'idle' | 'selected' | 'scanning' | 'error';

@Component({
  selector: 'app-document-scan',
  standalone: true,
  imports: [RouterLink, NotificationsComponent],
  templateUrl: './document-scan.html',
  styleUrl: './document-scan.scss',
})
export class DocumentScan implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private scanService = inject(ScanService);
  notifService = inject(NotificationService);

  currentUser = this.auth.currentUser;
  scanState = signal<ScanState>('idle');
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  errorMessage = signal('');
  scanProgress = signal(0);

  readonly acceptedExtensions = [
    '.pdf', '.docx', '.txt', '.json',
    '.yaml', '.yml', '.env', '.js', '.ts', '.py'
  ];

  readonly supportedFormats = [
    'PDF', 'DOCX', 'TXT', 'JSON',
    'YAML', '.ENV', 'JS / TS', 'PY'
  ];

  async ngOnInit(): Promise<void> {
    await this.notifService.load();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  handleFile(file: File): void {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.acceptedExtensions.includes(ext)) {
      this.errorMessage.set(
        `Unsupported file type: ${ext}. Please upload a supported format.`
      );
      this.scanState.set('error');
      return;
    }
    this.errorMessage.set('');
    this.selectedFile.set(file);
    this.scanState.set('selected');
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.scanState.set('idle');
    this.errorMessage.set('');
    this.scanProgress.set(0);
  }

  async startScan(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.scanState.set('scanning');
    this.scanProgress.set(0);

    try {
      const progressInterval = setInterval(() => {
        const current = this.scanProgress();
        if (current < 90) this.scanProgress.set(current + 10);
      }, 400);

      const scanId = await this.scanService.scanFile(file, 'document');

      clearInterval(progressInterval);
      this.scanProgress.set(100);

      await this.notifService.load();
      await this.sleep(300);
      this.router.navigate(['/results', scanId]);
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Scan failed. Please try again.'
      );
      this.scanState.set('error');
      this.scanProgress.set(0);
    }
  }

  getFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: '📄', docx: '📝', txt: '📃',
      json: '🔧', yaml: '🔧', yml: '🔧',
      env: '🔐', js: '💻', ts: '💻', py: '🐍',
    };
    return map[ext ?? ''] ?? '📄';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}