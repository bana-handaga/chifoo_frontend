import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, finalize, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

const API = environment.apiUrl;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TrendScopusItem  { tahun: number; jumlah: number; }
interface TrendGscholarItem { tahun: number; pub: number; cite: number; }

interface TopAuthor {
  id: number;
  sinta_id: string;
  nama: string;
  foto_url: string;
  sinta_score_overall: number;
  scopus_artikel: number;
  scopus_h_index: number;
  bidang_keilmuan: string[];
}

interface AuthorStats {
  total_authors_linked: number;
  avg_sinta_score: number;
  max_sinta_score: number;
  total_scopus_artikel: number;
  total_scopus_sitasi: number;
  avg_h_index: number;
  max_h_index: number;
  total_gscholar_artikel: number;
  total_wos_artikel: number;
}

interface DeptList {
  id: number;
  afiliasi_id: number;
  sinta_id_pt: string;
  pt_kode: string;
  pt_singkatan: string;
  pt_nama: string;
  nama: string;
  jenjang: string;
  kode_dept: string;
  url_profil: string;
  sinta_score_overall: number;
  sinta_score_3year: number;
  sinta_score_productivity: number;
  sinta_score_productivity_3year: number;
  jumlah_authors: number;
  scopus_artikel: number;
  scopus_sitasi: number;
  gscholar_artikel: number;
  gscholar_sitasi: number;
  wos_artikel: number;
  wos_sitasi: number;
}

interface DeptDetail extends DeptList {
  scopus_q1: number;
  scopus_q2: number;
  scopus_q3: number;
  scopus_q4: number;
  scopus_noq: number;
  research_conference: number;
  research_articles: number;
  research_others: number;
  trend_scopus: TrendScopusItem[];
  trend_gscholar: TrendGscholarItem[];
  top_authors: TopAuthor[];
  bidang_distribution: { bidang: string; jumlah: number }[];
  author_stats: AuthorStats;
}

interface DeptStats {
  total_departemen: number;
  total_authors: number;
  avg_score_overall: number;
  max_score_overall: number;
  distribusi_jenjang: { jenjang: string; jumlah: number }[];
}

interface PtOption {
  kode: string;
  singkatan: string;
}

interface PtSummary {
  sinta_kode: string;
  nama_sinta: string;
  singkatan_sinta: string;
  scopus_dokumen: number;
  scopus_sitasi: number;
  gscholar_dokumen: number;
  scopus_q1: number;
  scopus_q2: number;
  scopus_q3: number;
  scopus_q4: number;
}

