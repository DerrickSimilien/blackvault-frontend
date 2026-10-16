import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScanService } from '../../../core/scan.service';
import { NotificationService } from '../../../core/notification.service';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

type Phase = 'idle' | 'capturing' | 'reading' | 'uploading' | 'error';
type ScanMode = Parameters<ScanService['scanFile']>[1];

/**
 * Scan by picture.
 *  - Phones/tablets: opens the camera so the user can photograph a document.
 *  - Desktops/laptops: asks the browser to share a screen/window, grabs one frame.
 * The picture is read ON THE DEVICE (OCR with tesseract.js); only the extracted
 * text is sent to the normal scan pipeline, then the user lands on the results page.
 */
@Component({
  selector: 'app-capture-scan',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './capture-scan.html',
  styleUrl: './capture-scan.scss',
})
export class CaptureScan implements OnInit, OnDestroy {
  private router = inject(Router);
  private scanService = inject(ScanService);
  private notifService = inject(NotificationService);

  readonly isMobile =
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches &&
    navigator.maxTouchPoints > 0;

  readonly canShareScreen =
    !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';

  readonly modes: { id: string; label: string; icon: string }[] = [
    { id: 'document', label: 'Document', icon: '📄' },
    { id: 'resume',   label: 'Resume',   icon: '👤' },
    { id: 'code',     label: 'Code',     icon: '💻' },
    { id: 'contract', label: 'Contract', icon: '📋' },
  ];

  mode = signal<string>('document');
  phase = signal<Phase>('idle');
  progress = signal(0);
  previewUrl = signal<string>('');
  errorMessage = signal('');

  busy = computed(() => ['capturing', 'reading', 'uploading'].includes(this.phase()));
  statusText = computed(() => {
    switch (this.phase()) {
      case 'capturing': return 'Waiting for your screen…';
      case 'reading':   return `Reading the text… ${this.progress()}%`;
      case 'uploading': return 'Analyzing for security risks…';
      default:          return '';
    }
  });

  async ngOnInit(): Promise<void> {
    try { await this.notifService.load(); } catch { /* non-critical */ }
  }

  ngOnDestroy(): void { /* nothing is kept: images stay in memory only */ }

  // ── Mobile: photo from camera (or any image the user picks) ──
  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // lets the user pick/take the same shot again
    if (!file) return;

    try {
      this.begin('reading');
      const canvas = await this.fileToCanvas(file);
      await this.readAndScan(canvas);
    } catch (err) {
      this.fail(err);
    }
  }

  // ── Desktop: grab one frame of a shared screen/window ──
  async captureScreen(): Promise<void> {
    try {
      this.begin('capturing');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise(r => setTimeout(r, 450)); // let the first real frame arrive

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());

      this.phase.set('reading');
      await this.readAndScan(this.shrink(canvas));
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
        this.phase.set('idle');
        this.errorMessage.set('Screen sharing was cancelled. Choose a window or screen to scan.');
        this.phase.set('error');
        return;
      }
      this.fail(err);
    }
  }

  // ── Shared pipeline: OCR → upload text → results ──
  private async readAndScan(canvas: HTMLCanvasElement): Promise<void> {
    this.previewUrl.set(canvas.toDataURL('image/jpeg', 0.7));
    this.progress.set(0);
    this.phase.set('reading');

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') this.progress.set(Math.round(m.progress * 100));
      },
    });
    let text = '';
    try {
      const { data } = await worker.recognize(canvas);
      text = (data.text ?? '').trim();
    } finally {
      await worker.terminate();
    }

    if (text.length < 20) {
      throw new Error(
        'We couldn’t read enough text from that picture. Try better lighting, hold steady, and fill the frame with the page.'
      );
    }

    this.phase.set('uploading');
    const mode = this.mode();
    const file = new File([text], `${mode}-capture.txt`, { type: 'text/plain' });
    const scanId = await this.scanService.scanFile(file, mode as ScanMode);
    try { await this.notifService.load(); } catch { /* non-critical */ }
    this.router.navigate(['/results', scanId]);
  }

  private begin(phase: Phase): void {
    this.errorMessage.set('');
    this.previewUrl.set('');
    this.progress.set(0);
    this.phase.set(phase);
  }

  private fail(err: unknown): void {
    this.errorMessage.set(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    this.phase.set('error');
  }

  /** Photos from phones are huge; downscale so reading stays fast. */
  private async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return this.shrink(canvas);
  }

  private shrink(src: HTMLCanvasElement, max = 2200): HTMLCanvasElement {
    const scale = Math.min(1, max / Math.max(src.width, src.height));
    if (scale === 1) return src;
    const out = document.createElement('canvas');
    out.width = Math.round(src.width * scale);
    out.height = Math.round(src.height * scale);
    out.getContext('2d')!.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }
}