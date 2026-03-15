import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Ringkasan monitoring seluruh PTMA Indonesia</p>
      </div>

      <div class="stats-grid" *ngIf="statistik">
        <div class="stat-card blue">
          <div class="stat-value">{{ statistik.total_pt | number }}</div>
          <div class="stat-label">Total Perguruan Tinggi</div>
          <div class="stat-sub">{{ statistik.total_muhammadiyah }} Muhammadiyah · {{ statistik.total_aisyiyah }} Aisyiyah</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">{{ statistik.total_prodi | number }}</div>
          <div class="stat-label">Program Studi Aktif</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-value">{{ statistik.total_mahasiswa | number }}</div>
          <div class="stat-label">Total Mahasiswa</div>
        </div>
        <div class="stat-card purple" *ngIf="statistik">
          <div class="stat-value">{{ statistik.total_dosen | number }}</div>
          <div class="stat-label">Total Dosen</div>
          <div class="stat-sub">{{ statistik.total_dosen_tetap | number }} tetap · data {{ statistik.tahun_dosen }}</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="card">
          <h3>Sebaran per Jenis PT</h3>
          <div class="chart-list" *ngIf="statistik">
            <div class="chart-bar-item" *ngFor="let item of statistik.per_jenis">
              <div class="bar-label">{{ item.jenis | titlecase }}</div>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="(item.total / statistik.total_pt * 100)"></div>
              </div>
              <div class="bar-val">{{ item.total }}</div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Status Akreditasi</h3>
          <div class="chart-list" *ngIf="statistik">
            <div class="chart-bar-item" *ngFor="let item of statistik.per_akreditasi">
              <div class="bar-label">{{ formatAkreditasi(item.akreditasi_institusi) }}</div>
              <div class="bar-track">
                <div class="bar-fill green" [style.width.%]="(item.total / statistik.total_pt * 100)"></div>
              </div>
              <div class="bar-val">{{ item.total }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-16" *ngIf="periodeAktif">
        <h3>Periode Pelaporan Aktif</h3>
        <div class="periode-info">
          <div><strong>{{ periodeAktif.nama }}</strong></div>
          <div class="periode-dates">{{ periodeAktif.tanggal_mulai }} s/d {{ periodeAktif.tanggal_selesai }}</div>
          <div class="mt-8">Laporan masuk: <strong>{{ periodeAktif.laporan_submitted }}</strong> / {{ periodeAktif.total_laporan }}</div>
        </div>
      </div>

      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: #1a237e; }
    .page-header p { color: #666; font-size: 14px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      background: white; border-radius: 12px; padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid;
    }
    .stat-card.blue   { border-color: #1a237e; background: #f0f2fb; }
    .stat-card.green  { border-color: #137333; background: #f0f9f2; }
    .stat-card.orange { border-color: #e65100; background: #fff5ee; }
    .stat-card.purple { border-color: #6a1b9a; background: #f8f0fd; }
    .stat-value { font-size: 32px; font-weight: 700; color: #1a237e; }
    .stat-label { font-size: 13px; font-weight: 600; color: #444; margin-top: 4px; }
    .stat-sub   { font-size: 11px; color: #888; margin-top: 2px; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h3 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; }

    .chart-bar-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .bar-label { width: 110px; font-size: 13px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width 0.5s; }
    .bar-fill.green { background: #137333; }
    .bar-val { width: 30px; text-align: right; font-size: 13px; font-weight: 600; color: #333; }

    .mt-16 { margin-top: 16px; }
    .mt-8  { margin-top: 8px; }
    .periode-info { font-size: 14px; color: #444; }
    .periode-dates { font-size: 12px; color: #888; margin-top: 4px; }

    .loading-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .spinner {
      width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Tablet */
    @media (max-width: 1024px) {
      .charts-row { grid-template-columns: 1fr; }
    }

    /* Mobile */
    @media (max-width: 767px) {
      .page-header h1 { font-size: 20px; }
      .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
      .stat-card { padding: 14px; }
      .stat-value { font-size: 24px; }
      .bar-label { width: 80px; font-size: 12px; }
      .card { padding: 14px; }
    }

    @media (max-width: 400px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  statistik: any;
  periodeAktif: any;
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStatistikPT().subscribe({ next: d => this.statistik = d, error: () => {} });
    this.api.getPeriodeAktif().subscribe({
      next: d => { this.periodeAktif = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  formatAkreditasi(val: string): string {
    const map: any = { unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' };
    return map[val] || val;
  }
}
