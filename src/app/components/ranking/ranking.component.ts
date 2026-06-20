import { Component, OnInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { ApiService } from '../../services/api.service';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-ranking',
  template: `
  <div class="page-wrap">
    <div class="page-header">
      <div class="page-header__title">
        <h1>Perangkingan PTMA</h1>
        <p class="page-header__sub">Skor gabungan berdasarkan indikator akademik dan SDM dosen</p>
      </div>
      <!-- Semester selector -->
      <div class="sem-selector-wrap">
        <label class="sem-label">Semester:</label>
        <select class="sem-sel" [(ngModel)]="selectedSemKey" (ngModelChange)="onSemChange()" [disabled]="loading">
          <option *ngFor="let s of availableSemesters" [value]="s.key">{{ s.label }}</option>
        </select>
        <span class="sem-badge aktif" *ngIf="isAktifSem">Periode Dilaporkan</span>
      </div>
    </div>

    <div *ngIf="loading" class="loading-wrap">
      <div class="spinner"></div><span>Memuat data ranking...</span>
    </div>
    <div *ngIf="error && !loading" class="error-wrap">{{ error }}</div>

    <ng-container *ngIf="!loading && !error && data">

      <!-- Info strip -->
      <div class="info-strip">
        <div class="info-item">
          <span class="info-label">Data Dosen</span>
          <strong>{{ data.semester_dosen }}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Data Mahasiswa</span>
          <strong>{{ data.semester_mhs }}</strong>
        </div>
        <div class="info-item">
          <span class="info-label">Total PTMA</span>
          <strong>{{ data.total }} PT</strong>
        </div>
        <div class="info-item bobot-info" (click)="showBobot=!showBobot" style="cursor:pointer">
          <span class="info-label">Bobot Skor ⓘ</span>
          <strong>6 indikator</strong>
        </div>
      </div>

      <!-- Bobot panel -->
      <div class="bobot-panel" *ngIf="showBobot">
        <div class="bobot-title">Komposisi Skor Gabungan (total 100%)</div>
        <div class="bobot-grid">
          <div class="bobot-item" *ngFor="let b of bobotList">
            <div class="bobot-bar" [style.width]="b.pct + '%'"></div>
            <span class="bobot-lbl">{{ b.label }}</span>
            <span class="bobot-pct">{{ b.pct }}%</span>
          </div>
        </div>
        <div class="bobot-note">Normalisasi: min–max per indikator. Skor mencerminkan posisi relatif antar PTMA.</div>
      </div>

      <!-- Jenis Mahasiswa toggle -->
      <div class="jenis-bar">
        <span class="jenis-label">Mahasiswa (tren &amp; rasio):</span>
        <div class="jenis-toggle">
          <button [class.active]="jenisMhs==='semua'"   (click)="setJenisMhs('semua')"  [disabled]="loading">Semua</button>
          <button [class.active]="jenisMhs==='ppg'"     (click)="setJenisMhs('ppg')"    [disabled]="loading" class="ppg">PPG</button>
          <button [class.active]="jenisMhs==='non_ppg'" (click)="setJenisMhs('non_ppg')" [disabled]="loading" class="nonppg">Non-PPG</button>
        </div>
        <span class="jenis-note" *ngIf="jenisMhs !== 'semua'">
          {{ jenisMhs === 'ppg' ? '⚠ Hanya mahasiswa PPG — tren & rasio dosen/mhs berdasarkan Pendidikan Profesi Guru' : '⚠ Mahasiswa PPG dikecualikan dari tren & rasio dosen/mhs' }}
        </span>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <input class="search-input" [(ngModel)]="searchQ" (ngModelChange)="applyFilter()"
               placeholder="Cari nama PT…" />
        <select class="wilayah-sel" [(ngModel)]="filterWilayah" (ngModelChange)="applyFilter()">
          <option value="">Semua Wilayah</option>
          <option *ngFor="let w of wilayahList" [value]="w">{{ w }}</option>
        </select>
        <select class="wilayah-sel" [(ngModel)]="filterAkred" (ngModelChange)="applyFilter()">
          <option value="">Semua Akreditasi</option>
          <option value="unggul">Unggul</option>
          <option value="baik_sekali">Baik Sekali</option>
          <option value="baik">Baik</option>
          <option value="belum">Belum Terakreditasi</option>
        </select>
        <span class="filter-count" *ngIf="filtered.length < data.total">
          Menampilkan {{ filtered.length }} dari {{ data.total }} PT
        </span>
      </div>

      <!-- Top-10 chart -->
      <div class="chart-card chart-card--ranking" *ngIf="!searchQ && !filterWilayah && !filterAkred">
        <div class="chart-card__title">Top 10 PTMA — Skor Gabungan</div>
        <div class="chart-body">
          <canvas #rankChart></canvas>
        </div>
      </div>

      <!-- Tabel -->
      <div class="table-card">
        <table class="rank-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-pt">Perguruan Tinggi</th>
              <th class="col-akred">Akreditasi</th>
              <th class="sortable" [class.sorted]="sortKey==='skor'" (click)="sortBy('skor')">
                Skor <span class="sort-arrow">{{ sortKey==='skor' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='pct_s3'" (click)="sortBy('pct_s3')">
                % S3 <span class="sort-arrow">{{ sortKey==='pct_s3' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='pct_profesor'" (click)="sortBy('pct_profesor')">
                % Profesor <span class="sort-arrow">{{ sortKey==='pct_profesor' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='rasio_dosen_mhs'" (click)="sortBy('rasio_dosen_mhs')">
                Rasio Dosen/Mhs <span class="sort-arrow">{{ sortKey==='rasio_dosen_mhs' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='dosen_tetap'" (click)="sortBy('dosen_tetap')">
                Dosen Tetap <span class="sort-arrow">{{ sortKey==='dosen_tetap' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='mhs_aktif'" (click)="sortBy('mhs_aktif')">
                Mhs Aktif <span class="sort-arrow">{{ sortKey==='mhs_aktif' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='tren_mhs'" (click)="sortBy('tren_mhs')">
                Tren Mhs <span class="sort-arrow">{{ sortKey==='tren_mhs' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
              <th class="sortable" [class.sorted]="sortKey==='sinta_score'" (click)="sortBy('sinta_score')">
                Skor SINTA <span class="sort-arrow">{{ sortKey==='sinta_score' ? (sortAsc?'↑':'↓') : '⇅' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filtered" [class.top1]="r.rank===1" [class.top2]="r.rank===2" [class.top3]="r.rank===3">
              <td class="col-rank">
                <span class="rank-badge" [class.gold]="r.rank===1" [class.silver]="r.rank===2" [class.bronze]="r.rank===3">
                  {{ r.rank===1 ? '🥇' : r.rank===2 ? '🥈' : r.rank===3 ? '🥉' : r.rank }}
                </span>
              </td>
              <td class="col-pt">
                <span class="pt-singkat">{{ r.pt_singkatan }}</span>
                <span class="pt-nama">{{ r.pt_nama }}</span>
                <span class="pt-wilayah">{{ r.pt_wilayah }}</span>
              </td>
              <td class="col-akred">
                <span class="akred-badge" [class]="'akred-' + r.akreditasi">
                  {{ akredLabel(r.akreditasi) }}
                </span>
              </td>
              <td class="col-skor">
                <div class="skor-wrap">
                  <span class="skor-val" [style.color]="skorColor(r.skor)">{{ r.skor }}</span>
                  <div class="skor-bar-bg">
                    <div class="skor-bar-fill" [style.width]="r.skor + '%'" [style.background]="skorColor(r.skor)"></div>
                  </div>
                </div>
              </td>
              <td class="num-cell">
                <span [class.highlight-good]="r.rank_pct_s3 <= 10">{{ r.pct_s3 }}%</span>
                <span class="rank-sub">#{{ r.rank_pct_s3 }}</span>
              </td>
              <td class="num-cell">
                <span [class.highlight-good]="r.rank_pct_profesor <= 10">{{ r.pct_profesor }}%</span>
                <span class="rank-sub">#{{ r.rank_pct_profesor }}</span>
              </td>
              <td class="num-cell">
                <span [class.highlight-good]="r.rank_rasio_dosen_mhs <= 10">{{ r.rasio_dosen_mhs }}</span>
                <span class="rank-sub">#{{ r.rank_rasio_dosen_mhs }}</span>
              </td>
              <td class="num-cell">
                {{ r.dosen_tetap | number }}
                <span class="rank-sub">#{{ r.rank_dosen_tetap }}</span>
              </td>
              <td class="num-cell">
                {{ r.mhs_aktif | number }}
                <span class="rank-sub">#{{ r.rank_mhs_aktif }}</span>
              </td>
              <td class="num-cell" [class.tren-pos]="r.tren_mhs > 0" [class.tren-neg]="r.tren_mhs < 0">
                {{ r.tren_mhs > 0 ? '+' : '' }}{{ r.tren_mhs }}%
                <span class="rank-sub">#{{ r.rank_tren_mhs }}</span>
              </td>
              <td class="num-cell">
                <span [class.highlight-good]="r.rank_sinta_score <= 10">{{ r.sinta_score | number }}</span>
                <span class="rank-sub">#{{ r.rank_sinta_score }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </ng-container>
  </div>
  `,
  styles: [`
    .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 16px; }
    .page-header { margin-bottom: 20px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .page-header__title h1 { font-size: 1.6rem; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
    .page-header__sub { color: #64748b; font-size: 0.88rem; margin: 0; }
    .sem-selector-wrap { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; }
    .sem-label { font-size: 0.82rem; color: #64748b; white-space: nowrap; }
    .sem-sel { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.88rem; background: #f8fafc; min-width: 180px; }
    .sem-sel:focus { outline: none; border-color: #1a237e; }
    .sem-badge { font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
    .sem-badge.aktif { background: #dcfce7; color: #166534; }

    .loading-wrap { display: flex; align-items: center; gap: 12px; padding: 40px; justify-content: center; color: #64748b; }
    .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #1a237e; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-wrap { background: #fef2f2; color: #dc2626; padding: 16px; border-radius: 8px; }

    .info-strip { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .info-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; display: flex; flex-direction: column; gap: 2px; }
    .info-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-item strong { font-size: 0.95rem; color: #1e293b; }
    .bobot-info { border-style: dashed; border-color: #93c5fd; background: #eff6ff; }

    .bobot-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
    .bobot-title { font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
    .bobot-grid { display: flex; flex-direction: column; gap: 8px; }
    .bobot-item { display: flex; align-items: center; gap: 8px; }
    .bobot-bar { height: 10px; background: #1a237e; border-radius: 4px; min-width: 4px; }
    .bobot-lbl { font-size: 0.82rem; color: #374151; flex: 1; }
    .bobot-pct { font-size: 0.82rem; font-weight: 600; color: #1a237e; width: 36px; text-align: right; }
    .bobot-note { margin-top: 10px; font-size: 0.75rem; color: #94a3b8; }

    .jenis-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; }
    .jenis-label { font-size: 0.82rem; color: #64748b; white-space: nowrap; }
    .jenis-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .jenis-toggle button { padding: 6px 14px; font-size: 0.82rem; font-weight: 600; border: none; border-right: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; transition: background 0.15s, color 0.15s; }
    .jenis-toggle button:last-child { border-right: none; }
    .jenis-toggle button:disabled { opacity: 0.5; cursor: not-allowed; }
    .jenis-toggle button.active { background: #1a237e; color: #fff; }
    .jenis-toggle button.ppg.active { background: #0891b2; }
    .jenis-toggle button.nonppg.active { background: #0f766e; }
    .jenis-note { font-size: 0.76rem; color: #b45309; background: #fffbeb; border-radius: 6px; padding: 3px 10px; }
    .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .search-input { flex: 1; min-width: 180px; max-width: 280px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; }
    .search-input:focus { outline: none; border-color: #1a237e; }
    .wilayah-sel { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; background: #fff; }
    .filter-count { font-size: 0.82rem; color: #64748b; margin-left: 4px; }

    .chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .chart-card--ranking { }
    .chart-card__title { font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 14px; }
    .chart-body { height: 300px; }

    .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; overflow-x: auto; }
    .rank-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    .rank-table thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    .rank-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; white-space: nowrap; font-size: 0.8rem; }
    .rank-table th.sortable { cursor: pointer; user-select: none; }
    .rank-table th.sortable:hover { background: #f1f5f9; }
    .rank-table th.sorted { background: #eff6ff; color: #1a237e; }
    .sort-arrow { color: #94a3b8; font-size: 0.75rem; }
    .rank-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .rank-table tr:last-child td { border-bottom: none; }
    .rank-table tr:hover td { background: #f8fafc; }
    .rank-table tr.top1 td { background: #fffbeb; }
    .rank-table tr.top2 td { background: #f8fafc; }
    .rank-table tr.top3 td { background: #fff7ed; }

    .col-rank { width: 50px; text-align: center; }
    .rank-badge { font-size: 1rem; }
    .rank-badge:not(.gold):not(.silver):not(.bronze) { font-size: 0.82rem; color: #64748b; font-weight: 600; }

    .col-pt { min-width: 180px; }
    .pt-singkat { display: block; font-weight: 700; color: #1a237e; font-size: 0.9rem; }
    .pt-nama { display: block; font-size: 0.75rem; color: #64748b; line-height: 1.3; }
    .pt-wilayah { display: block; font-size: 0.72rem; color: #94a3b8; }

    .col-akred { width: 110px; }
    .akred-badge { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .akred-unggul      { background: #dcfce7; color: #166534; }
    .akred-baik_sekali { background: #dbeafe; color: #1e40af; }
    .akred-baik        { background: #fef9c3; color: #713f12; }
    .akred-belum       { background: #f1f5f9; color: #64748b; }

    .col-skor { width: 120px; }
    .skor-wrap { display: flex; flex-direction: column; gap: 3px; }
    .skor-val { font-weight: 700; font-size: 0.95rem; }
    .skor-bar-bg { height: 4px; background: #f1f5f9; border-radius: 2px; }
    .skor-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }

    .num-cell { text-align: right; white-space: nowrap; }
    .rank-sub { display: block; font-size: 0.7rem; color: #94a3b8; }
    .highlight-good { color: #16a34a; font-weight: 600; }
    .tren-pos { color: #16a34a; font-weight: 600; }
    .tren-neg { color: #dc2626; }

    @media (max-width: 768px) {
      .rank-table th:nth-child(n+7), .rank-table td:nth-child(n+7) { display: none; }
    }
  `]
})
export class RankingComponent implements OnInit {
  @ViewChild('rankChart') rankChartRef!: ElementRef<HTMLCanvasElement>;

