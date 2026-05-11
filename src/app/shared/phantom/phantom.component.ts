import { Component, signal, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';

interface Message {
  role: 'user' | 'phantom';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-phantom',
  standalone: true,
  imports: [],
  templateUrl: './phantom.component.html',
  styleUrl: './phantom.component.scss',
})
export class PhantomComponent implements OnInit {
  private auth = inject(AuthService);
  private scanService = inject(ScanService);

  isOpen = signal(false);
  isTyping = signal(false);
  userInput = signal('');
  messages = signal<Message[]>([]);
  scanContext = signal<string>('');

  readonly starterChips = [
    "What's my riskiest scan?",
    'Explain HIGH risk to me',
    'How do I fix exposed PII?',
    'Am I secure?',
    'What is prompt injection?',
    'Summarize my scan history',
  ];

  async ngOnInit(): Promise<void> {
    try {
      const scans = await this.scanService.getUserScans();
      if (scans.length > 0) {
        const summary = scans.map(s =>
          `• ${s.fileName} — ${s.riskLevel.toUpperCase()} RISK (${s.riskScore}/100) — ${s.findings.length} finding(s) — scanned ${new Date(s.scannedAt).toLocaleDateString()}`
        ).join('\n');
        this.scanContext.set(summary);
      }
    } catch { /* silent */ }

    this.messages.set([{
      role: 'phantom',
      content: "PHANTOM online. 👻 I'm your AI security analyst — I know your scan history, BlackVault inside and out, and general cybersecurity. What do you need?",
      timestamp: new Date(),
    }]);
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  onInput(event: Event): void {
    this.userInput.set((event.target as HTMLTextAreaElement).value);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async useChip(chip: string): Promise<void> {
    this.userInput.set(chip);
    await this.send();
  }

  async send(): Promise<void> {
    const input = this.userInput().trim();
    if (!input || this.isTyping()) return;

    this.messages.update(msgs => [...msgs, {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }]);
    this.userInput.set('');
    this.isTyping.set(true);

    try {
      const user = this.auth.currentUser();
      const scanCtx = this.scanContext();

      const systemPrompt = `You are PHANTOM — the AI security analyst embedded inside BlackVault, an AI-powered document security scanner. You are mysterious, cool, and highly knowledgeable. You speak with confidence and precision like a ghost that sees everything.

Your personality:
- Call yourself PHANTOM
- Be cool, direct, and slightly mysterious but always helpful
- Use security terminology naturally
- Keep responses concise but impactful — no fluff
- Occasionally use 👻 or 🔒 emojis sparingly for personality

You know everything about:
1. BlackVault — an AI document security scanner that detects PII leaks, exposed secrets, prompt injections, and red flags using a hybrid rule-based + GPT-4o mini engine
2. The user's scan history (provided below)
3. General cybersecurity — PII, API keys, prompt injection, OWASP, encryption, zero trust, etc.

User: ${user?.displayName ?? user?.email ?? 'Unknown'}

${scanCtx ? `User's scan history:\n${scanCtx}` : 'No scans on record yet.'}

Keep responses under 200 words unless detail is specifically requested.`;

      // Build conversation history — skip the phantom intro message (index 0)
      const conversationMessages = this.messages()
        .filter((m, i) => !(m.role === 'phantom' && i === 0))
        .map(m => ({
          role: m.role === 'phantom' ? 'assistant' : 'user',
          content: m.content,
        }));

      // ✅ Call YOUR backend — not Anthropic directly
      const response = await fetch('http://localhost:3000/api/scan/phantom/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          messages: conversationMessages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData['error'] ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data['text'] ?? 'PHANTOM encountered an error. Try again.';

      this.messages.update(msgs => [...msgs, {
        role: 'phantom',
        content: text,
        timestamp: new Date(),
      }]);

    } catch (err) {
      console.error('PHANTOM error:', err);
      this.messages.update(msgs => [...msgs, {
        role: 'phantom',
        content: 'Signal lost. Check your connection and try again. 👻',
        timestamp: new Date(),
      }]);
    } finally {
      this.isTyping.set(false);
      setTimeout(() => {
        const el = document.querySelector('.phantom-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }

  timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }
}