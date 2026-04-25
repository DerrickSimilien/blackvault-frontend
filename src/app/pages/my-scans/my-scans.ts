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
  isBulkDeleting = signal(false);

  // Search & filter
  searchQuery = signal('');
  activeRiskFilter = signal<RiskFilter>('all');
  activeSort = signal<SortOption>('newest');

  // Selection mode
  selectionMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());

  // Modal state
  showDeleteModal = signal(false);
  pendingDeleteScan = signal<ScanReport | null>(null);
  showBulkDeleteModal = signal(false);

  // Computed
  canCompare = computed(() => this.selectedIds().size === 2);
  canBulkDelete = computed(() => this.selectedIds().size > 0);
  allFilteredSelected = computed(() => {
    const filtered = this.filteredScans();
    if (filtered.length === 0) return false;
    return filtered.every(s => this.selectedIds().has(s.scanId));
  });

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

  filteredScans = computed(() => {
    let result = this.scans();

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(s =>
        s.fileName.toLowerCase().includes(query) ||
        s.riskLevel.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query)
      );
    }

    const risk = this.activeRiskFilter();
    if (risk !== 'all') {
      result = result.filter(s => s.riskLevel === risk);
    }

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

  // ── SELECTION MODE ─────────────────────────────────────
  enterSelectionMode(): void {
    this.selectionMode.set(true);
    this.selectedIds.set(new Set());
  }

  exitSelectionMode(): void {
    this.selectionMode.set(false);
    this.selectedIds.set(new Set());
  }

  toggleSelect(event: MouseEvent, scanId: string): void {
    event.stopPropagation();
    event.preventDefault();
    const current = new Set(this.selectedIds());
    if (current.has(scanId)) {
      current.delete(scanId);
    } else {
      current.add(scanId);
    }
    this.selectedIds.set(current);
  }

  isSelected(scanId: string): boolean {
    return this.selectedIds().has(scanId);
  }

  toggleSelectAll(): void {
    const filtered = this.filteredScans();
    if (this.allFilteredSelected()) {
      // Deselect all
      this.selectedIds.set(new Set());
    } else {
      // Select all filtered
      this.selectedIds.set(new Set(filtered.map(s => s.scanId)));
    }
  }

  // ── COMPARE (requires exactly 2 selected) ──────────────
  goToCompare(): void {
    const ids = [...this.selectedIds()];
    if (ids.length !== 2) return;
    this.router.navigate(['/compare'], {
      queryParams: { a: ids[0], b: ids[1] }
    });
  }

  // ── BULK DELETE ────────────────────────────────────────
  openBulkDeleteModal(): void {
    if (this.selectedIds().size === 0) return;
    this.showBulkDeleteModal.set(true);
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteModal.set(false);
  }

  async confirmBulkDelete(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    this.showBulkDeleteModal.set(false);
    this.isBulkDeleting.set(true);

    let successCount = 0;
    let failCount = 0;

    for (const scanId of ids) {
      try {
        await this.scanService.deleteScan(scanId);
        this.scans.update(scans => scans.filter(s => s.scanId !== scanId));
        successCount++;
      } catch {
        failCount++;
      }
    }

    this.selectedIds.set(new Set());
    this.isBulkDeleting.set(false);
    this.selectionMode.set(false);

    if (failCount === 0) {
      this.toast.success(`${successCount} scan${successCount !== 1 ? 's' : ''} deleted successfully.`);
    } else {
      this.toast.error(`${successCount} deleted, ${failCount} failed.`);
    }
  }

  // ── SINGLE DELETE ──────────────────────────────────────
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
      const current = new Set(this.selectedIds());
      current.delete(scan.scanId);
      this.selectedIds.set(current);
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