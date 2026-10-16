import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

type Status = 'pass' | 'warn' | 'fail' | 'info';
interface Check { id: string; title: string; detail: string; status: Status; }

const PULSES = 4;            // how many times "SCANNING..." pops up
const PULSE_MS = 2400;       // length of each pop
const TOTAL_MS = PULSES * PULSE_MS;
const BEAT_S = 1.15;         // seconds per heartbeat
const WINDOW_S = 3.4;        // seconds of waveform visible across the screen
const GAP_PX = 46;           // blank gap ahead of the sweeping dot
const R_PEAK = 0.325;        // where in the beat the tall spike happens (0–1)

/**
 * Device Safety Scan.
 * A hospital-monitor style sweep in the BlackVault rainbow, "SCANNING..." pulses
 * four times, then a report of REAL checks the browser can perform.
 *
 * Honest scope: a website runs inside the browser sandbox, so this is a browser
 * & connection security checkup. It can't read files or detect viruses/malware;
 * the results page says so plainly.
 */
@Component({
  selector: 'app-device-scan',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './device-scan.html',
  styleUrl: './device-scan.scss',
})
export class DeviceScan implements AfterViewInit, OnDestroy {
  @ViewChild('wave') private waveRef?: ElementRef<HTMLCanvasElement>;

  phase = signal<'scanning' | 'results'>('scanning');
  checks = signal<Check[]>([]);
  soundOn = signal(true);
  stage = signal(0);

  readonly stages = [
    'Inspecting your connection…',
    'Reviewing browser security…',
    'Checking site permissions…',
    'Looking for remote-control signals…',
    'Reviewing your operating system…',
  ];
  readonly pulseCount = PULSES;
  readonly pulseMs = PULSE_MS;

  counts = computed(() => {
    const c = this.checks();
    return {
      pass: c.filter(x => x.status === 'pass').length,
      warn: c.filter(x => x.status === 'warn').length,
      fail: c.filter(x => x.status === 'fail').length,
      info: c.filter(x => x.status === 'info').length,
    };
  });

  verdict = computed(() => {
    const n = this.counts();
    if (n.fail > 0) return { label: 'At risk', tone: 'fail', blurb: 'Something important needs fixing. See the items marked below.' };
    if (n.warn > 0) return { label: 'Needs attention', tone: 'warn', blurb: 'Mostly fine, but a few things are worth a look.' };
    return { label: 'Looks good', tone: 'pass', blurb: 'Nothing concerning showed up in the checks we can run from the browser.' };
  });

  private raf = 0;
  private t0 = 0;
  private lastBeat = -1;
  private audio: AudioContext | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stageTimer: ReturnType<typeof setInterval> | null = null;
  private readonly reduceMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngAfterViewInit(): void {
    this.run();
  }

  ngOnDestroy(): void {
    this.stopAll();
    this.audio?.close().catch(() => {});
  }

  toggleSound(): void {
    this.soundOn.update(v => !v);
  }

  scanAgain(): void {
    this.checks.set([]);
    this.phase.set('scanning');
    // wait a tick so the canvas exists again
    this.timers.push(setTimeout(() => this.run(), 30));
  }

  // ── Orchestration ──
  private run(): void {
    this.stopAll();
    this.stage.set(0);
    this.lastBeat = -1;
    this.t0 = performance.now();

    try {
      this.audio ??= new AudioContext();
      this.audio.resume().catch(() => {});
    } catch { this.audio = null; }

    this.startWave();
    this.stageTimer = setInterval(
      () => this.stage.update(s => (s + 1) % this.stages.length),
      Math.round(TOTAL_MS / (this.stages.length + 1))
    );

    const checksDone = this.runChecks();
    const minTime = new Promise<void>(r => this.timers.push(setTimeout(r, TOTAL_MS)));
    Promise.all([checksDone, minTime]).then(([result]) => {
      this.checks.set(result);
      this.stopAll();
      this.phase.set('results');
    });
  }

