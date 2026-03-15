import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import {
  Chart, LineController, LineElement, PointElement,
  BarController, BarElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-pt-detail',
  template: `
    <div class="page" *ngIf="pt">
      <div class="breadcrumb"><a routerLink="/perguruan-tinggi">Perguruan Tinggi</a> / {{ pt.singkatan }}</div>
      <div class="detail-header card mb-16">
        <div class="header-main">
          <div class="pt-logo" *ngIf="pt.logo"><img [src]="pt.logo" alt="logo"></div>
          <div class="pt-logo placeholder" *ngIf="!pt.logo">🏫</div>
          <div class="pt-info">
            <h1>{{ pt.nama }}</h1>
            <div class="pt-meta">
              <span>{{ pt.kode_pt }}</span> ·
              <span>{{ pt.jenis | titlecase }}</span> ·
              <span [class]="'badge badge-' + pt.organisasi_induk">{{ pt.organisasi_induk | titlecase }}</span> ·
              <span [class]="'badge badge-akr-' + pt.akreditasi_institusi">{{ formatAkreditasi(pt.akreditasi_institusi) }}</span>
            </div>
            <div class="pt-akreditasi-detail" *ngIf="pt.nomor_sk_akreditasi || pt.tanggal_kadaluarsa_akreditasi">
              <span *ngIf="pt.nomor_sk_akreditasi" class="akr-item">
                <span class="akr-lbl">No. SK</span>
                <span class="akr-val">{{ pt.nomor_sk_akreditasi }}</span>
              </span>
              <span *ngIf="pt.tanggal_kadaluarsa_akreditasi" class="akr-item">
                <span class="akr-lbl">Berlaku s/d</span>
                <span [class]="'exp-pill exp-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)">
                  {{ pt.tanggal_kadaluarsa_akreditasi | date:'dd MMM yyyy' }}
                </span>
              </span>
            </div>
            <div class="pt-address">📍 {{ pt.alamat }}, {{ pt.kota }}, {{ pt.provinsi }}</div>
            <div class="pt-contacts">
              <a *ngIf="pt.website" [href]="pt.website" target="_blank">🌐 {{ pt.website }}</a>
              <span *ngIf="pt.email">📧 {{ pt.email }}</span>
              <span *ngIf="pt.telepon">📞 {{ pt.telepon }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs-wrapper">
        <div class="tabs">
          <button [class.active]="tab==='prodi'" (click)="setTab('prodi')">Program Studi ({{ pt.program_studi?.length }})</button>
          <button [class.active]="tab==='mahasiswa'" (click)="setTab('mahasiswa')">Data Mahasiswa</button>
          <button [class.active]="tab==='dosen'" (click)="setTab('dosen')">Data Dosen</button>
        </div>
      </div>

      <!-- Tab: Program Studi -->
      <div class="card" *ngIf="tab==='prodi'">
        <div class="periode-label" *ngIf="pt.periode_aktif_label">
          Mahasiswa aktif: <strong>{{ pt.periode_aktif_label }}</strong>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Prodi</th>
                <th>Jenjang</th>
                <th>Akreditasi</th>
                <th class="text-right">Mhs Aktif</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of pt.program_studi">
                <td><code>{{ p.kode_prodi }}</code></td>
                <td>{{ p.nama }}</td>
                <td>{{ p.jenjang_display }}</td>
                <td><span class="badge">{{ p.akreditasi_display }}</span></td>
                <td class="text-right mhs-col">
                  <span *ngIf="p.mahasiswa_aktif_periode > 0">{{ p.mahasiswa_aktif_periode | number }}</span>
                  <span *ngIf="p.mahasiswa_aktif_periode === 0" class="no-data">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Data Mahasiswa -->
      <div class="card" *ngIf="tab==='mahasiswa'">
        <div class="no-data-msg" *ngIf="!pt.data_mahasiswa?.length">Belum ada data mahasiswa.</div>

        <ng-container *ngIf="pt.data_mahasiswa?.length">
          <!-- Filter Program Studi -->
          <div class="prodi-filter-wrap">
            <div class="prodi-filter-header" (click)="prodiFilterOpen = !prodiFilterOpen">
              <span class="pf-title">Filter Program Studi</span>
              <span class="pf-count">
                {{ selectedProdiMhs.size }}/{{ prodiListMhs.length }} dipilih
              </span>
              <button class="pf-all" (click)="$event.stopPropagation(); selectAllProdiMhs()">Semua</button>
              <button class="pf-none" (click)="$event.stopPropagation(); clearAllProdiMhs()">Hapus</button>
              <span class="pf-chevron">{{ prodiFilterOpen ? '▲' : '▼' }}</span>
            </div>
            <div class="prodi-checklist" *ngIf="prodiFilterOpen">
              <label *ngFor="let p of prodiListMhs" class="prodi-check-item">
                <input type="checkbox"
                       [checked]="selectedProdiMhs.has(p.id)"
                       (change)="toggleProdiMhs(p.id)">
                <span class="prodi-check-name">{{ p.nama }}</span>
                <span class="prodi-check-jenjang">{{ p.jenjang }}</span>
              </label>
            </div>
          </div>

          <!-- Grafik line -->
          <div class="chart-container">
            <canvas #mhsChart></canvas>
          </div>

          <!-- Tabel ringkas -->
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tahun Akademik</th>
                  <th>Semester</th>
                  <th class="text-right">Mahasiswa Aktif</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of mhsDataFiltered">
                  <td>{{ m.tahun_akademik }}</td>
                  <td>{{ m.semester | titlecase }}</td>
                  <td class="text-right aktif-col">{{ m.mahasiswa_aktif | number }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
      </div>

      <!-- Tab: Data Dosen -->
      <div class="card dosen-card" *ngIf="tab==='dosen'">
        <div class="no-data-msg" *ngIf="!pt.data_dosen?.length">Belum ada data dosen.</div>

        <!-- Accordion per periode -->
        <div class="accordion" *ngFor="let d of pt.data_dosen; let i = index"
             [class.accordion--open]="expandedDosen.has(i)">

          <!-- Accordion header -->
          <button class="accordion__header" (click)="toggleDosen(i)">
            <div class="accordion__title">
              <span class="acc-periode">{{ d.tahun_akademik }}</span>
              <span class="acc-sem-badge">{{ d.semester | titlecase }}</span>
              <span class="acc-prodi-count">{{ d.per_prodi?.length || 0 }} prodi</span>
            </div>
            <div class="accordion__stats">
              <span class="acc-stat"><span class="acc-stat-lbl">Tetap</span><strong>{{ d.dosen_tetap }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Tdk Tetap</span><strong>{{ d.dosen_tidak_tetap }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S3</span><strong>{{ d.dosen_s3 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S2</span><strong>{{ d.dosen_s2 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S1</span><strong>{{ d.dosen_s1 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Profesor</span><strong>{{ d.dosen_guru_besar }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">L.Kepala</span><strong>{{ d.dosen_lektor_kepala }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Lektor</span><strong>{{ d.dosen_lektor }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Ast.Ahli</span><strong>{{ d.dosen_asisten_ahli }}</strong></span>
            </div>
            <span class="accordion__chevron">{{ expandedDosen.has(i) ? '▲' : '▼' }}</span>
          </button>

          <!-- Accordion body -->
          <div class="accordion__body" *ngIf="expandedDosen.has(i)">

            <!-- Toolbar: filter jenjang + dataset toggles -->
            <div class="acc-toolbar">
              <div class="acc-toolbar__left">
                <label class="filter-label">Jenjang:</label>
                <select [(ngModel)]="filterDosenJenjang" class="filter-select">
                  <option value="">Semua</option>
                  <option *ngFor="let j of dosenJenjangOptions" [value]="j">{{ j }}</option>
                </select>
                <span class="filter-reset" *ngIf="filterDosenJenjang" (click)="filterDosenJenjang=''">✕</span>
                <span class="sub-info-inline" *ngIf="filterDosenJenjang">
                  {{ filteredProdi(d.per_prodi).length }}/{{ d.per_prodi?.length }} prodi
                </span>
              </div>
              <div class="acc-toolbar__right">
                <span class="toggle-label">Grafik:</span>
                <button *ngFor="let ds of DOSEN_DATASETS"
                        class="ds-toggle"
                        [class.active]="visibleDatasets.has(ds.key)"
                        [style.--ds-color]="ds.color"
                        (click)="toggleDataset(ds.key, i)">
                  {{ ds.label }}
                </button>
              </div>
            </div>

            <!-- Sub-accordion: Grafik -->
            <div class="sub-acc" [class.sub-acc--open]="subView(i)==='chart'">
              <button class="sub-acc__header" (click)="setSubView(i, 'chart')">
                <span>📊 Grafik per Program Studi</span>
                <span class="sub-acc__chevron">{{ subView(i)==='chart' ? '▲' : '▼' }}</span>
              </button>
              <div class="sub-acc__body" *ngIf="subView(i)==='chart'">
                <div class="acc-chart-wrap" [style.height.px]="chartHeight(d.per_prodi)">
                  <canvas [id]="'dosenChart-' + i"></canvas>
                </div>
              </div>
            </div>

            <!-- Sub-accordion: Tabel -->
            <div class="sub-acc" [class.sub-acc--open]="subView(i)==='table'">
              <button class="sub-acc__header" (click)="setSubView(i, 'table')">
                <span>📋 Tabel Rincian per Program Studi</span>
                <span class="sub-acc__chevron">{{ subView(i)==='table' ? '▲' : '▼' }}</span>
              </button>
              <div class="sub-acc__body" *ngIf="subView(i)==='table'">
                <div class="table-wrapper">
                  <table class="data-table sub-table">
                    <thead>
                      <tr>
                        <th>Program Studi</th><th>Jenjang</th>
                        <th class="text-right">Tetap</th><th class="text-right">Tdk Tetap</th>
                        <th class="text-right">S3</th><th class="text-right">S2</th><th class="text-right">S1</th>
                        <th class="text-right">Profesor</th><th class="text-right">L.Kepala</th>
                        <th class="text-right">Lektor</th><th class="text-right">Ast.Ahli</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let p of filteredProdi(d.per_prodi)">
                        <td>{{ p.prodi_nama }}</td>
                        <td><span class="badge-jenjang">{{ p.prodi_jenjang }}</span></td>
                        <td class="text-right num-col">{{ p.dosen_tetap }}</td>
                        <td class="text-right num-col">{{ p.dosen_tidak_tetap }}</td>
                        <td class="text-right num-col">{{ p.dosen_s3 }}</td>
                        <td class="text-right num-col">{{ p.dosen_s2 }}</td>
                        <td class="text-right num-col">{{ p.dosen_s1 }}</td>
                        <td class="text-right num-col">{{ p.dosen_guru_besar }}</td>
                        <td class="text-right num-col">{{ p.dosen_lektor_kepala }}</td>
                        <td class="text-right num-col">{{ p.dosen_lektor }}</td>
                        <td class="text-right num-col">{{ p.dosen_asisten_ahli }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div><!-- /accordion__body -->
        </div><!-- /accordion -->
      </div>
    </div>
    <div class="loading-overlay" *ngIf="loading"><div class="spinner"></div></div>
  `,
  styles: [`
    .breadcrumb { font-size: 13px; color: #888; margin-bottom: 16px; }
    .breadcrumb a { color: #1a237e; text-decoration: none; }

    .detail-header { margin-bottom: 16px; }
    .header-main { display: flex; gap: 20px; align-items: flex-start; }
    .pt-logo img { width: 80px; height: 80px; object-fit: contain; border-radius: 8px; border: 1px solid #eee; flex-shrink: 0; }
    .pt-logo.placeholder { font-size: 48px; width: 80px; text-align: center; flex-shrink: 0; }
    .pt-info { flex: 1; min-width: 0; }
    h1 { font-size: 20px; font-weight: 700; color: #1a237e; margin-bottom: 8px; }
    .pt-meta { font-size: 13px; color: #555; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .pt-address { font-size: 13px; color: #666; margin-bottom: 6px; }
    .pt-contacts { display: flex; gap: 16px; font-size: 12px; color: #444; flex-wrap: wrap; }
    .pt-contacts a { color: #1a237e; text-decoration: none; }
    .pt-akreditasi-detail { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
    .akr-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .akr-lbl { color: #888; font-weight: 500; }
    .akr-val { color: #333; font-weight: 600; }
    .exp-pill {
      display: inline-block; padding: 3px 10px; border-radius: 6px;
      font-weight: 700; color: #111; font-size: 12px;
    }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }

    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .mb-16 { margin-bottom: 16px; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; background: #f0f0f0; }
    .badge-muhammadiyah { background: #e3f2fd; color: #1565c0; }
    .badge-aisyiyah { background: #fce4ec; color: #c62828; }
    .badge-akr-unggul { background: #e6f4ea; color: #137333; }
    .badge-akr-baik_sekali { background: #e8f5e9; color: #2e7d32; }
    .badge-akr-baik { background: #fff8e1; color: #f57f17; }

    /* Tabs */
    .tabs-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 12px; }
    .tabs { display: flex; gap: 4px; min-width: max-content; }
    .tabs button {
      padding: 8px 16px; border: 1px solid #ddd; background: white;
      border-radius: 8px 8px 0 0; font-size: 13px; cursor: pointer; white-space: nowrap;
    }
    .tabs button.active { background: #1a237e; color: white; border-color: #1a237e; }

    .periode-label {
      font-size: 12px; color: #666; margin-bottom: 12px;
      padding: 6px 10px; background: #f0f4ff; border-radius: 6px; display: inline-block;
    }
    .mhs-col  { font-weight: 600; color: #1a237e; }
    .aktif-col { font-weight: 700; color: #1a237e; }

    /* Filter prodi mahasiswa */
    .prodi-filter-wrap { border: 1px solid #e2e6f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .prodi-filter-header {
      display: flex; align-items: center; gap: 8px; padding: 9px 14px;
      background: #f4f5fb; cursor: pointer; user-select: none;
    }
    .prodi-filter-header:hover { background: #eaecf8; }
    .pf-title { font-size: 13px; font-weight: 600; color: #1a237e; flex: 1; }
    .pf-count { font-size: 12px; color: #666; white-space: nowrap; }
    .pf-all, .pf-none {
      padding: 2px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid;
    }
    .pf-all  { background: #e8ecf8; color: #1a237e; border-color: #9fa8da; }
    .pf-none { background: #fce8e6; color: #c5221f; border-color: #ef9a9a; }
    .pf-chevron { font-size: 11px; color: #888; }
    .prodi-checklist {
      max-height: 220px; overflow-y: auto; padding: 8px 12px;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 2px;
      border-top: 1px solid #e2e6f0; background: white;
    }
    .prodi-check-item {
      display: flex; align-items: center; gap: 6px; padding: 4px 6px;
      border-radius: 4px; cursor: pointer; font-size: 12px;
    }
    .prodi-check-item:hover { background: #f0f4ff; }
    .prodi-check-item input { flex-shrink: 0; cursor: pointer; accent-color: #1a237e; }
    .prodi-check-name { flex: 1; color: #333; }
    .prodi-check-jenjang { font-size: 10px; color: #999; white-space: nowrap; }
    .no-data  { color: #bbb; font-weight: 400; }
    .tab-note { font-size: 12px; color: #888; margin-bottom: 14px; font-style: italic; }
    .no-data-msg { text-align: center; color: #aaa; font-size: 13px; padding: 24px 0; }

    /* Chart */
    .chart-container {
      position: relative; height: 280px;
      margin-bottom: 20px;
    }

    /* Table */
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { padding: 10px 12px; background: #f8f9fa; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .text-right { text-align: right; }

    /* ── Accordion ─────────────────────────────── */
    .dosen-card { padding: 16px; }
    .accordion {
      border: 1px solid #e2e6f0; border-radius: 10px;
      margin-bottom: 10px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .accordion--open { border-color: #9fa8da; box-shadow: 0 2px 8px rgba(26,35,126,0.1); }

    .accordion__header {
      width: 100%; display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: #f8f9fa; border: none; cursor: pointer;
      text-align: left; transition: background 0.15s;
    }
    .accordion--open .accordion__header { background: #e8ecf8; }
    .accordion__header:hover { background: #eef0f8; }

    .accordion__title { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .acc-periode { font-weight: 700; font-size: 14px; color: #1a237e; }
    .acc-sem-badge {
      padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
      background: #1a237e; color: white;
    }
    .acc-prodi-count { font-size: 11px; color: #888; white-space: nowrap; }

    .accordion__stats {
      display: flex; flex-wrap: wrap; gap: 6px 14px; flex: 1;
      justify-content: flex-start; padding: 0 8px;
    }
    .acc-stat { display: flex; flex-direction: column; align-items: center; min-width: 40px; }
    .acc-stat-lbl { font-size: 10px; color: #999; }
    .acc-stat strong { font-size: 13px; color: #1a237e; }
    .accordion__chevron { font-size: 11px; color: #1a237e; flex-shrink: 0; margin-left: auto; }

    /* ── Accordion body ─────────────────────────── */
    .accordion__body { border-top: 1px solid #e2e6f0; }

    /* Toolbar */
    .acc-toolbar {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: 10px 20px; padding: 10px 16px;
      background: #f4f5fb; border-bottom: 1px solid #e2e6f0;
    }
    .acc-toolbar__left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .acc-toolbar__right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
    .filter-label { font-size: 12px; color: #555; font-weight: 500; white-space: nowrap; }
    .filter-select { padding: 5px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; background: white; }
    .filter-reset {
      font-size: 11px; color: #c5221f; cursor: pointer;
      padding: 3px 7px; border-radius: 5px; background: #fce8e6;
    }
    .filter-reset:hover { background: #fad2cf; }
    .sub-info-inline { font-size: 11px; color: #888; }
    .toggle-label { font-size: 11px; color: #666; font-weight: 500; white-space: nowrap; }
    .ds-toggle {
      padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500;
      cursor: pointer; border: 1.5px solid var(--ds-color);
      background: white; color: var(--ds-color);
      transition: background 0.15s, color 0.15s;
    }
    .ds-toggle.active { background: var(--ds-color); color: white; }

    /* Chart */
    .acc-chart-wrap { position: relative; padding: 12px 16px; background: #fafbff; }

    /* Sub-accordion (grafik / tabel) */
    .sub-acc { border-top: 1px solid #e2e6f0; }
    .sub-acc__header {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 9px 16px; background: #f0f2fa; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600; color: #1a237e; text-align: left;
      transition: background 0.15s;
    }
    .sub-acc__header:hover { background: #e3e7f5; }
    .sub-acc--open .sub-acc__header { background: #dde2f5; }
    .sub-acc__chevron { font-size: 11px; color: #1a237e; }
    .sub-acc__body { background: white; }
    .sub-table th { background: #f0f4ff; font-size: 12px; padding: 8px 12px; }
    .sub-table td { font-size: 12px; padding: 7px 12px; }
    .num-col { color: #333; }
    .badge-jenjang { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; background: #f0f0f0; color: #555; white-space: nowrap; }

    .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #1a237e; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 767px) {
      .header-main { flex-direction: column; gap: 12px; }
      .pt-logo img, .pt-logo.placeholder { width: 60px; height: 60px; font-size: 36px; }
      h1 { font-size: 16px; }
      .card { padding: 14px; }
      th, td { padding: 8px 10px; font-size: 12px; }
      .chart-container { height: 220px; }
    }
  `]
})
export class PerguruanTinggiDetailComponent implements OnInit, AfterViewChecked {
  @ViewChild('mhsChart') mhsChartRef!: ElementRef<HTMLCanvasElement>;

