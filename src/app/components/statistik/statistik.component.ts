import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
      <div class="loading-wrap" *ngIf="loading && !statistik">
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
      </div>

      <!-- ── Ringkasan accordion ───────────────────── -->
      <div class="sum-accordion">
        <div class="sum-toggle" (click)="summaryOpen = !summaryOpen">
          <svg class="sum-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
          <span class="sum-toggle-text">Ringkasan <span class="sum-title-en">(Summary)</span></span>
          <span class="sum-count" *ngIf="sumTotal > 0">{{ sumTotal }} PT</span>
          <span class="sum-chevron">{{ summaryOpen ? '▲' : '▼' }}</span>
        </div>

        <div class="sum-body" *ngIf="summaryOpen">
          <div class="sum-toolbar">
            <span class="sum-info">Menampilkan {{ sumData.length }} dari {{ sumTotal }} PT</span>
            <div class="sum-pagination">
              <button (click)="sumPrev()" [disabled]="sumPage <= 1">‹ Prev</button>
              <span>{{ sumPage }} / {{ sumTotalPages }}</span>
              <button (click)="sumNext()" [disabled]="sumPage >= sumTotalPages">Next ›</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode PT</th>
                  <th>Nama</th>
                  <th>Wilayah</th>
                  <th>Jenis</th>
                  <th>Organisasi</th>
                  <th>Akreditasi</th>
                  <th class="sk-col">No. SK</th>
                  <th>Berlaku s/d</th>
                  <th class="text-center">Prodi</th>
                  <th class="text-right">Mahasiswa</th>
                  <th class="text-right">Dosen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let pt of sumData"
                    [class]="!pt.is_active ? 'row-inactive' : 'row-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)"
                    (click)="goToDetail(pt.id)" style="cursor:pointer">
                  <td><code>{{ pt.kode_pt }}</code></td>
                  <td>
                    <a [routerLink]="['/perguruan-tinggi', pt.id]" class="pt-link">
                      <strong>{{ pt.singkatan }}</strong><br>
                      <small>{{ pt.nama }}</small>
                    </a>
                  </td>
                  <td>{{ pt.wilayah_nama || '—' }}</td>
                  <td>{{ pt.jenis | titlecase }}</td>
                  <td><span [class]="'badge ' + (pt.organisasi_induk === 'muhammadiyah' ? 'badge-muh' : 'badge-ais')">
                    {{ pt.organisasi_induk === 'muhammadiyah' ? 'Muhammadiyah' : 'Aisyiyah' }}
                  </span></td>
                  <td><span [class]="'badge badge-' + pt.akreditasi_institusi">{{ fmtAkr(pt.akreditasi_institusi) }}</span></td>
                  <td class="sk-col">{{ pt.nomor_sk_akreditasi || '—' }}</td>
                  <td class="nowrap">
                    <span *ngIf="pt.tanggal_kadaluarsa_akreditasi"
                          [class]="'exp-pill exp-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)">
                      {{ pt.tanggal_kadaluarsa_akreditasi | date:'dd/MM/yyyy' }}
                    </span>
                    <span *ngIf="!pt.tanggal_kadaluarsa_akreditasi" class="no-data">—</span>
                  </td>
                  <td class="text-center">{{ pt.total_prodi }}</td>
                  <td class="text-right">{{ pt.total_mahasiswa | number }}</td>
                  <td class="text-right">{{ pt.total_dosen | number }}</td>
                  <td><span [class]="pt.is_active ? 'badge badge-aktif' : 'badge badge-nonaktif'">
                    {{ pt.is_active ? 'Aktif' : 'Tidak Aktif' }}
                  </span></td>
                </tr>
                <tr *ngIf="sumLoading"><td colspan="12" class="sum-loading-cell">Memuat...</td></tr>
                <tr *ngIf="!sumLoading && sumData.length === 0"><td colspan="12" class="sum-empty-cell">Tidak ada data</td></tr>
              </tbody>
            </table>
          </div>
          <div class="sum-pagination sum-pagination--bottom">
            <button (click)="sumPrev()" [disabled]="sumPage <= 1">‹ Prev</button>
            <span>Hal {{ sumPage }} / {{ sumTotalPages }}</span>
            <button (click)="sumNext()" [disabled]="sumPage >= sumTotalPages">Next ›</button>
          </div>
        </div>
      </div>

      <!-- Filter Wilayah accordion -->
      <div class="filter-card" *ngIf="wilayahList.length">
        <div class="filter-header" (click)="filterOpen = !filterOpen">
          <span class="filter-title">
            <svg class="filter-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            Filter Wilayah
            <span class="badge-filter">{{ selectedIds.size }} / {{ wilayahList.length }} dipilih</span>
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

    /* ── Ringkasan accordion ─────────────────────────── */
    .sum-accordion {
      background: #fff; border: 1px solid #e8eaf6; border-radius: 14px;
      margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      border-left: 4px solid #1a237e;
    }
    .sum-toggle {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px; cursor: pointer; user-select: none;
      transition: background .15s; color: #1a237e;
    }
    .sum-toggle:hover { background: #f0f4ff; }
    .sum-toggle-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .sum-toggle-text {
      flex: 1; font-size: 14px; font-weight: 700; color: #1a237e;
    }
    .sum-title-en { font-weight: 400; color: #64748b; font-size: 13px; }
    .sum-count {
      font-size: 11px; font-weight: 600; padding: 2px 10px;
      background: #e8eaf6; color: #1a237e; border-radius: 20px;
    }
    .sum-chevron { font-size: 11px; color: #94a3b8; }

    .sum-body { border-top: 1px solid #e8eaf6; padding: 14px 20px 20px; }

    .sum-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 8px; margin-bottom: 10px;
    }
    .sum-info { font-size: 12px; color: #94a3b8; }
    .sum-pagination { display: flex; align-items: center; gap: 6px; }
    .sum-pagination span { font-size: 12px; color: #555; white-space: nowrap; }
    .sum-pagination button {
      padding: 3px 10px; border: 1px solid #ddd; border-radius: 6px;
      background: #fff; cursor: pointer; font-size: 12px; transition: background .15s;
    }
    .sum-pagination button:hover:not(:disabled) { background: #e8eaf6; }
    .sum-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .sum-pagination--bottom { justify-content: center; margin-top: 12px; }

    .sum-loading-cell, .sum-empty-cell {
      text-align: center; padding: 24px; color: #94a3b8; font-size: 13px;
    }

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
    .badge-filter {
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

    /* ── PT Table (same as halaman PT) ──────────────── */
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      text-align: left; padding: 8px 10px; background: #f8f9fa;
      font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr.row-yellow td { background: #fffbec; }
    tr.row-red    td { background: #fff4f4; }
    tr.row-inactive td { background: #fff0f0; }
    tr:hover td { background: #dbeafe !important; cursor: pointer; }
    .pt-link { text-decoration: none; color: inherit; }
    .pt-link:hover strong { color: #1a237e; text-decoration: underline; }
    small { color: #888; font-size: 11px; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 4px; font-size: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-muh { background: #e3f2fd; color: #1565c0; }
    .badge-ais { background: #fce4ec; color: #c62828; }
    .badge-unggul { background: #e6f4ea; color: #137333; }
    .badge-baik_sekali { background: #e8f5e9; color: #2e7d32; }
    .badge-baik { background: #fff8e1; color: #f57f17; }
    .badge-belum { background: #f1f3f4; color: #5f6368; }
    .badge-aktif { background: #e6f4ea; color: #137333; }
    .badge-nonaktif { background: #fce8e6; color: #c5221f; }
    .text-center { text-align: center; }
    .text-right  { text-align: right; }
    .nowrap { white-space: nowrap; }
    .sk-col { display: none; }
    .no-data { color: #bbb; }
    .exp-pill {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-weight: 700; color: #111; font-size: 12px; white-space: nowrap;
    }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }

    /* ── Wilayah table extras ────────────────────────── */
    .col-num  { text-align: right; }
    .col-prov { color: #64748b; font-size: 12px; }
    .col-bar  { min-width: 100px; }

    /* ── Tablet / Desktop ────────────────────────────── */
    @media (min-width: 600px) {
      .sk-col { display: table-cell; font-size: 11px; color: #555; }
      th, td { padding: 10px 12px; font-size: 13px; }
    }
    @media (min-width: 1024px) {
      th, td { padding: 10px 14px; }
    }
  `]
})
export class StatistikComponent implements OnInit {
  statistik: any;
  loading = true;
  wilayahList: any[] = [];
  selectedIds = new Set<number>();
  filterOpen = false;

  // Ringkasan summary
  summaryOpen = true;
  sumData: any[] = [];
  sumPage = 1;
  sumTotal = 0;
  sumLoading = false;
  private readonly SUM_PAGE_SIZE = 5;

  private debounceTimer: any;

  constructor(private api: ApiService, private router: Router) {}

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
    this.loadSummary();
  }

  // ── Ringkasan ──────────────────────────────────────
  get sumTotalPages() { return Math.max(1, Math.ceil(this.sumTotal / this.SUM_PAGE_SIZE)); }

  loadSummary() {
    this.sumLoading = true;
    this.api.getPerguruanTinggiList({
      page: this.sumPage,
      page_size: this.SUM_PAGE_SIZE,
      ordering: '-mhs_sort'
    }).subscribe({
      next: (res: any) => {
        this.sumData  = res.results || res;
        this.sumTotal = res.count || this.sumData.length;
        this.sumLoading = false;
      },
      error: () => this.sumLoading = false
    });
  }

  sumNext() { if (this.sumPage < this.sumTotalPages) { this.sumPage++; this.loadSummary(); } }
  sumPrev() { if (this.sumPage > 1) { this.sumPage--; this.loadSummary(); } }

  goToDetail(id: number) { this.router.navigate(['/perguruan-tinggi', id]); }

  expStatus(tgl: string): string {
    if (!tgl) return '';
    const diff = (new Date(tgl).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 60) return 'red';
    if (diff < 90) return 'yellow';
    return 'green';
  }

  // ── Statistik / filter wilayah ──────────────────────
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
