import { Component, signal, inject, effect, untracked } from '@angular/core';
import { AuthService } from '../../core/auth.service';

interface Message {
  role: 'user' | 'phantom';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

// How a conversation looks once it is written to localStorage (Dates become text)
interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: 'user' | 'phantom'; content: string; timestamp: string }[];
}

const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 100;
const RESUME_WINDOW_MS = 30 * 60 * 1000; // reopen the last chat if it was active in the last 30 min

const INTRO =
  "PHANTOM online. 👻 I'm your AI security analyst — I know your scan history, BlackVault inside and out, and general cybersecurity. What do you need?";

@Component({
  selector: 'app-phantom',
  standalone: true,
  imports: [],
  templateUrl: './phantom.component.html',
  styleUrl: './phantom.component.scss',
})
export class PhantomComponent {
  private auth = inject(AuthService);

  private storageKey = 'bv.phantom.guest';
  private loadedFor: string | null = null;

  isOpen = signal(false);
  isTyping = signal(false);
  userInput = signal('');

  /** The chat currently on screen (always starts with the PHANTOM intro). */
  messages = signal<Message[]>([]);
  /** Every saved chat for this user, newest first. */
  conversations = signal<Conversation[]>([]);
  /** Id of the saved chat on screen, or null for a brand-new chat that hasn't been saved yet. */
  activeId = signal<string | null>(null);
  showHistory = signal(false);
  pendingDeleteId = signal<string | null>(null);

  readonly starterChips = [
    "What's my riskiest scan?",
    'Explain HIGH risk to me',
    'How do I fix exposed PII?',
    'Am I secure?',
    'What is prompt injection?',
    'Summarize my scan history',
  ];

  constructor() {
    // Load this user's chats whenever the signed-in user is known or changes.
    effect(() => {
      const uid = this.auth.currentUser()?.uid ?? 'guest';
      untracked(() => this.loadFor(uid));
    });
  }

  // ── chat window ─────────────────────────────────────────
  toggle(): void {
    this.isOpen.update(v => !v);
  }

  toggleHistory(): void {
    this.pendingDeleteId.set(null);
    this.showHistory.update(v => !v);
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

  // ── multiple conversations ──────────────────────────────
  newChat(): void {
    if (this.isTyping()) return; // don't switch away while PHANTOM is answering
    this.activeId.set(null);
    this.messages.set([this.introMessage()]);
    this.userInput.set('');
    this.pendingDeleteId.set(null);
    this.showHistory.set(false);
    this.scrollToBottom();
  }

  openConversation(id: string): void {
    if (this.isTyping()) return;
    const conv = this.conversations().find(c => c.id === id);
    if (!conv) return;
    this.activeId.set(conv.id);
    this.messages.set(conv.messages);
    this.userInput.set('');
    this.pendingDeleteId.set(null);
    this.showHistory.set(false);
    this.scrollToBottom();
  }

  askDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.pendingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(id: string): void {
    if (this.isTyping() && id === this.activeId()) return;
    this.conversations.update(list => list.filter(c => c.id !== id));
    this.pendingDeleteId.set(null);
    this.save();
    if (id === this.activeId()) this.newChat();
  }

  countLabel(c: Conversation): string {
    const n = c.messages.filter(m => m.role === 'user').length;
    return `${n} message${n === 1 ? '' : 's'}`;
  }

  // ── sending ─────────────────────────────────────────────
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
    this.commit();
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
    this.commit();
  }

  // ── saving & loading ────────────────────────────────────
  private introMessage(): Message {
    return { role: 'phantom', content: INTRO, timestamp: new Date() };
  }

  private loadFor(uid: string): void {
    if (uid === this.loadedFor) return; // same user, keep the chat on screen
    this.loadedFor = uid;
    this.storageKey = `bv.phantom.${uid}`;

    const saved = this.readStorage();
    this.conversations.set(saved);
    this.pendingDeleteId.set(null);
    this.showHistory.set(false);

    // Pick up where the user left off if they were chatting a moment ago.
    const latest = saved[0];
    if (latest && Date.now() - latest.updatedAt < RESUME_WINDOW_MS) {
      this.activeId.set(latest.id);
      this.messages.set(latest.messages);
    } else {
      this.activeId.set(null);
      this.messages.set([this.introMessage()]);
    }
  }

  /** Write the chat on screen into the saved list (creating it on the first user message). */
  private commit(): void {
    let msgs = this.messages();
    if (msgs.length > MAX_MESSAGES) msgs = [msgs[0], ...msgs.slice(-(MAX_MESSAGES - 1))];

    const now = Date.now();
    const id = this.activeId();

    if (!id) {
      const firstUser = msgs.find(m => m.role === 'user');
      if (!firstUser) return; // nothing worth saving yet
      const newId = now.toString(36) + Math.random().toString(36).slice(2, 8);
      const conv: Conversation = {
        id: newId,
        title: this.makeTitle(firstUser.content),
        createdAt: now,
        updatedAt: now,
        messages: msgs,
      };
      this.activeId.set(newId);
      this.conversations.update(list => [conv, ...list].slice(0, MAX_CONVERSATIONS));
    } else {
      this.conversations.update(list =>
        list
          .map(c => (c.id === id ? { ...c, messages: msgs, updatedAt: now } : c))
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    }
    this.save();
  }

  private makeTitle(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > 42 ? clean.slice(0, 42).trimEnd() + '…' : clean || 'New chat';
  }

  private save(): void {
    try {
      const data: StoredConversation[] = this.conversations().map(c => ({
        ...c,
        messages: c.messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch { /* storage full or blocked — chats just won't persist */ }
  }

  private readStorage(): Conversation[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as StoredConversation[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages) && c.messages.length > 0)
        .map(c => ({
          id: c.id,
          title: String(c.title ?? 'New chat'),
          createdAt: Number(c.createdAt) || Date.now(),
          updatedAt: Number(c.updatedAt) || Date.now(),
          messages: c.messages.map(m => ({
            role: m.role === 'user' ? 'user' as const : 'phantom' as const,
            content: String(m.content ?? ''),
            timestamp: new Date(m.timestamp),
          })),
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  // ── helpers ─────────────────────────────────────────────
  private scrollToBottom(): void {
    setTimeout(() => {
      const el = document.querySelector('.phantom-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  timeAgo(date: Date | number): string {
    const t = typeof date === 'number' ? date : date.getTime();
    const mins = Math.floor((Date.now() - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}