import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
import * as XLSX from 'xlsx';

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
  <div class="ds-accordion" [class.open]="searchOpen">
    <button class="ds-toggle" (click)="toggleSearch()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Cari Dosen
      <span class="ds-chevron" [class.rotated]="searchOpen">▾</span>
    </button>

    <div class="ds-body" *ngIf="searchOpen">
      <div class="ds-fields">
        <div class="dsf">
          <label>Nama Dosen</label>
          <input type="text" [(ngModel)]="searchForm.nama" placeholder="Ketik nama dosen..." (keyup.enter)="runSearch()">
        </div>
        <div class="dsf">
          <label>Jabatan Fungsional</label>
          <select [(ngModel)]="searchForm.jabatan">
            <option value="">— Semua —</option>
            <option value="Profesor">Profesor</option>
            <option value="Lektor Kepala">Lektor Kepala</option>
            <option value="Lektor">Lektor</option>
            <option value="Asisten Ahli">Asisten Ahli</option>
          </select>
        </div>
        <div class="dsf">
          <label>Pendidikan</label>
          <select [(ngModel)]="searchForm.pendidikan">
            <option value="">— Semua —</option>
            <option value="s3">S3</option>
            <option value="s2">S2</option>
            <option value="s1">S1</option>
            <option value="profesi">Profesi</option>
          </select>
        </div>
        <div class="dsf">
          <label>Status</label>
          <select [(ngModel)]="searchForm.status">
            <option value="">— Semua —</option>
            <option value="Aktif">Aktif</option>
            <option value="TUGAS BELAJAR">Tugas Belajar</option>
            <option value="IJIN BELAJAR">Ijin Belajar</option>
            <option value="CUTI">Cuti</option>
          </select>
        </div>
        <div class="dsf dsf--action">
          <button class="ds-btn-search" (click)="runSearch()" [disabled]="searching">
            {{ searching ? 'Mencari...' : 'Cari' }}
          </button>
          <button class="ds-btn-reset" (click)="resetSearch()" *ngIf="searchDone">Reset</button>
        </div>
      </div>

      <!-- Hasil -->
      <div class="ds-results" *ngIf="searchDone">
        <div class="ds-results__header">
          <div class="ds-results__info">
            Ditemukan <strong>{{ searchTotal | number }}</strong> dosen
            <span *ngIf="searchTotalPages > 1"> — halaman {{ searchPage }} / {{ searchTotalPages }}</span>
          </div>
          <div class="ds-actions">
            <div class="ds-pagination" *ngIf="searchTotalPages > 1">
              <button [disabled]="searchPage===1" (click)="goPage(searchPage-1)">‹ Prev</button>
              <span>{{ searchPage }} / {{ searchTotalPages }}</span>
              <button [disabled]="searchPage===searchTotalPages" (click)="goPage(searchPage+1)">Next ›</button>
            </div>
            <div class="ds-export-btns">
              <button class="ds-exp ds-exp--csv"  (click)="exportDosen('csv')">CSV</button>
              <button class="ds-exp ds-exp--xlsx" (click)="exportDosen('xlsx')">XLSX</button>
              <button class="ds-exp ds-exp--pdf"  (click)="exportDosen('pdf')">PDF</button>
            </div>
          </div>
        </div>
        <div class="ds-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th (click)="setSort('nama')" class="ds-sortable">Nama <span class="ds-si">{{ sortIcon('nama') }}</span></th>
                <th (click)="setSort('perguruan_tinggi__nama')" class="ds-sortable">Perguruan Tinggi <span class="ds-si">{{ sortIcon('perguruan_tinggi__nama') }}</span></th>
                <th (click)="setSort('program_studi_nama')" class="ds-sortable">Program Studi <span class="ds-si">{{ sortIcon('program_studi_nama') }}</span></th>
                <th (click)="setSort('jabatan_fungsional')" class="ds-sortable">Jabatan <span class="ds-si">{{ sortIcon('jabatan_fungsional') }}</span></th>
                <th (click)="setSort('pendidikan_tertinggi')" class="ds-sortable">Pend. <span class="ds-si">{{ sortIcon('pendidikan_tertinggi') }}</span></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of searchResults">
                <td>
                  <div class="ds-nama">{{ d.nama }}</div>
                  <div class="ds-sub-id">
                    <span *ngIf="d.nidn">NIDN: {{ d.nidn }}</span>
                    <span *ngIf="d.nuptk">NUPTK: {{ d.nuptk }}</span>
                  </div>
                </td>
                <td>
                  <div class="ds-pt-nama">{{ d.pt_nama }}</div>
                  <div class="ds-pt-kode">{{ d.pt_kode }}</div>
                </td>
                <td>
                  <div class="ds-prodi-nama">{{ d.program_studi_nama }}</div>
                  <div class="ds-prodi-kode">{{ d.kode_prodi }}</div>
                </td>
                <td><span [class]="jabatanClass(d.jabatan_fungsional)">{{ d.jabatan_fungsional || '—' }}</span></td>
                <td>{{ d.pendidikan_tertinggi?.toUpperCase() }}</td>
                <td><span class="status-chip" [class.aktif]="d.status==='Aktif'">{{ d.status }}</span></td>
              </tr>
              <tr *ngIf="!searchResults.length">
                <td colspan="6" class="empty-row">Tidak ada hasil ditemukan</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="ds-pagination ds-pagination--bottom" *ngIf="searchTotalPages > 1">
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
        <div class="stat-card__main">
          <div class="stat-card__icon stat-card__icon--dark">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <div class="stat-card__val stat-card__val--dark">{{ stats.total_tetap | number }}</div>
        </div>
        <div class="stat-card__lbl stat-card__lbl--dark">Dosen Tetap</div>
        <div class="stat-card__s3-detail">
          <span class="s3-chip s3-chip--tt">Tidak Tetap {{ stats.total_tidak_tetap | number }}</span>
          <span class="s3-chip s3-chip--dtpk">DTPK {{ stats.total_dtpk | number }}</span>
        </div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__main">
          <div class="stat-card__icon stat-card__icon--dark">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          </div>
          <div class="stat-card__val stat-card__val--dark">{{ stats.total_s3 | number }}</div>
        </div>
        <div class="stat-card__lbl stat-card__lbl--dark">Pendidikan S3</div>
        <div class="stat-card__s3-detail">
          <span class="s3-chip s3-chip--ln">🌏 LN {{ stats.total_s3_ln | number }}</span>
          <span class="s3-chip s3-chip--dn">🇮🇩 DN {{ stats.total_s3_dn | number }}</span>
        </div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__main">
          <div class="stat-card__icon stat-card__icon--dark">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
          </div>
          <div class="stat-card__val stat-card__val--dark">{{ stats.total_profesor | number }}</div>
        </div>
        <div class="stat-card__lbl stat-card__lbl--dark">Profesor / Guru Besar</div>
        <div class="stat-card__s3-detail">
          <span class="s3-chip s3-chip--ln">🌏 S3 LN {{ stats.prof_s3_ln | number }}</span>
          <span class="s3-chip s3-chip--dn">🇮🇩 S3 DN {{ stats.prof_s3_dn | number }}</span>
        </div>
      </div>
      <div class="stat-card stat-card--light">
        <div class="stat-card__main">
          <div class="stat-card__icon stat-card__icon--dark">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
          </div>
          <div class="stat-card__val stat-card__val--dark">{{ stats.total_aktif | number }}</div>
        </div>
        <div class="stat-card__lbl stat-card__lbl--dark">Dosen Aktif</div>
        <div class="stat-card__s3-detail">
          <span class="s3-chip s3-chip--tb">Tugas Belajar {{ stats.total_tugas_belajar | number }}</span>
          <span class="s3-chip s3-chip--ib">Ijin Belajar {{ stats.total_ijin_belajar | number }}</span>
          <span class="s3-chip s3-chip--cuti">Cuti {{ stats.total_cuti | number }}</span>
        </div>
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

    /* ── Search Accordion Dosen (biru) ── */
    .ds-accordion {
      background: #fff; border-radius: 12px; margin-bottom: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      border-left: 4px solid #1d4ed8;
    }
    .ds-toggle {
      width: 100%; display: flex; align-items: center; gap: .6rem;
      background: none; border: none; padding: .85rem 1.1rem;
      font-size: .9rem; font-weight: 600; color: #1e3a8a; cursor: pointer;
      text-align: left; border-radius: 12px;
    }
    .ds-toggle:hover { background: rgba(59,130,246,.05); }
    .ds-chevron { margin-left: auto; font-size: .85rem; color: #2563eb; transition: transform .2s; }
    .ds-chevron.rotated { transform: rotate(180deg); }
    .ds-body { padding: 0 1.1rem 1.1rem; }
    .ds-fields {
      display: grid; grid-template-columns: 1fr; gap: .75rem; margin-bottom: 1rem;
    }
    @media (min-width: 600px)  { .ds-fields { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .ds-fields { grid-template-columns: repeat(5, 1fr); } }
    .dsf { display: flex; flex-direction: column; gap: .3rem; }
    .dsf label { font-size: .78rem; font-weight: 600; color: #1e40af; }
    .dsf input, .dsf select {
      padding: .5rem .75rem; border: 1px solid #93c5fd; border-radius: 8px;
      font-size: .875rem; outline: none; background: #eff6ff;
    }
    .dsf input:focus, .dsf select:focus { border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,.12); }
    .dsf--action { justify-content: flex-end; flex-direction: row; align-items: flex-end; gap: .5rem; }
    .ds-btn-search {
      padding: .5rem 1.25rem; background: #1d4ed8; color: #fff;
      border: none; border-radius: 8px; font-size: .875rem; font-weight: 600; cursor: pointer;
    }
    .ds-btn-search:hover:not(:disabled) { background: #1e3a8a; }
    .ds-btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .ds-btn-reset {
      padding: .5rem 1rem; background: #eff6ff; color: #1e40af;
      border: 1px solid #93c5fd; border-radius: 8px; font-size: .875rem; cursor: pointer;
    }
    .ds-btn-reset:hover { background: #dbeafe; }

    /* Results */
    .ds-results { margin-top: .5rem; }
    .ds-results__header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: .5rem; margin-bottom: .5rem;
    }
    .ds-actions { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .ds-results__info { font-size: .82rem; color: #1e40af; }
    .ds-results__info strong { color: #1e3a8a; }
    .ds-pagination {
      display: flex; align-items: center; gap: .6rem; font-size: .83rem;
    }
    .ds-pagination--bottom { justify-content: center; margin-top: .6rem; }
    .ds-pagination button {
      padding: .3rem .8rem; border: 1px solid #93c5fd;
      border-radius: 8px; background: #eff6ff; cursor: pointer; color: #1e40af;
    }
    .ds-pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .ds-pagination button:hover:not(:disabled) { background: #dbeafe; }
    .ds-export-btns { display: flex; gap: .35rem; }
    .ds-exp {
      padding: .28rem .7rem; border-radius: 6px; font-size: .75rem;
      font-weight: 600; cursor: pointer; border: 1px solid;
    }
    .ds-exp--csv  { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .ds-exp--csv:hover  { background: #dcfce7; }
    .ds-exp--xlsx { background: #f0fdf4; color: #15803d; border-color: #4ade80; }
    .ds-exp--xlsx:hover { background: #bbf7d0; }
    .ds-exp--pdf  { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
    .ds-exp--pdf:hover  { background: #fee2e2; }
    .ds-table-wrap { overflow-x: auto; border-radius: 10px; background: rgba(59,130,246,.04); }
    .ds-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .ds-table th {
      background: rgba(59,130,246,.08); padding: .55rem .75rem;
      text-align: left; font-weight: 600; color: #1e40af;
      border-bottom: 2px solid rgba(59,130,246,.15); white-space: nowrap;
    }
    .ds-table th.ds-sortable { cursor: pointer; user-select: none; }
    .ds-table th.ds-sortable:hover { background: rgba(59,130,246,.14); color: #1e3a8a; }
    .ds-si { font-size: .72rem; color: #93c5fd; margin-left: .2rem; }
    .ds-table td {
      padding: .5rem .75rem; border-bottom: 1px solid rgba(59,130,246,.08);
      color: #1e293b; vertical-align: middle;
    }
    .ds-table tr:hover td { background: rgba(59,130,246,.06); }
    .ds-nama { font-weight: 500; color: #1e293b; }
    .ds-sub-id { font-family: monospace; font-size: .72rem; color: #64748b; margin-top: 1px; display: flex; flex-wrap: wrap; gap: .4rem; }
    .ds-pt-nama { font-size: .82rem; color: #1e293b; }
    .ds-pt-kode { font-size: .72rem; color: #1e40af; font-family: monospace; margin-top: 1px; }
    .ds-prodi-nama { font-size: .82rem; color: #1e293b; }
    .ds-prodi-kode { font-size: .72rem; color: #64748b; font-family: monospace; margin-top: 1px; }
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

    .stat-card__main { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .stat-card__icon { width: 42px; height: 42px; flex-shrink: 0; opacity: .9; }
    .stat-card__icon--dark { color: #1d4ed8; opacity: 1; }
    .stat-card__icon svg { width: 100%; height: 100%; }

    .stat-card__val  { font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .stat-card__val--dark { color: #1e293b; }
    .stat-card__lbl  { font-size: .8rem; opacity: .88; }
    .stat-card__lbl--dark { color: #64748b; opacity: 1; }
    .stat-card__s3-detail { display:flex; gap:.35rem; flex-wrap:wrap; margin-top:.4rem; }
    .s3-chip { font-size:.72rem; font-weight:600; padding:2px 8px; border-radius:10px; white-space:nowrap; }
    .s3-chip--ln   { background:#dbeafe; color:#1e40af; }
    .s3-chip--dn   { background:#dcfce7; color:#15803d; }
    .s3-chip--tt   { background:#fef3c7; color:#92400e; }
    .s3-chip--dtpk { background:#ede9fe; color:#5b21b6; }
    .s3-chip--tb   { background:#fef9c3; color:#854d0e; }
    .s3-chip--ib   { background:#e0f2fe; color:#075985; }
    .s3-chip--cuti { background:#f1f5f9; color:#475569; }

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

  exportDosen(fmt: 'csv' | 'xlsx' | 'pdf') {
    const params = {
      ...this.searchForm,
      page: '1',
      page_size: String(this.searchTotal || 5000),
      ordering: (this.sortDir === 'desc' ? '-' : '') + this.sortField,
    };
    this.api.dosenSearch(params).subscribe({ next: (res: any) => this.doExport(fmt, res.results) });
  }

  private doExport(fmt: 'csv' | 'xlsx' | 'pdf', rows: any[]) {
    const headers = ['Nama', 'NIDN', 'NUPTK', 'Perguruan Tinggi', 'Kode PT', 'Program Studi', 'Kode Prodi', 'Jabatan', 'Pendidikan', 'Status'];
    const data = rows.map(d => [
      d.nama, d.nidn || '—', d.nuptk || '—',
      d.pt_nama, d.pt_kode,
      d.program_studi_nama, d.kode_prodi || '—',
      d.jabatan_fungsional || '—', (d.pendidikan_tertinggi || '').toUpperCase(), d.status,
    ]);
    const filename = `dosen-${this.searchForm.nama || 'semua'}`;

    if (fmt === 'csv') {
      const lines = [headers, ...data].map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);

    } else if (fmt === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [28, 14, 16, 34, 10, 26, 10, 18, 12, 14].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dosen');
      XLSX.writeFile(wb, `${filename}.xlsx`);

    } else {
      const rows_html = data.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Dosen — ${this.searchForm.nama}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 16px; }
          h2 { font-size: 13px; margin-bottom: 6px; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1d4ed8; color: #fff; padding: 5px 6px; text-align: left; }
          td { padding: 4px 6px; border-bottom: 1px solid #dbeafe; }
          tr:nth-child(even) td { background: #f0f7ff; }
          @media print { @page { size: landscape; margin: 10mm; } }
        </style></head><body>
        <h2>Pencarian Dosen: ${this.searchForm.nama || '(semua)'}${this.searchForm.jabatan ? ' — ' + this.searchForm.jabatan : ''}</h2>
        <p style="font-size:9px;color:#666;margin-bottom:6px">Total: ${rows.length} dosen</p>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows_html}</tbody></table>
        <script>window.onload=function(){window.print();window.close();}</script>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }
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
