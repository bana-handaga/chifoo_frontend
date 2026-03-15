import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
Chart.register(...registerables);

@Component({
  selector: 'app-pt-list',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Perguruan Tinggi</h1>
        <p>Daftar seluruh PTMA di Indonesia</p>
      </div>
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-title">Distribusi Jenis</div>
          <div class="bar-list">
            <div class="bar-item" *ngFor="let item of chartJenis">
              <div class="bar-label">{{ item.label }}</div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div></div>
              <div class="bar-value">{{ item.total }}</div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Distribusi Organisasi</div>
          <div class="bar-list">
            <div class="bar-item" *ngFor="let item of chartOrganisasi">
              <div class="bar-label">{{ item.label }}</div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div></div>
              <div class="bar-value">{{ item.total }}</div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Distribusi Akreditasi</div>
          <div class="bar-list">
            <div class="bar-item" *ngFor="let item of chartAkreditasi">
              <div class="bar-label">{{ item.label }}</div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div></div>
              <div class="bar-value">{{ item.total }}</div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Distribusi Status</div>
          <div class="bar-list">
            <div class="bar-item" *ngFor="let item of chartStatus">
              <div class="bar-label">{{ item.label }}</div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div></div>
              <div class="bar-value">{{ item.total }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="notif-bar" *ngIf="count2m > 0 || count3m > 0">
        <div class="notif-item notif-red" *ngIf="count2m > 0" (click)="setExpFilter('less_2m')">
          <span class="notif-icon">🔴</span>
          <span><strong>{{ count2m }} PT</strong> akreditasinya kedaluarsa dalam <strong>kurang dari 2 bulan</strong></span>
          <span class="notif-action">Lihat →</span>
        </div>
        <div class="notif-item notif-yellow" *ngIf="count3m > 0" (click)="setExpFilter('less_3m')">
          <span class="notif-icon">🟡</span>
          <span><strong>{{ count3m }} PT</strong> akreditasinya kedaluarsa dalam <strong>kurang dari 3 bulan</strong></span>
          <span class="notif-action">Lihat →</span>
        </div>
      </div>
      <div class="filters card mb-16">
        <input type="text" [(ngModel)]="search" (input)="onSearch()" placeholder="🔍 Cari nama, kota, singkatan..." class="search-input">
        <div class="filter-selects">
          <select [(ngModel)]="filterExp" (change)="applyFilter()" class="filter-exp">
            <option value="">Semua Kadaluarsa</option>
            <option value="more_1y">Lebih dari 1 tahun</option>
            <option value="less_3m">Kurang dari 3 bulan</option>
            <option value="less_2m">Kurang dari 2 bulan</option>
            <option value="less_1m">Kurang dari 1 bulan</option>
          </select>
          <select [(ngModel)]="filterJenis" (change)="applyFilter()">
            <option value="">Semua Jenis</option>
            <option value="universitas">Universitas</option>
            <option value="institut">Institut</option>
            <option value="sekolah_tinggi">Sekolah Tinggi</option>
            <option value="politeknik">Politeknik</option>
            <option value="akademi">Akademi</option>
          </select>
          <select [(ngModel)]="filterOrganisasi" (change)="applyFilter()">
            <option value="">Semua Organisasi</option>
            <option value="muhammadiyah">Muhammadiyah</option>
            <option value="aisyiyah">Aisyiyah</option>
          </select>
          <select [(ngModel)]="filterAkreditasi" (change)="applyFilter()">
            <option value="">Semua Akreditasi</option>
            <option value="unggul">Unggul</option>
            <option value="baik_sekali">Baik Sekali</option>
            <option value="baik">Baik</option>
            <option value="belum">Belum</option>
          </select>
          <select [(ngModel)]="filterAktif" (change)="applyFilter()">
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
        </div>
      </div>
      <div class="card">
        <div class="table-toolbar">
          <div class="table-info">Menampilkan {{ data.length }} dari {{ totalCount }} PT</div>
          <div class="toolbar-right">
            <div class="pagination-top" *ngIf="totalCount > 10">
              <button (click)="prevPage()" [disabled]="!prevUrl">‹ Prev</button>
              <span>Hal {{ page }} / {{ totalPages }}</span>
              <button (click)="nextPage()" [disabled]="!nextUrl">Next ›</button>
            </div>
            <button class="toggle-chart-btn" (click)="toggleMhsChart()">
              {{ showMhsChart ? 'HIDE' : 'SHOW' }} Grafik
            </button>
          </div>
        </div>
        <div class="mhs-chart-wrap" *ngIf="showMhsChart">
          <canvas #mhsChartCanvas></canvas>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode PT</th><th>Nama</th><th>Jenis</th><th>Organisasi</th>
                <th>Akreditasi</th><th>No. SK</th><th>Berlaku s/d</th>
                <th>Prodi</th><th>Mahasiswa</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pt of data"
                  [class]="!pt.is_active ? 'row-inactive' : 'row-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)"
                  (click)="goToDetail(pt.id)" style="cursor:pointer">
                <td><code>{{ pt.kode_pt }}</code></td>
                <td>
                  <a [routerLink]="['/perguruan-tinggi', pt.id]" class="pt-link">
                    <strong>{{ pt.singkatan }}</strong><br>
                    <small>{{ pt.nama }}</small>
                  </a>
                </td>
                <td>{{ pt.jenis | titlecase }}</td>
                <td><span [class]="'badge ' + (pt.organisasi_induk === 'muhammadiyah' ? 'badge-muh' : 'badge-ais')">
                  {{ pt.organisasi_induk === 'muhammadiyah' ? 'Muhammadiyah' : 'Aisyiyah' }}
                </span></td>
                <td><span [class]="'badge badge-' + pt.akreditasi_institusi">
                  {{ formatAkreditasi(pt.akreditasi_institusi) }}
                </span></td>
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
                <td>
                  <span [class]="pt.is_active ? 'badge badge-aktif' : 'badge badge-nonaktif'">
                    {{ pt.is_active ? 'Aktif' : 'Tidak Aktif' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination" *ngIf="totalCount > 10">
          <button (click)="prevPage()" [disabled]="!prevUrl">‹ Prev</button>
          <span>Hal {{ page }} / {{ totalPages }}</span>
          <button (click)="nextPage()" [disabled]="!nextUrl">Next ›</button>
        </div>
        <div class="loading-overlay" *ngIf="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #1a237e; }
    .page-header p { color: #666; font-size: 13px; }

    .filters { display: flex; flex-direction: column; gap: 10px; }
    .search-input {
      width: 100%; padding: 8px 12px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 13px;
    }
    .filter-selects { display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-selects select {
      flex: 1; min-width: 130px; padding: 8px 12px;
      border: 1px solid #ddd; border-radius: 8px; font-size: 13px; background: white;
    }
    .filter-exp {
      background: #e8f0fe !important;
      border-color: #c5d4f7 !important;
      color: #1a56db;
    }

    .chart-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .chart-card { background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .chart-title { font-size: 12px; font-weight: 700; color: #555; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .bar-list { display: flex; flex-direction: column; gap: 7px; }
    .bar-item { display: flex; align-items: center; gap: 6px; }
    .bar-label { font-size: 11px; color: #555; min-width: 72px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .bar-value { font-size: 11px; font-weight: 600; color: #333; min-width: 24px; text-align: right; }
    @media (max-width: 900px) { .chart-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .chart-row { grid-template-columns: 1fr; } }

    .notif-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .notif-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px;
      border-radius: 10px; font-size: 13px; cursor: pointer; border: 1px solid transparent;
      transition: filter 0.15s;
    }
    .notif-item:hover { filter: brightness(0.96); }
    .notif-red    { background: #fff0f0; border-color: #f5c6c6; color: #7f1d1d; }
    .notif-yellow { background: #fffbec; border-color: #f5e08a; color: #713f12; }
    .notif-icon { font-size: 14px; }
    .notif-action { margin-left: auto; font-weight: 600; white-space: nowrap; opacity: 0.7; }

    .mb-16 { margin-bottom: 16px; }
    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .table-info { font-size: 12px; color: #888; }
    .toolbar-right { display: flex; align-items: center; gap: 10px; }
    .pagination-top { display: flex; align-items: center; gap: 6px; }
    .pagination-top span { font-size: 12px; color: #555; white-space: nowrap; }
    .pagination-top button { padding: 3px 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
    .pagination-top button:disabled { opacity: 0.4; cursor: not-allowed; }
    .toggle-chart-btn {
      padding: 4px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid #c5d4f7; border-radius: 6px; background: #e8f0fe; color: #1a56db;
    }
    .toggle-chart-btn:hover { background: #d0e2ff; }
    .mhs-chart-wrap { width: 100%; height: 180px; margin-bottom: 16px; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      text-align: left; padding: 10px 12px; background: #f8f9fa;
      font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr.row-yellow   td { background: #fffbec; }
    tr.row-red      td { background: #fff4f4; }
    tr.row-inactive td { background: #fff0f0; }
    tr:hover td { background: #dbeafe !important; cursor: pointer; }
    .pt-link { text-decoration: none; color: inherit; }
    .pt-link:hover strong { color: #1a237e; text-decoration: underline; }
    small { color: #888; font-size: 11px; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
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
    .sk-col { font-size: 11px; color: #555; max-width: 180px; word-break: break-all; }
    .no-data { color: #bbb; }
    .exp-pill {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-weight: 700; color: #111; font-size: 12px; white-space: nowrap;
    }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }
    .pagination { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
    .pagination button { padding: 6px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .loading-overlay {
      position: absolute; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; border-radius: 12px;
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 767px) {
      .page-header h1 { font-size: 18px; }
      .card { padding: 12px; }
      th, td { padding: 8px 10px; font-size: 12px; }
    }
  `]
})
export class PerguruanTinggiListComponent implements OnInit {
  data: any[] = [];
  totalCount = 0;
  nextUrl: any = null;
  prevUrl: any = null;
  loading = false;
  page = 1;
  search = '';
  filterJenis = '';
  filterOrganisasi = '';
  filterAkreditasi = '';
  filterAktif = '';
  filterExp = '';
  searchTimeout: any;
  count3m = 0;
  count2m = 0;
  chartJenis: any[] = [];
  chartOrganisasi: any[] = [];
  chartAkreditasi: any[] = [];
  chartStatus: any[] = [];
  showMhsChart = false;
  private mhsChartInstance: Chart | null = null;
  @ViewChild('mhsChartCanvas') mhsChartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private api: ApiService, private router: Router) {}
  ngOnInit() { this.loadData(); this.loadNotifCounts(); this.loadCharts(); }

  loadNotifCounts() {
    this.api.getPerguruanTinggiList({ exp_filter: 'less_3m', page: 1 }).subscribe({
      next: res => this.count3m = res.count || 0
    });
    this.api.getPerguruanTinggiList({ exp_filter: 'less_2m', page: 1 }).subscribe({
      next: res => this.count2m = res.count || 0
    });
  }

  setExpFilter(val: string) { this.filterExp = val; this.applyFilter(); }

  toggleMhsChart() {
    this.showMhsChart = !this.showMhsChart;
    if (this.showMhsChart) { setTimeout(() => this.renderMhsChart(), 50); }
  }

  renderMhsChart() {
    if (!this.mhsChartCanvas) return;
    if (this.mhsChartInstance) { this.mhsChartInstance.destroy(); this.mhsChartInstance = null; }
    const colors = this.data.map(pt => {
      const s = this.expStatus(pt.tanggal_kadaluarsa_akreditasi);
      return s === 'red' ? '#ef9a9a' : s === 'yellow' ? '#ffe082' : '#5c7df8';
    });
    this.mhsChartInstance = new Chart(this.mhsChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.data.map(pt => pt.kode_pt),
        datasets: [{ data: this.data.map(pt => pt.total_mahasiswa), backgroundColor: colors, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => this.data[items[0].dataIndex]?.nama || items[0].label,
              label: (item) => `Mahasiswa Aktif: ${Number(item.raw).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { ticks: { font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  loadCharts() {
    const JENIS_COLORS: any = {
      universitas: '#1a237e', institut: '#0277bd', sekolah_tinggi: '#00695c',
      politeknik: '#e65100', akademi: '#6a1b9a'
    };
    const JENIS_LABELS: any = {
      universitas: 'Universitas', institut: 'Institut', sekolah_tinggi: 'Sekolah Tinggi',
      politeknik: 'Politeknik', akademi: 'Akademi'
    };
    const AKR_COLORS: any = { unggul: '#137333', baik_sekali: '#2e7d32', baik: '#f57f17', belum: '#9e9e9e' };
    const AKR_LABELS: any = { unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' };

    this.api.getStatistikPT().subscribe((res: any) => {
      const totalJ = res.per_jenis.reduce((s: number, x: any) => s + x.total, 0);
      this.chartJenis = res.per_jenis
        .map((x: any) => ({
          label: JENIS_LABELS[x.jenis] || x.jenis,
          total: x.total,
          pct: totalJ ? Math.round(x.total / totalJ * 100) : 0,
          color: JENIS_COLORS[x.jenis] || '#90a4ae'
        }))
        .sort((a: any, b: any) => b.total - a.total);

      const totalO = res.total_muhammadiyah + res.total_aisyiyah;
      this.chartOrganisasi = [
        { label: 'Muhammadiyah', total: res.total_muhammadiyah, pct: totalO ? Math.round(res.total_muhammadiyah / totalO * 100) : 0, color: '#1565c0' },
        { label: 'Aisyiyah',     total: res.total_aisyiyah,     pct: totalO ? Math.round(res.total_aisyiyah / totalO * 100) : 0,     color: '#c62828' },
      ];

      const totalA = res.per_akreditasi.reduce((s: number, x: any) => s + x.total, 0);
      this.chartAkreditasi = ['unggul', 'baik_sekali', 'baik', 'belum'].map(k => {
        const found = res.per_akreditasi.find((x: any) => x.akreditasi_institusi === k);
        const total = found ? found.total : 0;
        return { label: AKR_LABELS[k], total, pct: totalA ? Math.round(total / totalA * 100) : 0, color: AKR_COLORS[k] };
      }).filter((x: any) => x.total > 0);

      const totalPT = res.total_pt;
      this.api.getPerguruanTinggiList({ is_active: 'true', page: 1 }).subscribe((r: any) => {
        const aktif = r.count || 0;
        const tidakAktif = totalPT - aktif;
        this.chartStatus = [
          { label: 'Aktif',       total: aktif,      pct: totalPT ? Math.round(aktif / totalPT * 100) : 0,      color: '#137333' },
          { label: 'Tidak Aktif', total: tidakAktif, pct: totalPT ? Math.round(tidakAktif / totalPT * 100) : 0, color: '#c5221f' },
        ];
      });
    });
  }

  get totalPages() { return Math.ceil(this.totalCount / 10); }

  loadData() {
    this.loading = true;
    const params: any = { page: this.page, page_size: 10 };
    if (this.search) params['search'] = this.search;
    if (this.filterJenis) params['jenis'] = this.filterJenis;
    if (this.filterOrganisasi) params['organisasi_induk'] = this.filterOrganisasi;
    if (this.filterAkreditasi) params['akreditasi_institusi'] = this.filterAkreditasi;
    if (this.filterAktif !== '') params['is_active'] = this.filterAktif;
    if (this.filterExp) params['exp_filter'] = this.filterExp;
    this.api.getPerguruanTinggiList(params).subscribe({
      next: res => {
        this.data = res.results || res;
        this.totalCount = res.count || this.data.length;
        this.nextUrl = res.next;
        this.prevUrl = res.previous;
        this.loading = false;
        if (this.showMhsChart) { setTimeout(() => this.renderMhsChart(), 50); }
      },
      error: () => this.loading = false
    });
  }
  applyFilter() { this.page = 1; this.loadData(); }
  goToDetail(id: number) { this.router.navigate(['/perguruan-tinggi', id]); }
  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => { this.page = 1; this.loadData(); }, 400);
  }
  nextPage() { if (this.nextUrl) { this.page++; this.loadData(); } }
  prevPage() { if (this.prevUrl) { this.page--; this.loadData(); } }
  formatAkreditasi(v: string) {
    return { unggul:'Unggul', baik_sekali:'Baik Sekali', baik:'Baik', belum:'Belum' }[v] || v;
  }

  expStatus(tgl: string): string {
    if (!tgl) return '';
    const now = new Date();
    const exp = new Date(tgl);
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 60)  return 'red';
    if (diffDays < 90)  return 'yellow';
    return 'green';
  }
}
