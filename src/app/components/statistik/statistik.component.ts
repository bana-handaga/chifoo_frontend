import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-statistik',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Statistik PTMA</h1>
        <p>Analisis data perguruan tinggi Muhammadiyah & Aisyiyah</p>
      </div>

      <!-- Wilayah checklist panel -->
      <div class="filter-card" *ngIf="wilayahList.length">
        <div class="filter-header" (click)="filterOpen = !filterOpen">
          <span class="filter-title">
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
              <input type="checkbox"
                     [checked]="selectedIds.has(w.id)"
                     (change)="toggleWilayah(w.id)">
              <span class="w-nama">{{ w.nama }}</span>
              <span class="w-prov">{{ w.provinsi }}</span>
            </label>
          </div>
        </div>
      </div>

      <div *ngIf="statistik && !loading">
        <div class="stats-overview">
          <div class="stat-box">
            <div class="val">{{ statistik.total_pt }}</div><div class="lbl">Total PT</div>
          </div>
          <div class="stat-box">
            <div class="val">{{ statistik.total_muhammadiyah }}</div><div class="lbl">Muhammadiyah</div>
          </div>
          <div class="stat-box">
            <div class="val">{{ statistik.total_aisyiyah }}</div><div class="lbl">Aisyiyah</div>
          </div>
          <div class="stat-box">
            <div class="val">{{ statistik.total_prodi }}</div><div class="lbl">Program Studi</div>
          </div>
          <div class="stat-box">
            <div class="val">{{ statistik.total_mahasiswa | number }}</div><div class="lbl">Mahasiswa</div>
          </div>
        </div>

        <div class="two-col">
          <div class="card">
            <h3>Distribusi Jenis PT</h3>
            <div *ngFor="let item of statistik.per_jenis" class="bar-row">
              <div class="bar-lbl">{{ item.jenis | titlecase }}</div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="(item.total/statistik.total_pt*100)"></div></div>
              <div class="bar-num">{{ item.total }}</div>
            </div>
          </div>
          <div class="card">
            <h3>Distribusi Akreditasi</h3>
            <div *ngFor="let item of statistik.per_akreditasi" class="bar-row">
              <div class="bar-lbl">{{ fmtAkr(item.akreditasi_institusi) }}</div>
              <div class="bar-track"><div class="bar-fill green" [style.width.%]="(item.total/statistik.total_pt*100)"></div></div>
              <div class="bar-num">{{ item.total }}</div>
            </div>
          </div>
        </div>

        <div class="card mt-16">
          <h3>Top 5 Wilayah</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Wilayah</th><th>Provinsi</th><th>Jumlah PT</th><th>Distribusi</th></tr></thead>
              <tbody>
                <tr *ngFor="let w of statistik.per_wilayah">
                  <td>{{ w.wilayah__nama }}</td>
                  <td>{{ w.wilayah__provinsi }}</td>
                  <td><strong>{{ w.total }}</strong></td>
                  <td>
                    <div class="bar-track sm"><div class="bar-fill" [style.width.%]="(w.total/statistik.total_pt*100)"></div></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Loading skeleton saat filter berubah -->
      <div class="loading-bar" *ngIf="loading">
        <div class="loading-bar-fill"></div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 16px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #1a237e; }
    .page-header p { color: #666; font-size: 13px; }

    /* ── Filter card ──────────────────────── */
    .filter-card {
      background: white; border-radius: 12px; margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;
    }
    .filter-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; cursor: pointer; user-select: none;
      border-bottom: 1px solid transparent; transition: background 0.15s;
    }
    .filter-header:hover { background: #f5f5f5; }
    .filter-title { font-size: 14px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 10px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      background: #e8eaf6; color: #1a237e; border-radius: 20px;
    }
    .chevron { font-size: 11px; color: #999; }

    .filter-body { padding: 12px 20px 16px; border-top: 1px solid #f0f0f0; }
    .filter-actions { display: flex; gap: 8px; margin-bottom: 12px; }
    .filter-actions button {
      padding: 4px 12px; font-size: 12px; border: 1px solid #1a237e;
      border-radius: 5px; cursor: pointer; background: white; color: #1a237e;
      transition: all 0.15s;
    }
    .filter-actions button:hover { background: #1a237e; color: white; }

    .wilayah-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 6px; max-height: 260px; overflow-y: auto;
    }
    .wilayah-item {
      display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px;
      border-radius: 6px; cursor: pointer; border: 1px solid #eee;
      transition: background 0.12s, border-color 0.12s;
    }
    .wilayah-item:hover { background: #f5f7ff; }
    .wilayah-item.selected { background: #e8eaf6; border-color: #9fa8da; }
    .wilayah-item input[type=checkbox] { margin-top: 2px; flex-shrink: 0; cursor: pointer; }
    .w-nama { font-size: 12px; font-weight: 600; color: #333; line-height: 1.3; }
    .w-prov { font-size: 11px; color: #888; display: none; }

    /* ── Stats ────────────────────────────── */
    .stats-overview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-box {
      background: white; border-radius: 10px; padding: 16px 12px;
      text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .val { font-size: 28px; font-weight: 700; color: #1a237e; }
    .lbl { font-size: 12px; color: #666; margin-top: 4px; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h3 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; }

    .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .bar-lbl { width: 120px; font-size: 13px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-track.sm { height: 6px; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width 0.5s; }
    .bar-fill.green { background: #137333; }
    .bar-num { width: 28px; text-align: right; font-size: 13px; font-weight: 600; }

    .mt-16 { margin-top: 16px; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { padding: 10px 12px; background: #f8f9fa; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }

    /* ── Loading bar ──────────────────────── */
    .loading-bar {
      height: 3px; background: #e8eaf6; border-radius: 2px;
      overflow: hidden; margin-bottom: 12px;
    }
    .loading-bar-fill {
      height: 100%; width: 40%; background: #1a237e;
      animation: slide 1s ease-in-out infinite alternate;
    }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

    /* Tablet */
    @media (max-width: 1024px) {
      .two-col { grid-template-columns: 1fr; }
      .stats-overview { grid-template-columns: repeat(3, 1fr); }
      .wilayah-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    }

    /* Mobile */
    @media (max-width: 767px) {
      .page-header h1 { font-size: 18px; }
      .stats-overview { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-box { padding: 12px 8px; }
      .val { font-size: 22px; }
      .card { padding: 14px; }
      .bar-lbl { width: 90px; font-size: 12px; }
      th, td { padding: 8px 10px; font-size: 12px; }
      .wilayah-grid { grid-template-columns: 1fr 1fr; max-height: 200px; }
      .filter-header { padding: 10px 14px; }
      .filter-body { padding: 10px 14px 12px; }
    }

    @media (max-width: 400px) {
      .stats-overview { grid-template-columns: repeat(2, 1fr); }
      .wilayah-grid { grid-template-columns: 1fr; }
    }
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
        // Semua dipilih secara default
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
    // Jika semua dipilih atau tidak ada yang dipilih → tanpa filter (data global)
    const allSelected = this.selectedIds.size === this.wilayahList.length || this.selectedIds.size === 0;
    const ids = allSelected ? [] : Array.from(this.selectedIds);
    this.api.getStatistikPT(ids).subscribe({
      next: d => { this.statistik = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  fmtAkr(v: string) { return ({ unggul:'Unggul', baik_sekali:'Baik Sekali', baik:'Baik', belum:'Belum' } as any)[v] || v; }
}
