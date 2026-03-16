// src/app/core/scan.service.ts
import { Injectable } from '@angular/core';
import { ScanReport } from '../pages/results/results';

@Injectable({ providedIn: 'root' })
export class ScanService {
  private readonly apiUrl = 'http://localhost:3000/api';

  async scanFile(file: File, mode: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

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
    const res = await fetch(`${this.apiUrl}/scan/${scanId}`);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Report not found');
    }

    const data = await res.json();

    // Convert scannedAt string back to Date
    return {
      ...data,
      scannedAt: new Date(data.scannedAt),
    } as ScanReport;
  }
}