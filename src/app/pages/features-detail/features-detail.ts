import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FeatureEntry {
  icon: string;
  title: string;
  tag: string;
  description: string;
}

@Component({
  selector: 'app-features-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './features-detail.html',
  styleUrl: './features-detail.scss',
})
export class FeaturesDetail implements OnInit, OnDestroy {
  readonly features: FeatureEntry[] = [
    {
      icon: '🤖',
      title: 'AI Threat Detection',
      tag: 'AI · LLM',
      description:
        'BlackVault runs every document through a large language model that reads for meaning, not just pattern matches. It catches contextual red flags — a sentence that quietly requests a wire transfer, an instruction buried in a footnote, a tone shift that suggests manipulation — the kind of thing a keyword scanner walks right past.',
    },
    {
      icon: '💉',
      title: 'Prompt Injection Detection',
      tag: 'Red Team',
      description:
        'As more pipelines feed documents straight into AI systems, attackers have started hiding instructions inside the documents themselves. BlackVault specifically hunts for embedded text designed to hijack a downstream model or automated workflow, flagging it before it ever reaches your AI stack.',
    },
    {
      icon: '🔑',
      title: 'Secret Exposure Scanner',
      tag: 'Secrets',
      description:
        'API keys, access tokens, database credentials, and private keys have a way of ending up in places they shouldn\u2019t — config files, old commit messages, exported chat logs. BlackVault scans for the exact formats these secrets take and flags them before they reach production or a public repo.',
    },
    {
      icon: '🛡️',
      title: 'PII Leak Detection',
      tag: 'Privacy',
      description:
        'Emails, phone numbers, Social Security numbers, and financial account details are easy to miss in a long document. BlackVault identifies personally identifiable information wherever it appears, so you can redact or review it before the document goes anywhere it shouldn\u2019t.',
    },
    {
      icon: '⚡',
      title: 'Hybrid AI Security Score',
      tag: 'Hybrid',
      description:
        'Rather than relying on one detection method, BlackVault combines fast rule-based pattern matching with deeper AI reasoning, then merges both into a single transparent risk score out of 100 — with a plain-language explanation for every point lost, so you always know exactly why a document scored the way it did.',
    },
    {
      icon: '🚩',
      title: 'Red Flag Analyzer',
      tag: 'Analysis',
      description:
        'Not every risk trips a hard rule. The Red Flag Analyzer surfaces ambiguous or suspicious patterns — unusual phrasing, inconsistent formatting, suspicious links — that deserve a human look even when nothing technically violates a fixed policy.',
    },
    {
      icon: '🔒',
      title: 'Zero-Trust Document Analysis',
      tag: 'Zero Trust',
      description:
        'Every file that comes through BlackVault is treated as potentially hostile by default — no document is implicitly trusted just because of where it came from. Raw content is never stored; only the scan summary persists, so your vault holds the findings, never the exposure.',
    },
  ];

  readonly currentIndex = signal(0);
  readonly currentFeature = computed(() => this.features[this.currentIndex()]);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
    this.stopTimer();
    this.startTimer();
  }

  next(): void {
    this.goTo((this.currentIndex() + 1) % this.features.length);
  }

  prev(): void {
    this.goTo((this.currentIndex() - 1 + this.features.length) % this.features.length);
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % this.features.length);
    }, 7000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}