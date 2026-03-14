import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-resume-scan',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="placeholder">
      <div class="placeholder__card">
        <div class="placeholder__icon">👤</div>
        <h1 class="placeholder__title">Resume Scan</h1>
        <p class="placeholder__sub">Coming soon — privacy analysis for resumes and CVs.</p>
        <button class="placeholder__btn" routerLink="/dashboard">← Back to Dashboard</button>
      </div>
    </div>
  `,
  styles: [`
    .placeholder {
      min-height: 100vh;
      background: #050507;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, sans-serif;
    }
    .placeholder__card {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #fff;
    }
    .placeholder__icon { font-size: 3rem; }
    .placeholder__title { font-size: 2rem; font-weight: 700; letter-spacing: -0.04em; }
    .placeholder__sub { font-size: 0.95rem; color: rgba(255,255,255,0.4); }
    .placeholder__btn {
      margin-top: 8px;
      padding: 10px 24px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { background: rgba(255,255,255,0.06); }
    }
  `]
})
export class ResumeScan {}