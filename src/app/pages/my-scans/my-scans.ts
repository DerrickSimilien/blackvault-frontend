import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ScanService } from '../../core/scan.service';
import { ToastService } from '../../core/toast.service';
import { ScanReport } from '../results/results';

type RiskFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'clean';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

@Component({
  selector: 'app-my-scans',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './my-scans.html',
  styleUrl: './my-scans.scss',
})
export class MyScans implements OnInit {
  private auth = inject(AuthService);
  private scanService = inject(ScanService);
  private toast = inject(ToastService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  isLoading = signal(true);
  scans = signal<ScanReport[]>([]);
  deletingId = signal<string | null>(null);

  // Search & filter state
  searchQuery = signal('');
  activeRiskFilter = signal<RiskFilter>('all');
  activeSort = signal<SortOption>('newest');

  // Modal state
  showDeleteModal = signal(false);
  pendingDeleteScan = signal<ScanReport | null>(null);

  // Compare state
  selectedForCompare = signal<Set<string>>(new Set());
  canCompare = computed(() => this.selectedForCompare().size === 2);

  readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  readonly riskFilters: { label: string; value: RiskFilter; color: string }[] = [
    { label: 'All',      value: 'all',      color: 'rgba(255,255,255,0.4)' },
    { label: 'Critical', value: 'critical', color: '#ff3b3b' },
    { label: 'High',     value: 'high',     color: '#ff8c00' },
    { label: 'Medium',   value: 'medium',   color: '#ffd36a' },
    { label: 'Low',      value: 'low',      color: '#7cf7ff' },
    { label: 'Clean',    value: 'clean',    color: '#00e887' },
  ];

  readonly sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Newest First',  value: 'newest'  },
    { label: 'Oldest First',  value: 'oldest'  },
    { label: 'Highest Risk',  value: 'highest' },
    { label: 'Lowest Risk',   value: 'lowest'  },
  ];

  // Filtered + sorted scans
  filteredScans = computed(() => {
    let result = this.scans();

    // Search filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(s =>
        s.fileName.toLowerCase().includes(query) ||
        s.riskLevel.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query)
      );
    }

    // Risk filter
    const risk = this.activeRiskFilter();
    if (risk !== 'all') {
      result = result.filter(s => s.riskLevel === risk);
    }

    // Sort
    const sort = this.activeSort();
    result = [...result].sort((a, b) => {
      if (sort === 'newest') return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
      if (sort === 'oldest') return new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime();
      if (sort === 'highest') return b.riskScore - a.riskScore;
      if (sort === 'lowest') return a.riskScore - b.riskScore;
      return 0;
    });

    return result;
  });

  hasActiveFilters = computed(() =>
    this.searchQuery().trim() !== '' ||
    this.activeRiskFilter() !== 'all' ||
    this.activeSort() !== 'newest'
  );

  async ngOnInit(): Promise<void> {
    try {
      const scans = await this.scanService.getUserScans();
      this.scans.set(scans);
    } catch (err) {
      console.error('Failed to load scans:', err);
      this.toast.error('Failed to load scans. Please refresh.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── SEARCH & FILTER ────────────────────────────────────
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  setRiskFilter(filter: RiskFilter): void {
    this.activeRiskFilter.set(filter);
  }

  setSort(sort: SortOption): void {
    this.activeSort.set(sort);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.activeRiskFilter.set('all');
    this.activeSort.set('newest');
  }

  // ── COMPARE ────────────────────────────────────────────
  toggleCompare(event: MouseEvent, scanId: string): void {
    event.stopPropagation();
    event.preventDefault();

    const current = new Set(this.selectedForCompare());

    if (current.has(scanId)) {
      current.delete(scanId);
    } else {
      if (current.size >= 2) {
        this.toast.info('You can only compare 2 scans at a time.');
        return;
      }
      current.add(scanId);
    }

    this.selectedForCompare.set(current);
  }

  isSelectedForCompare(scanId: string): boolean {
    return this.selectedForCompare().has(scanId);
  }

  goToCompare(): void {
    const ids = [...this.selectedForCompare()];
    if (ids.length !== 2) return;
    this.router.navigate(['/compare'], {
      queryParams: { a: ids[0], b: ids[1] }
    });
  }

  clearCompare(): void {
    this.selectedForCompare.set(new Set());
  }

  // ── DELETE ─────────────────────────────────────────────
  openDeleteModal(event: MouseEvent, scan: ScanReport): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.deletingId()) return;
    this.pendingDeleteScan.set(scan);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.pendingDeleteScan.set(null);
  }

  async confirmDelete(): Promise<void> {
    const scan = this.pendingDeleteScan();
    if (!scan) return;

    this.showDeleteModal.set(false);
    this.deletingId.set(scan.scanId);

    try {
      await this.scanService.deleteScan(scan.scanId);
      this.scans.update(scans => scans.filter(s => s.scanId !== scan.scanId));
      const current = new Set(this.selectedForCompare());
      current.delete(scan.scanId);
      this.selectedForCompare.set(current);
      this.toast.success('Scan deleted successfully.');
    } catch (err) {
      console.error('Failed to delete scan:', err);
      this.toast.error('Failed to delete scan. Please try again.');
    } finally {
      this.deletingId.set(null);
      this.pendingDeleteScan.set(null);
    }
  }

  getRiskColor(level: string): string {
    const map: Record<string, string> = {
      critical: '#ff3b3b', high: '#ff8c00',
      medium: '#ffd36a', low: '#7cf7ff', clean: '#00e887',
    };
    return map[level] ?? '#fff';
  }

  getRiskBg(level: string): string {
    const map: Record<string, string> = {
      critical: 'rgba(255,59,59,0.08)', high: 'rgba(255,140,0,0.08)',
      medium: 'rgba(255,211,106,0.08)', low: 'rgba(124,247,255,0.08)',
      clean: 'rgba(0,232,135,0.08)',
    };
    return map[level] ?? 'rgba(255,255,255,0.04)';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}