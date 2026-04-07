import { Injectable, inject } from '@angular/core';
import { ScanReport } from '../pages/results/results';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ScanService {
  private readonly apiUrl = 'http://localhost:3000/api';
  private auth = inject(AuthService);

  async scanFile(file: File, mode: string): Promise<string> {
    const userId = this.auth.currentUser()?.uid;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    if (userId) {
      formData.append('userId', userId);
    }

    const res = await fetch(`${this.apiUrl}/scan`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Scan failed');
    }

    const data = await res.json();
    return data.scanId as string;
  }

  async getReport(scanId: string): Promise<ScanReport> {
    const userId = this.auth.currentUser()?.uid;
    const url = userId
      ? `${this.apiUrl}/scan/${scanId}?userId=${userId}`
      : `${this.apiUrl}/scan/${scanId}`;

    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Report not found');
    }

    const data = await res.json();
    return {
      ...data,
      scannedAt: new Date(data.scannedAt),
    } as ScanReport;
  }

  async getUserScans(): Promise<ScanReport[]> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) return [];

    const res = await fetch(`${this.apiUrl}/scan/user/${userId}`);
    if (!res.ok) return [];

    const data = await res.json() as ScanReport[];
    return data.map(r => ({
      ...r,
      scannedAt: new Date(r.scannedAt),
    }));
  }

  async deleteScan(scanId: string): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) throw new Error('Not authenticated');

    const res = await fetch(`${this.apiUrl}/scan/${scanId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Failed to delete scan');
    }
  }
}