  data: any = null;
  loading = true;
  error = '';
  showBobot = false;

  filtered: any[] = [];
  searchQ = '';
  filterWilayah = '';
  filterAkred = '';
  wilayahList: string[] = [];

  sortKey = 'rank';
  sortAsc = true;

  availableSemesters: { key: string; tahun_akademik: string; semester: string; label: string }[] = [];
  selectedSemKey = '';
  isAktifSem = false;
  private aktifSemKey = '';

  jenisMhs: 'semua' | 'ppg' | 'non_ppg' = 'semua';

  bobotList = [
    { label: '% Dosen S3',            pct: 25 },
    { label: 'Rasio Dosen/Mhs',       pct: 25 },
    { label: '% Profesor',            pct: 20 },
    { label: 'Tren Mahasiswa',         pct: 10 },
    { label: 'Akreditasi Institusi',   pct: 10 },
    { label: 'Skor SINTA',             pct: 10 },
  ];

  private chartInst: Chart<any> | null = null;

  constructor(private api: ApiService, private zone: NgZone) {}

  ngOnInit() {
    this.loadRanking();
  }

  private loadRanking(tahunAkademik?: string, semester?: string) {
    this.loading = true;
    this.error = '';
    this.api.getRankingPTMA(tahunAkademik, semester, this.jenisMhs).subscribe({
      next: (d: any) => {
        this.data = d;
        this.loading = false;

        // Bangun daftar semester (hanya pertama kali atau update jika sudah ada)
        if (d.available_semesters?.length && !this.availableSemesters.length) {
          this.availableSemesters = d.available_semesters.map((s: any) => ({
            key: `${s.tahun_akademik}|${s.semester}`,
            tahun_akademik: s.tahun_akademik,
            semester: s.semester,
            label: s.label,
          }));
        }

        // Tandai semester aktif (periode dilaporkan) berdasarkan response pertama
        if (!this.aktifSemKey) {
          this.aktifSemKey = `${d.tahun_akademik}|${d.semester}`;
        }
        this.selectedSemKey = `${d.tahun_akademik}|${d.semester}`;
        this.isAktifSem = this.selectedSemKey === this.aktifSemKey;

        this.wilayahList = [...new Set<string>(d.rankings.map((r: any) => r.pt_wilayah).filter(Boolean))].sort();
        this.applyFilter();
        setTimeout(() => this.zone.runOutsideAngular(() => this.renderChart()), 200);
      },
      error: () => {
        this.loading = false;
        this.error = 'Gagal memuat data ranking.';
      }
    });
  }

