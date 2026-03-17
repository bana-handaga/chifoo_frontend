import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import {
  Chart, ArcElement, DoughnutController, Tooltip, Legend, CategoryScale,
  LineController, LineElement, PointElement, LinearScale, Filler
} from 'chart.js';
import { ApiService } from '../../services/api.service';

Chart.register(ArcElement, DoughnutController, Tooltip, Legend, CategoryScale,
               LineController, LineElement, PointElement, LinearScale, Filler);

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Ringkasan monitoring seluruh PTMA Indonesia</p>
      </div>

      <div class="stats-grid" *ngIf="statistik">
        <div class="stat-card yellow" *ngIf="periodeAktif">
          <div class="stat-label-top">Periode Pelaporan Aktif</div>
          <div class="stat-value-sm">{{ periodeAktif.nama }}</div>
        </div>
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
        <div class="stat-card purple">
          <div class="stat-value">{{ statistik.total_dosen | number }}</div>
          <div class="stat-label">Total Dosen</div>
          <div class="stat-sub">{{ statistik.total_dosen_tetap | number }} tetap · data {{ statistik.tahun_dosen }}</div>
        </div>
      </div>

      <!-- Tren Mahasiswa Aktif -->
      <div class="card tren-card">
        <div class="tren-header">
          <h3>Tren Mahasiswa Aktif — 12 Semester Terakhir</h3>
          <div class="tren-controls">
            <div class="mode-toggle">
              <button [class.active]="trenMode==='gabung'" (click)="setTrenMode('gabung')">Gabung</button>
              <button [class.active]="trenMode==='perbandingan'" (click)="setTrenMode('perbandingan')">Perbandingan</button>
            </div>
            <div class="pt-select-wrap" *ngIf="trenMode==='perbandingan'">
              <select multiple class="pt-multi-select" (change)="onPtSelectChange($event)">
                <option *ngFor="let pt of ptList" [value]="pt.id">{{ pt.singkatan || pt.nama }}</option>
              </select>
              <span class="pt-select-hint">Tahan Ctrl untuk pilih beberapa PT</span>
            </div>
          </div>
        </div>
        <div class="tren-wrap">
          <canvas #trenChart></canvas>
        </div>
        <div class="tren-loading" *ngIf="trenLoading">Memuat data...</div>
        <div class="tren-error" *ngIf="trenError">{{ trenError }}</div>
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

      <!-- 2D Pie Charts row -->
      <div class="pie-row" *ngIf="statistik">
        <div class="card pie-card">
          <h3>7 PT — Mahasiswa Aktif Terbanyak</h3>
          <div class="pie-wrap"><canvas #mhsChart></canvas></div>
        </div>
        <div class="card pie-card">
          <h3>7 PT — Prodi Aktif Terbanyak</h3>
          <div class="pie-wrap"><canvas #prodiChart></canvas></div>
        </div>
        <div class="card pie-card">
          <h3>7 PT — Dosen Tetap Terbanyak</h3>
          <div class="pie-wrap"><canvas #dosenChart></canvas></div>
        </div>
      </div>

      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Base (mobile-first) ───────────────────────── */
    .page-header { margin-bottom: 16px; }
    .page-header h1 { font-size: 18px; font-weight: 700; color: #1a237e; }
    .page-header p { color: #666; font-size: 13px; }

    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .stat-card {
      background: white; border-radius: 12px; padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid;
    }
    .stat-card.yellow { border-color: #f59e0b; background: #fde68a; }
    .stat-card.yellow .stat-label-top { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; margin-bottom: 6px; }
    .stat-card.yellow .stat-value-sm  { font-size: .9rem; font-weight: 700; color: #78350f; line-height: 1.3; }
    .stat-card.blue   { border-color: #1a237e; background: #f0f2fb; }
    .stat-card.green  { border-color: #137333; background: #f0f9f2; }
    .stat-card.orange { border-color: #e65100; background: #fff5ee; }
    .stat-card.purple { border-color: #6a1b9a; background: #f8f0fd; }
    .stat-value { font-size: 22px; font-weight: 700; color: #1a237e; }
    .stat-label { font-size: 12px; font-weight: 600; color: #444; margin-top: 4px; }
    .stat-sub   { font-size: 10px; color: #888; margin-top: 2px; }

    .tren-card { margin-bottom: 16px; }
    .tren-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .tren-header h3 { margin: 0; font-size: 13px; }
    .tren-controls { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
    .mode-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .mode-toggle button {
      padding: 6px 12px; border: none; background: #f8fafc; cursor: pointer;
      font-size: 12px; color: #475569; transition: background .15s;
    }
    .mode-toggle button.active { background: #1a237e; color: #fff; font-weight: 600; }
    .mode-toggle button:not(.active):hover { background: #e2e8f0; }
    .pt-select-wrap { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .pt-multi-select {
      padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 12px; width: 100%; max-height: 100px; background: #fff;
    }
    .pt-select-hint { font-size: 11px; color: #94a3b8; }
    .tren-wrap { height: 200px; position: relative; }
    .tren-loading { text-align: center; font-size: 13px; color: #94a3b8; padding: 8px; }
    .tren-error   { text-align: center; font-size: 13px; color: #dc2626; padding: 8px; }

    .charts-row { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }
    .pie-row    { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }
    .card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h3 { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 10px; }

    .pie-card { padding: 14px; }
    .pie-wrap { width: 100%; height: 220px; position: relative; }

    .chart-bar-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .bar-label { width: 80px; font-size: 12px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width 0.5s; }
    .bar-fill.green { background: #137333; }
    .bar-val { width: 28px; text-align: right; font-size: 12px; font-weight: 600; color: #333; }

    .loading-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .spinner {
      width: 36px; height: 36px; border: 4px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Tablet ≥ 600px ───────────────────────────── */
    @media (min-width: 600px) {
      .stats-grid { gap: 14px; }
      .stat-value { font-size: 26px; }
      .tren-wrap { height: 230px; }
      .pie-wrap { height: 240px; }
      .pie-row { grid-template-columns: 1fr 1fr; }
    }

    /* ── Desktop ≥ 1024px ─────────────────────────── */
    @media (min-width: 1024px) {
      .page-header { margin-bottom: 24px; }
      .page-header h1 { font-size: 24px; }
      .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .stat-card { padding: 20px; }
      .stat-value { font-size: 32px; }
      .stat-label { font-size: 13px; }
      .stat-sub { font-size: 11px; }
      .tren-header { flex-direction: row; align-items: flex-start; justify-content: space-between; }
      .tren-header h3 { font-size: inherit; }
      .pt-select-wrap { width: auto; }
      .pt-multi-select { width: auto; min-width: 200px; }
      .tren-wrap { height: 260px; }
      .charts-row { grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .pie-row { grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .card { padding: 20px; }
      .card h3 { font-size: 14px; }
      .pie-wrap { height: 260px; }
      .bar-label { width: 110px; font-size: 13px; }
      .bar-val { font-size: 13px; }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  statistik: any;
  periodeAktif: any;
  loading = true;
  private viewReady = false;
  private mhsChartInst:   Chart | null = null;
  private prodiChartInst: Chart | null = null;
  private dosenChartInst: Chart | null = null;

  @ViewChild('mhsChart')               mhsChartRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiChart')             prodiChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dosenChart')             dosenChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trenChart', { static: true }) trenChartRef!: ElementRef<HTMLCanvasElement>;

  trenMode: 'gabung' | 'perbandingan' = 'gabung';
  trenLoading = false;
  trenError = '';
  ptList: any[] = [];
  selectedPtIds: number[] = [];
  private trenChartInst: Chart | null = null;

  constructor(private api: ApiService, private zone: NgZone) {}

  ngOnInit() {
    this.api.getStatistikPT().subscribe({
      next: d => { this.statistik = d; if (this.viewReady) this.scheduleCharts(); },
      error: () => {}
    });
    this.api.getPeriodeAktif().subscribe({
      next: d => { this.periodeAktif = d; this.loading = false; },
      error: () => this.loading = false
    });
    this.api.getPerguruanTinggiList({ page_size: 200, ordering: 'nama' }).subscribe({
      next: (d: any) => { this.ptList = d.results || d; },
      error: () => {}
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.statistik) this.scheduleCharts();
    setTimeout(() => this.loadTren(), 200);
  }

  private scheduleCharts() {
    setTimeout(() => this.zone.runOutsideAngular(() => this.buildCharts()), 150);
  }

  setTrenMode(mode: 'gabung' | 'perbandingan') {
    this.trenMode = mode;
    if (mode === 'gabung') this.selectedPtIds = [];
    this.loadTren();
  }

  onPtSelectChange(event: Event) {
    const sel = event.target as HTMLSelectElement;
    this.selectedPtIds = Array.from(sel.selectedOptions).map(o => +o.value);
    this.loadTren();
  }

  private loadTren() {
    this.trenLoading = true;
    this.trenError = '';
    this.api.getTrenMahasiswa(this.trenMode, this.selectedPtIds).subscribe({
      next: (d: any) => {
        this.trenLoading = false;
        this.zone.runOutsideAngular(() => this.renderTren(d));
      },
      error: (err: any) => {
        this.trenLoading = false;
        const status = err?.status;
        this.trenError = status === 404
          ? 'Endpoint tren_mahasiswa belum tersedia di server. Perlu deploy backend terbaru.'
          : `Gagal memuat data tren (error ${status ?? 'unknown'}).`;
      }
    });
  }

  private renderTren(data: any) {
    if (!this.trenChartRef) return;

    const lineColors = [
      '#1a237e','#137333','#e65100','#6a1b9a','#0277bd','#558b2f','#bf360c'
    ];
    const datasets = data.datasets.map((ds: any, i: number) => ({
      label: ds.nama,
      data: ds.data,
      borderColor: lineColors[i % lineColors.length],
      backgroundColor: lineColors[i % lineColors.length] + '22',
      fill: data.datasets.length === 1,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    }));

    // Update existing chart instead of destroy+recreate to avoid canvas context issues
    if (this.trenChartInst) {
      this.trenChartInst.data.labels = data.labels;
      this.trenChartInst.data.datasets = datasets;
      this.trenChartInst.update('none');
      return;
    }

    this.trenChartInst = new Chart(this.trenChartRef.nativeElement.getContext('2d')!, {
      type: 'line',
      data: { labels: data.labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, padding: 12, boxWidth: 14 } },
          tooltip: {
            callbacks: {
              label: (c: any) => ` ${c.dataset.label}: ${(c.parsed.y as number).toLocaleString('id-ID')} mahasiswa`
            }
          }
        },
        scales: {
          x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: '#f0f0f0' },
            ticks: { font: { size: 11 }, callback: (v: any) => Number(v).toLocaleString('id-ID') }
          }
        }
      }
    });
  }

  private outsideLabelPlugin() {
    return {
      id: 'arcOutsideLabel',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;
        const cx: number = meta0.data[0].x;
        const cy: number = meta0.data[0].y;
        chart.data.datasets.forEach((_: any, di: number) => {
          const total = chart.data.datasets[di].data.reduce((a: number, b: number) => a + b, 0);
          chart.getDatasetMeta(di).data.forEach((arc: any, i: number) => {
            const value = chart.data.datasets[di].data[i];
            if (!value || value / total < 0.04) return;
            const angle  = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
            const outerR = arc.outerRadius;
            const x1 = cx + Math.cos(angle) * outerR * 0.92;
            const y1 = cy + Math.sin(angle) * outerR * 0.92;
            const x2 = cx + Math.cos(angle) * outerR * 1.12;
            const y2 = cy + Math.sin(angle) * outerR * 1.12;
            const right = Math.cos(angle) >= 0;
            const x3 = x2 + (right ? 12 : -12);
            ctx.save();
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y2);
            ctx.stroke();
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#222';
            ctx.textAlign = right ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(value.toLocaleString('id-ID'), right ? x3 + 3 : x3 - 3, y2);
            ctx.restore();
          });
        });
      }
    };
  }

  private gradientColors(n: number, hue: number): string[] {
    return Array.from({ length: n }, (_, i) => {
      const l = 35 + (i / Math.max(n - 1, 1)) * 30;
      return `hsl(${hue},60%,${l}%)`;
    });
  }

  private buildChart(
    ref: ElementRef<HTMLCanvasElement>,
    existing: Chart | null,
    labels: string[], values: number[], hue: number
  ): Chart {
    existing?.destroy();
    return new Chart(ref.nativeElement.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: this.gradientColors(values.length, hue),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: 24, bottom: 24, left: 24, right: 24 } },
        radius: '80%',
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 11 }, padding: 10, boxWidth: 12, boxHeight: 12 }
          },
          tooltip: {
            callbacks: {
              label: (c: any) => ` ${c.label}: ${(c.parsed as number).toLocaleString('id-ID')}`
            }
          }
        }
      },
      plugins: [this.outsideLabelPlugin()]
    });
  }

  private buildCharts() {
    const s = this.statistik;
    if (!s) return;

    if (s.top_mhs?.length) {
      this.mhsChartInst = this.buildChart(
        this.mhsChartRef, this.mhsChartInst,
        s.top_mhs.map((r: any) => r.singkatan || r.nama),
        s.top_mhs.map((r: any) => r.mhs_total),
        210
      );
    }
    if (s.top_prodi?.length) {
      this.prodiChartInst = this.buildChart(
        this.prodiChartRef, this.prodiChartInst,
        s.top_prodi.map((r: any) => r.singkatan || r.nama),
        s.top_prodi.map((r: any) => r.prodi_total),
        140
      );
    }
    if (s.top_dosen?.length) {
      this.dosenChartInst = this.buildChart(
        this.dosenChartRef, this.dosenChartInst,
        s.top_dosen.map((r: any) => r.singkatan || r.nama),
        s.top_dosen.map((r: any) => r.dsn_total),
        270
      );
    }
  }

  formatAkreditasi(val: string): string {
    const map: any = { unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' };
    return map[val] || val;
  }
}