  private stopAll(): void {
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.stageTimer) { clearInterval(this.stageTimer); this.stageTimer = null; }
  }

  // ── Heartbeat waveform ──
  private g(p: number, c: number, w: number): number {
    return Math.exp(-((p - c) ** 2) / (2 * w * w));
  }

  /** One ECG-style beat, normalised so the tall spike is ~1. */
  private wave(t: number): number {
    const p = (((t % BEAT_S) + BEAT_S) % BEAT_S) / BEAT_S;
    return (
      0.12 * this.g(p, 0.14, 0.03) -
      0.14 * this.g(p, 0.30, 0.008) +
      1.0 * this.g(p, R_PEAK, 0.009) -
      0.3 * this.g(p, 0.355, 0.01) +
      0.2 * this.g(p, 0.56, 0.05)
    );
  }

  private startWave(): void {
    const cvs = this.waveRef?.nativeElement;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
        cvs.width = Math.round(w * dpr);
        cvs.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const light = document.documentElement.getAttribute('data-theme') === 'light';
      const t = this.reduceMotion ? 1.0 : (now - this.t0) / 1000;
      const pps = w / WINDOW_S;
      const headX = (t * pps) % w;
      const sweepStart = Math.floor((t * pps) / w) * w;
      const mid = h * 0.62;
      const amp = h * 0.42;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#7cf7ff');
      grad.addColorStop(0.35, '#b38bff');
      grad.addColorStop(0.7, '#ff5bd6');
      grad.addColorStop(1, '#ffd36a');

      ctx.beginPath();
      let pen = false;
      for (let x = 0; x <= w; x += 2) {
        const ahead = x > headX;
        if (ahead && x < headX + GAP_PX) { pen = false; continue; }
        const tx = ((ahead ? sweepStart - w : sweepStart) + x) / pps;
        if (tx < 0) { pen = false; continue; }
        const y = mid - this.wave(tx) * amp;
        if (!pen) { ctx.moveTo(x, y); pen = true; } else { ctx.lineTo(x, y); }
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = light ? 'rgba(124, 58, 237, 0.45)' : 'rgba(179, 139, 255, 0.9)';
      ctx.shadowBlur = light ? 6 : 14;
      ctx.stroke();

      // glowing dot riding the front of the line
      const hy = mid - this.wave(t) * amp;
      ctx.beginPath();
      ctx.arc(headX, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = light ? '#7c3aed' : '#ffffff';
      ctx.shadowBlur = 18;
      ctx.fill();

      // beep on every tall spike
      const beat = Math.floor((t - R_PEAK * BEAT_S) / BEAT_S);
      if (beat !== this.lastBeat && beat >= 0) {
        this.lastBeat = beat;
        this.beep();
      }

      if (!this.reduceMotion) this.raf = requestAnimationFrame(draw);
    };

    this.raf = requestAnimationFrame(draw);
  }

  private beep(): void {
    if (!this.soundOn() || !this.audio || this.reduceMotion) return;
    try {
      const ctx = this.audio;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch { /* sound is optional */ }
  }

  // ── The real checks ──
  private async runChecks(): Promise<Check[]> {
    const out: Check[] = [];
    const add = (id: string, title: string, detail: string, status: Status) =>
      out.push({ id, title, detail, status });

    // 1. Connection
    const https = location.protocol === 'https:';
    if (https) {
      add('tls', 'Encrypted connection', 'This page was loaded over HTTPS, so traffic between you and BlackVault is encrypted.', 'pass');
    } else if (window.isSecureContext) {
      add('tls', 'Encrypted connection', 'You are on a local development address, which browsers treat as secure. The live site must use HTTPS.', 'info');
    } else {
      add('tls', 'Encrypted connection', 'This page is NOT served over a secure connection. Anything you type could be read in transit.', 'fail');
    }

    // 2. Browser
    const b = this.browserInfo();
    add('browser', 'Browser', `${b.name} ${b.version}. Keep automatic updates on; most attacks target out-of-date browsers.`, 'info');

    // 3. Operating system
    out.push(this.osCheck());

    // 4. Remote-control / automation flag
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) {
      add('automation', 'Remote-control signals', 'This browser reports it is being driven by automation software. If you did not set that up, close it and reopen your browser.', 'warn');
    } else {
      add('automation', 'Remote-control signals', 'No automation or remote-control flag was reported by this browser.', 'pass');
    }

    // 5. Permissions granted to this site
    out.push(await this.permissionCheck());

    // 6. Privacy signal
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    add(
      'privacy', 'Privacy signal',
      gpc ? 'Your browser sends “Global Privacy Control”, asking sites not to sell or share your data.'
          : 'Your browser is not sending a Global Privacy Control signal. Turning it on is optional but adds privacy.',
      gpc ? 'pass' : 'info'
    );

    // 7. Crypto
    add(
      'crypto', 'Built-in encryption tools',
      window.crypto?.subtle ? 'Your browser’s secure cryptography features are available.'
                            : 'Secure cryptography features are unavailable here, usually because the page is not on a secure connection.',
      window.crypto?.subtle ? 'pass' : 'warn'
    );

    // 8. Network
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    add(
      'network', 'Network',
      navigator.onLine
        ? `Online${conn?.effectiveType ? ` (${conn.effectiveType} connection)` : ''}. Avoid public Wi-Fi without a VPN for sensitive uploads.`
        : 'Your device reports it is offline.',
      'info'
    );

    return out;
  }

  private browserInfo(): { name: string; version: string } {
    const ua = navigator.userAgent;
    const v = (re: RegExp) => ua.match(re)?.[1] ?? 'unknown';
    if (/Edg\//.test(ua)) return { name: 'Microsoft Edge', version: v(/Edg\/(\d+)/) };
    if (/OPR\//.test(ua)) return { name: 'Opera', version: v(/OPR\/(\d+)/) };
    if (/Firefox\//.test(ua)) return { name: 'Firefox', version: v(/Firefox\/(\d+)/) };
    if (/Chrome\//.test(ua)) return { name: 'Chrome', version: v(/Chrome\/(\d+)/) };
    if (/Safari\//.test(ua)) return { name: 'Safari', version: v(/Version\/(\d+)/) };
    return { name: 'Unknown browser', version: '' };
  }

  private osCheck(): Check {
    const ua = navigator.userAgent;
    const win = ua.match(/Windows NT (\d+)\.(\d+)/);
    if (win) {
      const major = +win[1];
      return major >= 10
        ? { id: 'os', title: 'Operating system', detail: 'Windows 10 or 11 — still receiving security updates (heuristic based on your browser’s report).', status: 'pass' }
        : { id: 'os', title: 'Operating system', detail: 'This looks like an older Windows version that no longer gets security updates. Upgrading is strongly recommended.', status: 'fail' };
    }
    const android = ua.match(/Android (\d+)/);
    if (android) {
      return +android[1] >= 10
        ? { id: 'os', title: 'Operating system', detail: `Android ${android[1]} detected.`, status: 'info' }
        : { id: 'os', title: 'Operating system', detail: `Android ${android[1]} is old and may no longer receive security patches.`, status: 'warn' };
    }
    const ios = ua.match(/OS (\d+)_\d+.* like Mac OS X/);
    if (ios) {
      return +ios[1] >= 16
        ? { id: 'os', title: 'Operating system', detail: `iOS ${ios[1]} detected.`, status: 'info' }
        : { id: 'os', title: 'Operating system', detail: `iOS ${ios[1]} is out of date. Updating to the latest iOS is recommended.`, status: 'warn' };
    }
    return { id: 'os', title: 'Operating system', detail: 'Browsers hide most OS version details, so the exact version can’t be checked from here. Keep system updates on.', status: 'info' };
  }

  private async permissionCheck(): Promise<Check> {
    const names = ['camera', 'microphone', 'geolocation', 'notifications'];
    const granted: string[] = [];
    let supported = false;
    for (const n of names) {
      try {
        const res = await navigator.permissions.query({ name: n as PermissionName });
        supported = true;
        if (res.state === 'granted') granted.push(n === 'geolocation' ? 'location' : n);
      } catch { /* not supported in this browser */ }
    }
    if (!supported) {
      return { id: 'perm', title: 'Permissions for this site', detail: 'Your browser doesn’t let us read site permissions.', status: 'info' };
    }
    return granted.length
      ? { id: 'perm', title: 'Permissions for this site', detail: `This site already has access to: ${granted.join(', ')}. Review it in your browser’s site settings if that’s unexpected.`, status: 'warn' }
      : { id: 'perm', title: 'Permissions for this site', detail: 'No camera, microphone, location, or notification access has been granted to this site.', status: 'pass' };
  }

  statusIcon(s: Status): string {
    return s === 'pass' ? '✓' : s === 'warn' ? '!' : s === 'fail' ? '✕' : 'i';
  }
}