interface PagedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DeptList[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsAvatar(name: string, bg = '#0891b2'): string {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56">
    <rect width="56" height="56" rx="28" fill="${bg}"/>
    <text x="28" y="38" text-anchor="middle" font-size="20" font-family="sans-serif" fill="white" font-weight="bold">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-sinta-departemen',
  template: `
<div class="dp-wrap">

  <!-- ── Back ── -->
  <div class="dp-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Hero ── -->
  <div class="dp-hero">
    <div class="dp-hero__icon">
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
      </svg>
    </div>
    <div class="dp-hero__content">
      <div class="dp-hero__badge">SINTA — Science and Technology Index</div>
      <h1 class="dp-hero__title">Departemen / Program Studi PTMA di SINTA</h1>
      <p class="dp-hero__desc">
        Daftar program studi <strong>PTMA (Perguruan Tinggi Muhammadiyah &amp; Aisyiyah)</strong>
        yang terdaftar di SINTA — lengkap dengan skor departemen, produktivitas riset,
        dan agregat publikasi berdasarkan data resmi Kemdiktisaintek.
      </p>
    </div>
  </div>

  <!-- ── Stats Bar ── -->
  <div class="dp-statsbar" *ngIf="stats">
    <div class="dp-stat">
      <div class="dp-stat__val">{{ stats.total_departemen | number }}</div>
      <div class="dp-stat__lbl">Total Departemen</div>
    </div>
    <div class="dp-stat">
      <div class="dp-stat__val">{{ stats.total_authors | number }}</div>
      <div class="dp-stat__lbl">Total Author</div>
    </div>
    <div class="dp-stat">
      <div class="dp-stat__val">{{ stats.avg_score_overall | number:'1.0-0' }}</div>
      <div class="dp-stat__lbl">Rata-rata Skor SINTA</div>
    </div>
    <div class="dp-stat">
      <div class="dp-stat__val">{{ stats.max_score_overall | number }}</div>
      <div class="dp-stat__lbl">Skor Tertinggi</div>
    </div>
    <div class="dp-stat dp-stat--jenjang" *ngIf="stats.distribusi_jenjang?.length">
      <div class="dp-jenjang-chips">
        <span *ngFor="let j of stats.distribusi_jenjang | slice:0:4" class="dp-jenjang-chip">
          {{ j.jenjang || '—' }}&nbsp;<b>{{ j.jumlah }}</b>
        </span>
      </div>
      <div class="dp-stat__lbl">Sebaran Jenjang</div>
    </div>
  </div>

  <!-- ── Filter & Sort Bar ── -->
  <div class="dp-toolbar">
    <!-- Search full width -->
    <div class="dp-search-wrap">
      <svg class="dp-search-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16a6.47 6.47 0 004.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        class="dp-search"
        type="text"
        [(ngModel)]="searchQuery"
        (ngModelChange)="onSearchChange()"
        placeholder="Cari nama departemen atau nama PT…"
      />
      <button *ngIf="searchQuery" class="dp-search-clear" (click)="clearSearch()">✕</button>
    </div>

    <!-- Filter row: PT | Jenjang | Sort | Reset -->
    <div class="dp-filter-row">

      <select class="dp-select" [(ngModel)]="filterPt" (change)="onFilterChange()">
        <option value="">Semua PT</option>
        <option *ngFor="let p of ptOptions" [value]="p.kode">{{ p.singkatan }}</option>
      </select>

      <select class="dp-select" [(ngModel)]="filterJenjang" (change)="onFilterChange()">
        <option value="">Semua Jenjang</option>
        <option value="S1">S1 – Sarjana</option>
        <option value="S2">S2 – Magister</option>
        <option value="S3">S3 – Doktor</option>
        <option value="D3">D3 – Diploma III</option>
        <option value="D4">D4 – Diploma IV / Sarjana Terapan</option>
        <option value="Sp1">Sp1 – Spesialis</option>
        <option value="Profesi">Profesi</option>
      </select>

      <select class="dp-select" [(ngModel)]="ordering" (change)="onFilterChange()">
        <option value="-sinta_score_overall">Skor SINTA (Tertinggi)</option>
        <option value="sinta_score_overall">Skor SINTA (Terendah)</option>
        <option value="-sinta_score_3year">Skor 3 Tahun</option>
        <option value="-sinta_score_productivity">Produktivitas</option>
        <option value="-scopus_artikel">Scopus Artikel</option>
        <option value="-scopus_sitasi">Scopus Sitasi</option>
        <option value="-jumlah_authors">Jumlah Author</option>
        <option value="nama">Nama (A–Z)</option>
      </select>

      <select class="dp-select dp-select--sm" [(ngModel)]="pageSize" (change)="onPageSizeChange()">
        <option [value]="24">24 / hal</option>
        <option [value]="50">50 / hal</option>
        <option [value]="100">100 / hal</option>
      </select>

      <button *ngIf="hasActiveFilter()" class="dp-btn-reset" (click)="resetFilters()">Reset</button>

    </div>
  </div>

  <!-- ── View Bar: count + toggle grid/table + PT summary toggle ── -->
  <div class="dp-viewbar">
    <span class="dp-viewbar__count" *ngIf="!loading && totalCount">
      {{ totalCount | number }} departemen<span *ngIf="hasActiveFilter()" class="dp-viewbar__filtered"> (difilter)</span>
    </span>
    <div class="dp-view-toggle">
      <button class="dp-view-btn" [class.active]="showPtSummary" (click)="togglePtSummary()" title="Ringkasan per PT">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
        <span>Per PT</span>
      </button>
      <button class="dp-view-btn" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" title="Tampilan kartu">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
        <span>Kartu</span>
      </button>
      <button class="dp-view-btn" [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Tampilan tabel">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        <span>Tabel</span>
      </button>
    </div>
  </div>

  <!-- ── PT Summary Panel ── -->
  <div class="dp-pt-summary" *ngIf="showPtSummary">
    <div class="dp-pt-summary__header">
      <div class="dp-pt-summary__title">Ringkasan per Perguruan Tinggi</div>
      <div class="dp-pt-summary__sort-btns">
        <button class="dp-pts-btn" [class.active]="ptSummarySort==='scopus_dokumen'" (click)="setPtSort('scopus_dokumen')">Scopus</button>
        <button class="dp-pts-btn" [class.active]="ptSummarySort==='scopus_sitasi'" (click)="setPtSort('scopus_sitasi')">Sitasi</button>
        <button class="dp-pts-btn" [class.active]="ptSummarySort==='gscholar_dokumen'" (click)="setPtSort('gscholar_dokumen')">GScholar</button>
        <button class="dp-pts-btn" [class.active]="ptSummarySort==='q1q2'" (click)="setPtSort('q1q2')">Q1+Q2</button>
      </div>
    </div>
    <div class="dp-pt-summary__body">
      <div *ngIf="ptSummaryLoading" class="dp-loading" style="padding:1rem">
        <div class="dp-spinner"></div><span>Memuat…</span>
      </div>
      <table class="dp-pts-table" *ngIf="!ptSummaryLoading && ptSummaryData.length">
        <thead>
          <tr>
            <th class="dp-pts-th">#</th>
            <th class="dp-pts-th dp-pts-th--name">PT</th>
            <th class="dp-pts-th dp-pts-th--num dp-pts-th--sort" (click)="setPtSort('scopus_dokumen')">
              Scopus Art. <span>{{ ptSortIcon('scopus_dokumen') }}</span>
            </th>
            <th class="dp-pts-th dp-pts-th--num dp-pts-th--sort" (click)="setPtSort('scopus_sitasi')">
              Sitasi <span>{{ ptSortIcon('scopus_sitasi') }}</span>
            </th>
            <th class="dp-pts-th dp-pts-th--num dp-pts-th--sort" (click)="setPtSort('gscholar_dokumen')">
              GScholar <span>{{ ptSortIcon('gscholar_dokumen') }}</span>
            </th>
            <th class="dp-pts-th dp-pts-th--num dp-pts-th--sort" (click)="setPtSort('q1q2')">
              Q1+Q2 <span>{{ ptSortIcon('q1q2') }}</span>
            </th>
            <th class="dp-pts-th dp-pts-th--bar">Proporsi Scopus</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of sortedPtSummary(); let i = index"
              class="dp-pts-tr"
              [class.dp-pts-tr--active]="filterPt === p.sinta_kode"
              (click)="filterByPt(p.sinta_kode)">
            <td class="dp-pts-td dp-pts-td--no">{{ i + 1 }}</td>
            <td class="dp-pts-td dp-pts-td--name">
              <span class="dp-pts-singkatan">{{ p.singkatan_sinta }}</span>
              <span class="dp-pts-nama">{{ p.nama_sinta }}</span>
            </td>
            <td class="dp-pts-td dp-pts-td--num"><b>{{ p.scopus_dokumen | number }}</b></td>
            <td class="dp-pts-td dp-pts-td--num">{{ p.scopus_sitasi | number }}</td>
            <td class="dp-pts-td dp-pts-td--num">{{ p.gscholar_dokumen | number }}</td>
            <td class="dp-pts-td dp-pts-td--num">{{ (p.scopus_q1 + p.scopus_q2) | number }}</td>
            <td class="dp-pts-td dp-pts-td--bar">
              <div class="dp-pts-bar-wrap">
                <div class="dp-pts-bar dp-pts-bar--q1" [style.width.%]="ptBarPct(p, 'q1')"></div>
                <div class="dp-pts-bar dp-pts-bar--q2" [style.width.%]="ptBarPct(p, 'q2')"></div>
                <div class="dp-pts-bar dp-pts-bar--q3" [style.width.%]="ptBarPct(p, 'q3')"></div>
                <div class="dp-pts-bar dp-pts-bar--q4" [style.width.%]="ptBarPct(p, 'q4')"></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Loading / Empty ── -->
  <div *ngIf="loading" class="dp-loading">
    <div class="dp-spinner"></div>
    <span>Memuat data…</span>
  </div>

  <div *ngIf="!loading && depts.length === 0" class="dp-empty">
    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="opacity:.3">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
    <p>Tidak ada data yang cocok dengan pencarian/filter.</p>
  </div>

  <!-- ── Dept Cards Grid ── -->
  <div class="dp-grid" *ngIf="!loading && depts.length && viewMode === 'grid'">
    <div
      class="dp-card"
      *ngFor="let d of depts"
      (click)="openDetail(d)"
    >
      <!-- Card header -->
      <div class="dp-card__head">
        <div class="dp-card__jenjang dp-jenjang--{{ jenjangClass(d.jenjang) }}">{{ d.jenjang || '—' }}</div>
        <div class="dp-card__pt">{{ d.pt_singkatan }}</div>
      </div>

      <!-- Dept name -->
      <div class="dp-card__nama">{{ d.nama }}</div>

      <!-- Main score -->
      <div class="dp-card__score-row">
        <div class="dp-card__score-main">
          <span class="dp-card__score-val">{{ d.sinta_score_overall | number }}</span>
          <span class="dp-card__score-lbl">Skor SINTA</span>
        </div>
        <div class="dp-card__score-sub">
          <span class="dp-card__score-val2">{{ d.sinta_score_3year | number }}</span>
          <span class="dp-card__score-lbl2">3 Tahun</span>
        </div>
      </div>

      <!-- Stats row -->
      <div class="dp-card__stats">
        <div class="dp-card__stat" title="Jumlah Author">
          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          {{ d.jumlah_authors | number }}
        </div>
        <div class="dp-card__stat" title="Artikel Scopus">
          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          {{ d.scopus_artikel | number }}
        </div>
        <div class="dp-card__stat" title="Sitasi Scopus">
          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>
          {{ d.scopus_sitasi | number }}
        </div>
      </div>

      <div class="dp-card__link">Lihat Detail →</div>
    </div>
  </div>

  <!-- ── Export Bar ── -->
  <div class="dp-export-bar" *ngIf="!loading && depts.length > 0">
    <span class="dp-export-label">Export ({{ totalCount | number }} baris):</span>
    <button class="dp-export-btn dp-export-btn--csv" (click)="exportCSV()" [disabled]="exporting">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17.5v-7h1.5l1.5 3.5 1.5-3.5H14v7h-1.5v-4l-1 2.5h-1l-1-2.5v4H8z"/></svg>
      {{ exporting ? 'Mengekspor…' : 'CSV' }}
    </button>
    <button class="dp-export-btn dp-export-btn--xlsx" (click)="exportXLSX()" [disabled]="exporting">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9 17.5l1.5-2.5L9 12.5h1.7l.8 1.5.8-1.5H14l-1.5 2.5 1.5 2.5h-1.7l-.8-1.5-.8 1.5H9z"/></svg>
      {{ exporting ? 'Mengekspor…' : 'XLSX' }}
    </button>
  </div>

  <!-- ── Pagination TOP (table only) ── -->
  <div class="dp-pagination dp-pagination--top" *ngIf="viewMode === 'table' && totalCount > pageSize">
    <button class="dp-page-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹</button>
    <ng-container *ngFor="let p of pageNumbers()">
      <button *ngIf="p !== -1" class="dp-page-btn" [class.active]="p === currentPage" (click)="goPage(p)">{{ p }}</button>
      <span *ngIf="p === -1" class="dp-page-ellipsis">…</span>
    </ng-container>
    <button class="dp-page-btn" [disabled]="currentPage >= totalPages()" (click)="goPage(currentPage + 1)">›</button>
    <span class="dp-page-info">{{ (currentPage - 1) * pageSize + 1 }}–{{ min(currentPage * pageSize, totalCount) }} dari {{ totalCount | number }}</span>
  </div>

  <!-- ── Dept Table ── -->
  <div class="dp-table-wrap" *ngIf="!loading && depts.length && viewMode === 'table'">
    <table class="dp-table">
      <thead>
        <tr>
          <th class="dp-th dp-th--no">#</th>
          <th class="dp-th">Jenjang</th>
          <th class="dp-th dp-th--sort" (click)="setTableSort('nama')">
            Nama Departemen <span class="dp-sort-icon">{{ sortIcon('nama') }}</span>
          </th>
          <th class="dp-th dp-th--sort" (click)="setTableSort('afiliasi__nama_sinta')">
            PT <span class="dp-sort-icon">{{ sortIcon('afiliasi__nama_sinta') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('sinta_score_overall')">
            Skor SINTA <span class="dp-sort-icon">{{ sortIcon('sinta_score_overall') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('sinta_score_3year')">
            3 Thn <span class="dp-sort-icon">{{ sortIcon('sinta_score_3year') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('sinta_score_productivity')">
            Produktivitas <span class="dp-sort-icon">{{ sortIcon('sinta_score_productivity') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('jumlah_authors')">
            Author <span class="dp-sort-icon">{{ sortIcon('jumlah_authors') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('scopus_artikel')">
            Scopus Art. <span class="dp-sort-icon">{{ sortIcon('scopus_artikel') }}</span>
          </th>
          <th class="dp-th dp-th--sort dp-th--num" (click)="setTableSort('scopus_sitasi')">
            Sitasi <span class="dp-sort-icon">{{ sortIcon('scopus_sitasi') }}</span>
          </th>
          <th class="dp-th"></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let d of depts; let i = index" class="dp-tr" (click)="openDetail(d)">
          <td class="dp-td dp-td--no">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
          <td class="dp-td">
            <span class="dp-card__jenjang dp-jenjang--{{ jenjangClass(d.jenjang) }}">{{ d.jenjang || '—' }}</span>
          </td>
          <td class="dp-td dp-td--nama">{{ d.nama }}</td>
          <td class="dp-td dp-td--pt">
            <span class="dp-td-pt-singkatan">{{ d.pt_singkatan }}</span>
          </td>
          <td class="dp-td dp-td--num"><b>{{ d.sinta_score_overall | number }}</b></td>
          <td class="dp-td dp-td--num">{{ d.sinta_score_3year | number }}</td>
          <td class="dp-td dp-td--num">{{ d.sinta_score_productivity | number }}</td>
          <td class="dp-td dp-td--num">{{ d.jumlah_authors | number }}</td>
          <td class="dp-td dp-td--num">{{ d.scopus_artikel | number }}</td>
          <td class="dp-td dp-td--num">{{ d.scopus_sitasi | number }}</td>
          <td class="dp-td dp-td--action">
            <span class="dp-table-link">Detail →</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Pagination ── -->
  <div class="dp-pagination" *ngIf="totalCount > pageSize">
    <button
      class="dp-page-btn"
      [disabled]="currentPage === 1"
      (click)="goPage(currentPage - 1)"
    >‹</button>

    <ng-container *ngFor="let p of pageNumbers()">
      <button
        *ngIf="p !== -1"
        class="dp-page-btn"
        [class.active]="p === currentPage"
        (click)="goPage(p)"
      >{{ p }}</button>
      <span *ngIf="p === -1" class="dp-page-ellipsis">…</span>
    </ng-container>

    <button
      class="dp-page-btn"
      [disabled]="currentPage >= totalPages()"
      (click)="goPage(currentPage + 1)"
    >›</button>

    <span class="dp-page-info">{{ (currentPage - 1) * pageSize + 1 }}–{{ min(currentPage * pageSize, totalCount) }} dari {{ totalCount | number }}</span>
  </div>

</div><!-- /dp-wrap -->

<!-- ══════════════════════════════════════════════════════
     DETAIL MODAL
══════════════════════════════════════════════════════ -->
<div class="dp-modal-backdrop" *ngIf="selected" (click)="closeDetail()">
  <div class="dp-modal" (click)="$event.stopPropagation()" role="dialog">

    <!-- Modal header -->
    <div class="dp-modal__header">
      <div class="dp-modal__jenjang dp-jenjang--{{ jenjangClass(selected.jenjang) }}">{{ selected.jenjang }}</div>
      <div class="dp-modal__title-wrap">
        <h2 class="dp-modal__title">{{ selected.nama }}</h2>
        <div class="dp-modal__pt">{{ selected.pt_singkatan }} &mdash; {{ selected.pt_nama }}</div>
      </div>
      <button class="dp-modal__close" (click)="closeDetail()">✕</button>
    </div>

    <div class="dp-modal__body" *ngIf="!detailLoading && detail">

      <!-- ── Score Cards ── -->
      <div class="dp-modal__scores">
        <div class="dp-score-card dp-score-card--primary">
          <div class="dp-score-card__val">{{ detail.sinta_score_overall | number }}</div>
          <div class="dp-score-card__lbl">Skor SINTA</div>
        </div>
        <div class="dp-score-card">
          <div class="dp-score-card__val">{{ detail.sinta_score_3year | number }}</div>
          <div class="dp-score-card__lbl">Skor 3 Tahun</div>
        </div>
        <div class="dp-score-card">
          <div class="dp-score-card__val">{{ detail.sinta_score_productivity | number }}</div>
          <div class="dp-score-card__lbl">Produktivitas</div>
        </div>
        <div class="dp-score-card">
          <div class="dp-score-card__val">{{ detail.sinta_score_productivity_3year | number }}</div>
          <div class="dp-score-card__lbl">Produktivitas 3 Thn</div>
        </div>
        <div class="dp-score-card">
          <div class="dp-score-card__val">{{ detail.jumlah_authors | number }}</div>
          <div class="dp-score-card__lbl">Jumlah Author</div>
        </div>
      </div>

      <!-- ── Author Aggregates ── -->
      <div class="dp-section" *ngIf="detail.author_stats && detail.author_stats.total_authors_linked > 0">
        <div class="dp-section__title">Agregat dari Author Terhubung ({{ detail.author_stats.total_authors_linked | number }} author)</div>
        <div class="dp-author-agg-grid">
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.avg_sinta_score | number:'1.0-1' }}</div>
            <div class="dp-agg-lbl">Rata-rata Skor SINTA</div>
          </div>
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.max_sinta_score | number }}</div>
            <div class="dp-agg-lbl">Skor Tertinggi</div>
          </div>
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.avg_h_index | number:'1.0-1' }}</div>
            <div class="dp-agg-lbl">Rata-rata H-Index</div>
          </div>
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.max_h_index | number }}</div>
            <div class="dp-agg-lbl">H-Index Tertinggi</div>
          </div>
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.total_scopus_artikel | number }}</div>
            <div class="dp-agg-lbl">Total Artikel Scopus</div>
          </div>
          <div class="dp-agg-card">
            <div class="dp-agg-val">{{ detail.author_stats.total_scopus_sitasi | number }}</div>
            <div class="dp-agg-lbl">Total Sitasi Scopus</div>
          </div>
        </div>
      </div>

      <!-- ── Publikasi per Sumber ── -->
      <div class="dp-section">
        <div class="dp-section__title">Publikasi per Sumber</div>
        <div class="dp-pub-table">
          <div class="dp-pub-row dp-pub-row--head">
            <span>Sumber</span><span>Artikel</span><span>Sitasi</span>
          </div>
          <div class="dp-pub-row">
            <span class="dp-pub-src dp-pub-src--scopus">Scopus</span>
            <span>{{ detail.scopus_artikel | number }}</span>
            <span>{{ detail.scopus_sitasi | number }}</span>
          </div>
          <div class="dp-pub-row">
            <span class="dp-pub-src dp-pub-src--gscholar">Google Scholar</span>
            <span>{{ detail.gscholar_artikel | number }}</span>
            <span>{{ detail.gscholar_sitasi | number }}</span>
          </div>
          <div class="dp-pub-row">
            <span class="dp-pub-src dp-pub-src--wos">Web of Science</span>
            <span>{{ detail.wos_artikel | number }}</span>
            <span>{{ detail.wos_sitasi | number }}</span>
          </div>
        </div>
      </div>

      <!-- ── Kuartil Scopus ── -->
      <div class="dp-section" *ngIf="totalKuartil(detail) > 0">
        <div class="dp-section__title">Distribusi Kuartil Scopus</div>
        <div class="dp-kuartil-bar">
          <div *ngFor="let q of kuartilSegments(detail)" class="dp-q-seg dp-q--{{ q.key }}"
               [style.flex]="q.pct" title="{{ q.label }}: {{ q.val }}">
            <span *ngIf="q.pct > 5">{{ q.val }}</span>
          </div>
        </div>
        <div class="dp-kuartil-legend">
          <span class="dp-ql dp-ql--q1">Q1 {{ detail.scopus_q1 }}</span>
          <span class="dp-ql dp-ql--q2">Q2 {{ detail.scopus_q2 }}</span>
          <span class="dp-ql dp-ql--q3">Q3 {{ detail.scopus_q3 }}</span>
          <span class="dp-ql dp-ql--q4">Q4 {{ detail.scopus_q4 }}</span>
          <span class="dp-ql dp-ql--noq">NoQ {{ detail.scopus_noq }}</span>
        </div>
      </div>

      <!-- ── Penelitian ── -->
      <div class="dp-section" *ngIf="(detail.research_articles || detail.research_conference || detail.research_others)">
        <div class="dp-section__title">Karya Penelitian</div>
        <div class="dp-radar-row">
          <div class="dp-radar-item">
            <div class="dp-radar-val">{{ detail.research_articles | number }}</div>
            <div class="dp-radar-lbl">Artikel Penelitian</div>
          </div>
          <div class="dp-radar-item">
            <div class="dp-radar-val">{{ detail.research_conference | number }}</div>
            <div class="dp-radar-lbl">Prosiding</div>
          </div>
          <div class="dp-radar-item">
            <div class="dp-radar-val">{{ detail.research_others | number }}</div>
            <div class="dp-radar-lbl">Lainnya</div>
          </div>
        </div>
      </div>

      <!-- ── Tren Scopus ── -->
      <div class="dp-section" *ngIf="detail.trend_scopus && detail.trend_scopus.length">
        <div class="dp-section__title">Tren Publikasi Scopus per Tahun</div>
        <div class="dp-trend-chart">
          <ng-container *ngFor="let t of sortedTrend(detail.trend_scopus)">
            <div class="dp-trend-col" [title]="t.tahun + ': ' + t.jumlah + ' artikel'">
              <div class="dp-trend-bar" [style.height.%]="trendBarHeight(t.jumlah, detail.trend_scopus)"></div>
              <div class="dp-trend-val" *ngIf="t.jumlah > 0">{{ t.jumlah }}</div>
              <div class="dp-trend-yr">{{ t.tahun }}</div>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ── Tren GScholar ── -->
      <div class="dp-section" *ngIf="detail.trend_gscholar && detail.trend_gscholar.length">
        <div class="dp-section__title">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="margin-right:5px;vertical-align:middle;color:#7c3aed"><path d="M12 3L1 9l4 2.18V17h2v-4.82L9 13.4V17c0 1.1 1.34 2 3 2s3-.9 3-2v-3.6l3-1.22V17h2v-5.82L23 9 12 3z"/></svg>
          Tren Google Scholar per Tahun (Agregat Departemen)
        </div>
        <div class="dp-gs-trend">
          <div class="dp-gs-legend">
            <span class="dp-gs-dot dp-gs-dot--pub"></span> Publikasi
            <span class="dp-gs-dot dp-gs-dot--cite" style="margin-left:12px"></span> Sitasi
          </div>
          <div class="dp-gs-chart">
            <ng-container *ngFor="let t of detail.trend_gscholar">
              <div class="dp-gs-col" [title]="t.tahun + ' — pub: ' + t.pub + ', cite: ' + t.cite">
                <div class="dp-gs-bars">
                  <div class="dp-gs-bar dp-gs-bar--cite"
                       [style.height.%]="gsBarHeight(t.cite, detail.trend_gscholar, 'cite')"
                       *ngIf="t.cite > 0"></div>
                  <div class="dp-gs-bar dp-gs-bar--pub"
                       [style.height.%]="gsBarHeight(t.pub, detail.trend_gscholar, 'pub')"
                       *ngIf="t.pub > 0"></div>
                </div>
                <div class="dp-gs-yr">{{ t.tahun }}</div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- ── Top Authors ── -->
      <div class="dp-section" *ngIf="detail.top_authors && detail.top_authors.length">
        <div class="dp-section__title">Author Terbaik</div>
        <div class="dp-top-authors">
          <div class="dp-author-row" *ngFor="let a of detail.top_authors; let i = index">
            <div class="dp-author-rank">{{ i + 1 }}</div>
            <img
              class="dp-author-foto"
              [src]="a.foto_url || authorInitials(a.nama, i)"
              (error)="onImgError($event, a.nama, i)"
              [alt]="a.nama"
            />
            <div class="dp-author-info">
              <div class="dp-author-nama">{{ a.nama }}</div>
              <div class="dp-author-meta">
                <span *ngFor="let b of a.bidang_keilmuan | slice:0:2" class="dp-bidang-chip">{{ b }}</span>
              </div>
            </div>
            <div class="dp-author-scores">
              <div><b>{{ a.sinta_score_overall | number }}</b> <small>SINTA</small></div>
              <div><b>{{ a.scopus_artikel | number }}</b> <small>Artikel</small></div>
              <div><b>{{ a.scopus_h_index }}</b> <small>H-Index</small></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Bidang Keilmuan ── -->
      <div class="dp-section" *ngIf="detail.bidang_distribution && detail.bidang_distribution.length">
        <div class="dp-section__title">Bidang Keilmuan (dari Author)</div>
        <div class="dp-bidang-dist">
          <ng-container *ngFor="let b of detail.bidang_distribution">
            <div class="dp-bidang-row">
              <span class="dp-bidang-name">{{ b.bidang }}</span>
              <div class="dp-bidang-bar-wrap">
                <div class="dp-bidang-bar"
                  [style.width.%]="(b.jumlah / detail.bidang_distribution[0].jumlah) * 100">
                </div>
              </div>
              <span class="dp-bidang-count">{{ b.jumlah }}</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ── SINTA Link ── -->
      <div class="dp-section dp-section--link" *ngIf="detail.url_profil">
        <a [href]="detail.url_profil" target="_blank" rel="noopener" class="dp-sinta-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          Lihat Profil di SINTA
        </a>
      </div>

    </div><!-- /modal-body -->

    <!-- Loading overlay inside modal -->
    <div class="dp-modal__loading" *ngIf="detailLoading">
      <div class="dp-spinner"></div>
    </div>

  </div>
</div><!-- /modal backdrop -->
`,
  styles: [`
/* ── Wrap ── */
.dp-wrap {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
  font-family: system-ui, sans-serif;
}

/* ── Back link ── */
.dp-back {
  display: inline-block;
  font-size: .83rem;
  color: #64748b;
  margin-bottom: 1rem;
  padding: .3rem .7rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.dp-back:hover { background: #f1f5f9; color: #1e293b; }

/* ── Hero ── */
.dp-hero {
  display: flex;
  align-items: flex-start;
  gap: 1.1rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  border-radius: 14px;
  padding: 1.6rem 1.8rem;
  color: #fff;
  margin-bottom: 1.2rem;
}
.dp-hero__icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,.12);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
}
.dp-hero__badge {
  font-size: .72rem;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #93c5fd;
  margin-bottom: .35rem;
}
.dp-hero__title { font-size: 1.35rem; font-weight: 700; margin: 0 0 .5rem; }
.dp-hero__desc { font-size: .87rem; color: #cbd5e1; margin: 0; line-height: 1.55; }

/* ── Stats Bar ── */
.dp-statsbar {
  display: flex;
  gap: .75rem;
  margin-bottom: 1.1rem;
  flex-wrap: wrap;
}
.dp-stat {
  flex: 1 1 120px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: .75rem 1rem;
  text-align: center;
}
.dp-stat__val { font-size: 1.45rem; font-weight: 700; color: #1e40af; line-height: 1.1; }
.dp-stat__lbl { font-size: .72rem; color: #64748b; margin-top: .15rem; }
.dp-stat--jenjang { flex: 2 1 180px; }
.dp-jenjang-chips { display: flex; gap: .4rem; flex-wrap: wrap; justify-content: center; margin-bottom: .2rem; }
.dp-jenjang-chip {
  font-size: .75rem;
  padding: .15rem .55rem;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 20px;
  border: 1px solid #bfdbfe;
}

/* ── Toolbar ── */
.dp-toolbar { margin-bottom: 1.1rem; display: flex; flex-direction: column; gap: .55rem; }
.dp-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.dp-search-icon {
  position: absolute;
  left: .75rem;
  color: #94a3b8;
  pointer-events: none;
  width: 18px;
  height: 18px;
}
.dp-search {
  width: 100%;
  padding: .6rem .6rem .6rem 2.4rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: .92rem;
  background: #fff;
  transition: border-color .2s;
}
.dp-search:focus { outline: none; border-color: #3b82f6; }
.dp-search-clear {
  position: absolute;
  right: .6rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: .9rem;
  padding: .2rem .4rem;
}
.dp-filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 80px auto;
  gap: 10px;
  width: 100%;
}
.dp-select {
  padding: .5rem .75rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: .87rem;
  background: #fff;
  color: #334155;
  cursor: pointer;
  width: 100%;
}
.dp-select:focus { outline: none; border-color: #3b82f6; }
.dp-btn-reset {
  padding: .5rem .9rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: .83rem;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
}
.dp-btn-reset:hover { background: #e2e8f0; }
.dp-select--sm { max-width: 90px; }

/* ── Export Bar ── */
.dp-export-bar {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .6rem;
  flex-wrap: wrap;
}
.dp-export-label { font-size: .78rem; color: #64748b; }
.dp-export-btn {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: .35rem .75rem;
  border-radius: 7px;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity .15s;
}
.dp-export-btn:disabled { opacity: .5; cursor: default; }
.dp-export-btn--csv  { background: #16a34a; color: #fff; }
.dp-export-btn--xlsx { background: #1d4ed8; color: #fff; }
.dp-export-btn--csv:hover:not(:disabled)  { background: #15803d; }
.dp-export-btn--xlsx:hover:not(:disabled) { background: #1e40af; }

/* ── PT Summary Panel ── */
.dp-pt-summary {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
}
.dp-pt-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: .5rem;
}
.dp-pt-summary__title { font-size: .85rem; font-weight: 700; color: #1e293b; }
.dp-pt-summary__sort-btns { display: flex; gap: .35rem; }
.dp-pts-btn {
  padding: .25rem .6rem;
  font-size: .75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}
.dp-pts-btn.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.dp-pt-summary__body { overflow-x: auto; max-height: 380px; overflow-y: auto; }
.dp-pts-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.dp-pts-th {
  padding: .5rem .75rem;
  text-align: left;
  font-size: .72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .04em;
  background: #f8fafc;
  position: sticky;
  top: 0;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.dp-pts-th--num { text-align: right; }
.dp-pts-th--sort { cursor: pointer; }
.dp-pts-th--sort:hover { color: #1d4ed8; }
.dp-pts-tr { border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background .12s; }
.dp-pts-tr:hover { background: #f0f7ff; }
.dp-pts-tr--active { background: #eff6ff; }
.dp-pts-td { padding: .45rem .75rem; color: #334155; vertical-align: middle; }
.dp-pts-td--no { color: #94a3b8; font-size: .75rem; width: 30px; text-align: center; }
.dp-pts-td--name { min-width: 140px; }
.dp-pts-td--num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dp-pts-td--bar { min-width: 100px; padding-right: 1rem; }
.dp-pts-singkatan { font-size: .78rem; font-weight: 700; color: #1e40af; display: block; }
.dp-pts-nama { font-size: .7rem; color: #94a3b8; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.dp-pts-bar-wrap { display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: #f1f5f9; }
.dp-pts-bar { height: 100%; transition: width .3s; }
.dp-pts-bar--q1 { background: #1d4ed8; }
.dp-pts-bar--q2 { background: #0891b2; }
.dp-pts-bar--q3 { background: #059669; }
.dp-pts-bar--q4 { background: #d97706; }

/* ── Loading / Empty ── */
.dp-loading { display: flex; align-items: center; gap: .7rem; padding: 2rem; color: #64748b; justify-content: center; }
.dp-spinner { width: 22px; height: 22px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dp-empty { text-align: center; padding: 3rem 1rem; color: #94a3b8; }

/* ── Dept Cards Grid ── */
.dp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 1rem;
  margin-bottom: 1.4rem;
}
.dp-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.1rem 1rem;
  cursor: pointer;
  transition: box-shadow .2s, border-color .2s, transform .1s;
  display: flex;
  flex-direction: column;
  gap: .4rem;
}
.dp-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.1); border-color: #93c5fd; transform: translateY(-2px); }
.dp-card__head { display: flex; justify-content: space-between; align-items: center; }
.dp-card__pt { font-size: .73rem; color: #64748b; font-weight: 600; }
.dp-card__nama { font-size: .93rem; font-weight: 600; color: #1e293b; line-height: 1.35; }
.dp-card__score-row { display: flex; align-items: baseline; gap: 1rem; }
.dp-card__score-main { display: flex; flex-direction: column; }
.dp-card__score-val { font-size: 1.5rem; font-weight: 700; color: #1e40af; }
.dp-card__score-lbl { font-size: .68rem; color: #94a3b8; }
.dp-card__score-sub { display: flex; flex-direction: column; }
.dp-card__score-val2 { font-size: 1.1rem; font-weight: 600; color: #3b82f6; }
.dp-card__score-lbl2 { font-size: .68rem; color: #94a3b8; }
.dp-card__stats { display: flex; gap: .75rem; margin-top: .2rem; }
.dp-card__stat {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: .78rem;
  color: #64748b;
}
.dp-card__link { font-size: .75rem; color: #3b82f6; margin-top: auto; padding-top: .5rem; }

/* ── Jenjang badges ── */
.dp-card__jenjang, .dp-modal__jenjang {
  font-size: .68rem;
  font-weight: 700;
  padding: .15rem .5rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.dp-jenjang--s1 { background: #dbeafe; color: #1d4ed8; }
.dp-jenjang--s2 { background: #ede9fe; color: #6d28d9; }
.dp-jenjang--s3 { background: #fce7f3; color: #9d174d; }
.dp-jenjang--d3, .dp-jenjang--d4 { background: #d1fae5; color: #065f46; }
.dp-jenjang--profesi, .dp-jenjang--sp1, .dp-jenjang--sp2 { background: #fef3c7; color: #92400e; }
.dp-jenjang-- { background: #f1f5f9; color: #475569; }

/* ── Pagination ── */
.dp-pagination {
  display: flex;
  align-items: center;
  gap: .4rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}
.dp-pagination--top { margin-top: 0; margin-bottom: .6rem; }
.dp-page-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 .5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: .85rem;
  cursor: pointer;
  color: #334155;
  transition: background .15s, border-color .15s;
}
.dp-page-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; }
.dp-page-btn.active { background: #1e40af; color: #fff; border-color: #1e40af; }
.dp-page-btn:disabled { opacity: .4; cursor: default; }
.dp-page-ellipsis { color: #94a3b8; padding: 0 .2rem; }
.dp-page-info { font-size: .78rem; color: #64748b; margin-left: .5rem; }

/* ── Modal ── */
.dp-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2vh 1rem;
  overflow-y: auto;
}
.dp-modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  position: relative;
}
.dp-modal__header {
  display: flex;
  align-items: flex-start;
  gap: .75rem;
  padding: 1.2rem 1.4rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}
.dp-modal__title-wrap { flex: 1; min-width: 0; }
.dp-modal__title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 .2rem; line-height: 1.3; }
.dp-modal__pt { font-size: .8rem; color: #64748b; }
.dp-modal__close {
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  padding: .3rem .6rem;
  cursor: pointer;
  font-size: 1rem;
  color: #475569;
  flex-shrink: 0;
}
.dp-modal__close:hover { background: #e2e8f0; }
.dp-modal__body { padding: 1.1rem 1.4rem 1.4rem; }
.dp-modal__loading { padding: 3rem; text-align: center; }

/* ── Score Cards ── */
.dp-modal__scores {
  display: flex;
  gap: .75rem;
  flex-wrap: wrap;
  margin-bottom: 1.2rem;
}
.dp-score-card {
  flex: 1 1 90px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: .75rem .9rem;
  text-align: center;
}
.dp-score-card--primary { background: #eff6ff; border-color: #bfdbfe; }
.dp-score-card__val { font-size: 1.35rem; font-weight: 700; color: #1e40af; }
.dp-score-card__lbl { font-size: .68rem; color: #64748b; margin-top: .1rem; }

/* ── Sections ── */
.dp-section { margin-bottom: 1.3rem; }
.dp-section--link { margin-bottom: 0; }
.dp-section__title {
  font-size: .78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: .65rem;
  padding-bottom: .35rem;
  border-bottom: 1px solid #f1f5f9;
}

/* ── Author Aggregates ── */
.dp-author-agg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .6rem;
}
.dp-agg-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: .6rem .75rem;
  text-align: center;
}
.dp-agg-val { font-size: 1.15rem; font-weight: 700; color: #0f172a; }
.dp-agg-lbl { font-size: .68rem; color: #64748b; margin-top: .1rem; }

/* ── Pub Table ── */
.dp-pub-table { display: flex; flex-direction: column; gap: .3rem; }
.dp-pub-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: .5rem; font-size: .85rem; padding: .35rem .5rem; border-radius: 6px; }
.dp-pub-row--head { font-size: .72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.dp-pub-row:not(.dp-pub-row--head):nth-child(even) { background: #f8fafc; }
.dp-pub-src { font-weight: 600; color: #334155; }
.dp-pub-src--scopus::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f97316; margin-right: 6px; }
.dp-pub-src--gscholar::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; margin-right: 6px; }
.dp-pub-src--wos::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; margin-right: 6px; }

/* ── Kuartil ── */
.dp-kuartil-bar {
  display: flex;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: .6rem;
}
.dp-q-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .72rem;
  font-weight: 700;
  color: rgba(255,255,255,.9);
  transition: flex .3s;
}
.dp-q--q1 { background: #16a34a; }
.dp-q--q2 { background: #2563eb; }
.dp-q--q3 { background: #d97706; }
.dp-q--q4 { background: #dc2626; }
.dp-q--noq { background: #94a3b8; }
.dp-kuartil-legend { display: flex; gap: .5rem; flex-wrap: wrap; }
.dp-ql { font-size: .75rem; padding: .15rem .5rem; border-radius: 20px; font-weight: 600; }
.dp-ql--q1 { background: #dcfce7; color: #15803d; }
.dp-ql--q2 { background: #dbeafe; color: #1d4ed8; }
.dp-ql--q3 { background: #fef3c7; color: #92400e; }
.dp-ql--q4 { background: #fee2e2; color: #b91c1c; }
.dp-ql--noq { background: #f1f5f9; color: #475569; }

/* ── Radar / Research ── */
.dp-radar-row { display: flex; gap: 1.2rem; flex-wrap: wrap; }
.dp-radar-item { text-align: center; flex: 1 1 80px; }
.dp-radar-val { font-size: 1.25rem; font-weight: 700; color: #1e40af; }
.dp-radar-lbl { font-size: .72rem; color: #64748b; margin-top: .1rem; }

/* ── Trend Chart ── */
.dp-trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 100px;
  padding-bottom: 1.4rem;
  overflow-x: auto;
  padding-left: 2px;
}
.dp-trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  flex: 1 1 24px;
  min-width: 24px;
  height: 100%;
  position: relative;
}
.dp-trend-bar {
  width: 100%;
  background: linear-gradient(to top, #1d4ed8, #60a5fa);
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height .3s;
}
.dp-trend-val { font-size: .62rem; color: #334155; font-weight: 600; position: absolute; top: -1px; }
.dp-trend-yr { position: absolute; bottom: 0; font-size: .6rem; color: #94a3b8; }

/* ── Top Authors ── */
.dp-top-authors { display: flex; flex-direction: column; gap: .6rem; }
.dp-author-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem .75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}
.dp-author-rank {
  font-size: 1rem;
  font-weight: 700;
  color: #94a3b8;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.dp-author-foto {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.dp-author-info { flex: 1; min-width: 0; }
.dp-author-nama { font-size: .87rem; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-author-meta { display: flex; gap: .3rem; flex-wrap: wrap; margin-top: .2rem; }
.dp-bidang-chip {
  font-size: .66rem;
  padding: .1rem .4rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 20px;
}
.dp-author-scores {
  display: flex;
  gap: .75rem;
  flex-shrink: 0;
  font-size: .78rem;
  text-align: center;
}
.dp-author-scores div { display: flex; flex-direction: column; gap: .1rem; }
.dp-author-scores small { color: #94a3b8; font-size: .65rem; }

/* ── Bidang Distribution ── */
.dp-bidang-dist { display: flex; flex-direction: column; gap: .4rem; }
.dp-bidang-row {
  display: grid;
  grid-template-columns: 160px 1fr 36px;
  align-items: center;
  gap: .6rem;
}
.dp-bidang-name { font-size: .8rem; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-bidang-bar-wrap { background: #f1f5f9; border-radius: 4px; height: 8px; overflow: hidden; }
.dp-bidang-bar { height: 100%; background: linear-gradient(to right, #1d4ed8, #60a5fa); border-radius: 4px; transition: width .4s; }
.dp-bidang-count { font-size: .78rem; font-weight: 600; color: #64748b; text-align: right; }

/* ── GScholar Trend ── */
.dp-gs-trend { margin-top: .4rem; }
.dp-gs-legend { display: flex; align-items: center; gap: .3rem; font-size: .75rem; color: #64748b; margin-bottom: .6rem; }
.dp-gs-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dp-gs-dot--pub { background: #7c3aed; }
.dp-gs-dot--cite { background: #db2777; }
.dp-gs-chart { display: flex; align-items: flex-end; gap: 4px; height: 110px; overflow-x: auto; padding-bottom: 2px; }
.dp-gs-col { display: flex; flex-direction: column; align-items: center; min-width: 30px; }
.dp-gs-bars { display: flex; gap: 2px; align-items: flex-end; height: 88px; }
.dp-gs-bar { width: 9px; border-radius: 2px 2px 0 0; transition: height .3s; }
.dp-gs-bar--pub { background: #7c3aed; }
.dp-gs-bar--cite { background: #db2777; }
.dp-gs-yr { font-size: 9px; color: #94a3b8; margin-top: 3px; transform: rotate(-45deg); transform-origin: center; white-space: nowrap; }

/* ── SINTA Link ── */
.dp-sinta-link {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .55rem 1rem;
  background: #0f172a;
  color: #fff;
  border-radius: 8px;
  font-size: .84rem;
  font-weight: 600;
  text-decoration: none;
  transition: background .15s;
}
.dp-sinta-link:hover { background: #1e3a5f; }

/* ── View Bar ── */
.dp-viewbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .75rem;
  min-height: 34px;
}
.dp-viewbar__count {
  font-size: .83rem;
  color: #64748b;
}
.dp-viewbar__filtered { color: #94a3b8; }
.dp-view-toggle {
  display: flex;
  gap: 3px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 3px;
}
.dp-view-btn {
  display: flex;
  align-items: center;
  gap: .3rem;
  padding: .3rem .65rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: .78rem;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.dp-view-btn:hover { background: #e2e8f0; color: #334155; }
.dp-view-btn.active { background: #fff; color: #1e40af; box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 600; }

/* ── Table ── */
.dp-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 1.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.dp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .84rem;
  white-space: nowrap;
}
.dp-th {
  padding: .65rem .85rem;
  background: #f8fafc;
  color: #475569;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  text-align: left;
  border-bottom: 1.5px solid #e2e8f0;
  user-select: none;
}
.dp-th--no { width: 40px; text-align: center; color: #94a3b8; }
.dp-th--num { text-align: right; }
.dp-th--sort {
  cursor: pointer;
  transition: background .15s, color .15s;
}
.dp-th--sort:hover { background: #eff6ff; color: #1e40af; }
.dp-sort-icon {
  font-size: .75rem;
  color: #94a3b8;
  margin-left: .25rem;
  display: inline-block;
  width: .8em;
}
.dp-tr {
  cursor: pointer;
  transition: background .12s;
  border-bottom: 1px solid #f1f5f9;
}
.dp-tr:last-child { border-bottom: none; }
.dp-tr:hover { background: #f0f7ff; }
.dp-tr:hover .dp-table-link { color: #1e40af; }
.dp-td {
  padding: .6rem .85rem;
  color: #334155;
  vertical-align: middle;
}
.dp-td--no { text-align: center; color: #94a3b8; font-size: .78rem; width: 40px; }
.dp-td--nama { font-weight: 600; color: #1e293b; min-width: 180px; white-space: normal; }
.dp-td--pt { min-width: 80px; }
.dp-td--num { text-align: right; font-variant-numeric: tabular-nums; }
.dp-td--action { width: 80px; text-align: right; }
.dp-td-pt-singkatan { font-size: .78rem; font-weight: 600; color: #64748b; }
.dp-table-link { font-size: .75rem; color: #3b82f6; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .dp-hero { flex-direction: column; gap: .75rem; padding: 1.2rem; }
  .dp-filter-row { grid-template-columns: 1fr; }
  .dp-author-agg-grid { grid-template-columns: 1fr 1fr; }
  .dp-bidang-row { grid-template-columns: 1fr 1fr 28px; }
  .dp-bidang-name { font-size: .73rem; }
  .dp-modal__header { flex-wrap: wrap; }
  .dp-author-scores { display: none; }
  .dp-stat { flex: 1 1 80px; }
  .dp-stat__val { font-size: 1.15rem; }
}
`],
})
export class SintaDepartemenComponent implements OnInit, OnDestroy {

