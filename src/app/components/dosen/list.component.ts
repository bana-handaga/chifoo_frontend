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
    </div>
  </div>

  <div *ngIf="loading" class="loading-wrap">
    <div class="spinner"></div><span>Memuat data...</span>
  </div>

  <ng-container *ngIf="!loading && stats">

    <!-- Stat boxes -->
    <div class="stat-grid">
      <div class="stat-card stat-card--blue">
        <div class="stat-card__icon">👨‍🏫</div>
        <div class="stat-card__val">{{ stats.total_dosen | number }}</div>
        <div class="stat-card__lbl">Total Dosen</div>
      </div>
      <div class="stat-card stat-card--teal">
        <div class="stat-card__icon">🏛️</div>
        <div class="stat-card__val">{{ stats.total_tetap | number }}</div>
        <div class="stat-card__lbl">Dosen Tetap</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-card__icon">🎓</div>
        <div class="stat-card__val">{{ stats.total_s3 | number }}</div>
        <div class="stat-card__lbl">Bergelar S3</div>
      </div>
      <div class="stat-card stat-card--purple">
        <div class="stat-card__icon">⭐</div>
        <div class="stat-card__val">{{ stats.total_profesor | number }}</div>
        <div class="stat-card__lbl">Profesor / Guru Besar</div>
      </div>
      <div class="stat-card stat-card--orange">
        <div class="stat-card__icon">✅</div>
        <div class="stat-card__val">{{ stats.total_aktif | number }}</div>
        <div class="stat-card__lbl">Dosen Aktif</div>
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
        <div class="pie-legend">
          <span class="pie-legend__dot" style="background:#3b82f6"></span>Laki-laki
          &nbsp;&nbsp;
          <span class="pie-legend__dot" style="background:#f472b6"></span>Perempuan
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
    .stat-card--blue   { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .stat-card--teal   { background: linear-gradient(135deg, #14b8a6, #0f766e); }
    .stat-card--green  { background: linear-gradient(135deg, #22c55e, #15803d); }
    .stat-card--purple { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    .stat-card--orange { background: linear-gradient(135deg, #f97316, #c2410c); }

    .stat-card__icon { font-size: 1.5rem; }
    .stat-card__val  { font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .stat-card__lbl  { font-size: .8rem; opacity: .88; }

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

    .pie-legend { font-size: .78rem; color: #64748b; text-align: center; margin-top: .5rem; display: flex; justify-content: center; align-items: center; gap: .25rem; }
    .pie-legend__dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
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
  loading = true;
  private chartsRendered = false;

  private chartJk:      Chart | null = null;
  private chartPend:    Chart | null = null;
  private chartStatus:  Chart | null = null;
  private chartJabatan: Chart | null = null;
  private chartWilayah: Chart | null = null;
  private chartPt:      Chart | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
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

    // 1. Jenis Kelamin — doughnut
    this.chartJk?.destroy();
    this.chartJk = new Chart(this.jkChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Laki-laki', 'Perempuan'],
        datasets: [{ data: [s.per_jk.L, s.per_jk.P], backgroundColor: ['#3b82f6', '#f472b6'], borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed.toLocaleString('id-ID')} (${(ctx.parsed / (s.per_jk.L + s.per_jk.P) * 100).toFixed(1)}%)`
        }}}
      }
    });

    // 2. Pendidikan — doughnut single-hue (hijau)
    const pendVals   = s.per_pendidikan.map((r: any) => r.total);
    const pendLabels = s.per_pendidikan.map((r: any) => r.label);
    this.chartPend?.destroy();
    this.chartPend = new Chart(this.pendChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: pendLabels,
        datasets: [{ data: pendVals, backgroundColor: this.gradientColors(pendVals, 158, 55), borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });

    // 3. Status — doughnut single-hue (oranye)
    const statusVals   = s.per_status.map((r: any) => r.total);
    const statusLabels = s.per_status.map((r: any) => r.status);
    this.chartStatus?.destroy();
    this.chartStatus = new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{ data: statusVals, backgroundColor: this.gradientColors(statusVals, 30, 75), borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
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