  onSemChange() {
    const parts = this.selectedSemKey.split('|');
    if (parts.length === 2) {
      this.isAktifSem = this.selectedSemKey === this.aktifSemKey;
      this.searchQ = '';
      this.filterWilayah = '';
      this.filterAkred = '';
      if (this.chartInst) { this.chartInst.destroy(); this.chartInst = null; }
      this.loadRanking(parts[0], parts[1]);
    }
  }

  setJenisMhs(j: 'semua' | 'ppg' | 'non_ppg') {
    if (this.jenisMhs === j) return;
    this.jenisMhs = j;
    const parts = this.selectedSemKey.split('|');
    if (this.chartInst) { this.chartInst.destroy(); this.chartInst = null; }
    this.loadRanking(parts[0], parts[1]);
  }

  applyFilter() {
    if (!this.data) return;
    const q = this.searchQ.trim().toLowerCase();
    let rows = this.data.rankings as any[];
    if (q) rows = rows.filter((r: any) =>
      r.pt_nama.toLowerCase().includes(q) || r.pt_singkatan.toLowerCase().includes(q));
    if (this.filterWilayah) rows = rows.filter((r: any) => r.pt_wilayah === this.filterWilayah);
    if (this.filterAkred)  rows = rows.filter((r: any) => r.akreditasi === this.filterAkred);
    this.filtered = this.sortRows(rows);
  }

  sortBy(key: string) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = key === 'rank';
    }
    this.filtered = this.sortRows(this.filtered);
  }

  private sortRows(rows: any[]): any[] {
    return [...rows].sort((a, b) => {
      const diff = a[this.sortKey] - b[this.sortKey];
      return this.sortAsc ? diff : -diff;
    });
  }

  akredLabel(val: string): string {
    return { unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' }[val] || val;
  }

  skorColor(skor: number): string {
    if (skor >= 60) return '#16a34a';
    if (skor >= 40) return '#d97706';
    return '#dc2626';
  }

  private renderChart() {
    if (!this.rankChartRef || !this.data) return;
    const top10 = (this.data.rankings as any[]).slice(0, 10);
    const labels = top10.map((r: any) => r.pt_singkatan);
    const scores = top10.map((r: any) => r.skor);
    const colors = scores.map((s: number) => this.skorColor(s));

    if (this.chartInst) { this.chartInst.destroy(); this.chartInst = null; }

    const ctx = this.rankChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Skor Gabungan',
          data: scores,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => ` Skor: ${c.parsed.x}`
            }
          }
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
          y: { ticks: { font: { size: 12, weight: 'bold' } } }
        }
      }
    });
  }
}
