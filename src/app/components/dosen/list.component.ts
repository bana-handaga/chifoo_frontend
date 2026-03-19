import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dosen-list',
  template: `
<div class="page-wrap">

  <!-- Header -->
  <div class="page-header">
    <div class="page-header__title">
      <h1>Data Dosen PTMA</h1>
      <p class="page-header__sub">Profil dosen Perguruan Tinggi Muhammadiyah & Aisyiyah</p>
      <div class="periode-badge" *ngIf="periodeLabel">
        <span class="periode-badge__dot"></span>
        Periode Pelaporan Aktif: <strong>{{ periodeLabel }}</strong>
      </div>
    </div>
  </div>

  <!-- Accordion Pencarian -->
  <div class="search-accordion" [class.open]="searchOpen">
    <button class="search-toggle" (click)="toggleSearch()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Cari Dosen
      <span class="search-toggle__chevron" [class.rotated]="searchOpen">▾</span>
    </button>

    <div class="search-body" *ngIf="searchOpen">
      <div class="search-fields">
        <div class="sf">
          <label>Nama Dosen</label>
          <input type="text" [(ngModel)]="searchForm.nama" placeholder="Ketik nama dosen..." (keyup.enter)="runSearch()">
        </div>
        <div class="sf">
          <label>Jabatan Fungsional</label>
          <select [(ngModel)]="searchForm.jabatan">
            <option value="">— Semua —</option>
            <option value="Profesor">Profesor</option>
            <option value="Lektor Kepala">Lektor Kepala</option>
            <option value="Lektor">Lektor</option>
            <option value="Asisten Ahli">Asisten Ahli</option>
          </select>
        </div>
        <div class="sf">
          <label>Pendidikan</label>
          <select [(ngModel)]="searchForm.pendidikan">
            <option value="">— Semua —</option>
            <option value="s3">S3</option>
            <option value="s2">S2</option>
            <option value="s1">S1</option>
            <option value="profesi">Profesi</option>
          </select>
        </div>
        <div class="sf">
          <label>Status</label>
          <select [(ngModel)]="searchForm.status">
            <option value="">— Semua —</option>
            <option value="Aktif">Aktif</option>
            <option value="TUGAS BELAJAR">Tugas Belajar</option>
            <option value="IJIN BELAJAR">Ijin Belajar</option>
            <option value="CUTI">Cuti</option>
          </select>
        </div>
        <div class="sf sf--action">
          <button class="btn-search" (click)="runSearch()" [disabled]="searching">
            {{ searching ? 'Mencari...' : 'Cari' }}
          </button>
          <button class="btn-reset" (click)="resetSearch()">Reset</button>
        </div>
      </div>

      <!-- Hasil -->
      <div class="search-results" *ngIf="searchDone">
        <div class="search-results__header">
          <div class="search-results__info">
            Ditemukan <strong>{{ searchTotal | number }}</strong> dosen
            <span *ngIf="searchTotalPages > 1"> — halaman {{ searchPage }} / {{ searchTotalPages }}</span>
          </div>
          <div class="pagination" *ngIf="searchTotalPages > 1">
            <button [disabled]="searchPage===1" (click)="goPage(searchPage-1)">‹ Prev</button>
            <span>{{ searchPage }} / {{ searchTotalPages }}</span>
            <button [disabled]="searchPage===searchTotalPages" (click)="goPage(searchPage+1)">Next ›</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="result-table">
            <thead>
              <tr>
                <th (click)="setSort('nama')" class="sortable">
                  Nama <span class="sort-icon">{{ sortIcon('nama') }}</span>
                </th>
                <th>NIDN</th>
                <th>NUPTK</th>
                <th (click)="setSort('perguruan_tinggi__nama')" class="sortable">
                  Perguruan Tinggi <span class="sort-icon">{{ sortIcon('perguruan_tinggi__nama') }}</span>
                </th>
                <th (click)="setSort('program_studi_nama')" class="sortable">
                  Program Studi <span class="sort-icon">{{ sortIcon('program_studi_nama') }}</span>
                </th>
                <th (click)="setSort('jabatan_fungsional')" class="sortable">
                  Jabatan <span class="sort-icon">{{ sortIcon('jabatan_fungsional') }}</span>
                </th>
                <th (click)="setSort('pendidikan_tertinggi')" class="sortable">
                  Pend. <span class="sort-icon">{{ sortIcon('pendidikan_tertinggi') }}</span>
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of searchResults">
                <td>{{ d.nama }}</td>
                <td class="mono">{{ d.nidn || '—' }}</td>
                <td class="mono">{{ d.nuptk || '—' }}</td>
                <td>{{ d.pt_singkatan }}</td>
                <td>{{ d.program_studi_nama }}</td>
                <td><span [class]="jabatanClass(d.jabatan_fungsional)">{{ d.jabatan_fungsional || '—' }}</span></td>
                <td>{{ d.pendidikan_tertinggi?.toUpperCase() }}</td>
                <td><span class="status-chip" [class.aktif]="d.status==='Aktif'">{{ d.status }}</span></td>
              </tr>
              <tr *ngIf="!searchResults.length">
                <td colspan="8" class="empty-row">Tidak ada hasil ditemukan</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="pagination" *ngIf="searchTotalPages > 1">
          <button [disabled]="searchPage===1" (click)="goPage(searchPage-1)">‹ Prev</button>
          <span>{{ searchPage }} / {{ searchTotalPages }}</span>
          <button [disabled]="searchPage===searchTotalPages" (click)="goPage(searchPage+1)">Next ›</button>
        </div>
      </div>
    </div>
  </div>

  <div *ngIf="loading" class="loading-wrap">
    <div class="spinner"></div><span>Memuat data...</span>
  </div>

  <ng-container *ngIf="!loading && stats">

    <!-- Stat boxes -->
    <div class="stat-grid">
      <div class="stat-card stat-card--blue">
        <div class="stat-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>
        <div class="stat-card__val">{{ stats.total_dosen | number }}</div>
        <div class="stat-card__lbl">Total Dosen</div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ stats.total_tetap | number }}</div>
        <div class="stat-card__lbl stat-card__lbl--dark">Dosen Tetap</div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ stats.total_s3 | number }}</div>
        <div class="stat-card__lbl stat-card__lbl--dark">Bergelar S3</div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ stats.total_profesor | number }}</div>
        <div class="stat-card__lbl stat-card__lbl--dark">Profesor / Guru Besar</div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ stats.total_aktif | number }}</div>
        <div class="stat-card__lbl stat-card__lbl--dark">Dosen Aktif</div>
      </div>
    </div>

    <!-- Row 1: Pie charts -->
    <div class="charts-row charts-row--pie">

      <!-- Jenis Kelamin -->
      <div class="chart-card">
        <div class="chart-card__title">Distribusi Jenis Kelamin</div>
        <div class="chart-card__body chart-card__body--pie">
          <canvas #jkChart></canvas>
        </div>
      </div>

      <!-- Pendidikan Tertinggi -->
      <div class="chart-card">
        <div class="chart-card__title">Distribusi Pendidikan Tertinggi</div>
        <div class="chart-card__body chart-card__body--pie">
          <canvas #pendChart></canvas>
        </div>
      </div>

      <!-- Status Dosen -->
      <div class="chart-card">
        <div class="chart-card__title">Distribusi Status Dosen</div>
        <div class="chart-card__body chart-card__body--pie">
          <canvas #statusChart></canvas>
        </div>
      </div>

    </div>

    <!-- Row 2: Bar charts -->
    <div class="charts-row charts-row--bar">

      <!-- Jabatan Fungsional -->
      <div class="chart-card">
        <div class="chart-card__title">Distribusi Jabatan Fungsional</div>
        <div class="chart-card__body">
          <canvas #jabatanChart></canvas>
        </div>
      </div>

      <!-- Per Wilayah -->
      <div class="chart-card">
        <div class="chart-card__title">Sebaran Dosen per Wilayah</div>
        <div class="chart-card__body">
          <canvas #wilayahChart></canvas>
        </div>
      </div>

    </div>

    <!-- Row 3: Top PT -->
    <div class="chart-card chart-card--full">
      <div class="chart-card__title">Top 20 PT — Dosen Terbanyak</div>
      <div class="chart-card__body chart-card__body--bar-lg">
        <canvas #ptChart></canvas>
      </div>
    </div>

  </ng-container>
</div>
  `,
  styles: [`
    .page-wrap { padding: 1.25rem; max-width: 1400px; margin: 0 auto; }

    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .page-header__sub { color: #64748b; font-size: .875rem; margin: .25rem 0 0; }

    .periode-badge {
      display: inline-flex; align-items: center; gap: .4rem;
      margin-top: .6rem;
      padding: .3rem .75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      font-size: .8rem; color: #1e40af;
    }
    .periode-badge strong { font-weight: 700; }
    .periode-badge__dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #3b82f6;
      animation: pulse-dot 1.8s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .5; transform: scale(.7); }
    }

    /* ── Search Accordion ─────────────────────────── */
    .search-accordion {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      margin-bottom: 1rem; overflow: hidden;
    }
    .search-toggle {
      width: 100%; display: flex; align-items: center; gap: .5rem;
      padding: .85rem 1.25rem; border: none; background: none;
      font-size: .9rem; font-weight: 600; color: #334155; cursor: pointer;
      text-align: left;
    }
    .search-toggle:hover { background: #f8fafc; }
    .search-toggle svg { width: 16px; height: 16px; stroke: #3b82f6; flex-shrink: 0; }
    .search-toggle__chevron { margin-left: auto; font-size: .8rem; transition: transform .2s; }
    .search-toggle__chevron.rotated { transform: rotate(180deg); }

    .search-body { padding: 0 1.25rem 1.25rem; border-top: 1px solid #f1f5f9; }

    .search-fields {
      display: grid; gap: .75rem;
      grid-template-columns: 1fr;
      padding-top: 1rem;
    }
    @media (min-width: 600px)  { .search-fields { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .search-fields { grid-template-columns: repeat(5, 1fr); } }

    .sf { display: flex; flex-direction: column; gap: .3rem; }
    .sf label { font-size: .75rem; font-weight: 600; color: #64748b; }
    .sf input, .sf select {
      padding: .45rem .65rem; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: .85rem; color: #1e293b;
      background: #f8fafc; outline: none;
    }
    .sf input:focus, .sf select:focus { border-color: #3b82f6; background: #fff; }
    .sf--action { flex-direction: row; align-items: flex-end; gap: .5rem; }

    .btn-search {
      flex: 1; padding: .5rem; border: none; border-radius: 8px;
      background: #3b82f6; color: #fff; font-weight: 600;
      font-size: .85rem; cursor: pointer;
    }
    .btn-search:disabled { opacity: .6; cursor: not-allowed; }
    .btn-search:hover:not(:disabled) { background: #2563eb; }
    .btn-reset {
      padding: .5rem .9rem; border: 1px solid #e2e8f0; border-radius: 8px;
      background: #fff; color: #64748b; font-size: .85rem; cursor: pointer;
    }
    .btn-reset:hover { background: #f1f5f9; }

    /* Hasil pencarian */
    .search-results { margin-top: 1rem; }
    .search-results__header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: .5rem; margin-bottom: .5rem;
    }
    .search-results__header .pagination { margin-top: 0; }
    .search-results__info { font-size: .82rem; color: #64748b; }
    .search-results__info strong { color: #1e293b; }

    .table-wrap { overflow-x: auto; border-radius: 10px; background: rgba(59,130,246,.05); }
    .result-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .result-table th {
      background: rgba(59,130,246,.08); padding: .55rem .75rem;
      text-align: left; font-weight: 600; color: #475569;
      border-bottom: 2px solid rgba(59,130,246,.15); white-space: nowrap;
    }
    .result-table th.sortable { cursor: pointer; user-select: none; }
    .result-table th.sortable:hover { background: rgba(59,130,246,.14); color: #1d4ed8; }
    .sort-icon { font-style: normal; font-size: .72rem; color: #94a3b8; margin-left: .2rem; }
    .result-table td {
      padding: .5rem .75rem; border-bottom: 1px solid rgba(59,130,246,.08);
      color: #1e293b; vertical-align: middle;
    }
    .result-table tr:hover td { background: rgba(59,130,246,.06); }
    .mono { font-family: monospace; font-size: .78rem; color: #64748b; }
    .empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }

    .jabatan-chip {
      display: inline-block; padding: .2rem .55rem;
      border-radius: 20px; font-size: .75rem; font-weight: 600;
      background: #f1f5f9; color: #475569;
    }
    .jabatan-chip--profesor { background: #fef9c3; color: #854d0e; }
    .jabatan-chip--lektor-kepala { background: #dbeafe; color: #1e40af; }
    .jabatan-chip--lektor { background: #e0f2fe; color: #0369a1; }
    .jabatan-chip--asisten-ahli { background: #f0fdf4; color: #166534; }

    .status-chip {
      display: inline-block; padding: .2rem .55rem;
      border-radius: 20px; font-size: .75rem;
      background: #f1f5f9; color: #64748b;
    }
    .status-chip.aktif { background: #dcfce7; color: #166534; }

    .pagination {
      display: flex; align-items: center; gap: .75rem;
      justify-content: center; margin-top: .75rem; font-size: .83rem;
    }
    .pagination button {
      padding: .35rem .85rem; border: 1px solid #e2e8f0;
      border-radius: 8px; background: #fff; cursor: pointer; color: #334155;
    }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .pagination button:hover:not(:disabled) { background: #f1f5f9; }

    .loading-wrap { display: flex; align-items: center; gap: .75rem; color: #64748b; padding: 2rem; }
    .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Stat grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: .75rem;
      margin-bottom: 1.25rem;
    }
    @media (min-width: 600px)  { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1024px) { .stat-grid { grid-template-columns: repeat(5, 1fr); } }

    .stat-card {
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: .25rem;
      color: #fff;
    }
    .stat-card--blue  { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .stat-card--light {
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }

    .stat-card__icon { width: 28px; height: 28px; opacity: .9; }
    .stat-card__icon--dark { opacity: .45; }
    .stat-card__icon svg { width: 100%; height: 100%; }

    .stat-card__val  { font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .stat-card__val--dark { color: #1e293b; }
    .stat-card__lbl  { font-size: .8rem; opacity: .88; }
    .stat-card__lbl--dark { color: #64748b; opacity: 1; }

    /* Chart rows */
    .charts-row { display: grid; gap: .75rem; margin-bottom: .75rem; }
    .charts-row--pie { grid-template-columns: 1fr; }
    .charts-row--bar { grid-template-columns: 1fr; }
    @media (min-width: 600px)  {
      .charts-row--pie { grid-template-columns: repeat(2, 1fr); }
      .charts-row--bar { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .charts-row--pie { grid-template-columns: repeat(3, 1fr); }
    }

    .chart-card {
      background: #fff;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
    }
    .chart-card--full { margin-bottom: .75rem; }

    .chart-card__title {
      font-size: .875rem; font-weight: 600; color: #334155;
      margin-bottom: .75rem;
    }
    .chart-card__body { position: relative; height: 220px; }
    .chart-card__body--pie { height: 200px; }
    .chart-card__body--bar-lg { height: 480px; }

    .chart-card__body--pie { display: flex; align-items: center; }
  `]
})
export class DosenListComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('jkChart')      jkChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pendChart')    pendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart')  statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('jabatanChart') jabatanChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wilayahChart') wilayahChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ptChart')      ptChartRef!: ElementRef<HTMLCanvasElement>;

  stats: any = null;
  periodeLabel = '';
  loading = true;
  private chartsRendered = false;

  // Search accordion
  searchOpen    = false;
  searching     = false;
  searchDone    = false;
  searchTotal   = 0;
  searchPage    = 1;
  searchTotalPages = 1;
  searchResults: any[] = [];
  searchForm = { nama: '', jabatan: '', pendidikan: '', status: '' };
  sortField = 'nama';
  sortDir   = 'asc';

  private chartJk:      Chart | null = null;
  private chartPend:    Chart | null = null;
  private chartStatus:  Chart | null = null;
  private chartJabatan: Chart | null = null;
  private chartWilayah: Chart | null = null;
  private chartPt:      Chart | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getPeriodeAktif().subscribe({
      next: (p: any) => {
        if (p?.tahun_akademik) {
          const sem = p.semester === 'ganjil' ? 'Ganjil' : 'Genap';
          this.periodeLabel = `${sem} ${p.tahun_akademik}`;
        }
      }
    });
    this.api.getDosenStats().subscribe({
      next: (data) => { this.stats = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; }
    });
  }

  ngAfterViewChecked() {
    if (this.stats && !this.chartsRendered && this.jkChartRef) {
      this.chartsRendered = true;
      this.renderAll();
    }
  }

  toggleSearch() { this.searchOpen = !this.searchOpen; }

  setSort(field: string) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.runSearch(1);
  }

  sortIcon(field: string): string {
    if (this.sortField !== field) return '⇅';
    return this.sortDir === 'asc' ? '▲' : '▼';
  }

  runSearch(page = 1) {
    this.searching = true;
    this.searchPage = page;
    const params = { ...this.searchForm, page: String(page), ordering: (this.sortDir === 'desc' ? '-' : '') + this.sortField };
    this.api.dosenSearch(params).subscribe({
      next: (res: any) => {
        this.searchResults   = res.results;
        this.searchTotal     = res.total;
        this.searchTotalPages = Math.ceil(res.total / res.page_size);
        this.searchDone      = true;
        this.searching       = false;
      },
      error: () => { this.searching = false; }
    });
  }

  goPage(p: number) { this.runSearch(p); }

  resetSearch() {
    this.searchForm   = { nama: '', jabatan: '', pendidikan: '', status: '' };
    this.searchDone   = false;
    this.searchResults = [];
    this.searchTotal   = 0;
    this.searchPage    = 1;
    this.sortField     = 'nama';
    this.sortDir       = 'asc';
  }

  jabatanClass(jabatan: string): string {
    const map: {[k: string]: string} = {
      'Profesor': 'jabatan-chip jabatan-chip--profesor',
      'Lektor Kepala': 'jabatan-chip jabatan-chip--lektor-kepala',
      'Lektor': 'jabatan-chip jabatan-chip--lektor',
      'Asisten Ahli': 'jabatan-chip jabatan-chip--asisten-ahli',
    };
    return map[jabatan] || 'jabatan-chip';
  }

  ngOnDestroy() {
    [this.chartJk, this.chartPend, this.chartStatus,
     this.chartJabatan, this.chartWilayah, this.chartPt]
      .forEach(c => c?.destroy());
  }

  // ─── Gradient helper ───────────────────────────────────────────────
  private gradientColors(values: number[], hue: number, sat = 55): string[] {
    if (!values.length) return [];
    const max = Math.max(...values);
    return values.map(v => {
      const lit = 80 - Math.round((v / max) * 45);
      return `hsl(${hue},${sat}%,${lit}%)`;
    });
  }

  private renderAll() {
    const s = this.stats;

    const legendRight: any = {
      position: 'right',
      labels: { boxWidth: 12, font: { size: 11 }, padding: 10 }
    };
    const tooltipPct = (total: number) => ({
      callbacks: {
        label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed.toLocaleString('id-ID')} (${(ctx.parsed / total * 100).toFixed(1)}%)`
      }
    });

    // 1. Jenis Kelamin — doughnut single-hue (biru)
    const jkVals   = [s.per_jk.L, s.per_jk.P];
    const jkLabels = ['Laki-laki', 'Perempuan'];
    const jkTotal  = s.per_jk.L + s.per_jk.P;
    this.chartJk?.destroy();
    this.chartJk = new Chart(this.jkChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: jkLabels,
        datasets: [{ data: jkVals, backgroundColor: this.gradientColors(jkVals, 220, 65), borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: legendRight, tooltip: tooltipPct(jkTotal) }
      }
    });

    // 2. Pendidikan — doughnut single-hue (hijau)
    const pendVals   = s.per_pendidikan.map((r: any) => r.total);
    const pendLabels = s.per_pendidikan.map((r: any) => r.label);
    const pendTotal  = pendVals.reduce((a: number, b: number) => a + b, 0);
    this.chartPend?.destroy();
    this.chartPend = new Chart(this.pendChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: pendLabels,
        datasets: [{ data: pendVals, backgroundColor: this.gradientColors(pendVals, 158, 55), borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: legendRight, tooltip: tooltipPct(pendTotal) }
      }
    });

    // 3. Status — doughnut single-hue (oranye)
    const statusVals   = s.per_status.map((r: any) => r.total);
    const statusLabels = s.per_status.map((r: any) => r.status);
    const statusTotal  = statusVals.reduce((a: number, b: number) => a + b, 0);
    this.chartStatus?.destroy();
    this.chartStatus = new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{ data: statusVals, backgroundColor: this.gradientColors(statusVals, 30, 75), borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: legendRight, tooltip: tooltipPct(statusTotal) }
      }
    });

    // 4. Jabatan Fungsional — horizontal bar single-hue (biru)
    const jabVals   = s.per_jabatan.map((r: any) => r.total);
    const jabLabels = s.per_jabatan.map((r: any) => r.jabatan_fungsional);
    this.chartJabatan?.destroy();
    this.chartJabatan = new Chart(this.jabatanChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: jabLabels,
        datasets: [{ data: jabVals, backgroundColor: this.gradientColors(jabVals, 220, 65), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.x.toLocaleString('id-ID')} dosen`
        }}},
        scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 12 } } } }
      }
    });

    // 5. Per Wilayah — horizontal bar single-hue (teal)
    const wVals   = s.per_wilayah.map((r: any) => r.total);
    const wLabels = s.per_wilayah.map((r: any) => (r['perguruan_tinggi__wilayah__nama'] || 'Lainnya'));
    this.chartWilayah?.destroy();
    this.chartWilayah = new Chart(this.wilayahChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: wLabels,
        datasets: [{ data: wVals, backgroundColor: this.gradientColors(wVals, 168, 50), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.x.toLocaleString('id-ID')} dosen`
        }}},
        scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } }
      }
    });

    // 6. Top 20 PT — horizontal bar single-hue (ungu)
    const ptVals   = s.per_pt.map((r: any) => r.total);
    const ptLabels = s.per_pt.map((r: any) => r['perguruan_tinggi__singkatan'] || r['perguruan_tinggi__nama']);
    this.chartPt?.destroy();
    this.chartPt = new Chart(this.ptChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ptLabels,
        datasets: [{ data: ptVals, backgroundColor: this.gradientColors(ptVals, 262, 60), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.x.toLocaleString('id-ID')} dosen`
        }}},
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });
  }
}