  depts: DeptList[] = [];
  stats: DeptStats | null = null;
  ptOptions: PtOption[] = [];
  loading = false;

  searchQuery = '';
  filterPt     = '';
  filterJenjang = '';
  ordering     = '-sinta_score_overall';

  totalCount = 0;
  currentPage = 1;
  pageSize    = 24;

  selected: DeptList | null = null;
  detail: DeptDetail | null = null;
  detailLoading = false;

  viewMode: 'grid' | 'table' = 'grid';
  tableSortField = 'sinta_score_overall';
  tableSortDir: 'asc' | 'desc' = 'desc';

  exporting       = false;
  showPtSummary   = false;
  ptSummaryData:  PtSummary[] = [];
  ptSummaryLoading = false;
  ptSummarySort   = 'scopus_dokumen';

  private searchDelay = new Subject<void>();
  private destroy$    = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadPtOptions();
    this.loadDepts();

    this.searchDelay.pipe(
      debounceTime(350),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadDepts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loaders ──────────────────────────────────────────────────────────

  loadStats(): void {
    this.http.get<DeptStats>(`${API}/sinta-departemen/stats/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: s => this.stats = s, error: () => {} });
  }

  loadPtOptions(): void {
    this.http.get<any>(`${API}/sinta-afiliasi/?ordering=singkatan_sinta&page_size=500`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: r => {
        const list = r.results ?? r;
        this.ptOptions = list.map((a: any) => ({
          kode: a.sinta_kode,
          singkatan: a.singkatan_sinta || a.pt_singkatan || a.sinta_kode,
        })).sort((a: PtOption, b: PtOption) => a.singkatan.localeCompare(b.singkatan));
      }, error: () => {} });
  }

  loadDepts(): void {
    this.loading = true;
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('page_size', this.pageSize.toString())
      .set('ordering', this.ordering);

    if (this.searchQuery.trim())
      params = params.set('search', this.searchQuery.trim());
    if (this.filterPt)
      params = params.set('afiliasi__sinta_kode', this.filterPt);
    if (this.filterJenjang)
      params = params.set('jenjang', this.filterJenjang);

    this.http.get<PagedResponse>(`${API}/sinta-departemen/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: r => {
          this.depts      = r.results;
          this.totalCount = r.count;
        },
        error: () => { this.depts = []; this.totalCount = 0; },
      });
  }