  pt: any;
  loading = true;
  tab = 'prodi';
  expandedDosen = new Set<number>();
  private dosenSubView = new Map<number, 'chart' | 'table' | null>();

  subView(i: number): 'chart' | 'table' | null {
    return this.dosenSubView.has(i) ? this.dosenSubView.get(i)! : 'chart';
  }

  setSubView(i: number, view: 'chart' | 'table') {
    const current = this.subView(i);
    if (current === view) {
      // Toggle: tutup jika sudah terbuka
      this.dosenSubView.set(i, null);
      if (view === 'chart') {
        const c = this.dosenCharts.get(i);
        if (c) { c.destroy(); this.dosenCharts.delete(i); }
      }
    } else {
      this.dosenSubView.set(i, view);
      if (view === 'chart') {
        setTimeout(() => this.renderDosenChart(i), 50);
      }
    }
  }
  private _filterDosenJenjang = '';
  get filterDosenJenjang() { return this._filterDosenJenjang; }
  set filterDosenJenjang(v: string) {
    this._filterDosenJenjang = v;
    setTimeout(() => this.rerenderAllDosenCharts(), 0);
  }
  private dosenCharts = new Map<number, Chart>();
  private chart: Chart | null = null;
  private chartRendered = false;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getPerguruanTinggiDetail(id).subscribe({
      next: d => { this.pt = d; this.loading = false; this.buildProdiListMhs(); this.buildJenjangOptions(); },
      error: () => this.loading = false
    });
  }

  ngAfterViewChecked() {
    if (this.tab === 'mahasiswa' && this.mhsChartRef && !this.chartRendered) {
      this.chartRendered = true;
      this.renderChart();
    }
  }

  setTab(t: string) {
    this.tab = t;
    if (t !== 'mahasiswa') {
      this.chartRendered = false;
      if (this.chart) { this.chart.destroy(); this.chart = null; }
    }
  }

  private renderChart() {
    if (!this.mhsChartRef) return;
    const source = this.mhsDataFiltered;
    if (!source.length) return;

    // Urutkan: tahun_akademik ascending, dalam tahun yang sama ganjil → genap
    const semOrder: Record<string, number> = { ganjil: 0, genap: 1 };
    const rows = [...source].sort((a: any, b: any) => {
      if (a.tahun_akademik !== b.tahun_akademik) {
        return a.tahun_akademik.localeCompare(b.tahun_akademik);
      }
      return (semOrder[a.semester] ?? 0) - (semOrder[b.semester] ?? 0);
    });
    const labels = rows.map((m: any) =>
      `${m.tahun_akademik}\n${m.semester.charAt(0).toUpperCase() + m.semester.slice(1)}`
    );
    const values = rows.map((m: any) => m.mahasiswa_aktif);

    const ctx = this.mhsChartRef.nativeElement.getContext('2d')!;
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Mahasiswa Aktif',
          data: values,
          borderColor: '#1a237e',
          backgroundColor: 'rgba(26,35,126,0.08)',
          pointBackgroundColor: '#1a237e',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + (ctx.parsed.y ?? 0).toLocaleString('id-ID') + ' mahasiswa'
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 30 },
            grid: { display: false }
          },
          y: {
            beginAtZero: false,
            ticks: {
              font: { size: 11 },
              callback: (v: any) => v.toLocaleString('id-ID')
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }

  readonly DOSEN_DATASETS = [
    { key: 's3',            label: 'S3',           color: '#1a237e' },
    { key: 's2',            label: 'S2',           color: '#1565c0' },
    { key: 's1',            label: 'S1',           color: '#0288d1' },
    { key: 'guru_besar',    label: 'Profesor',     color: '#e67300' },
    { key: 'lektor_kepala', label: 'Lekt. Kepala', color: '#f57f17' },
    { key: 'lektor',        label: 'Lektor',       color: '#00695c' },
    { key: 'asisten_ahli',  label: 'Asisten Ahli', color: '#6a1b9a' },
    { key: 'tetap',         label: 'Tetap',        color: '#137333' },
    { key: 'tidak_tetap',   label: 'Tdk Tetap',    color: '#b71c1c' },
  ];

  visibleDatasets = new Set<string>(['s3', 'guru_besar']);

  toggleDataset(key: string, openIndex: number) {
    if (this.visibleDatasets.has(key)) this.visibleDatasets.delete(key);
    else this.visibleDatasets.add(key);
    setTimeout(() => this.rerenderAllDosenCharts(), 0);
  }

  // ── Filter prodi mahasiswa ────────────────────────
  prodiFilterOpen = false;
  prodiListMhs: { id: number; nama: string; jenjang: string }[] = [];
  selectedProdiMhs = new Set<number>();
  mhsDataFiltered: any[] = [];

  private buildProdiListMhs() {
    const map = new Map<number, { id: number; nama: string; jenjang: string }>();
    for (const periode of this.pt?.data_mahasiswa || []) {
      for (const p of periode.per_prodi || []) {
        if (!map.has(p.prodi_id)) {
          map.set(p.prodi_id, { id: p.prodi_id, nama: p.prodi_nama, jenjang: p.prodi_jenjang });
        }
      }
    }
    this.prodiListMhs = Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
    // Default: semua terpilih
    this.selectedProdiMhs = new Set(this.prodiListMhs.map(p => p.id));
    this.recomputeMhsData();
  }

  toggleProdiMhs(id: number) {
    // Buat Set baru agar Angular mendeteksi perubahan referensi
    const next = new Set(this.selectedProdiMhs);
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedProdiMhs = next;
    this.recomputeMhsData();
  }

  selectAllProdiMhs() {
    this.selectedProdiMhs = new Set(this.prodiListMhs.map(p => p.id));
    this.recomputeMhsData();
  }

  clearAllProdiMhs() {
    this.selectedProdiMhs = new Set();
    this.recomputeMhsData();
  }

  private recomputeMhsData() {
    const src = this.pt?.data_mahasiswa ?? [];
    const allSelected = this.selectedProdiMhs.size === this.prodiListMhs.length;
    this.mhsDataFiltered = allSelected
      ? src
      : src.map((periode: any) => {
          const rows = (periode.per_prodi || []).filter(
            (p: any) => this.selectedProdiMhs.has(p.prodi_id)
          );
          return {
            tahun_akademik: periode.tahun_akademik,
            semester: periode.semester,
            mahasiswa_aktif: rows.reduce((s: number, p: any) => s + (p.mahasiswa_aktif || 0), 0),
            per_prodi: rows,
          };
        });
    // Destroy chart lama lalu render ulang
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.chartRendered = false;
    if (this.tab === 'mahasiswa') {
      setTimeout(() => { this.chartRendered = true; this.renderChart(); }, 50);
    }
  }

  dosenJenjangOptions: string[] = [];

  buildJenjangOptions() {
    const set = new Set<string>();
    for (const d of this.pt?.data_dosen || []) {
      for (const p of d.per_prodi || []) {
        if (p.prodi_jenjang) set.add(p.prodi_jenjang);
      }
    }
    this.dosenJenjangOptions = Array.from(set).sort();
  }

  filteredProdi(perProdi: any[]): any[] {
    if (!this.filterDosenJenjang) return perProdi || [];
    return (perProdi || []).filter(p => p.prodi_jenjang === this.filterDosenJenjang);
  }

  toggleDosen(i: number) {
    if (this.expandedDosen.has(i)) {
      this.expandedDosen.delete(i);
      this.dosenSubView.delete(i);
      const c = this.dosenCharts.get(i);
      if (c) { c.destroy(); this.dosenCharts.delete(i); }
    } else {
      this.expandedDosen.add(i);
      this.dosenSubView.set(i, 'chart');   // default: grafik terbuka
      setTimeout(() => this.renderDosenChart(i), 50);
    }
  }

  chartHeight(perProdi: any[]): number {
    const rows = this.filteredProdi(perProdi).length || 1;
    return Math.max(200, rows * 26 + 70);
  }

  private readonly DS_FIELD_MAP: Record<string, string> = {
    s3: 'dosen_s3', s2: 'dosen_s2', s1: 'dosen_s1',
    guru_besar: 'dosen_guru_besar', lektor_kepala: 'dosen_lektor_kepala',
    lektor: 'dosen_lektor', asisten_ahli: 'dosen_asisten_ahli',
    tetap: 'dosen_tetap', tidak_tetap: 'dosen_tidak_tetap',
  };

  private renderDosenChart(i: number) {
    const canvas = document.getElementById(`dosenChart-${i}`) as HTMLCanvasElement;
    if (!canvas) return;
    const periode = this.pt?.data_dosen?.[i];
    if (!periode) return;

    const rows   = this.filteredProdi(periode.per_prodi);
    const labels = rows.map((p: any) => `${p.prodi_nama} (${p.prodi_jenjang})`);

    const existing = this.dosenCharts.get(i);
    if (existing) { existing.destroy(); }

    const datasets = this.DOSEN_DATASETS.map(ds => {
      const field = this.DS_FIELD_MAP[ds.key];
      return {
        label: ds.label,
        data: rows.map((p: any) => p[field] || 0),
        backgroundColor: ds.color + 'bf',   // 75% opacity
        borderColor: ds.color,
        borderWidth: 1,
        borderRadius: 3,
        hidden: !this.visibleDatasets.has(ds.key),
      };
    });

    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x}` } },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          y: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
    this.dosenCharts.set(i, chart);
  }

  private rerenderAllDosenCharts() {
    for (const i of this.expandedDosen) {
      this.renderDosenChart(i);
    }
  }

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
