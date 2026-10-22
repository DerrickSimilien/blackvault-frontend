import {
  Component, ElementRef, OnDestroy, effect, input, signal, untracked, viewChild,
} from '@angular/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

/**
 * Renders a PDF page by page onto canvases so the DOCUMENT itself zooms inside a
 * fixed-size box (the box and its scrollbars never change size).
 *
 *  - 100% = each page fits the width of the box.
 *  - Only pages near the visible area are drawn, so big PDFs stay fast.
 *  - While the slider moves, pages scale instantly; they are redrawn sharp a
 *    moment after you stop.
 *
 * pdf.js is loaded lazily the first time a PDF is previewed, so it does not
 * add weight to the rest of the app. The PDF never leaves the browser.
 */

type PdfJs = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfjs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Path is relative to THIS file: src/app/shared/pdf-preview/ → project root.
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL('../../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' },
      );
      return pdfjs;
    });
    pdfjsPromise.catch(() => { pdfjsPromise = null; });
  }
  return pdfjsPromise;
}

interface PageEntry {
  num: number;
  proxy: PDFPageProxy;
  el: HTMLDivElement;
  /** Width/height of the page at scale 1 (PDF points). */
  w: number;
  h: number;
  renderedScale: number;
  visible: boolean;
  task: RenderTask | null;
  busy: Promise<void>;
}

const MAX_PAGES = 100;
const PAD = 16;

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  template: `
    <div class="pp" #scroller>
      @if (state() === 'loading') { <p class="pp__msg">Loading preview…</p> }
      @if (state() === 'error') {
        <p class="pp__msg">
          This PDF couldn't be previewed, but BlackVault can still analyze it.
        </p>
      }
      <div class="pp__pages" #host></div>
      @if (truncated()) {
        <p class="pp__note">Previewing the first {{ maxPages }} pages. The full file is still analyzed.</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; flex: 1; min-width: 0; height: 100%; }
    .pp {
      height: 100%; overflow: auto; box-sizing: border-box;
      background: var(--bv-bg-surface);
    }
    .pp__pages {
      min-width: 100%; width: max-content; box-sizing: border-box;
      padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px;
    }
    .pp__msg, .pp__note {
      margin: 0; padding: 24px; text-align: center;
      font-size: 0.82rem; line-height: 1.55; color: var(--bv-text-secondary);
    }
  `],
})
export class PdfPreviewComponent implements OnDestroy {
  file = input.required<File>();
  /** Zoom in percent. 100 = page fits the width of the box. */
  zoom = input(100);

  state = signal<'loading' | 'ready' | 'error'>('loading');
  truncated = signal(false);
  readonly maxPages = MAX_PAGES;

  private scroller = viewChild.required<ElementRef<HTMLDivElement>>('scroller');
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  private doc: PDFDocumentProxy | null = null;
  private docTask: PDFDocumentLoadingTask | null = null;
  private pages: PageEntry[] = [];
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private loadToken = 0;
  private redrawTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWidth = 0;

