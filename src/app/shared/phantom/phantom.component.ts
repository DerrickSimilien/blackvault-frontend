import { Component, signal, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth.service';

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

  isOpen = signal(false);
  isTyping = signal(false);
  userInput = signal('');
  messages = signal<Message[]>([]);

  readonly starterChips = [
    "What's my riskiest scan?",
    'Explain HIGH risk to me',
    'How do I fix exposed PII?',
    'Am I secure?',
    'What is prompt injection?',
    'Summarize my scan history',
  ];

  ngOnInit(): void {
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
    this.scrollToBottom();

    try {
      const user = this.auth.currentUser();

      // Skip the intro message (index 0); the server builds the system prompt
      // and looks up this user's scan history itself.
      const conversation = this.messages()
        .filter((m, i) => !(m.role === 'phantom' && i === 0))
        .map(m => ({
          role: m.role === 'phantom' ? 'assistant' : 'user',
          content: m.content,
        }));

      const response = await fetch('http://localhost:3000/api/scan/phantom/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid ?? null,
          userName: user?.displayName ?? user?.email ?? 'Unknown',
          messages: conversation,
        }),
      });

      const data = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        // Show the server's friendly message (rate limit, no credits, bad key...)
        this.addPhantomMessage(
          (data['error'] as string) ?? `PHANTOM hit an error (HTTP ${response.status}). Try again.`
        );
        return;
      }

      this.addPhantomMessage((data['text'] as string) ?? 'PHANTOM encountered an error. Try again.');

    } catch (err) {
      // Only reached when the request never got an answer (backend off, no network)
      console.error('PHANTOM error:', err);
      this.addPhantomMessage('Signal lost. Check that the BlackVault server is running and try again. 👻');
    } finally {
      this.isTyping.set(false);
      this.scrollToBottom();
    }
  }

  private addPhantomMessage(content: string): void {
    this.messages.update(msgs => [...msgs, {
      role: 'phantom',
      content,
      timestamp: new Date(),
    }]);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = document.querySelector('.phantom-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }
}