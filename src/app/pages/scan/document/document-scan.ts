import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ScanService } from '../../../core/scan.service';
import { NotificationService } from '../../../core/notification.service';
import { NotificationsComponent } from '../../../shared/notifications/notifications.component';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';
import { PdfPreviewComponent } from '../../../shared/pdf-preview/pdf-preview.component';
import { SubscriptionService } from '../../../core/subscription.service';

type ScanState = 'idle' | 'selected' | 'scanning' | 'error';
type PreviewKind = 'none' | 'pdf' | 'text' | 'image' | 'unavailable';

@Component({
  selector: 'app-document-scan',
  standalone: true,
  imports: [RouterLink, NotificationsComponent, ThemeToggleComponent, PdfPreviewComponent],
  templateUrl: './document-scan.html',
  styleUrl: './document-scan.scss',
})
export class DocumentScan implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private scanService = inject(ScanService);
  private subs = inject(SubscriptionService);
  notifService = inject(NotificationService);

  currentUser = this.auth.currentUser;
  scanState = signal<ScanState>('idle');
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  errorMessage = signal('');
  scanProgress = signal(0);

  // ── PREVIEW STATE ────────────────────────────────────────
  previewKind = signal<PreviewKind>('none');
  previewImageUrl = signal<string | null>(null);
  previewText = signal('');
  zoom = signal(100);

  readonly zoomMin = 25;
  readonly zoomMax = 300;
  readonly zoomStep = 5;
  /** Height of the preview viewport at 100% (px). */
  readonly viewportHeight = 520;

  /** Text preview font size, which grows with the zoom level. */
  textSize = computed(() => (13 * this.zoom()) / 100);

  private objectUrl: string | null = null;
  private readonly textExtensions = [
    'txt', 'json', 'yaml', 'yml', 'env', 'js', 'ts', 'py',
  ];
  private readonly maxTextPreviewChars = 200_000;

  readonly acceptedExtensions = [
    '.pdf', '.docx', '.txt', '.json',
    '.yaml', '.yml', '.env', '.js', '.ts', '.py'
  ];

  readonly supportedFormats = [
    'PDF', 'DOCX', 'TXT', 'JSON',
    'YAML', '.ENV', 'JS / TS', 'PY'
  ];

  constructor() {
    // Lets the rainbow outline's angle animate smoothly. Harmless if unsupported or already registered.
    try {
      (CSS as unknown as { registerProperty(d: object): void }).registerProperty({
        name: '--doc-angle', syntax: '<angle>', inherits: false, initialValue: '0deg',
      });
    } catch { /* already registered or unsupported */ }
  }

  async ngOnInit(): Promise<void> {
    await this.notifService.load();
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  // ── FILE INTAKE ──────────────────────────────────────────
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
    input.value = ''; // allow choosing the same file again after removing it
  }

  handleFile(file: File): void {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!this.acceptedExtensions.includes(ext)) {
      this.errorMessage.set(`Unsupported file type: ${ext}. Please upload a supported format.`);
      this.scanState.set('error');
      return;
    }
    this.errorMessage.set('');
    this.selectedFile.set(file);
    this.scanState.set('selected');
    this.buildPreview(file);
  }

  clearFile(): void {
    this.releasePreview();
    this.selectedFile.set(null);
    this.scanState.set('idle');
    this.errorMessage.set('');
    this.scanProgress.set(0);
  }

  // ── PREVIEW ──────────────────────────────────────────────
  private buildPreview(file: File): void {
    this.releasePreview();
    this.zoom.set(100);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'pdf') {
      // Drawn page-by-page by <app-pdf-preview>, so the document itself zooms.
      this.previewKind.set('pdf');
      return;
    }

    if (file.type.startsWith('image/')) {
      this.objectUrl = URL.createObjectURL(file);
      this.previewImageUrl.set(this.objectUrl);
      this.previewKind.set('image');
      return;
    }

    if (this.textExtensions.includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        this.previewText.set(
          text.length > this.maxTextPreviewChars
            ? text.slice(0, this.maxTextPreviewChars) + '\n\n… preview truncated …'
            : text
        );
        this.previewKind.set('text');
      };
      reader.onerror = () => this.previewKind.set('unavailable');
      reader.readAsText(file);
      return;
    }

    // DOCX / DOC etc. can't be rendered in the browser without extra libraries.
    this.previewKind.set('unavailable');
  }

  private releasePreview(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.previewImageUrl.set(null);
    this.previewText.set('');
    this.previewKind.set('none');
    this.zoom.set(100);
  }

  // ── ZOOM ─────────────────────────────────────────────────
  onZoomInput(event: Event): void {
    this.setZoom(Number((event.target as HTMLInputElement).value));
  }

  zoomBy(delta: number): void {
    this.setZoom(this.zoom() + delta);
  }

  resetZoom(): void {
    this.zoom.set(100);
  }

  private setZoom(value: number): void {
    const clamped = Math.min(this.zoomMax, Math.max(this.zoomMin, value));
    this.zoom.set(clamped);
  }

  // ── SCAN ─────────────────────────────────────────────────
  async startScan(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    // Free users get 2 scans; after that the subscribe modal appears instead.
    if (!this.subs.canScan()) {
      void this.subs.openModal();
      return;
    }

    this.scanState.set('scanning');
    this.scanProgress.set(0);

    try {
      const progressInterval = setInterval(() => {
        const current = this.scanProgress();
        if (current < 90) this.scanProgress.set(current + 10);
      }, 400);

      let scanId: string;
      try {
        scanId = await this.scanService.scanFile(file, 'document');
      } finally {
        clearInterval(progressInterval);
      }

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

  // ── HELPERS ──────────────────────────────────────────────
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