  openDetail(dept: DeptList): void {
    this.selected     = dept;
    this.detail       = null;
    this.detailLoading = true;
    this.http.get<DeptDetail>(`${API}/sinta-departemen/${dept.id}/`)
      .pipe(takeUntil(this.destroy$), finalize(() => this.detailLoading = false))
      .subscribe({ next: d => this.detail = d, error: () => {} });
  }

  closeDetail(): void {
    this.selected = null;
    this.detail   = null;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeDetail(); }

  // ── Filters ───────────────────────────────────────────────────────────────

  onSearchChange(): void { this.searchDelay.next(); }
  onFilterChange(): void {
    // Sync table sort state from dropdown ordering
    if (this.ordering.startsWith('-')) {
      this.tableSortField = this.ordering.slice(1);
      this.tableSortDir = 'desc';
    } else {
      this.tableSortField = this.ordering;
      this.tableSortDir = 'asc';
    }
    this.currentPage = 1;
    this.loadDepts();
  }
  clearSearch(): void { this.searchQuery = ''; this.onFilterChange(); }
  hasActiveFilter(): boolean {
    return !!(this.searchQuery || this.filterPt || this.filterJenjang
              || this.ordering !== '-sinta_score_overall');
  }
  resetFilters(): void {
    this.searchQuery    = '';
    this.filterPt       = '';
    this.filterJenjang  = '';
    this.ordering       = '-sinta_score_overall';
    this.tableSortField = 'sinta_score_overall';
    this.tableSortDir   = 'desc';
    this.currentPage    = 1;
    this.loadDepts();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadDepts();
  }

