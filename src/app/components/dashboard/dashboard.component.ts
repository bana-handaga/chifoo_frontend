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
    <div class="page-wrap">
      <div class="page-header">
        <div class="page-header__title">
          <h1>Dashboard PTMA</h1>
          <p class="page-header__sub">Ringkasan monitoring seluruh PTMA Indonesia</p>
          <div class="periode-badge" *ngIf="periodeAktif">
            <span class="periode-badge__dot"></span>
            Periode Pelaporan Aktif: <strong>{{ periodeAktif.nama }}</strong>
          </div>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="stat-grid" *ngIf="statistik">
        <div class="stat-card stat-card--blue" routerLink="/perguruan-tinggi" style="cursor:pointer">
          <div class="stat-card__main">
            <div class="stat-card__icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val">{{ statistik.total_pt | number }}</div>
          </div>
          <div class="stat-card__lbl">Total Perguruan Tinggi</div>
          <div class="stat-card__sub">{{ statistik.total_muhammadiyah }} Muhammadiyah · {{ statistik.total_aisyiyah }} Aisyiyah</div>
        </div>
        <div class="stat-card stat-card--light" routerLink="/program-studi" style="cursor:pointer">
          <div class="stat-card__main">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_prodi | number }}</div>
          </div>
          <div class="stat-card__lbl stat-card__lbl--dark">Program Studi Aktif</div>
        </div>
        <div class="stat-card stat-card--light" routerLink="/mahasiswa" style="cursor:pointer">
          <div class="stat-card__main">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_mahasiswa | number }}</div>
          </div>
          <div class="stat-card__lbl stat-card__lbl--dark">Total Mahasiswa</div>
        </div>
        <div class="stat-card stat-card--light" routerLink="/dosen" style="cursor:pointer">
          <div class="stat-card__main">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_dosen | number }}</div>
          </div>
          <div class="stat-card__lbl stat-card__lbl--dark">Dosen Tetap</div>
          <div class="stat-card__sub stat-card__sub--dark">data {{ statistik.tahun_dosen }}</div>
        </div>
      </div>

      <!-- Tren Mahasiswa Aktif -->
      <div class="chart-card chart-card--tren">
        <div class="tren-header">
          <div class="chart-card__title">Tren Mahasiswa Aktif — 12 Semester Terakhir</div>
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
        <div class="chart-card__body chart-card__body--tren">
          <canvas #trenChart></canvas>
        </div>
        <div class="tren-loading" *ngIf="trenLoading">Memuat data...</div>
        <div class="tren-error" *ngIf="trenError">{{ trenError }}</div>
      </div>

      <!-- Row 1: Pie charts -->
      <div class="charts-row charts-row--pie" *ngIf="statistik">
        <div class="chart-card">
          <div class="chart-card__title">7 PT — Mahasiswa Aktif Terbanyak</div>
          <div class="chart-card__body chart-card__body--pie"><canvas #mhsChart></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card__title">7 PT — Prodi Aktif Terbanyak</div>
          <div class="chart-card__body chart-card__body--pie"><canvas #prodiChart></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card__title">7 PT — Dosen Tetap Terbanyak</div>
          <div class="chart-card__body chart-card__body--pie"><canvas #dosenChart></canvas></div>
        </div>
      </div>

      <!-- Row 2: Bar charts -->
      <div class="charts-row charts-row--bar" *ngIf="statistik">
        <div class="chart-card">
          <div class="chart-card__title">Sebaran per Jenis PT</div>
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
          <div class="chart-card__title">Status Akreditasi</div>
          <div class="chart-list">
            <div class="chart-bar-item" *ngFor="let item of statistik.per_akreditasi">
              <div class="bar-label">{{ formatAkreditasi(item.akreditasi_institusi) }}</div>
              <div class="bar-track">
                <div class="bar-fill bar-fill--green" [style.width.%]="(item.total / statistik.total_pt * 100)"></div>
              </div>
              <div class="bar-val">{{ item.total }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────── */
    .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 40px; }

    /* ── Page header ─────────────────────────────────── */
    .page-header { margin-bottom: 28px; }
    .page-header__title h1 { font-size: 22px; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
    .page-header__sub { color: #64748b; font-size: 13px; margin: 0 0 10px; }
    .periode-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;
      border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 500;
    }
    .periode-badge__dot {
      width: 8px; height: 8px; border-radius: 50%; background: #43a047;
      animation: pulse-dot 1.5s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .5; transform: scale(.7); }
    }

    /* ── Stat grid ───────────────────────────────────── */
    .stat-grid {
      display: grid; grid-template-columns: 1fr;
      gap: 16px; margin-bottom: 24px;
    }
    @media (min-width: 480px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 900px) { .stat-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }
    .stat-card {
      border-radius: 14px; padding: 20px 22px;
      box-shadow: -4px 0 0 0 #6366f1, 0 1px 6px rgba(0,0,0,0.09);
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-card--blue  { background: #1a237e; color: #fff; }
    .stat-card--light { background: #fff; border: 1px solid #e8eaf6; }
    .stat-card__main { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .stat-card__icon { width: 42px; height: 42px; flex-shrink: 0; opacity: .85; }
    .stat-card__icon svg { width: 100%; height: 100%; }
    .stat-card--blue .stat-card__icon { color: #c5cae9; }
    .stat-card__icon--dark { color: #1a237e; }
    .stat-card__val { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .stat-card--blue  .stat-card__val { color: #fff; }
    .stat-card__val--dark { color: #1a237e; }
    .stat-card__lbl { font-size: 12px; font-weight: 600; }
    .stat-card--blue  .stat-card__lbl { color: #c5cae9; }
    .stat-card__lbl--dark { color: #64748b; }
    .stat-card__sub { font-size: 11px; margin-top: 2px; }
    .stat-card--blue  .stat-card__sub { color: #9fa8da; }
    .stat-card__sub--dark { color: #94a3b8; }

    /* ── Chart card ──────────────────────────────────── */
    .chart-card {
      background: #fff; border: 1px solid #e8eaf6; border-radius: 14px;
      padding: 20px; margin-bottom: 20px;
      box-shadow: -4px 0 0 0 #6366f1, 0 1px 6px rgba(0,0,0,0.07);
    }
    .chart-card__title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 14px; }
    .chart-card__body--pie  { height: 250px; position: relative; }
    .chart-card__body--tren { height: 240px; position: relative; }

    /* ── Charts rows ─────────────────────────────────── */
    .charts-row { display: grid; gap: 16px; margin-bottom: 20px; }
    .charts-row--pie { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .charts-row--bar { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .charts-row .chart-card { margin-bottom: 0; }

    /* ── Tren card specifics ─────────────────────────── */
    .tren-header { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .tren-controls { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
    .mode-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .mode-toggle button {
      padding: 6px 12px; border: none; background: #f8fafc; cursor: pointer;
      font-size: 12px; color: #475569; transition: background .15s;
    }
    .mode-toggle button.active { background: #1a237e; color: #fff; font-weight: 600; }
    .mode-toggle button:not(.active):hover { background: #e2e8f0; }
    .pt-select-wrap { display: flex; flex-direction: column; gap: 4px; }
    .pt-multi-select {
      padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: 12px; min-width: 200px; max-height: 100px; background: #fff;
    }
    .pt-select-hint { font-size: 11px; color: #94a3b8; }
    .tren-loading { text-align: center; font-size: 13px; color: #94a3b8; padding: 8px; }
    .tren-error   { text-align: center; font-size: 13px; color: #dc2626; padding: 8px; }

    /* ── Bar charts ──────────────────────────────────── */
    .chart-list { display: flex; flex-direction: column; gap: 10px; }
    .chart-bar-item { display: flex; align-items: center; gap: 8px; }
    .bar-label { width: 100px; font-size: 12px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width 0.5s; }
    .bar-fill--green { background: #137333; }
    .bar-val { width: 28px; text-align: right; font-size: 12px; font-weight: 600; color: #333; }

    /* ── Loading overlay ─────────────────────────────── */
    .loading-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .spinner {
      width: 36px; height: 36px; border: 4px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  statistik: any;
  periodeAktif: any;
  loading = true;
  private viewReady = false;
  private mhsChartInst:   Chart | null = null;
  private prodiChartInst: Chart<any> | null = null;
  private dosenChartInst: Chart<any> | null = null;

  @ViewChild('mhsChart')               mhsChartRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiChart')             prodiChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dosenChart')             dosenChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trenChart', { static: true }) trenChartRef!: ElementRef<HTMLCanvasElement>;

  trenMode: 'gabung' | 'perbandingan' = 'gabung';
  trenLoading = false;
  trenError = '';
  ptList: any[] = [];
  selectedPtIds: number[] = [];
  private trenChartInst: Chart<any> | null = null;
  private activePeriodeIdx = -1;
  private lastTrenData: any = null;

  constructor(private api: ApiService, private zone: NgZone) {}

  ngOnInit() {
    this.api.getStatistikPT().subscribe({
      next: d => { this.statistik = d; if (this.viewReady) this.scheduleCharts(); },
      error: () => {}
    });
    this.api.getPeriodeAktif().subscribe({
      next: d => {
        this.periodeAktif = d;
        this.loading = false;
        // Jika tren sudah dirender sebelum periodeAktif tiba, update highlight-nya
        if (this.lastTrenData) {
          this.zone.runOutsideAngular(() => this.renderTren(this.lastTrenData));
        }
      },
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
        this.lastTrenData = d;
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

    // Konstruksi label chart dari tahun+semester periode aktif
    // Format chart: "{tahun_akademik} {Semester}" misal "2024/2025 Ganjil"
    let activeLabel = '';
    if (this.periodeAktif?.tahun && this.periodeAktif?.semester) {
      const p = this.periodeAktif;
      const tahunAkademik = p.semester === 'genap'
        ? `${p.tahun - 1}/${p.tahun}`
        : `${p.tahun}/${p.tahun + 1}`;
      activeLabel = `${tahunAkademik} ${p.semester.charAt(0).toUpperCase() + p.semester.slice(1)}`;
    }
    this.activePeriodeIdx = activeLabel ? (data.labels as string[]).indexOf(activeLabel) : -1;
    const ai = this.activePeriodeIdx;
    const n = (data.labels as string[]).length;

    const buildDatasets = (rawDatasets: any[]) => rawDatasets.map((ds: any, i: number) => {
      const color = lineColors[i % lineColors.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: color + '22',
        fill: rawDatasets.length === 1,
        tension: 0.35,
        pointRadius:          Array.from({ length: n }, (_, j) => j === ai ? 9 : 4),
        pointHoverRadius:     Array.from({ length: n }, (_, j) => j === ai ? 11 : 6),
        pointBackgroundColor: Array.from({ length: n }, (_, j) => j === ai ? '#fff' : color),
        pointBorderColor:     Array.from({ length: n }, (_, j) => j === ai ? '#f59e0b' : color),
        pointBorderWidth:     Array.from({ length: n }, (_, j) => j === ai ? 3 : 1),
        borderWidth: 2,
      };
    });

    // Update existing chart instead of destroy+recreate to avoid canvas context issues
    if (this.trenChartInst) {
      this.trenChartInst.data.labels = data.labels;
      this.trenChartInst.data.datasets = buildDatasets(data.datasets);
      this.trenChartInst.update('none');
      return;
    }

    // Plugin: garis vertikal dashed + badge "Periode Aktif" di titik aktif
    const self = this;
    const activePeriodeBadgePlugin = {
      id: 'activePeriodeBadge',
      afterDraw(chart: any) {
        const idx = self.activePeriodeIdx;
        if (idx < 0) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data?.[idx]) return;
        const pt = meta.data[idx];
        const ctx: CanvasRenderingContext2D = chart.ctx;
        const yAxis = chart.scales['y'];

        ctx.save();

        // Garis vertikal dashed amber
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pt.x, yAxis.top);
        ctx.lineTo(pt.x, yAxis.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge "Periode Aktif"
        const text = 'Periode Aktif';
        ctx.font = 'bold 10px sans-serif';
        const tw = ctx.measureText(text).width;
        const pad = 5;
        const bw = tw + pad * 2;
        const bh = 17;
        const bx = Math.min(Math.max(pt.x - bw / 2, chart.chartArea.left), chart.chartArea.right - bw);
        const by = yAxis.top + 2;
        const r = 3;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + bw / 2, by + bh / 2);

        ctx.restore();
      }
    };

    this.trenChartInst = new Chart(this.trenChartRef.nativeElement.getContext('2d')!, {
      type: 'line',
      data: { labels: data.labels, datasets: buildDatasets(data.datasets) },
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
      },
      plugins: [activePeriodeBadgePlugin]
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
    existing: Chart<any> | null,
    labels: string[], values: number[], hue: number
  ): Chart<any> {
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
      } as unknown as any,
      plugins: [this.outsideLabelPlugin()]
    }) as unknown as Chart<any>;
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
