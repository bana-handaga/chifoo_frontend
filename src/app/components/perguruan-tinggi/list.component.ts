import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

@Component({
  selector: 'app-pt-list',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Perguruan Tinggi</h1>
        <p>Daftar seluruh PTMA di Indonesia</p>
        <div class="periode-badge" *ngIf="statistik?.periode_label">
          <span class="periode-badge__dot"></span>
          Periode Pelaporan Aktif: <strong>{{ statistik.periode_label }}</strong>
        </div>
      </div>

      <!-- Stats overview -->
      <div class="stats-overview" *ngIf="statistik">
        <div class="stat-box">
          <div class="val">{{ statistik.total_pt }}</div>
          <div class="lbl">Total PT</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ statistik.total_muhammadiyah }}</div>
          <div class="lbl">Muhammadiyah</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ statistik.total_aisyiyah }}</div>
          <div class="lbl">Aisyiyah</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ statistik.total_prodi }}</div>
          <div class="lbl">Program Studi</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ statistik.total_dosen | number }}</div>
          <div class="lbl">Dosen Tetap</div>
        </div>
        <div class="stat-box">
          <div class="val">{{ statistik.total_mahasiswa | number }}</div>
          <div class="lbl">Mahasiswa</div>
        </div>
      </div>

      <!-- Charts: Akreditasi | Wilayah | Jenis -->
      <div class="three-col" *ngIf="statistik">
        <div class="card">
          <h3>Distribusi Akreditasi</h3>
          <div class="donut-wrap"><canvas #akrChart></canvas></div>
        </div>
        <div class="card" *ngIf="chartWilayah.length">
          <h3>Sebaran PT per Wilayah</h3>
          <div class="donut-wrap"><canvas #wilayahChart></canvas></div>
        </div>
        <div class="card">
          <h3>Distribusi Jenis</h3>
          <div *ngFor="let item of chartJenis" class="bar-row">
            <div class="bar-lbl">{{ item.label }}</div>
            <div class="bar-track"><div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div></div>
            <div class="bar-num">{{ item.total }}</div>
          </div>
        </div>
      </div>

      <!-- Notifikasi kadaluarsa -->
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

      <!-- Search Accordion -->
      <div class="pt-accordion">
        <div class="pt-toggle" (click)="filterOpen = !filterOpen">
          <span class="pt-toggle-icon">🔍</span>
          <span class="pt-toggle-text">
            Pencarian Perguruan Tinggi
            <span class="pt-badge" *ngIf="activeFilterCount > 0">{{ activeFilterCount }} filter aktif</span>
          </span>
          <div class="pt-header-actions" (click)="$event.stopPropagation()">
            <button class="pt-btn-exp pt-btn-csv"  (click)="exportPt('csv')"  title="Export CSV">CSV</button>
            <button class="pt-btn-exp pt-btn-xlsx" (click)="exportPt('xlsx')" title="Export XLSX">XLSX</button>
            <button class="pt-btn-exp pt-btn-pdf"  (click)="exportPt('pdf')"  title="Export PDF">PDF</button>
          </div>
          <span class="pt-chevron">{{ filterOpen ? '▲' : '▼' }}</span>
        </div>
        <div class="pt-body" *ngIf="filterOpen">
          <div class="ptf">
            <div class="ptf-row">
              <div class="ptf-field">
                <label>Nama / Singkatan PT</label>
                <input type="text" [(ngModel)]="search" (input)="onSearch()" placeholder="Cari nama, singkatan, kota...">
              </div>
              <div class="ptf-field">
                <label>Kadaluarsa Akreditasi</label>
                <select [(ngModel)]="filterExp" (change)="applyFilter()">
                  <option value="">Semua</option>
                  <option value="more_1y">Lebih dari 1 tahun</option>
                  <option value="less_3m">Kurang dari 3 bulan</option>
                  <option value="less_2m">Kurang dari 2 bulan</option>
                  <option value="less_1m">Kurang dari 1 bulan</option>
                </select>
              </div>
            </div>
            <div class="ptf-row">
              <div class="ptf-field">
                <label>Jenis</label>
                <select [(ngModel)]="filterJenis" (change)="applyFilter()">
                  <option value="">Semua Jenis</option>
                  <option value="universitas">Universitas</option>
                  <option value="institut">Institut</option>
                  <option value="sekolah_tinggi">Sekolah Tinggi</option>
                  <option value="politeknik">Politeknik</option>
                  <option value="akademi">Akademi</option>
                </select>
              </div>
              <div class="ptf-field">
                <label>Organisasi</label>
                <select [(ngModel)]="filterOrganisasi" (change)="applyFilter()">
                  <option value="">Semua</option>
                  <option value="muhammadiyah">Muhammadiyah</option>
                  <option value="aisyiyah">Aisyiyah</option>
                </select>
              </div>
              <div class="ptf-field">
                <label>Akreditasi</label>
                <select [(ngModel)]="filterAkreditasi" (change)="applyFilter()">
                  <option value="">Semua</option>
                  <option value="unggul">Unggul</option>
                  <option value="baik_sekali">Baik Sekali</option>
                  <option value="baik">Baik</option>
                  <option value="belum">Belum</option>
                </select>
              </div>
              <div class="ptf-field">
                <label>Status</label>
                <select [(ngModel)]="filterAktif" (change)="applyFilter()">
                  <option value="">Semua</option>
                  <option value="true">Aktif</option>
                  <option value="false">Tidak Aktif</option>
                </select>
              </div>
            </div>
            <div class="ptf-btn-row">
              <button class="pt-btn-reset" *ngIf="activeFilterCount > 0" (click)="resetFilters()">✕ Reset Filter</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabel -->
      <div class="card mt-16 pt-table-card">
        <div class="table-toolbar">
          <div class="table-info">Menampilkan {{ data.length }} dari {{ totalCount }} PT</div>
          <div class="toolbar-right">
            <div class="pagination-top" *ngIf="totalCount > 10">
              <button (click)="prevPage()" [disabled]="!prevUrl">‹ Prev</button>
              <span>Hal {{ page }} / {{ totalPages }}</span>
              <button (click)="nextPage()" [disabled]="!nextUrl">Next ›</button>
            </div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-sort" (click)="setSort('kode_pt')">Kode PT <span class="si">{{si('kode_pt')}}</span></th>
                <th class="th-sort" (click)="setSort('nama')">Nama <span class="si">{{si('nama')}}</span></th>
                <th>Jenis</th>
                <th>Organisasi</th>
                <th class="th-sort" (click)="setSort('akreditasi_institusi')">Akreditasi <span class="si">{{si('akreditasi_institusi')}}</span></th>
                <th class="sk-col">No. SK</th>
                <th class="th-sort" (click)="setSort('tanggal_kadaluarsa_akreditasi')">Berlaku s/d <span class="si">{{si('tanggal_kadaluarsa_akreditasi')}}</span></th>
                <th>Prodi</th>
                <th class="th-sort" (click)="setSort('mhs_sort')">Mahasiswa <span class="si">{{si('mhs_sort')}}</span></th>
                <th class="th-sort" (click)="setSort('dosen_sort')">Dosen <span class="si">{{si('dosen_sort')}}</span></th>
                <th>Status</th>
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
                <td class="text-right">{{ pt.total_dosen | number }}</td>
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

      <!-- Loading bar saat data sedang dimuat -->
      <div class="loading-bar" *ngIf="loading && !data.length">
        <div class="loading-bar-fill"></div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Stats overview ─── */
    .stats-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
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
    .stat-box {
      background: white; border-radius: 10px; padding: 10px 8px;
      text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .val { font-size: 18px; font-weight: 700; color: #1a237e; }
    .lbl { font-size: 10px; color: #666; margin-top: 4px; }

    /* ── Charts row ─── */
    .three-col { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
    .card { background: white; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative; }
    .card h3 { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
    .donut-wrap { position: relative; height: 200px; display: flex; align-items: center; justify-content: center; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .bar-lbl { width: 90px; font-size: 11px; color: #555; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
    .bar-num { width: 28px; text-align: right; font-size: 12px; font-weight: 600; color: #333; }

    /* ── PT Search Accordion ─── */
    .pt-accordion {
      background: white; border-radius: 12px; margin-bottom: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.09); overflow: hidden;
      border-left: 4px solid #16a34a;
    }
    .pt-toggle {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; cursor: pointer; user-select: none; transition: background 0.15s;
      color: #14532d;
    }
    .pt-toggle:hover { background: #f0fdf4; }
    .pt-toggle-icon { font-size: 14px; }
    .pt-toggle-text { flex: 1; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .pt-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; background: #dcfce7; color: #166534; border-radius: 20px; }
    .pt-chevron { font-size: 11px; color: #166534; }
    .pt-header-actions { display: flex; gap: 4px; }
    .pt-btn-exp { padding: 3px 8px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: filter 0.15s; }
    .pt-btn-exp:hover { filter: brightness(0.9); }
    .pt-btn-csv  { background: #16a34a; color: #fff; }
    .pt-btn-xlsx { background: #15803d; color: #fff; }
    .pt-btn-pdf  { background: #dc2626; color: #fff; }
    .pt-body { padding: 10px 14px 14px; border-top: 1px solid #dcfce7; }
    .ptf { display: flex; flex-direction: column; gap: 10px; }
    .ptf-row { display: flex; flex-direction: column; gap: 8px; }
    .ptf-field { display: flex; flex-direction: column; gap: 3px; }
    .ptf-field label { font-size: 11px; font-weight: 600; color: #166534; letter-spacing: .02em; }
    .ptf-field input, .ptf-field select {
      width: 100%; padding: 7px 10px; background: #f0fdf4;
      border: 1px solid #86efac; border-radius: 7px; font-size: 13px;
      box-sizing: border-box; color: #14532d;
    }
    .ptf-field input:focus, .ptf-field select:focus {
      outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
    }
    .ptf-btn-row { display: flex; gap: 8px; }
    .pt-btn-reset {
      padding: 5px 14px; font-size: 12px; font-weight: 600;
      border: 1px solid #16a34a; border-radius: 7px;
      cursor: pointer; background: white; color: #16a34a; transition: all 0.15s;
    }
    .pt-btn-reset:hover { background: #16a34a; color: #fff; }

    /* ── Notif bar ─── */
    .notif-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .notif-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      border-radius: 10px; font-size: 12px; cursor: pointer; border: 1px solid transparent; transition: filter 0.15s;
    }
    .notif-item:hover { filter: brightness(0.96); }
    .notif-red    { background: #fff0f0; border-color: #f5c6c6; color: #7f1d1d; }
    .notif-yellow { background: #fffbec; border-color: #f5e08a; color: #713f12; }
    .notif-icon { font-size: 14px; }
    .notif-action { margin-left: auto; font-weight: 600; white-space: nowrap; opacity: 0.7; }

    /* ── Table card ─── */
    .mt-16 { margin-top: 12px; }
    .pt-table-card { border-top: 3px solid #16a34a; }
    .pt-table-card .table-wrapper { background: rgba(34,197,94,.03); }
    .table-toolbar { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
    .table-info { font-size: 12px; color: #888; }
    .toolbar-right { width: 100%; }
    .pagination-top { display: flex; align-items: center; gap: 6px; }
    .pagination-top span { font-size: 12px; color: #555; white-space: nowrap; }
    .pagination-top button { padding: 3px 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
    .pagination-top button:disabled { opacity: 0.4; cursor: not-allowed; }

    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      text-align: left; padding: 8px 10px; background: #f8f9fa;
      font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    th.th-sort { cursor: pointer; user-select: none; }
    th.th-sort:hover { background: #eef0f3; color: #1e293b; }
    .si { font-size: .75rem; opacity: .55; margin-left: 3px; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr.row-yellow   td { background: #fffbec; }
    tr.row-red      td { background: #fff4f4; }
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
    .sk-col { display: none; font-size: 11px; color: #555; max-width: 160px; word-break: break-all; }
    .no-data { color: #bbb; }
    .exp-pill {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-weight: 700; color: #111; font-size: 12px; white-space: nowrap;
    }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }

    .pagination { display: flex; gap: 8px; align-items: center; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
    .pagination button { padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

    .loading-overlay {
      position: absolute; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; border-radius: 12px;
    }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-bar { height: 3px; background: #e8eaf6; border-radius: 2px; overflow: hidden; margin-top: 12px; }
    .loading-bar-fill { height: 100%; width: 40%; background: #1a237e; animation: slide 1s ease-in-out infinite alternate; }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

    /* ── Tablet ≥ 600px ─── */
    @media (min-width: 600px) {
      .stats-overview { grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
      .stat-box { padding: 12px 8px; }
      .val { font-size: 20px; }
      .lbl { font-size: 11px; }
      .three-col { grid-template-columns: 1fr 1fr; gap: 16px; }
      .donut-wrap { height: 220px; }
      .bar-lbl { width: 110px; font-size: 12px; }
      .ptf-row { flex-direction: row; flex-wrap: wrap; }
      .ptf-field { flex: 1; min-width: 140px; }
      .pt-toggle { padding: 12px 20px; }
      .pt-body { padding: 12px 20px 16px; }
      .notif-item { padding: 10px 16px; font-size: 13px; }
      .sk-col { display: table-cell; }
      .table-toolbar { flex-direction: row; align-items: center; }
      .toolbar-right { width: auto; }
    }

    /* ── Desktop ≥ 1024px ─── */
    @media (min-width: 1024px) {
      .stats-overview { grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 8px; }
      .stat-box { padding: 16px 12px; }
      .val { font-size: 28px; }
      .lbl { font-size: 12px; }
      .card { padding: 20px; }
      .card h3 { font-size: 15px; margin-bottom: 16px; }
      .three-col { grid-template-columns: 1fr 1fr 1fr; }
      .donut-wrap { height: 260px; }
      .bar-lbl { width: 120px; font-size: 13px; }
      .mt-16 { margin-top: 16px; }
      th, td { padding: 10px 12px; font-size: 13px; }
      .pagination button { padding: 6px 16px; font-size: 13px; }
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
  sortKey = 'mhs_sort';
  sortAsc = false;
  searchTimeout: any;
  count3m = 0;
  count2m = 0;
  statistik: any = null;
  chartJenis: any[] = [];
  chartAkreditasi: any[] = [];
  chartWilayah: any[] = [];
  filterOpen = false;
  private akrChartInstance: Chart | null = null;
  private wilayahChartInstance: Chart | null = null;
  @ViewChild('akrChart')     akrChartRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('wilayahChart') wilayahChartRef!: ElementRef<HTMLCanvasElement>;

  constructor(private api: ApiService, private router: Router, private zone: NgZone) {}

  ngOnInit() {
    this.loadData();
    this.loadNotifCounts();
    this.loadCharts();
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.search) n++;
    if (this.filterJenis) n++;
    if (this.filterOrganisasi) n++;
    if (this.filterAkreditasi) n++;
    if (this.filterAktif) n++;
    if (this.filterExp) n++;
    return n;
  }

  resetFilters() {
    this.search = '';
    this.filterJenis = '';
    this.filterOrganisasi = '';
    this.filterAkreditasi = '';
    this.filterAktif = '';
    this.filterExp = '';
    this.applyFilter();
  }

  loadNotifCounts() {
    this.api.getPerguruanTinggiList({ exp_filter: 'less_3m', page: 1 }).subscribe({
      next: res => this.count3m = res.count || 0
    });
    this.api.getPerguruanTinggiList({ exp_filter: 'less_2m', page: 1 }).subscribe({
      next: res => this.count2m = res.count || 0
    });
  }

  setExpFilter(val: string) {
    this.filterExp = val;
    this.filterOpen = true;
    this.applyFilter();
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
      this.statistik = res;

      const totalJ = res.per_jenis.reduce((s: number, x: any) => s + x.total, 0);
      this.chartJenis = res.per_jenis
        .map((x: any) => ({
          label: JENIS_LABELS[x.jenis] || x.jenis,
          total: x.total,
          pct: totalJ ? Math.round(x.total / totalJ * 100) : 0,
          color: JENIS_COLORS[x.jenis] || '#90a4ae'
        }))
        .sort((a: any, b: any) => b.total - a.total);

      const totalA = res.per_akreditasi.reduce((s: number, x: any) => s + x.total, 0);
      this.chartAkreditasi = ['unggul', 'baik_sekali', 'baik', 'belum'].map(k => {
        const found = res.per_akreditasi.find((x: any) => x.akreditasi_institusi === k);
        const total = found ? found.total : 0;
        return { label: AKR_LABELS[k], total, pct: totalA ? Math.round(total / totalA * 100) : 0, color: AKR_COLORS[k] };
      }).filter((x: any) => x.total > 0);

      const totalW = (res.per_wilayah || []).reduce((s: number, x: any) => s + x.total, 0);
      const wValues = (res.per_wilayah || []).map((x: any) => x.total);
      const wColors = this.gradientColors(wValues, 168, 50); // gradasi teal-hijau
      this.chartWilayah = (res.per_wilayah || []).map((x: any, i: number) => ({
        label: x.wilayah__nama || 'Lainnya',
        total: x.total,
        pct: totalW ? Math.round(x.total / totalW * 100) : 0,
        color: wColors[i]
      }));

      this.zone.runOutsideAngular(() => {
        setTimeout(() => { this.renderAkrChart(); this.renderWilayahChart(); }, 0);
      });
    });
  }

  /** Warna gradasi satu hue: nilai besar → gelap, nilai kecil → terang */
  private gradientColors(values: number[], hue: number, sat = 55): string[] {
    const max   = Math.max(...values);
    const min   = Math.min(...values);
    const range = max - min || 1;
    return values.map(v => {
      const t = (v - min) / range;         // 0 = terkecil, 1 = terbesar
      const l = Math.round(72 - t * 38);   // 72% (terang) → 34% (gelap)
      return `hsl(${hue},${sat}%,${l}%)`;
    });
  }

  private renderAkrChart() {
    if (!this.akrChartRef) return;
    if (this.akrChartInstance) { this.akrChartInstance.destroy(); this.akrChartInstance = null; }

    const labels = this.chartAkreditasi.map(x => x.label);
    const data   = this.chartAkreditasi.map(x => x.total);
    const colors = this.gradientColors(data, 213, 60); // gradasi biru

    const outsideLabelPlugin = {
      id: 'arcOutsideLabel',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;
        const cx: number = meta0.data[0].x;
        const cy: number = meta0.data[0].y;
        chart.data.datasets.forEach((_: any, di: number) => {
          chart.getDatasetMeta(di).data.forEach((arc: any, i: number) => {
            const value = chart.data.datasets[di].data[i];
            if (!value) return;
            const total = chart.data.datasets[di].data.reduce((a: number, b: number) => a + b, 0);
            if (value / total < 0.04) return;
            const outerR = arc.outerRadius;
            const angle  = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
            const x1 = cx + Math.cos(angle) * outerR * 0.92;
            const y1 = cy + Math.sin(angle) * outerR * 0.92;
            const x2 = cx + Math.cos(angle) * outerR * 1.10;
            const y2 = cy + Math.sin(angle) * outerR * 1.10;
            const right = Math.cos(angle) >= 0;
            const x3 = x2 + (right ? 10 : -10);
            ctx.save();
            ctx.strokeStyle = '#999';
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
            ctx.fillText(String(value), right ? x3 + 3 : x3 - 3, y2);
            ctx.restore();
          });
        });
      }
    };

    this.akrChartInstance = new Chart(this.akrChartRef.nativeElement.getContext('2d')!, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false as const,
        layout: { padding: { top: 28, bottom: 28, left: 28, right: 28 } },
        radius: '78%',
        plugins: {
          legend: { position: 'right' as const, labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } },
          tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.parsed} PT` } }
        }
      },
      plugins: [outsideLabelPlugin]
    });
  }

  private renderWilayahChart() {
    if (!this.wilayahChartRef) return;
    if (this.wilayahChartInstance) { this.wilayahChartInstance.destroy(); this.wilayahChartInstance = null; }

    const labels = this.chartWilayah.map(x => x.label);
    const data   = this.chartWilayah.map(x => x.total);
    const colors = this.gradientColors(data, 168, 50);

    const outsideLabelPlugin = {
      id: 'arcOutsideLabelW',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;
        const cx: number = meta0.data[0].x;
        const cy: number = meta0.data[0].y;
        chart.data.datasets.forEach((_: any, di: number) => {
          chart.getDatasetMeta(di).data.forEach((arc: any, i: number) => {
            const value = chart.data.datasets[di].data[i];
            if (!value) return;
            const total = chart.data.datasets[di].data.reduce((a: number, b: number) => a + b, 0);
            if (value / total < 0.04) return;
            const outerR = arc.outerRadius;
            const angle  = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
            const x2 = cx + Math.cos(angle) * outerR * 1.10;
            const y2 = cy + Math.sin(angle) * outerR * 1.10;
            const right = Math.cos(angle) >= 0;
            const x3 = x2 + (right ? 10 : -10);
            ctx.save();
            ctx.strokeStyle = '#999'; ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * outerR * 0.92, cy + Math.sin(angle) * outerR * 0.92);
            ctx.lineTo(x2, y2); ctx.lineTo(x3, y2); ctx.stroke();
            ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#222';
            ctx.textAlign = right ? 'left' : 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(String(value), right ? x3 + 3 : x3 - 3, y2);
            ctx.restore();
          });
        });
      }
    };

    this.wilayahChartInstance = new Chart(this.wilayahChartRef.nativeElement.getContext('2d')!, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false as const,
        layout: { padding: { top: 28, bottom: 28, left: 28, right: 28 } },
        radius: '78%',
        plugins: {
          legend: { position: 'right' as const, labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } },
          tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.parsed} PT` } }
        }
      },
      plugins: [outsideLabelPlugin]
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
    params['ordering'] = (this.sortAsc ? '' : '-') + this.sortKey;
    this.api.getPerguruanTinggiList(params).subscribe({
      next: res => {
        this.data = res.results || res;
        this.totalCount = res.count || this.data.length;
        this.nextUrl = res.next;
        this.prevUrl = res.previous;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter() { this.page = 1; this.loadData(); }

  setSort(key: string) {
    if (this.sortKey === key) { this.sortAsc = !this.sortAsc; } else { this.sortKey = key; this.sortAsc = true; }
    this.page = 1; this.loadData();
  }

  si(key: string): string {
    if (this.sortKey !== key) return '↕';
    return this.sortAsc ? '↑' : '↓';
  }

  goToDetail(id: number) { this.router.navigate(['/perguruan-tinggi', id]); }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => { this.page = 1; this.loadData(); }, 400);
  }

  nextPage() { if (this.nextUrl) { this.page++; this.loadData(); } }
  prevPage() { if (this.prevUrl) { this.page--; this.loadData(); } }

  formatAkreditasi(v: string) {
    return ({ unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', belum: 'Belum' } as any)[v] || v;
  }

  exportPt(fmt: 'csv' | 'xlsx' | 'pdf') {
    const params: any = { page: 1, page_size: 500 };
    if (this.search) params['search'] = this.search;
    if (this.filterJenis) params['jenis'] = this.filterJenis;
    if (this.filterOrganisasi) params['organisasi_induk'] = this.filterOrganisasi;
    if (this.filterAkreditasi) params['akreditasi_institusi'] = this.filterAkreditasi;
    if (this.filterAktif !== '') params['is_active'] = this.filterAktif;
    if (this.filterExp) params['exp_filter'] = this.filterExp;
    params['ordering'] = (this.sortAsc ? '' : '-') + this.sortKey;

    this.api.getPerguruanTinggiList(params).subscribe({ next: (res: any) => {
      const rows = (res.results || res) as any[];
      const headers = ['Kode PT','Singkatan','Nama','Jenis','Organisasi','Akreditasi','Kota','Provinsi','Prodi','Mahasiswa','Dosen Tetap','Status'];
      const body = rows.map((p: any) => [
        p.kode_pt, p.singkatan, p.nama,
        p.jenis ? (p.jenis as string).replace('_',' ') : '',
        p.organisasi_induk,
        this.formatAkreditasi(p.akreditasi_institusi),
        p.kota, p.provinsi,
        p.total_prodi ?? '',
        p.total_mahasiswa ?? '',
        p.total_dosen ?? '',
        p.is_active ? 'Aktif' : 'Tidak Aktif',
      ]);
      const ts = new Date().toISOString().slice(0,10);
      if (fmt === 'csv') {
        const lines = [headers, ...body].map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `perguruan-tinggi-${ts}.csv`; a.click();
      } else if (fmt === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Perguruan Tinggi');
        XLSX.writeFile(wb, `perguruan-tinggi-${ts}.xlsx`);
      } else {
        const html = `<html><head><title>Perguruan Tinggi</title>
          <style>body{font-family:sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}
          th,td{border:1px solid #ccc;padding:4px 6px}th{background:#f0fdf4;color:#166534}</style></head>
          <body><h3>Data Perguruan Tinggi</h3>
          <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${body.map(r=>`<tr>${r.map((c: any)=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></body></html>`;
        const w = window.open('','_blank')!; w.document.write(html); w.document.close(); w.print();
      }
    }});
  }

  expStatus(tgl: string): string {
    if (!tgl) return '';
    const now = new Date();
    const exp = new Date(tgl);
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 60) return 'red';
    if (diffDays < 90) return 'yellow';
    return 'green';
  }
}