  togglePtSummary(): void {
    this.showPtSummary = !this.showPtSummary;
    if (this.showPtSummary && this.ptSummaryData.length === 0) {
      this.loadPtSummary();
    }
  }

  loadPtSummary(): void {
    this.ptSummaryLoading = true;
    this.http.get<any>(`${API}/sinta-afiliasi/?page_size=200&ordering=-scopus_dokumen`)
      .pipe(takeUntil(this.destroy$), finalize(() => this.ptSummaryLoading = false))
      .subscribe({
        next: r => {
          const list = r.results ?? r;
          this.ptSummaryData = list.map((a: any) => ({
            sinta_kode:      a.sinta_kode,
            nama_sinta:      a.nama_sinta,
            singkatan_sinta: a.singkatan_sinta || a.sinta_kode,
            scopus_dokumen:  a.scopus_dokumen  || 0,
            scopus_sitasi:   a.scopus_sitasi   || 0,
            gscholar_dokumen:a.gscholar_dokumen|| 0,
            scopus_q1:       a.scopus_q1       || 0,
            scopus_q2:       a.scopus_q2       || 0,
            scopus_q3:       a.scopus_q3       || 0,
            scopus_q4:       a.scopus_q4       || 0,
          }));
        },
        error: () => {}
      });
  }