  constructor() {
    effect(() => {
      const f = this.file();
      untracked(() => void this.load(f));
    });

    effect(() => {
      this.zoom();
      untracked(() => this.onZoomChanged());
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  // ── LOADING ──────────────────────────────────────────────
  private async load(file: File): Promise<void> {
    const token = ++this.loadToken;
    this.teardown();
    this.state.set('loading');
    this.truncated.set(false);

    try {
      const pdfjs = await loadPdfjs();
      const data = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      if (token !== this.loadToken) { void loadingTask.destroy(); return; }
      this.doc = doc;
      this.docTask = loadingTask;

      const root = this.scroller().nativeElement;
      this.observer = new IntersectionObserver(
        (entries) => this.onIntersect(entries),
        { root, rootMargin: '400px 0px' },
      );
      this.lastWidth = root.clientWidth;
      this.resizeObserver = new ResizeObserver(() => {
        const w = root.clientWidth;
        if (Math.abs(w - this.lastWidth) > 1) { this.lastWidth = w; this.onZoomChanged(); }
      });
      this.resizeObserver.observe(root);

      const count = Math.min(doc.numPages, MAX_PAGES);
      this.truncated.set(doc.numPages > MAX_PAGES);

      for (let n = 1; n <= count; n++) {
        const proxy = await doc.getPage(n);
        if (token !== this.loadToken) return;
        const vp = proxy.getViewport({ scale: 1 });
        const el = document.createElement('div');
        el.dataset['page'] = String(n - 1);
        el.style.cssText =
          'position:relative;flex-shrink:0;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.35);';
        const entry: PageEntry = {
          num: n, proxy, el, w: vp.width, h: vp.height,
          renderedScale: 0, visible: false, task: null, busy: Promise.resolve(),
        };
        this.size(entry);
        this.host().nativeElement.appendChild(el);
        this.pages.push(entry);
        this.observer.observe(el);
        if (n === 1) this.state.set('ready');
      }
      this.state.set('ready');
    } catch (err) {
      if (token !== this.loadToken) return;
      console.warn('PDF preview failed:', err);
      this.state.set('error');
    }
  }

  private teardown(): void {
    if (this.redrawTimer) { clearTimeout(this.redrawTimer); this.redrawTimer = null; }
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.observer = null;
    this.resizeObserver = null;
    for (const p of this.pages) { p.task?.cancel(); p.proxy.cleanup(); }
    this.pages = [];
    const host = this.host?.()?.nativeElement;
    host?.replaceChildren();
    if (this.docTask) { void this.docTask.destroy(); this.docTask = null; }
    this.doc = null;
  }

  // ── SIZING / ZOOM ────────────────────────────────────────
  /** CSS scale for a page: fit-to-width × zoom. */
  private scaleFor(p: PageEntry): number {
    const avail = Math.max(120, this.scroller().nativeElement.clientWidth - PAD * 2 - 12);
    return (avail / p.w) * (this.zoom() / 100);
  }

  private size(p: PageEntry): void {
    const s = this.scaleFor(p);
    p.el.style.width = `${p.w * s}px`;
    p.el.style.height = `${p.h * s}px`;
    // Stretch the already-drawn canvas to the new size (a soft preview until the redraw).
    const c = p.el.firstElementChild as HTMLCanvasElement | null;
    if (c) { c.style.width = '100%'; c.style.height = '100%'; }
  }

  private onZoomChanged(): void {
    if (!this.pages.length) return;
    for (const p of this.pages) this.size(p);
    if (this.redrawTimer) clearTimeout(this.redrawTimer);
    this.redrawTimer = setTimeout(() => {
      for (const p of this.pages) if (p.visible) void this.draw(p);
    }, 160);
  }

  // ── DRAWING ──────────────────────────────────────────────
  private onIntersect(entries: IntersectionObserverEntry[]): void {
    for (const e of entries) {
      const p = this.pages[Number((e.target as HTMLElement).dataset['page'])];
      if (!p) continue;
      p.visible = e.isIntersecting;
      if (e.isIntersecting) {
        void this.draw(p);
      } else if (p.renderedScale) {
        // Far away from the viewport: free the canvas memory.
        p.task?.cancel();
        p.el.replaceChildren();
        p.renderedScale = 0;
      }
    }
  }

  private draw(p: PageEntry): Promise<void> {
    // Queue per page so two renders never use the same canvas at once.
    p.busy = p.busy.then(() => this.drawNow(p)).catch(() => undefined);
    return p.busy;
  }

  private async drawNow(p: PageEntry): Promise<void> {
    if (!p.visible) return;
    const css = this.scaleFor(p);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = css * dpr;
    if (Math.abs(scale - p.renderedScale) < 0.001) return;

    const vp = p.proxy.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    canvas.style.cssText = 'display:block;width:100%;height:100%;';

    p.task?.cancel();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const task = p.proxy.render({ canvasContext: ctx, viewport: vp });
    p.task = task;
    try {
      await task.promise;
    } catch {
      return; // cancelled by a newer draw
    }
    if (p.task !== task) return;
    p.el.replaceChildren(canvas);
    p.renderedScale = scale;
  }
}