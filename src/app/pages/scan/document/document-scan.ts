import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

type ScanState = 'idle' | 'selected' | 'scanning' | 'error';

@Component({
  selector: 'app-document-scan',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './document-scan.html',
  styleUrl: './document-scan.scss',
})
export class DocumentScan {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  scanState = signal<ScanState>('idle');
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  errorMessage = signal('');
  scanProgress = signal(0);

  readonly acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json',
    'application/x-yaml',
    'text/yaml',
    'application/javascript',
    'text/javascript',
    'text/x-python',
    'application/x-python-code',
  ];

  readonly acceptedExtensions = ['.pdf','.docx','.txt','.json','.yaml','.yml','.env','.js','.ts','.py'];

  readonly supportedFormats = ['PDF', 'DOCX', 'TXT', 'JSON', 'YAML', '.ENV', 'JS / TS', 'PY'];

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
      this.errorMessage.set(`Unsupported file type: ${ext}. Please upload a supported format.`);
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
    if (!this.selectedFile()) return;
    this.scanState.set('scanning');
    this.scanProgress.set(0);

    // Simulate progress
    const steps = [15, 35, 55, 70, 85, 95, 100];
    for (const step of steps) {
      await this.sleep(400);
      this.scanProgress.set(step);
    }

    await this.sleep(500);
    // Route to placeholder results page with a mock scan ID
    const mockScanId = crypto.randomUUID();
    this.router.navigate(['/results', mockScanId]);
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