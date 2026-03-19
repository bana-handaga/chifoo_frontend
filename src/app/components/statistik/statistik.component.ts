import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-statistik',
  template: `
    <div class="page-wrap">

      <!-- Page header -->
      <div class="page-header">
        <div class="page-header__title">
          <h1>Laporan Performa Perguruan Tinggi</h1>
          <p class="page-header__sub">Analisis data dan performa perguruan tinggi Muhammadiyah &amp; Aisyiyah</p>
        </div>
      </div>

      <!-- Loading bar -->
      <div class="loading-wrap" *ngIf="loading">
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
      </div>

      <!-- Filter Wilayah accordion -->
      <div class="filter-card" *ngIf="wilayahList.length">
        <div class="filter-header" (click)="filterOpen = !filterOpen">
          <span class="filter-title">
            <svg class="filter-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            Filter Wilayah
            <span class="badge">{{ selectedIds.size }} / {{ wilayahList.length }} dipilih</span>
          </span>
          <span class="chevron">{{ filterOpen ? '▲' : '▼' }}</span>
        </div>
        <div class="filter-body" *ngIf="filterOpen">
          <div class="filter-actions">
            <button (click)="selectAll()">Pilih Semua</button>
            <button (click)="clearAll()">Hapus Semua</button>
          </div>
          <div class="wilayah-grid">
            <label *ngFor="let w of wilayahList" class="wilayah-item"
                   [class.selected]="selectedIds.has(w.id)">
              <input type="checkbox" [checked]="selectedIds.has(w.id)" (change)="toggleWilayah(w.id)">
              <span class="w-nama">{{ w.nama }}</span>
            </label>
          </div>
        </div>
      </div>

      <ng-container *ngIf="statistik && !loading">

        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card stat-card--blue">
            <div class="stat-card__icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val">{{ statistik.total_pt | number }}</div>
            <div class="stat-card__lbl">Total Perguruan Tinggi</div>
            <div class="stat-card__sub">{{ statistik.total_muhammadiyah }} Muhammadiyah · {{ statistik.total_aisyiyah }} Aisyiyah</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_prodi | number }}</div>
            <div class="stat-card__lbl stat-card__lbl--dark">Program Studi Aktif</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_mahasiswa | number }}</div>
            <div class="stat-card__lbl stat-card__lbl--dark">Total Mahasiswa</div>
          </div>
        </div>

        <!-- Bar charts row -->
        <div class="charts-row charts-row--bar">
          <div class="chart-card">
            <div class="chart-card__title">Distribusi Jenis PT</div>
            <div class="chart-list">
              <div class="chart-bar-item" *ngFor="let item of statistik.per_jenis">
                <div class="bar-label">{{ item.jenis | titlecase }}</div>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="(item.total / statistik.total_pt * 100)"></div>
                </div>
                <div class="bar-val">{{ item.total }}</div>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-card__title">Status Akreditasi Institusi</div>
            <div class="chart-list">
              <div class="chart-bar-item" *ngFor="let item of statistik.per_akreditasi">
                <div class="bar-label">{{ fmtAkr(item.akreditasi_institusi) }}</div>
                <div class="bar-track">
                  <div class="bar-fill bar-fill--green" [style.width.%]="(item.total / statistik.total_pt * 100)"></div>
                </div>
                <div class="bar-val">{{ item.total }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sebaran per Wilayah table -->
        <div class="chart-card">
          <div class="chart-card__title">Sebaran per Wilayah</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Wilayah</th>
                  <th>Provinsi</th>
                  <th class="col-num">Jumlah PT</th>
                  <th>Distribusi</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let w of statistik.per_wilayah">
                  <td>{{ w.wilayah__nama }}</td>
                  <td class="col-prov">{{ w.wilayah__provinsi }}</td>
                  <td class="col-num"><strong>{{ w.total }}</strong></td>
                  <td class="col-bar">
                    <div class="bar-track sm">
                      <div class="bar-fill" [style.width.%]="(w.total / statistik.total_pt * 100)"></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </ng-container>

    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────── */
    .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 40px; }

    /* ── Page header ─────────────────────────────────── */
    .page-header { margin-bottom: 24px; }
    .page-header__title h1 { font-size: 22px; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
    .page-header__sub { color: #64748b; font-size: 13px; margin: 0; }

    /* ── Loading ─────────────────────────────────────── */
    .loading-wrap { margin-bottom: 16px; }
    .loading-bar { height: 3px; background: #e8eaf6; border-radius: 2px; overflow: hidden; }
    .loading-bar-fill {
      height: 100%; width: 40%; background: #1a237e;
      animation: slide 1s ease-in-out infinite alternate;
    }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

    /* ── Filter card ─────────────────────────────────── */
    .filter-card {
      background: #fff; border: 1px solid #e8eaf6; border-radius: 14px;
      margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .filter-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; cursor: pointer; user-select: none; transition: background .15s;
    }
    .filter-header:hover { background: #f5f7ff; }
    .filter-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 600; color: #334155;
    }
    .filter-icon { width: 18px; height: 18px; color: #1a237e; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      background: #e8eaf6; color: #1a237e; border-radius: 20px;
    }
    .chevron { font-size: 11px; color: #94a3b8; }
    .filter-body { padding: 14px 20px 18px; border-top: 1px solid #f0f4f8; }
    .filter-actions { display: flex; gap: 8px; margin-bottom: 12px; }
    .filter-actions button {
      padding: 4px 14px; font-size: 12px; border: 1px solid #1a237e;
      border-radius: 6px; cursor: pointer; background: #fff; color: #1a237e; transition: all .15s;
    }
    .filter-actions button:hover { background: #1a237e; color: #fff; }
    .wilayah-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 6px; max-height: 240px; overflow-y: auto;
    }
    .wilayah-item {
      display: flex; align-items: center; gap: 8px; padding: 6px 10px;
      border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0;
      font-size: 12px; font-weight: 500; color: #334155; transition: background .12s, border-color .12s;
    }
    .wilayah-item:hover { background: #f0f4ff; }
    .wilayah-item.selected { background: #e8eaf6; border-color: #9fa8da; }
    .wilayah-item input[type=checkbox] { flex-shrink: 0; cursor: pointer; }

    /* ── Stat grid ───────────────────────────────────── */
    .stat-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px; margin-bottom: 20px;
    }
    .stat-card {
      border-radius: 14px; padding: 20px 22px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-card--blue  { background: #1a237e; }
    .stat-card--light { background: #fff; border: 1px solid #e8eaf6; }
    .stat-card__icon { width: 32px; height: 32px; margin-bottom: 6px; }
    .stat-card__icon svg { width: 100%; height: 100%; }
    .stat-card--blue .stat-card__icon { color: #c5cae9; }
    .stat-card__icon--dark { color: #1a237e; }
    .stat-card__val { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .stat-card--blue .stat-card__val { color: #fff; }
    .stat-card__val--dark { color: #1a237e; }
    .stat-card__lbl { font-size: 12px; font-weight: 600; }
    .stat-card--blue .stat-card__lbl { color: #c5cae9; }
    .stat-card__lbl--dark { color: #64748b; }
    .stat-card__sub { font-size: 11px; margin-top: 2px; color: #9fa8da; }

    /* ── Chart card ──────────────────────────────────── */
    .chart-card {
      background: #fff; border: 1px solid #e8eaf6; border-radius: 14px;
      padding: 20px; margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .chart-card__title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 16px; }

    /* ── Charts rows ─────────────────────────────────── */
    .charts-row { display: grid; gap: 16px; margin-bottom: 20px; }
    .charts-row--bar { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .charts-row .chart-card { margin-bottom: 0; }

    /* ── Bar charts ──────────────────────────────────── */
    .chart-list { display: flex; flex-direction: column; gap: 10px; }
    .chart-bar-item { display: flex; align-items: center; gap: 8px; }
    .bar-label { width: 110px; font-size: 12px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-track.sm { height: 6px; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width .5s; }
    .bar-fill--green { background: #137333; }
    .bar-val { width: 28px; text-align: right; font-size: 12px; font-weight: 600; color: #333; }

    /* ── Wilayah table ───────────────────────────────── */
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      padding: 10px 14px; background: #f8f9fa; text-align: left;
      font-size: 12px; font-weight: 600; color: #64748b;
      border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    td { padding: 10px 14px; border-bottom: 1px solid #f0f4f8; color: #334155; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(26,35,126,.04); }
    .col-num { text-align: right; }
    .col-prov { color: #64748b; font-size: 12px; }
    .col-bar { min-width: 100px; }
  `]
})
export class StatistikComponent implements OnInit {
  statistik: any;
  loading = true;
  wilayahList: any[] = [];
  selectedIds = new Set<number>();
  filterOpen = false;

  private debounceTimer: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getWilayahList().subscribe({
      next: (d: any) => {
        const list = Array.isArray(d) ? d : (d.results || []);
        this.wilayahList = list.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        this.wilayahList.forEach((w: any) => this.selectedIds.add(w.id));
        this.selectedIds = new Set(this.selectedIds);
      }
    });
    this.loadStatistik();
  }

  toggleWilayah(id: number) {
    const next = new Set(this.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds = next;
    this.scheduleReload();
  }

  selectAll() {
    this.selectedIds = new Set(this.wilayahList.map((w: any) => w.id));
    this.scheduleReload();
  }

  clearAll() {
    this.selectedIds = new Set();
    this.scheduleReload();
  }

  private scheduleReload() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.loadStatistik(), 300);
  }

  loadStatistik() {
    this.loading = true;
    const allSelected = this.selectedIds.size === this.wilayahList.length || this.selectedIds.size === 0;
    const ids = allSelected ? [] : Array.from(this.selectedIds);
    this.api.getStatistikPT(ids).subscribe({
      next: d => { this.statistik = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  fmtAkr(v: string) { return ({ unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' } as any)[v] || v; }
}