  setPtSort(field: string): void {
    this.ptSummarySort = field;
  }

  ptSortIcon(field: string): string {
    return this.ptSummarySort === field ? '↓' : '↕';
  }

  sortedPtSummary(): PtSummary[] {
    const field = this.ptSummarySort;
    return [...this.ptSummaryData].sort((a, b) => {
      const va = field === 'q1q2' ? a.scopus_q1 + a.scopus_q2 : (a as any)[field] || 0;
      const vb = field === 'q1q2' ? b.scopus_q1 + b.scopus_q2 : (b as any)[field] || 0;
      return vb - va;
    });
  }

  filterByPt(kode: string): void {
    this.filterPt = this.filterPt === kode ? '' : kode;
    this.currentPage = 1;
    this.loadDepts();
  }

  ptBarPct(p: PtSummary, q: 'q1'|'q2'|'q3'|'q4'): number {
    const total = (p.scopus_q1 + p.scopus_q2 + p.scopus_q3 + p.scopus_q4) || 1;
    const maxTotal = Math.max(...this.ptSummaryData.map(x => x.scopus_q1 + x.scopus_q2 + x.scopus_q3 + x.scopus_q4), 1);
    const rowTotal = p.scopus_q1 + p.scopus_q2 + p.scopus_q3 + p.scopus_q4;
    return (p[`scopus_${q}` as keyof PtSummary] as number / rowTotal * (rowTotal / maxTotal) * 100) || 0;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  private buildExportParams(): HttpParams {
    let p = new HttpParams().set('page_size', '10000').set('ordering', this.ordering);
    if (this.searchQuery.trim()) p = p.set('search', this.searchQuery.trim());
    if (this.filterPt)           p = p.set('afiliasi__sinta_kode', this.filterPt);
    if (this.filterJenjang)      p = p.set('jenjang', this.filterJenjang);
    return p;
  }

  private fetchAllForExport(cb: (rows: DeptList[]) => void): void {
    this.exporting = true;
    this.http.get<PagedResponse>(`${API}/sinta-departemen/`, { params: this.buildExportParams() })
      .pipe(takeUntil(this.destroy$), finalize(() => this.exporting = false))
      .subscribe({ next: r => cb(r.results), error: () => {} });
  }

  private toRows(data: DeptList[]): any[][] {
    const header = ['#', 'PT', 'Nama Departemen', 'Jenjang', 'Kode Dept',
                    'Skor SINTA', 'Skor 3 Thn', 'Produktivitas',
                    'Jumlah Author', 'Scopus Artikel', 'Scopus Sitasi',
                    'GScholar Artikel', 'GScholar Sitasi', 'WoS Artikel'];
    const rows = data.map((d, i) => [
      i + 1, d.pt_singkatan, d.nama, d.jenjang, d.kode_dept,
      d.sinta_score_overall, d.sinta_score_3year, d.sinta_score_productivity,
      d.jumlah_authors, d.scopus_artikel, d.scopus_sitasi,
      d.gscholar_artikel, d.gscholar_sitasi, d.wos_artikel,
    ]);
    return [header, ...rows];
  }

  exportCSV(): void {
    this.fetchAllForExport(data => {
      const rows = this.toRows(data);
      const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `departemen_sinta_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });
  }

  exportXLSX(): void {
    this.fetchAllForExport(data => {
      const rows = this.toRows(data);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [4, 12, 35, 8, 10, 12, 10, 14, 10, 12, 12, 14, 14, 10].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Departemen SINTA');
      XLSX.writeFile(wb, `departemen_sinta_${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  }

  setTableSort(field: string): void {
    if (this.tableSortField === field) {
      this.tableSortDir = this.tableSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.tableSortField = field;
      this.tableSortDir = 'desc';
    }
    this.ordering = (this.tableSortDir === 'desc' ? '-' : '') + this.tableSortField;
    this.currentPage = 1;
    this.loadDepts();
  }

  sortIcon(field: string): string {
    if (this.tableSortField !== field) return '↕';
    return this.tableSortDir === 'desc' ? '↓' : '↑';
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  totalPages(): number { return Math.ceil(this.totalCount / this.pageSize); }
  min(a: number, b: number): number { return Math.min(a, b); }

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage = p;
    this.loadDepts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const cur   = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (cur > 3) pages.push(-1);
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  jenjangClass(j: string): string {
    if (!j) return '';
    const lc = j.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lc.startsWith('s1')) return 's1';
    if (lc.startsWith('s2')) return 's2';
    if (lc.startsWith('s3')) return 's3';
    if (lc.startsWith('d3')) return 'd3';
    if (lc.startsWith('d4')) return 'd4';
    if (lc.startsWith('sp1') || lc.startsWith('sp2')) return 'sp1';
    if (lc === 'profesi') return 'profesi';
    return lc.slice(0, 4);
  }

  totalKuartil(d: DeptDetail): number {
    return (d.scopus_q1 || 0) + (d.scopus_q2 || 0) + (d.scopus_q3 || 0)
         + (d.scopus_q4 || 0) + (d.scopus_noq || 0);
  }

  kuartilSegments(d: DeptDetail): { key: string; label: string; val: number; pct: number }[] {
    const total = this.totalKuartil(d) || 1;
    return [
      { key: 'q1', label: 'Q1', val: d.scopus_q1 || 0, pct: ((d.scopus_q1 || 0) / total) * 100 },
      { key: 'q2', label: 'Q2', val: d.scopus_q2 || 0, pct: ((d.scopus_q2 || 0) / total) * 100 },
      { key: 'q3', label: 'Q3', val: d.scopus_q3 || 0, pct: ((d.scopus_q3 || 0) / total) * 100 },
      { key: 'q4', label: 'Q4', val: d.scopus_q4 || 0, pct: ((d.scopus_q4 || 0) / total) * 100 },
      { key: 'noq', label: 'NoQ', val: d.scopus_noq || 0, pct: ((d.scopus_noq || 0) / total) * 100 },
    ];
  }

  sortedTrend(trend: TrendScopusItem[]): TrendScopusItem[] {
    return [...trend].sort((a, b) => a.tahun - b.tahun);
  }

  trendBarHeight(jumlah: number, trend: TrendScopusItem[]): number {
    const max = Math.max(...trend.map(t => t.jumlah), 1);
    return Math.max(2, (jumlah / max) * 100);
  }

  gsBarHeight(val: number, trend: TrendGscholarItem[], field: 'pub' | 'cite'): number {
    const max = Math.max(...trend.map(t => field === 'pub' ? t.pub : t.cite), 1);
    return Math.max(2, (val / max) * 100);
  }

  authorInitials(nama: string, idx: number): string {
    const colors = ['#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb'];
    return initialsAvatar(nama, colors[idx % colors.length]);
  }

  onImgError(event: Event, nama: string, idx: number): void {
    const img = event.target as HTMLImageElement;
    img.src = this.authorInitials(nama, idx);
  }
}
