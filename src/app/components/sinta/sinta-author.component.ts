import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, ArcElement, DoughnutController
} from 'chart.js';
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController);

const API = environment.apiUrl;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TrendItem {
  jenis: string;
  tahun: number;
  jumlah: number;
}

interface AuthorList {
  id: number;
  sinta_id: string;
  nama: string;
  url_profil: string;
  foto_url: string;
  pt_kode: string;
  pt_singkatan: string;
  dept_nama: string;
  dept_jenjang: string;
  sinta_score_overall: number;
  sinta_score_3year: number;
  scopus_artikel: number;
  scopus_sitasi: number;
  scopus_h_index: number;
  gscholar_h_index: number;
  bidang_keilmuan: string[];
}

interface AuthorDetail extends AuthorList {
  affil_score: number;
  affil_score_3year: number;
  scopus_cited_doc: number;
  scopus_i10_index: number;
  scopus_g_index: number;
  gscholar_artikel: number;
  gscholar_sitasi: number;
  gscholar_cited_doc: number;
  gscholar_i10_index: number;
  gscholar_g_index: number;
  wos_artikel: number;
  wos_sitasi: number;
  wos_cited_doc: number;
  wos_h_index: number;
  scopus_q1: number;
  scopus_q2: number;
  scopus_q3: number;
  scopus_q4: number;
  scopus_noq: number;
  research_conference: number;
  research_articles: number;
  research_others: number;
  scraped_at: string;
  trend: TrendItem[];
}

interface ScopusArtikel {
  id: number;
  eid: string;
  judul: string;
  tahun: number | null;
  sitasi: number;
  kuartil: string;
  jurnal_nama: string;
  jurnal_url: string;
  scopus_url: string;
  urutan_penulis: number | null;
  total_penulis: number | null;
  nama_singkat: string | null;
}

interface ScopusArtikelResponse {
  count: number;
  page: number;
  page_size: number;
  results: ScopusArtikel[];
}

interface AuthorStats {
  total_authors: number;
  avg_score_overall: number;
  max_score_overall: number;
  total_scopus_artikel: number;
  total_scopus_sitasi: number;
}

interface PtOption {
  kode: string;
  singkatan: string;
}

interface PagedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuthorList[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsAvatar(name: string): string {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0].slice(0, 2)).toUpperCase();
  const colors = ['#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb'];
  const idx = name.charCodeAt(0) % colors.length;
  const bg = colors[idx];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <rect width="80" height="80" rx="40" fill="${bg}"/>
    <text x="40" y="54" text-anchor="middle" font-size="28" font-family="sans-serif" fill="white" font-weight="bold">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-sinta-author',
  template: `
<div class="au-wrap">

  <!-- ── Back ── -->
  <div class="au-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Hero ── -->
  <div class="au-hero">
    <div class="au-hero__icon">
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
    <div class="au-hero__content">
      <div class="au-hero__badge">SINTA — Science and Technology Index</div>
      <h1 class="au-hero__title">Author / Penulis PTMA di SINTA</h1>
      <p class="au-hero__desc">
        Daftar peneliti dan dosen <strong>PTMA (Perguruan Tinggi Muhammadiyah &amp; Aisyiyah)</strong>
        yang terdaftar di SINTA — lengkap dengan skor riset, indeks Scopus, dan Google Scholar
        berdasarkan data resmi Kemdiktisaintek.
      </p>
    </div>
  </div>

  <!-- ── Stats Bar ── -->
  <div class="au-statsbar" *ngIf="stats">
    <div class="au-stat">
      <div class="au-stat__val">{{ stats.total_authors | number }}</div>
      <div class="au-stat__lbl">Total Author</div>
    </div>
    <div class="au-stat">
      <div class="au-stat__val">{{ stats.avg_score_overall | number:'1.0-0' }}</div>
      <div class="au-stat__lbl">Rata-rata Skor SINTA</div>
    </div>
    <div class="au-stat">
      <div class="au-stat__val">{{ stats.max_score_overall | number }}</div>
      <div class="au-stat__lbl">Skor Tertinggi</div>
    </div>
    <div class="au-stat">
      <div class="au-stat__val">{{ stats.total_scopus_artikel | number }}</div>
      <div class="au-stat__lbl">Total Artikel Scopus</div>
    </div>
    <div class="au-stat">
      <div class="au-stat__val">{{ stats.total_scopus_sitasi | number }}</div>
      <div class="au-stat__lbl">Total Sitasi Scopus</div>
    </div>
  </div>

  <!-- ── Filter & Sort Bar ── -->
  <div class="au-toolbar">
    <!-- Search — full width -->
    <div class="au-search-wrap">
      <svg class="au-search-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16a6.47 6.47 0 004.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        class="au-search"
        type="text"
        [(ngModel)]="searchQuery"
        (ngModelChange)="onSearchChange()"
        placeholder="Cari nama atau bidang keilmuan…"
      />
      <button *ngIf="searchQuery" class="au-search-clear" (click)="clearSearch()">✕</button>
    </div>

    <!-- Filter row — sejajar di desktop, kolom di mobile -->
    <div class="au-filter-row">

      <!-- Filter PT -->
      <select class="au-select" [(ngModel)]="filterPt" (change)="onPtChange()">
        <option value="">Semua PT</option>
        <option *ngFor="let p of ptOptions" [value]="p.kode">{{ p.singkatan }}</option>
      </select>

      <!-- Filter Departemen (aktif saat PT dipilih) -->
      <select class="au-select" [(ngModel)]="filterDept" (change)="onFilterChange()" [disabled]="!filterPt">
        <option value="">{{ filterPt ? 'Semua Departemen' : '— Pilih PT dulu —' }}</option>
        <option *ngFor="let d of deptOptions" [value]="d.kode_dept">{{ d.nama }} ({{ d.jenjang }})</option>
      </select>

      <!-- Ordering -->
      <select class="au-select" [(ngModel)]="ordering" (change)="onFilterChange()">
        <option value="-sinta_score_overall">Skor SINTA (tertinggi)</option>
        <option value="-sinta_score_3year">Skor 3 Tahun (tertinggi)</option>
        <option value="-scopus_artikel">Artikel Scopus (terbanyak)</option>
        <option value="-scopus_h_index">H-Index Scopus (tertinggi)</option>
        <option value="afiliasi__nama_sinta">PT (A–Z)</option>
        <option value="departemen__nama">Departemen (A–Z)</option>
        <option value="nama">Nama A–Z</option>
      </select>

      <!-- Page size -->
      <select class="au-select au-select--sm" [(ngModel)]="pageSize" (change)="onPageSizeChange()">
        <option [value]="20">20 / hal.</option>
        <option [value]="50">50 / hal.</option>
        <option [value]="100">100 / hal.</option>
      </select>

      <!-- Reset -->
      <button class="au-reset-btn" (click)="resetFilter()" title="Reset semua filter">
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
        Reset
      </button>

    </div>
  </div>

  <!-- ── Loading ── -->
  <div class="au-loading" *ngIf="loading">
    <div class="au-spinner"></div>
    <span>Memuat data author…</span>
  </div>

  <!-- ── Empty ── -->
  <div class="au-empty" *ngIf="!loading && authors.length === 0">
    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="color:#cbd5e1">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
    <p>Tidak ada author ditemukan.</p>
    <button class="au-reset-btn" (click)="resetFilter()">Reset Filter</button>
  </div>

  <!-- ── View Bar: count + toggle grid/table ── -->
  <div class="au-viewbar" *ngIf="!loading && authors.length > 0">
    <span class="au-count">{{ totalCount | number }} author ditemukan</span>
    <div class="au-view-toggle">
      <button class="au-view-btn" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" title="Tampilan kartu">
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
        <span>Kartu</span>
      </button>
      <button class="au-view-btn" [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Tampilan tabel">
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        <span>Tabel</span>
      </button>
    </div>
  </div>

  <!-- ── Author Cards Grid ── -->
  <div class="au-grid" *ngIf="!loading && authors.length > 0 && viewMode === 'grid'">
    <div
      class="au-card"
      *ngFor="let a of authors"
      (click)="openDetail(a)"
      [class.au-card--active]="selectedAuthor?.id === a.id"
    >
      <!-- Foto -->
      <div class="au-card__photo-wrap">
        <img
          class="au-card__photo"
          [src]="a.foto_url || getInitialsAvatar(a.nama)"
          [alt]="a.nama"
          (error)="onImgError($event, a.nama)"
          loading="lazy"
        />
      </div>

      <!-- Info utama -->
      <div class="au-card__body">
        <div class="au-card__name">{{ a.nama }}</div>
        <div class="au-card__affil">
          <span class="au-card__pt">{{ a.pt_singkatan }}</span>
          <span class="au-card__dept" *ngIf="a.dept_nama"> · {{ a.dept_nama }}<span *ngIf="a.dept_jenjang"> ({{ a.dept_jenjang }})</span></span>
        </div>

        <!-- SINTA Score -->
        <div class="au-card__scores">
          <div class="au-score-main">
            <div class="au-score-main__val">{{ a.sinta_score_overall | number }}</div>
            <div class="au-score-main__lbl">Skor SINTA</div>
          </div>
          <div class="au-score-sub">
            <div class="au-score-sub__val">{{ a.sinta_score_3year | number }}</div>
            <div class="au-score-sub__lbl">3 Tahun</div>
          </div>
        </div>

        <!-- Row stats -->
        <div class="au-card__metrics">
          <div class="au-metric">
            <span class="au-metric__val">{{ a.scopus_h_index }}</span>
            <span class="au-metric__lbl">H Scopus</span>
          </div>
          <div class="au-metric">
            <span class="au-metric__val">{{ a.gscholar_h_index }}</span>
            <span class="au-metric__lbl">H GScholar</span>
          </div>
          <div class="au-metric">
            <span class="au-metric__val">{{ a.scopus_artikel }}</span>
            <span class="au-metric__lbl">Artikel</span>
          </div>
          <div class="au-metric">
            <span class="au-metric__val">{{ a.scopus_sitasi | number }}</span>
            <span class="au-metric__lbl">Sitasi</span>
          </div>
        </div>

        <!-- Bidang keilmuan tags -->
        <div class="au-card__tags" *ngIf="a.bidang_keilmuan?.length">
          <span class="au-tag" *ngFor="let b of a.bidang_keilmuan | slice:0:3">{{ b }}</span>
          <span class="au-tag au-tag--more" *ngIf="a.bidang_keilmuan.length > 3">
            +{{ a.bidang_keilmuan.length - 3 }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Pagination atas (table mode) ── -->
  <div class="au-pagination au-pagination--top" *ngIf="!loading && totalPages > 1 && viewMode === 'table'">
    <button class="au-pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹ Sebelumnya</button>
    <div class="au-pg-pages">
      <button
        *ngFor="let p of visiblePages"
        class="au-pg-num"
        [class.au-pg-num--active]="p === currentPage"
        [class.au-pg-num--ellipsis]="p === -1"
        [disabled]="p === -1"
        (click)="p !== -1 && goPage(p)"
      >{{ p === -1 ? '…' : p }}</button>
    </div>
    <button class="au-pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">Selanjutnya ›</button>
  </div>

  <!-- ── Export Bar (table mode) ── -->
  <div class="au-export-bar" *ngIf="!loading && authors.length > 0 && viewMode === 'table'">
    <span class="au-export-label">Export:</span>
    <button class="au-export-btn au-export-btn--csv" (click)="exportCSV()" [disabled]="exporting">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17.5v-7h1.5l1.5 3.5 1.5-3.5H14v7h-1.5v-4l-1 2.5h-1l-1-2.5v4H8z"/></svg>
      {{ exporting ? 'Mengekspor…' : 'CSV' }}
    </button>
    <button class="au-export-btn au-export-btn--xlsx" (click)="exportXLSX()" [disabled]="exporting">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9 17.5l1.5-2.5L9 12.5h1.7l.8 1.5.8-1.5H14l-1.5 2.5 1.5 2.5h-1.7l-.8-1.5-.8 1.5H9z"/></svg>
      {{ exporting ? 'Mengekspor…' : 'XLSX' }}
    </button>
    <span class="au-export-hint" *ngIf="totalCount > pageSize">
      (semua {{ totalCount | number }} data dengan filter aktif)
    </span>
  </div>

  <!-- ── Author Table ── -->
  <div class="au-table-wrap" *ngIf="!loading && authors.length > 0 && viewMode === 'table'">
    <table class="au-table">
      <thead>
        <tr>
          <th class="au-th au-th--no">#</th>
          <th class="au-th au-th--sort" (click)="setTableSort('nama')">
            Nama <span class="au-sort-icon">{{ sortIcon('nama') }}</span>
          </th>
          <th class="au-th au-th--sort" (click)="setTableSort('afiliasi__nama_sinta')">
            PT <span class="au-sort-icon">{{ sortIcon('afiliasi__nama_sinta') }}</span>
          </th>
          <th class="au-th au-th--sort" (click)="setTableSort('departemen__nama')">
            Departemen <span class="au-sort-icon">{{ sortIcon('departemen__nama') }}</span>
          </th>
          <th class="au-th au-th--sort au-th--num" (click)="setTableSort('sinta_score_overall')">
            Skor SINTA <span class="au-sort-icon">{{ sortIcon('sinta_score_overall') }}</span>
          </th>
          <th class="au-th au-th--sort au-th--num" (click)="setTableSort('sinta_score_3year')">
            3 Thn <span class="au-sort-icon">{{ sortIcon('sinta_score_3year') }}</span>
          </th>
          <th class="au-th au-th--sort au-th--num" (click)="setTableSort('scopus_artikel')">
            Scopus Art. <span class="au-sort-icon">{{ sortIcon('scopus_artikel') }}</span>
          </th>
          <th class="au-th au-th--sort au-th--num" (click)="setTableSort('scopus_sitasi')">
            Sitasi <span class="au-sort-icon">{{ sortIcon('scopus_sitasi') }}</span>
          </th>
          <th class="au-th au-th--sort au-th--num" (click)="setTableSort('scopus_h_index')">
            H-Index <span class="au-sort-icon">{{ sortIcon('scopus_h_index') }}</span>
          </th>
          <th class="au-th"></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let a of authors; let i = index" class="au-tr" (click)="openDetail(a)">
          <td class="au-td au-td--no">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
          <td class="au-td au-td--nama">
            <div class="au-td-author">
              <img
                class="au-td-foto"
                [src]="a.foto_url || getInitialsAvatar(a.nama)"
                [alt]="a.nama"
                (error)="onImgError($event, a.nama)"
                loading="lazy"
              />
              <span>{{ a.nama }}</span>
            </div>
          </td>
          <td class="au-td au-td--pt">{{ a.pt_singkatan }}</td>
          <td class="au-td au-td--dept">
            <span *ngIf="a.dept_nama">{{ a.dept_nama }}<span *ngIf="a.dept_jenjang" class="au-td-jenjang"> ({{ a.dept_jenjang }})</span></span>
            <span *ngIf="!a.dept_nama" class="au-td-muted">—</span>
          </td>
          <td class="au-td au-td--num"><b>{{ a.sinta_score_overall | number }}</b></td>
          <td class="au-td au-td--num">{{ a.sinta_score_3year | number }}</td>
          <td class="au-td au-td--num">{{ a.scopus_artikel | number }}</td>
          <td class="au-td au-td--num">{{ a.scopus_sitasi | number }}</td>
          <td class="au-td au-td--num">{{ a.scopus_h_index }}</td>
          <td class="au-td au-td--action">
            <span class="au-table-link">Detail →</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Pagination ── -->
  <div class="au-pagination" *ngIf="!loading && totalPages > 1">
    <button class="au-pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹ Sebelumnya</button>
    <div class="au-pg-pages">
      <button
        *ngFor="let p of visiblePages"
        class="au-pg-num"
        [class.au-pg-num--active]="p === currentPage"
        [class.au-pg-num--ellipsis]="p === -1"
        [disabled]="p === -1"
        (click)="p !== -1 && goPage(p)"
      >{{ p === -1 ? '…' : p }}</button>
    </div>
    <button class="au-pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">Selanjutnya ›</button>
  </div>

</div>

<!-- ════════════════════════ DETAIL MODAL ════════════════════════ -->
<div class="au-overlay" *ngIf="modalOpen" (click)="closeModal()">
  <div class="au-modal" (click)="$event.stopPropagation()">

    <!-- Close -->
    <button class="au-modal__close" (click)="closeModal()">✕</button>

    <!-- Loading detail -->
    <div class="au-modal__loading" *ngIf="detailLoading">
      <div class="au-spinner"></div>
      <span>Memuat detail author…</span>
    </div>

    <ng-container *ngIf="!detailLoading && detail">

      <!-- ── Header Modal ── -->
      <div class="au-modal__header">
        <div class="au-modal__photo-wrap">
          <img
            class="au-modal__photo"
            [src]="detail.foto_url || getInitialsAvatar(detail.nama)"
            [alt]="detail.nama"
            (error)="onImgError($event, detail.nama)"
          />
          <button class="au-btn-pdf au-btn-pdf--photo" (click)="downloadAuthorPdf()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17.5v-5h1.25c.69 0 1.25.56 1.25 1.25v2.5c0 .69-.56 1.25-1.25 1.25H8.5zm1.25-4h-.25v3h.25c.14 0 .25-.11.25-.25v-2.5c0-.14-.11-.25-.25-.25zm2.25 4v-5H13v.5h-1v1.5h.75v.5H12v1.5h1v.5h-1.75v.5zm3-2.5h-.75v2.5h-1v-5H15c.69 0 1.25.56 1.25 1.25v1.25c0 .69-.56 1.25-1.25 1zm0-1.5c.14 0 .25.11.25.25v1.25c0 .14-.11.25-.25.25h-.75v-1.75h.75z"/></svg>
            PDF
          </button>
        </div>
        <div class="au-modal__meta">
          <h2 class="au-modal__name">{{ detail.nama }}</h2>
          <div class="au-modal__affil">
            {{ detail.pt_singkatan }}
            <span *ngIf="detail.dept_nama"> · {{ detail.dept_nama }}<span *ngIf="detail.dept_jenjang"> ({{ detail.dept_jenjang }})</span></span>
          </div>
          <a class="au-modal__sinta-link" [href]="detail.url_profil" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            Lihat Profil di SINTA
          </a>
          <div class="au-card__tags" *ngIf="detail.bidang_keilmuan?.length" style="margin-top:8px">
            <span class="au-tag" *ngFor="let b of detail.bidang_keilmuan">{{ b }}</span>
          </div>
        </div>
      </div>

      <!-- ── Score Cards ── -->
      <div class="au-modal__scores">
        <div class="au-mscore">
          <div class="au-mscore__val">{{ detail.sinta_score_overall | number }}</div>
          <div class="au-mscore__lbl">Skor SINTA Overall</div>
        </div>
        <div class="au-mscore au-mscore--secondary">
          <div class="au-mscore__val">{{ detail.sinta_score_3year | number }}</div>
          <div class="au-mscore__lbl">Skor SINTA 3 Tahun</div>
        </div>
        <div class="au-mscore au-mscore--tertiary">
          <div class="au-mscore__val">{{ detail.affil_score | number }}</div>
          <div class="au-mscore__lbl">Skor Afiliasi</div>
        </div>
        <div class="au-mscore au-mscore--quaternary">
          <div class="au-mscore__val">{{ detail.affil_score_3year | number }}</div>
          <div class="au-mscore__lbl">Afiliasi 3 Tahun</div>
        </div>
      </div>

      <!-- ── Stats 3 Kolom ── -->
      <div class="au-modal__section">
        <table class="au-stats-table au-stats-3col">
          <thead>
            <tr>
              <th class="au-th--metric">Metrik</th>
              <th class="au-th--scopus">Scopus</th>
              <th class="au-th--gs">Google Scholar</th>
              <th class="au-th--wos">Web of Science</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Artikel</td><td>{{ detail.scopus_artikel }}</td><td>{{ detail.gscholar_artikel }}</td><td>{{ detail.wos_artikel }}</td></tr>
            <tr><td>Sitasi</td><td>{{ detail.scopus_sitasi | number }}</td><td>{{ detail.gscholar_sitasi | number }}</td><td>{{ detail.wos_sitasi | number }}</td></tr>
            <tr><td>Cited Doc</td><td>{{ detail.scopus_cited_doc }}</td><td>{{ detail.gscholar_cited_doc }}</td><td>{{ detail.wos_cited_doc }}</td></tr>
            <tr><td>H-Index</td><td>{{ detail.scopus_h_index }}</td><td>{{ detail.gscholar_h_index }}</td><td>{{ detail.wos_h_index }}</td></tr>
            <tr><td>i10-Index</td><td>{{ detail.scopus_i10_index }}</td><td>{{ detail.gscholar_i10_index }}</td><td>—</td></tr>
            <tr><td>G-Index</td><td>{{ detail.scopus_g_index }}</td><td>{{ detail.gscholar_g_index }}</td><td>—</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ── Distribusi Kuartil Scopus ── -->
      <div class="au-modal__section" *ngIf="hasQuartileData(detail)">
        <h3 class="au-modal__section-title">Distribusi Kuartil Scopus</h3>
        <div class="au-quartile-bar">
          <div class="au-q au-q--q1" [style.flex]="detail.scopus_q1" *ngIf="detail.scopus_q1 > 0"
               [title]="'Q1: ' + detail.scopus_q1">
            <span class="au-q__lbl">Q1</span><span class="au-q__val">{{ detail.scopus_q1 }}</span>
          </div>
          <div class="au-q au-q--q2" [style.flex]="detail.scopus_q2" *ngIf="detail.scopus_q2 > 0"
               [title]="'Q2: ' + detail.scopus_q2">
            <span class="au-q__lbl">Q2</span><span class="au-q__val">{{ detail.scopus_q2 }}</span>
          </div>
          <div class="au-q au-q--q3" [style.flex]="detail.scopus_q3" *ngIf="detail.scopus_q3 > 0"
               [title]="'Q3: ' + detail.scopus_q3">
            <span class="au-q__lbl">Q3</span><span class="au-q__val">{{ detail.scopus_q3 }}</span>
          </div>
          <div class="au-q au-q--q4" [style.flex]="detail.scopus_q4" *ngIf="detail.scopus_q4 > 0"
               [title]="'Q4: ' + detail.scopus_q4">
            <span class="au-q__lbl">Q4</span><span class="au-q__val">{{ detail.scopus_q4 }}</span>
          </div>
          <div class="au-q au-q--noq" [style.flex]="detail.scopus_noq" *ngIf="detail.scopus_noq > 0"
               [title]="'No-Q: ' + detail.scopus_noq">
            <span class="au-q__lbl">No-Q</span><span class="au-q__val">{{ detail.scopus_noq }}</span>
          </div>
        </div>
        <div class="au-quartile-legend">
          <span class="au-ql au-ql--q1">Q1 Hijau = publikasi berkualitas tertinggi</span>
          <span class="au-ql au-ql--q2">Q2</span>
          <span class="au-ql au-ql--q3">Q3</span>
          <span class="au-ql au-ql--q4">Q4</span>
          <span class="au-ql au-ql--noq">Tidak Terklasifikasi</span>
        </div>
      </div>

      <!-- ── Tren Publikasi ── -->
      <div class="au-modal__section" *ngIf="detail.trend?.length">
        <h3 class="au-modal__section-title">Tren Publikasi per Tahun</h3>
        <div class="au-trend-panels">

          <!-- Scopus -->
          <div class="au-trend-panel">
            <div class="au-trend-panel__title">Scopus</div>
            <ng-container *ngIf="getTrend(detail.trend, 'scopus').length; else emptyTrend">
              <div class="au-trend-bars">
                <div class="au-tbar-row" *ngFor="let t of getTrend(detail.trend, 'scopus')">
                  <span class="au-tbar-yr">{{ t.tahun }}</span>
                  <div class="au-tbar-wrap">
                    <div class="au-tbar au-tbar--scopus"
                         [style.width.%]="getTrendPct(detail.trend, 'scopus', t.jumlah)"
                         [title]="t.jumlah + ' artikel'">
                    </div>
                  </div>
                  <span class="au-tbar-val">{{ t.jumlah }}</span>
                </div>
              </div>
            </ng-container>
            <ng-template #emptyTrend><span class="au-trend-empty">–</span></ng-template>
          </div>

          <!-- Penelitian -->
          <div class="au-trend-panel">
            <div class="au-trend-panel__title">Penelitian</div>
            <ng-container *ngIf="getTrend(detail.trend, 'research').length; else emptyTrend2">
              <div class="au-trend-bars">
                <div class="au-tbar-row" *ngFor="let t of getTrend(detail.trend, 'research')">
                  <span class="au-tbar-yr">{{ t.tahun }}</span>
                  <div class="au-tbar-wrap">
                    <div class="au-tbar au-tbar--research"
                         [style.width.%]="getTrendPct(detail.trend, 'research', t.jumlah)"
                         [title]="t.jumlah + ' penelitian'">
                    </div>
                  </div>
                  <span class="au-tbar-val">{{ t.jumlah }}</span>
                </div>
              </div>
            </ng-container>
            <ng-template #emptyTrend2><span class="au-trend-empty">–</span></ng-template>
          </div>

          <!-- Pengabdian -->
          <div class="au-trend-panel">
            <div class="au-trend-panel__title">Pengabdian</div>
            <ng-container *ngIf="getTrend(detail.trend, 'service').length; else emptyTrend3">
              <div class="au-trend-bars">
                <div class="au-tbar-row" *ngFor="let t of getTrend(detail.trend, 'service')">
                  <span class="au-tbar-yr">{{ t.tahun }}</span>
                  <div class="au-tbar-wrap">
                    <div class="au-tbar au-tbar--service"
                         [style.width.%]="getTrendPct(detail.trend, 'service', t.jumlah)"
                         [title]="t.jumlah + ' pengabdian'">
                    </div>
                  </div>
                  <span class="au-tbar-val">{{ t.jumlah }}</span>
                </div>
              </div>
            </ng-container>
            <ng-template #emptyTrend3><span class="au-trend-empty">–</span></ng-template>
          </div>

          <!-- GScholar Publikasi -->
          <div class="au-trend-panel" *ngIf="getTrend(detail.trend, 'gscholar_pub').length">
            <div class="au-trend-panel__title au-trend-panel__title--gs">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style="margin-right:4px;vertical-align:middle"><path d="M12 3L1 9l4 2.18V17h2v-4.82L9 13.4V17c0 1.1 1.34 2 3 2s3-.9 3-2v-3.6l3-1.22V17h2v-5.82L23 9 12 3zm6.93 6L12 12.72 5.07 9 12 5.28 18.93 9z"/></svg>
              GScholar Publikasi
            </div>
            <div class="au-trend-bars">
              <div class="au-tbar-row" *ngFor="let t of getTrend(detail.trend, 'gscholar_pub')">
                <span class="au-tbar-yr">{{ t.tahun }}</span>
                <div class="au-tbar-wrap">
                  <div class="au-tbar au-tbar--gscholar"
                       [style.width.%]="getTrendPct(detail.trend, 'gscholar_pub', t.jumlah)"
                       [title]="t.jumlah + ' publikasi'">
                  </div>
                </div>
                <span class="au-tbar-val">{{ t.jumlah }}</span>
              </div>
            </div>
          </div>

          <!-- GScholar Sitasi -->
          <div class="au-trend-panel" *ngIf="getTrend(detail.trend, 'gscholar_cite').length">
            <div class="au-trend-panel__title au-trend-panel__title--gs">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style="margin-right:4px;vertical-align:middle"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              GScholar Sitasi
            </div>
            <div class="au-trend-bars">
              <div class="au-tbar-row" *ngFor="let t of getTrend(detail.trend, 'gscholar_cite')">
                <span class="au-tbar-yr">{{ t.tahun }}</span>
                <div class="au-tbar-wrap">
                  <div class="au-tbar au-tbar--gscholar-cite"
                       [style.width.%]="getTrendPct(detail.trend, 'gscholar_cite', t.jumlah)"
                       [title]="t.jumlah + ' sitasi'">
                  </div>
                </div>
                <span class="au-tbar-val">{{ t.jumlah }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Scopus Artikel List ── -->
      <div class="au-scopus-section" *ngIf="detail.scopus_artikel > 0">
        <div class="au-scopus-header">
          <div class="au-scopus-title">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17h8v2H8v-2zm0-4h8v2H8v-2zm0-4h5v2H8V9z"/></svg>
            Daftar Artikel Scopus
            <span class="au-scopus-count" *ngIf="scopusTotal > 0">({{ scopusTotal }} artikel)</span>
          </div>
          <div class="au-scopus-filter-row">
            <select class="au-scopus-select" [(ngModel)]="scopusFilterQ" (change)="loadScopusArtikels(selectedAuthor!.id, true)">
              <option value="">Semua Kuartil</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
            <select class="au-scopus-select" [(ngModel)]="scopusOrdering" (change)="loadScopusArtikels(selectedAuthor!.id, true)">
              <option value="-sitasi">Sitasi ↓</option>
              <option value="sitasi">Sitasi ↑</option>
              <option value="-tahun">Tahun ↓</option>
              <option value="tahun">Tahun ↑</option>
            </select>
          </div>
        </div>

        <div class="au-scopus-loading" *ngIf="scopusLoading">
          <div class="au-spinner-sm"></div> Memuat…
        </div>

        <div *ngIf="!scopusLoading && scopusArtikels.length === 0 && scopusLoaded" class="au-scopus-empty">
          Belum ada data artikel Scopus.
        </div>

        <div class="au-scopus-list" *ngIf="!scopusLoading && scopusArtikels.length > 0">
          <div class="au-scopus-item" *ngFor="let a of scopusArtikels">
            <div class="au-scopus-item__top">
              <span class="au-scopus-q au-scopus-q--{{ a.kuartil?.toLowerCase() || 'noq' }}">
                {{ a.kuartil || 'NoQ' }}
              </span>
              <span class="au-scopus-year">{{ a.tahun }}</span>
              <span class="au-scopus-cited" *ngIf="a.sitasi > 0">
                <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2z"/></svg>
                {{ a.sitasi }}
              </span>
              <span class="au-scopus-order" *ngIf="a.urutan_penulis">
                Penulis ke-{{ a.urutan_penulis }}/{{ a.total_penulis }}
              </span>
            </div>
            <div class="au-scopus-item__title">
              <a *ngIf="a.scopus_url" [href]="a.scopus_url" target="_blank" rel="noopener">{{ a.judul }}</a>
              <span *ngIf="!a.scopus_url">{{ a.judul }}</span>
            </div>
            <div class="au-scopus-item__journal" *ngIf="a.jurnal_nama">
              <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm-3-4H7V6h7v2z"/></svg>
              <a *ngIf="a.jurnal_url" [href]="a.jurnal_url" target="_blank" rel="noopener">{{ a.jurnal_nama }}</a>
              <span *ngIf="!a.jurnal_url">{{ a.jurnal_nama }}</span>
            </div>
          </div>
        </div>

        <!-- Pagination artikel -->
        <div class="au-scopus-pagination" *ngIf="scopusTotal > scopusPageSize">
          <button class="au-scopus-page-btn" [disabled]="scopusPage === 1"
                  (click)="loadScopusArtikels(selectedAuthor!.id, false, scopusPage - 1)">‹</button>
          <span class="au-scopus-page-info">{{ scopusPage }} / {{ scopusTotalPages() }}</span>
          <button class="au-scopus-page-btn" [disabled]="scopusPage >= scopusTotalPages()"
                  (click)="loadScopusArtikels(selectedAuthor!.id, false, scopusPage + 1)">›</button>
        </div>
      </div>

      <!-- ── Footer ── -->
      <div class="au-modal__footer" *ngIf="detail.scraped_at">
        <span class="au-modal__scraped">Data diperbarui: {{ detail.scraped_at | date:'d MMM y, HH:mm' }}</span>
      </div>

    </ng-container>
  </div>
</div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════
       Variabel & Reset
    ═══════════════════════════════════════════════════ */
    :host {
      --au-accent:       #0891b2;
      --au-accent-dark:  #0e7490;
      --au-accent-light: #e0f7fa;
      --au-text:         #1e293b;
      --au-muted:        #64748b;
      --au-border:       #e2e8f0;
      --au-bg:           #f8fafc;
      --au-card-bg:      #ffffff;
      --au-radius:       12px;
      --au-shadow:       0 2px 10px rgba(0,0,0,.07);
      --au-shadow-hover: 0 8px 24px rgba(8,145,178,.15);
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* ── Wrapper ── */
    .au-wrap {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.25rem 1.25rem 2rem;
    }

    /* ── Back ── */
    .au-back {
      display: inline-flex;
      align-items: center;
      font-size: .83rem;
      color: #64748b;
      cursor: pointer;
      margin-bottom: 1rem;
      padding: .3rem .7rem;
      border-radius: 6px;
      transition: background .15s;
    }
    .au-back:hover { background: #f1f5f9; color: #1e293b; }

    /* ── Hero ── */
    .au-hero {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border-radius: var(--au-radius);
      padding: 1.1rem 1.4rem;
      margin-bottom: 1.5rem;
    }
    .au-hero__icon {
      flex-shrink: 0;
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .au-hero__badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: .7;
      margin-bottom: 6px;
    }
    .au-hero__title {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    .au-hero__desc {
      font-size: 14px;
      opacity: .85;
      line-height: 1.6;
      margin: 0;
    }
    .au-hero__desc strong { opacity: 1; }

    /* ── Stats Bar ── */
    .au-statsbar {
      display: flex;
      gap: 12px;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .au-stat {
      flex: 1 1 140px;
      background: var(--au-card-bg);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius);
      padding: 16px 18px;
      text-align: center;
      box-shadow: var(--au-shadow);
    }
    .au-stat__val {
      font-size: 22px;
      font-weight: 800;
      color: var(--au-accent);
      line-height: 1.1;
    }
    .au-stat__lbl {
      font-size: 11px;
      color: var(--au-muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    /* ── Toolbar ── */
    .au-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 1.25rem;
      background: var(--au-card-bg);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius);
      padding: .75rem 1rem;
      box-shadow: var(--au-shadow);
    }
    .au-search-wrap {
      position: relative;
      width: 100%;
    }
    .au-filter-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr auto;
      gap: 10px;
      width: 100%;
    }
    .au-filter-row .au-select,
    .au-filter-row .au-select--sm {
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    .au-filter-row .au-reset-btn {
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .au-filter-row {
        grid-template-columns: 1fr;
      }
    }
    .au-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--au-muted);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }
    .au-search {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 32px 8px 34px;
      border: 1px solid var(--au-border);
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color .18s;
      background: var(--au-bg);
    }
    .au-search:focus { border-color: var(--au-accent); background: #fff; }
    .au-search-clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--au-muted);
      font-size: 14px;
      padding: 2px 4px;
      line-height: 1;
    }
    .au-select {
      padding: 8px 10px;
      border: 1px solid var(--au-border);
      border-radius: 8px;
      font-size: 13px;
      background: var(--au-bg);
      color: var(--au-text);
      cursor: pointer;
      outline: none;
      transition: border-color .18s;
    }
    .au-select:focus { border-color: var(--au-accent); }
    .au-select--sm { flex-shrink: 0; }
    .au-reset-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 14px;
      border: 1px solid var(--au-border);
      border-radius: 8px;
      background: var(--au-bg);
      color: var(--au-muted);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: background .18s, color .18s;
    }
    .au-reset-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* ── Loading & Empty ── */
    .au-loading, .au-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 20px;
      color: var(--au-muted);
      font-size: 15px;
    }
    .au-spinner {
      width: 36px;
      height: 36px;
      border: 4px solid var(--au-accent-light);
      border-top-color: var(--au-accent);
      border-radius: 50%;
      animation: au-spin .7s linear infinite;
    }
    @keyframes au-spin { to { transform: rotate(360deg); } }

    /* ── View Bar ── */
    .au-viewbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      min-height: 34px;
    }
    .au-count {
      font-size: 13px;
      color: var(--au-muted);
      font-weight: 500;
    }
    .au-view-toggle {
      display: flex;
      gap: 3px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 3px;
    }
    .au-view-btn {
      display: flex;
      align-items: center;
      gap: .3rem;
      padding: .28rem .6rem;
      border: none;
      border-radius: 5px;
      background: transparent;
      color: #64748b;
      font-size: .77rem;
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .au-view-btn:hover { background: #e2e8f0; color: #334155; }
    .au-view-btn.active { background: #fff; color: #1e40af; box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 600; }

    /* ── Table ── */
    .au-table-wrap {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .au-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .84rem;
      white-space: nowrap;
    }
    .au-th {
      padding: .6rem .85rem;
      background: #f8fafc;
      color: #475569;
      font-size: .71rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      text-align: left;
      border-bottom: 1.5px solid #e2e8f0;
      user-select: none;
    }
    .au-th--no { width: 40px; text-align: center; color: #94a3b8; }
    .au-th--num { text-align: right; }
    .au-th--sort { cursor: pointer; transition: background .15s, color .15s; }
    .au-th--sort:hover { background: #eff6ff; color: #1e40af; }
    .au-sort-icon { font-size: .74rem; color: #94a3b8; margin-left: .2rem; display: inline-block; width: .8em; }
    .au-tr {
      cursor: pointer;
      transition: background .12s;
      border-bottom: 1px solid #f1f5f9;
    }
    .au-tr:last-child { border-bottom: none; }
    .au-tr:hover { background: #f0f7ff; }
    .au-tr:hover .au-table-link { color: #1e40af; }
    .au-td {
      padding: .55rem .85rem;
      color: #334155;
      vertical-align: middle;
    }
    .au-td--no { text-align: center; color: #94a3b8; font-size: .78rem; width: 40px; }
    .au-td--nama { min-width: 180px; font-weight: 600; color: #1e293b; white-space: normal; max-width: 240px; }
    .au-td--pt { font-size: .78rem; font-weight: 600; color: #64748b; min-width: 70px; }
    .au-td--dept { font-size: .78rem; color: #64748b; min-width: 140px; white-space: normal; max-width: 200px; }
    .au-td--num { text-align: right; font-variant-numeric: tabular-nums; }
    .au-td--action { width: 72px; text-align: right; }
    .au-td-author { display: flex; align-items: center; gap: .5rem; }
    .au-td-foto { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .au-td-jenjang { color: #94a3b8; }
    .au-td-muted { color: #cbd5e1; }
    .au-table-link { font-size: .75rem; color: #3b82f6; }

    /* ── Grid ── */
    .au-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    @media (max-width: 640px) {
      .au-grid { grid-template-columns: 1fr; }
    }
    @media (min-width: 641px) and (max-width: 1024px) {
      .au-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1025px) {
      .au-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (min-width: 1280px) {
      .au-grid { grid-template-columns: repeat(4, 1fr); }
    }

    /* ── Card ── */
    .au-card {
      background: var(--au-card-bg);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius);
      padding: 18px 16px 14px;
      cursor: pointer;
      transition: transform .18s, box-shadow .18s, border-color .18s;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: var(--au-shadow);
      position: relative;
    }
    .au-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--au-shadow-hover);
      border-color: var(--au-accent);
    }
    .au-card--active {
      border-color: var(--au-accent);
      box-shadow: 0 0 0 3px rgba(8,145,178,.15);
    }

    /* Foto */
    .au-card__photo-wrap {
      width: 72px;
      height: 72px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .au-card__photo {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--au-accent-light);
    }

    /* Body */
    .au-card__body {
      width: 100%;
    }
    .au-card__name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--au-text);
      line-height: 1.3;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .au-card__affil {
      font-size: 11.5px;
      color: var(--au-muted);
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .au-card__pt {
      font-weight: 600;
      color: var(--au-accent-dark);
    }

    /* Scores */
    .au-card__scores {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 10px;
    }
    .au-score-main {
      background: var(--au-accent);
      color: white;
      border-radius: 8px;
      padding: 8px 14px;
      min-width: 70px;
    }
    .au-score-main__val {
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
    }
    .au-score-main__lbl {
      font-size: 10px;
      opacity: .85;
      margin-top: 2px;
    }
    .au-score-sub {
      background: var(--au-accent-light);
      color: var(--au-accent-dark);
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 60px;
    }
    .au-score-sub__val {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
    }
    .au-score-sub__lbl {
      font-size: 10px;
      margin-top: 2px;
    }

    /* Metrics row */
    .au-card__metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .au-metric {
      background: var(--au-bg);
      border-radius: 6px;
      padding: 5px 4px;
    }
    .au-metric__val {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: var(--au-text);
      line-height: 1;
    }
    .au-metric__lbl {
      display: block;
      font-size: 9.5px;
      color: var(--au-muted);
      margin-top: 2px;
    }

    /* Tags */
    .au-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
    }
    .au-tag {
      font-size: 10.5px;
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--au-accent-light);
      color: var(--au-accent-dark);
      border: 1px solid rgba(8,145,178,.15);
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .au-tag--more {
      background: #f1f5f9;
      color: var(--au-muted);
      border-color: var(--au-border);
    }

    /* ── Pagination ── */
    .au-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 16px 0;
    }
    .au-pagination--top {
      padding: 8px 0 4px;
    }

    /* ── Export Bar ── */
    .au-export-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0 8px;
      flex-wrap: wrap;
    }
    .au-export-label {
      font-size: 12px;
      color: var(--au-muted);
      font-weight: 600;
    }
    .au-export-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 13px;
      border-radius: 6px;
      border: 1px solid;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .au-export-btn:disabled { opacity: .55; cursor: not-allowed; }
    .au-export-btn--csv {
      border-color: #059669;
      color: #059669;
      background: #f0fdf4;
    }
    .au-export-btn--csv:hover:not(:disabled) { background: #059669; color: #fff; }
    .au-export-btn--xlsx {
      border-color: #2563eb;
      color: #2563eb;
      background: #eff6ff;
    }
    .au-export-btn--xlsx:hover:not(:disabled) { background: #2563eb; color: #fff; }
    .au-export-hint {
      font-size: 11px;
      color: var(--au-muted);
    }
    .au-pg-btn {
      padding: 7px 16px;
      border: 1px solid var(--au-border);
      border-radius: 8px;
      background: var(--au-card-bg);
      color: var(--au-accent);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .18s;
    }
    .au-pg-btn:disabled { color: var(--au-border); cursor: default; }
    .au-pg-btn:not(:disabled):hover { background: var(--au-accent-light); }
    .au-pg-pages { display: flex; gap: 4px; }
    .au-pg-num {
      width: 34px;
      height: 34px;
      border: 1px solid var(--au-border);
      border-radius: 6px;
      background: var(--au-card-bg);
      color: var(--au-text);
      font-size: 13px;
      cursor: pointer;
      transition: background .18s, color .18s;
    }
    .au-pg-num--active {
      background: var(--au-accent);
      color: white;
      border-color: var(--au-accent);
    }
    .au-pg-num--ellipsis { cursor: default; border-color: transparent; background: transparent; }

    /* ════════════════════════════════════
       MODAL / OVERLAY
    ════════════════════════════════════ */
    .au-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,.55);
      backdrop-filter: blur(3px);
      z-index: 1000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px;
      overflow-y: auto;
    }
    .au-modal {
      position: relative;
      background: var(--au-card-bg);
      border-radius: 16px;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      padding: 28px 28px 24px;
      overflow: hidden;
    }
    .au-modal__close {
      position: absolute;
      top: 14px;
      right: 16px;
      background: #f1f5f9;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      font-size: 16px;
      cursor: pointer;
      line-height: 32px;
      text-align: center;
      color: var(--au-muted);
      transition: background .18s;
    }
    .au-modal__close:hover { background: #fee2e2; color: #dc2626; }

    .au-modal__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      min-height: 180px;
      color: var(--au-muted);
    }

    /* Header modal */
    .au-modal__header {
      display: flex;
      gap: 18px;
      margin-bottom: 22px;
      align-items: flex-start;
    }
    .au-modal__photo-wrap { flex-shrink: 0; }
    .au-modal__photo {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--au-accent-light);
    }
    .au-modal__meta { flex: 1; min-width: 0; }
    .au-modal__name {
      font-size: 19px;
      font-weight: 800;
      color: var(--au-text);
      margin: 0 0 4px;
      line-height: 1.2;
      word-break: break-word;
    }
    .au-modal__affil {
      font-size: 13px;
      color: var(--au-muted);
      margin-bottom: 8px;
    }
    .au-modal__sinta-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: var(--au-accent);
      text-decoration: none;
      font-weight: 600;
      transition: color .18s;
    }
    .au-modal__sinta-link:hover { color: var(--au-accent-dark); text-decoration: underline; }

    /* Score cards */
    .au-modal__scores {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    @media (max-width: 500px) {
      .au-modal__scores { grid-template-columns: repeat(2, 1fr); }
      .au-modal__header { flex-direction: column; align-items: center; text-align: center; }
    }
    .au-mscore {
      border-radius: 10px;
      padding: 12px 10px;
      text-align: center;
      background: var(--au-accent);
      color: white;
    }
    .au-mscore--secondary { background: #0e7490; }
    .au-mscore--tertiary  { background: #7c3aed; }
    .au-mscore--quaternary { background: #059669; }
    .au-mscore__val {
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
    }
    .au-mscore__lbl {
      font-size: 10px;
      opacity: .85;
      margin-top: 4px;
      line-height: 1.3;
    }

    /* Section */
    .au-modal__section {
      margin-bottom: 22px;
      border-top: 1px solid var(--au-border);
      padding-top: 18px;
    }
    .au-modal__section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--au-text);
      margin: 0 0 12px;
    }

    /* Tabs */
    .au-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--au-border);
      padding-bottom: 0;
    }
    .au-tab {
      padding: 7px 16px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      background: none;
      color: var(--au-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color .18s, border-color .18s;
    }
    .au-tab--active {
      color: var(--au-accent);
      border-bottom-color: var(--au-accent);
    }
    .au-tab:hover:not(.au-tab--active) { color: var(--au-text); }

    /* Stats table */
    .au-stats-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .au-stats-table tr:nth-child(even) { background: var(--au-bg); }
    .au-stats-table td {
      padding: 7px 12px;
      border-bottom: 1px solid var(--au-border);
    }
    .au-stats-table td:first-child {
      color: var(--au-muted);
      font-weight: 500;
      width: 55%;
    }
    .au-stats-table td:last-child {
      font-weight: 700;
      color: var(--au-text);
      text-align: right;
    }

    /* Quartile bar */
    .au-quartile-bar {
      display: flex;
      height: 36px;
      border-radius: 6px;
      overflow: hidden;
      gap: 2px;
      margin-bottom: 10px;
    }
    .au-q {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 28px;
      transition: flex .3s;
    }
    .au-q--q1  { background: #059669; }
    .au-q--q2  { background: #2563eb; }
    .au-q--q3  { background: #d97706; }
    .au-q--q4  { background: #dc2626; }
    .au-q--noq { background: #94a3b8; }
    .au-q__lbl { line-height: 1; }
    .au-q__val { font-size: 9px; opacity: .85; }
    .au-quartile-legend {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 10px;
      color: var(--au-muted);
    }
    .au-ql { display: flex; align-items: center; gap: 4px; }
    .au-ql::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }
    .au-ql--q1::before  { background: #059669; }
    .au-ql--q2::before  { background: #2563eb; }
    .au-ql--q3::before  { background: #d97706; }
    .au-ql--q4::before  { background: #dc2626; }
    .au-ql--noq::before { background: #94a3b8; }

    /* Trend panels */
    .au-trend-panels {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 520px) {
      .au-trend-panels { grid-template-columns: 1fr; }
    }
    .au-trend-panel {
      background: var(--au-bg);
      border-radius: 8px;
      padding: 12px;
    }
    .au-trend-panel__title {
      font-size: 12px;
      font-weight: 700;
      color: var(--au-muted);
      text-transform: uppercase;
      letter-spacing: .5px;
      margin-bottom: 10px;
    }
    .au-trend-bars { display: flex; flex-direction: column; gap: 5px; }
    .au-tbar-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .au-tbar-yr {
      width: 30px;
      flex-shrink: 0;
      color: var(--au-muted);
      font-weight: 600;
    }
    .au-tbar-wrap {
      flex: 1;
      background: #e2e8f0;
      border-radius: 3px;
      height: 8px;
      overflow: hidden;
    }
    .au-tbar {
      height: 100%;
      border-radius: 3px;
      min-width: 4px;
      transition: width .3s;
    }
    .au-tbar--scopus        { background: #2563eb; }
    .au-tbar--research      { background: #059669; }
    .au-tbar--service       { background: #d97706; }
    .au-tbar--gscholar      { background: #7c3aed; }
    .au-tbar--gscholar-cite { background: #db2777; }
    .au-trend-panel__title--gs { color: #7c3aed; }

    /* ── Scopus Artikel Section ── */
    .au-scopus-section {
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
      margin-top: .5rem;
    }
    .au-scopus-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .5rem;
      margin-bottom: .75rem;
    }
    .au-scopus-title {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .82rem;
      font-weight: 700;
      color: #1e293b;
    }
    .au-scopus-count { font-size: .75rem; color: #64748b; font-weight: 400; }
    .au-scopus-filter-row { display: flex; gap: .4rem; }
    .au-scopus-select {
      padding: .3rem .55rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: .78rem;
      background: #fff;
      color: #334155;
    }
    .au-scopus-loading { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: #64748b; padding: .75rem 0; }
    .au-spinner-sm { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin .7s linear infinite; }
    .au-scopus-empty { font-size: .8rem; color: #94a3b8; padding: .75rem 0; }
    .au-scopus-list { display: flex; flex-direction: column; gap: .6rem; }
    .au-scopus-item {
      padding: .65rem .8rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      transition: border-color .15s;
    }
    .au-scopus-item:hover { border-color: #93c5fd; }
    .au-scopus-item__top {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-bottom: .35rem;
      flex-wrap: wrap;
    }
    .au-scopus-q {
      font-size: .68rem;
      font-weight: 700;
      padding: .1rem .4rem;
      border-radius: 4px;
    }
    .au-scopus-q--q1  { background: #dbeafe; color: #1d4ed8; }
    .au-scopus-q--q2  { background: #cffafe; color: #0e7490; }
    .au-scopus-q--q3  { background: #d1fae5; color: #065f46; }
    .au-scopus-q--q4  { background: #fef9c3; color: #854d0e; }
    .au-scopus-q--noq { background: #f1f5f9; color: #64748b; }
    .au-scopus-year { font-size: .75rem; font-weight: 600; color: #475569; }
    .au-scopus-cited {
      display: inline-flex;
      align-items: center;
      gap: .2rem;
      font-size: .72rem;
      color: #0891b2;
    }
    .au-scopus-order { font-size: .7rem; color: #94a3b8; margin-left: auto; }
    .au-scopus-item__title {
      font-size: .83rem;
      color: #1e293b;
      line-height: 1.4;
      margin-bottom: .25rem;
    }
    .au-scopus-item__title a { color: #1d4ed8; text-decoration: none; }
    .au-scopus-item__title a:hover { text-decoration: underline; }
    .au-scopus-item__journal {
      display: flex;
      align-items: center;
      gap: .3rem;
      font-size: .73rem;
      color: #64748b;
    }
    .au-scopus-item__journal a { color: #64748b; text-decoration: none; }
    .au-scopus-item__journal a:hover { text-decoration: underline; }
    .au-scopus-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      margin-top: .75rem;
    }
    .au-scopus-page-btn {
      padding: .25rem .6rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      font-size: .85rem;
      cursor: pointer;
    }
    .au-scopus-page-btn:disabled { opacity: .4; cursor: default; }
    .au-scopus-page-info { font-size: .78rem; color: #64748b; }
    .au-tbar-val {
      width: 20px;
      flex-shrink: 0;
      text-align: right;
      font-weight: 700;
      color: var(--au-text);
    }
    .au-trend-empty {
      font-size: 13px;
      color: var(--au-muted);
    }

    /* Modal footer */
    .au-modal__footer {
      border-top: 1px solid var(--au-border);
      padding-top: 12px;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .au-modal__scraped {
      font-size: 11px;
      color: #94a3b8;
      flex: 1;
    }
    .au-btn-pdf {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
      background: #1a237e; color: #fff; font-size: 12px; font-weight: 600;
      white-space: nowrap;
    }
    .au-btn-pdf:hover { background: #283593; }
    .au-btn-pdf--photo {
      display: flex; width: 100%; margin-top: 8px; justify-content: center;
      padding: 5px 0; font-size: 11px; border-radius: 6px;
    }
    .au-stats-3col { width: 100%; border-collapse: collapse; }
    .au-stats-3col th, .au-stats-3col td { padding: 6px 10px; border: 1px solid var(--au-border); font-size: 12px; }
    .au-stats-3col thead th { font-weight: 700; text-align: center; }
    .au-th--metric { background: var(--au-bg); color: var(--au-text); }
    .au-th--scopus { background: #e0f7fa; color: #0891b2; }
    .au-th--gs { background: #fce7f3; color: #be185d; }
    .au-th--wos { background: #eff6ff; color: #1d4ed8; }
    .au-stats-3col tbody td:first-child { font-weight: 600; color: var(--au-muted); background: var(--au-bg); }
    .au-stats-3col tbody td:not(:first-child) { text-align: right; font-weight: 700; }
  `]
})
export class SintaAuthorComponent implements OnInit, OnDestroy {

  // ── State ──────────────────────────────────────────────────────────────────
  stats:   AuthorStats | null = null;
  authors: AuthorList[]       = [];
  ptOptions: PtOption[]       = [];

  loading       = false;
  totalCount    = 0;
  currentPage   = 1;
  totalPages    = 1;
  pageSize      = 20;

  // Filter / sort
  searchQuery  = '';
  filterPt     = '';
  filterDept   = '';
  deptOptions: { id: number; kode_dept: string; nama: string; jenjang: string }[] = [];
  ordering     = '-sinta_score_overall';

  private searchTimer: any = null;
  private destroy$ = new Subject<void>();

  // Modal
  modalOpen     = false;
  detailLoading = false;
  detail: AuthorDetail | null = null;
  selectedAuthor: AuthorList | null = null;
  activeTab: 'scopus' | 'gscholar' | 'wos' = 'scopus';

  // View toggle + table sort
  viewMode: 'grid' | 'table' = 'grid';
  exporting = false;

  // Scopus artikel
  scopusArtikels:  ScopusArtikel[] = [];
  scopusTotal      = 0;
  scopusPage       = 1;
  scopusPageSize   = 10;
  scopusLoading    = false;
  scopusLoaded     = false;
  scopusFilterQ    = '';
  scopusOrdering   = '-sitasi';
  tableSortField = 'sinta_score_overall';
  tableSortDir: 'asc' | 'desc' = 'desc';

  constructor(private http: HttpClient) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadStats();
    this.loadPtOptions();
    this.loadAuthors();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimer) { clearTimeout(this.searchTimer); }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeModal(); }

  // ── Data Loading ───────────────────────────────────────────────────────────

  loadStats(): void {
    this.http.get<AuthorStats>(`${API}/sinta-author/stats/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: s => this.stats = s,
        error: err => console.error('Author stats error', err)
      });
  }

  loadAuthors(): void {
    this.loading = true;
    let params = new HttpParams()
      .set('page', String(this.currentPage))
      .set('page_size', String(this.pageSize))
      .set('ordering', this.ordering);

    if (this.searchQuery.trim()) {
      params = params.set('search', this.searchQuery.trim());
    }
    if (this.filterPt) {
      params = params.set('afiliasi__sinta_kode', this.filterPt);
    }
    if (this.filterDept) {
      params = params.set('departemen__kode_dept', this.filterDept);
    }

    this.http.get<PagedResponse>(`${API}/sinta-author/`, { params })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: res => {
          this.authors    = res.results;
          this.totalCount = res.count;
          this.totalPages = Math.ceil(res.count / this.pageSize);
        },
        error: err => console.error('Author list error', err)
      });
  }

  private loadPtOptions(): void {
    this.http.get<any[]>(`${API}/sinta-author/pt-options/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => { this.ptOptions = res; }
      });
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  onSearchChange(): void {
    if (this.searchTimer) { clearTimeout(this.searchTimer); }
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadAuthors();
    }, 400);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadAuthors();
  }

  onPtChange(): void {
    this.filterDept = '';
    this.deptOptions = [];
    if (this.filterPt) {
      this.http.get<{ count: number; results: any[] }>(
        `${API}/sinta-departemen/?afiliasi__sinta_kode=${this.filterPt}&ordering=nama&page_size=200`
      ).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            this.deptOptions = res.results.map(d => ({
              id: d.id,
              kode_dept: d.kode_dept,
              nama: d.nama,
              jenjang: d.jenjang || ''
            }));
          },
          error: err => console.error('Dept options error', err)
        });
    }
    this.onFilterChange();
  }

  onFilterChange(): void {
    if (this.ordering.startsWith('-')) {
      this.tableSortField = this.ordering.slice(1);
      this.tableSortDir = 'desc';
    } else {
      this.tableSortField = this.ordering;
      this.tableSortDir = 'asc';
    }
    this.currentPage = 1;
    this.loadAuthors();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadAuthors();
  }

  resetFilter(): void {
    this.searchQuery    = '';
    this.filterPt       = '';
    this.filterDept     = '';
    this.deptOptions    = [];
    this.ordering       = '-sinta_score_overall';
    this.tableSortField = 'sinta_score_overall';
    this.tableSortDir   = 'desc';
    this.pageSize       = 20;
    this.currentPage    = 1;
    this.loadAuthors();
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
    this.loadAuthors();
  }

  sortIcon(field: string): string {
    if (this.tableSortField !== field) return '↕';
    return this.tableSortDir === 'desc' ? '↓' : '↑';
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  private buildExportParams(): HttpParams {
    let params = new HttpParams()
      .set('page_size', '10000')
      .set('ordering', this.ordering);
    if (this.searchQuery.trim()) { params = params.set('search', this.searchQuery.trim()); }
    if (this.filterPt)           { params = params.set('afiliasi__sinta_kode', this.filterPt); }
    if (this.filterDept)         { params = params.set('departemen__kode_dept', this.filterDept); }
    return params;
  }

  private fetchAllForExport(callback: (rows: AuthorList[]) => void): void {
    this.exporting = true;
    this.http.get<PagedResponse>(`${API}/sinta-author/`, { params: this.buildExportParams() })
      .pipe(takeUntil(this.destroy$), finalize(() => this.exporting = false))
      .subscribe({
        next: res => callback(res.results),
        error: err => { console.error('Export error', err); this.exporting = false; }
      });
  }

  private toRows(data: AuthorList[]): any[][] {
    const header = ['#', 'Nama', 'PT', 'Departemen', 'Jenjang', 'Skor SINTA', 'Skor 3 Thn',
                    'Scopus Artikel', 'Scopus Sitasi', 'H-Index Scopus', 'H-Index GScholar'];
    const rows = data.map((a, i) => [
      i + 1, a.nama, a.pt_singkatan, a.dept_nama || '', a.dept_jenjang || '',
      a.sinta_score_overall, a.sinta_score_3year,
      a.scopus_artikel, a.scopus_sitasi, a.scopus_h_index, a.gscholar_h_index
    ]);
    return [header, ...rows];
  }

  exportCSV(): void {
    this.fetchAllForExport(data => {
      const rows = this.toRows(data);
      const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `author-sinta-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  exportXLSX(): void {
    this.fetchAllForExport(data => {
      const rows = this.toRows(data);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [4,30,12,25,8,12,10,12,12,10,10].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Author SINTA');
      XLSX.writeFile(wb, `author-sinta-${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  }

  goPage(page: number): void {
    if (page < 1 || page > this.totalPages) { return; }
    this.currentPage = page;
    this.loadAuthors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const cur   = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    if (cur > 3)            { pages.push(-1); }
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) {
      pages.push(p);
    }
    if (cur < total - 2)    { pages.push(-1); }
    pages.push(total);
    return pages;
  }

  // ── Modal / Detail ─────────────────────────────────────────────────────────

  openDetail(author: AuthorList): void {
    this.selectedAuthor  = author;
    this.detail          = null;
    this.activeTab       = 'scopus';
    this.modalOpen       = true;
    this.detailLoading   = true;
    this.scopusArtikels  = [];
    this.scopusTotal     = 0;
    this.scopusPage      = 1;
    this.scopusLoaded    = false;
    this.scopusFilterQ   = '';
    this.scopusOrdering  = '-sitasi';
    document.body.style.overflow = 'hidden';

    this.http.get<AuthorDetail>(`${API}/sinta-author/${author.id}/`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.detailLoading = false)
      )
      .subscribe({
        next:  d => {
          this.detail = d;
          if (d.scopus_artikel > 0) this.loadScopusArtikels(author.id, true);
        },
        error: err => {
          console.error('Author detail error', err);
          // Fallback: show list data as partial detail
          this.detail = author as unknown as AuthorDetail;
        }
      });
  }

  loadScopusArtikels(authorId: number, reset: boolean, page?: number): void {
    if (reset) this.scopusPage = 1;
    if (page) this.scopusPage = page;
    this.scopusLoading = true;
    let params = new HttpParams()
      .set('author', authorId.toString())
      .set('page', this.scopusPage.toString())
      .set('page_size', this.scopusPageSize.toString())
      .set('ordering', this.scopusOrdering);
    if (this.scopusFilterQ) params = params.set('kuartil', this.scopusFilterQ);

    this.http.get<ScopusArtikelResponse>(`${API}/sinta-scopus-artikel/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => { this.scopusLoading = false; this.scopusLoaded = true; }))
      .subscribe({
        next: r => { this.scopusArtikels = r.results; this.scopusTotal = r.count; },
        error: () => { this.scopusArtikels = []; }
      });
  }

  scopusTotalPages(): number {
    return Math.ceil(this.scopusTotal / this.scopusPageSize);
  }

  closeModal(): void {
    this.modalOpen      = false;
    this.selectedAuthor = null;
    this.detail         = null;
    document.body.style.overflow = '';
  }

  // ── Template Helpers ───────────────────────────────────────────────────────

  getInitialsAvatar(name: string): string {
    return initialsAvatar(name);
  }

  onImgError(event: Event, name: string): void {
    const img = event.target as HTMLImageElement;
    img.src = initialsAvatar(name);
    img.onerror = null;
  }

  hasQuartileData(d: AuthorDetail): boolean {
    return (d.scopus_q1 + d.scopus_q2 + d.scopus_q3 + d.scopus_q4 + d.scopus_noq) > 0;
  }

  async downloadAuthorPdf(): Promise<void> {
    const d = this.detail;
    if (!d) return;

    const { jsPDF } = await import('jspdf');
    const fmtNum = (n: any) => (n != null ? Number(n).toLocaleString('id') : '—');
    const fmtDate = (s: string) => s
      ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    // ── 1. Load foto → clip ke lingkaran via canvas ────────────────
    const rawFoto: string = d.foto_url
      ? await fetch(`${API}/proxy-image/?url=${encodeURIComponent(d.foto_url)}`)
          .then(r => r.json()).catch(() => '')
      : '';
    const fotoImg: string = rawFoto
      ? await new Promise<string>(res => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas'); c.width = c.height = 120;
            const ctx = c.getContext('2d')!;
            ctx.beginPath(); ctx.arc(60, 60, 60, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(img, 0, 0, 120, 120);
            res(c.toDataURL('image/png'));
          };
          img.onerror = () => res('');
          img.src = rawFoto;
        })
      : '';

    // ── 2. Tren chart (Chart.js → canvas → PNG) ───────────────────
    const CHART_W = 720, CHART_H = 200;
    const trenSeries = [
      { label: 'Scopus',          color: '#0891b2', jenis: 'scopus' },
      { label: 'Penelitian',      color: '#22c55e', jenis: 'research' },
      { label: 'Pengabdian',      color: '#f97316', jenis: 'service' },
      { label: 'GScholar Pub',    color: '#6366f1', jenis: 'gscholar_pub' },
      { label: 'GScholar Sitasi', color: '#a855f7', jenis: 'gscholar_cite' },
    ].filter(s => this.getTrend(d.trend || [], s.jenis).length > 0);
    const allYears = [...new Set((d.trend || []).map((t: TrendItem) => t.tahun))].sort();
    const trenImg = (() => {
      if (!trenSeries.length || !allYears.length) return '';
      const datasets = trenSeries.map(s => ({
        label: s.label,
        data: allYears.map(y => {
          const f = (d.trend || []).find((t: TrendItem) => t.jenis === s.jenis && t.tahun === y);
          return f ? f.jumlah : 0;
        }),
        backgroundColor: s.color + 'cc', borderColor: s.color, borderWidth: 1, borderRadius: 3,
      }));
      const c = document.createElement('canvas'); c.width = CHART_W; c.height = CHART_H;
      const ch = new Chart(c, {
        type: 'bar', data: { labels: allYears.map(String), datasets },
        options: {
          animation: false, responsive: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 12, padding: 6 } } },
          scales: {
            x: { ticks: { font: { size: 9 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: (v: any) => Number(v).toLocaleString('id') } }
          }
        }
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // ── 3. Kuartil bar (canvas → PNG) ─────────────────────────────
    const kuartilTotal = d.scopus_q1 + d.scopus_q2 + d.scopus_q3 + d.scopus_q4 + d.scopus_noq;
    const KQ_W = 720, KQ_H = 70;
    const kuartilImg = (() => {
      if (!kuartilTotal) return '';
      const qs = [
        { key: 'Q1', val: d.scopus_q1, c: '#22c55e' },
        { key: 'Q2', val: d.scopus_q2, c: '#84cc16' },
        { key: 'Q3', val: d.scopus_q3, c: '#eab308' },
        { key: 'Q4', val: d.scopus_q4, c: '#f97316' },
        { key: 'NoQ', val: d.scopus_noq, c: '#94a3b8' },
      ].filter(q => q.val > 0);
      const c = document.createElement('canvas'); c.width = KQ_W; c.height = KQ_H;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, KQ_W, KQ_H);
      let bx = 0;
      for (const q of qs) {
        const bw = Math.round(KQ_W * q.val / kuartilTotal);
        ctx.fillStyle = q.c; ctx.fillRect(bx, 0, bw, 44);
        if (bw > 28) {
          ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(q.key, bx + bw / 2, 22);
        }
        bx += bw;
      }
      let lx = 4; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const q of qs) {
        ctx.fillStyle = q.c; ctx.fillRect(lx, 50, 12, 12);
        ctx.fillStyle = '#374151'; ctx.font = '11px Arial';
        ctx.fillText(`${q.key}: ${q.val}`, lx + 16, 56);
        lx += ctx.measureText(`${q.key}: ${q.val}`).width + 30;
      }
      return c.toDataURL('image/png');
    })();

    // ── 4. Hitung skala autoscale 1-halaman A4 ────────────────────
    const MRG = 12, CW = 186;  // margin & content width (mm)
    const FOTO_D = 22;
    const H_HEADER   = 27;   // foto(22) + sep + gap
    const H_TAGLINE  = 8;
    const H_SCORES   = 24;   // 4 kartu + gap
    const H_STATSTBL = 48;   // judul(6) + header-row(5.5) + 6-rows(33) + gap(3.5)
    const H_KUARTIL  = kuartilImg ? (6 + CW * KQ_H   / KQ_W   + 3) : 0;
    const H_TREN     = trenImg    ? (6 + CW * CHART_H / CHART_W + 3) : 0;
    const N_ART      = this.scopusArtikels.length;
    const H_ARTIKEL  = N_ART > 0 ? (6 + N_ART * 16 + 2) : 0;
    const H_SOURCES  = 10;
    const totalH = MRG + H_HEADER + H_TAGLINE + H_SCORES + H_STATSTBL
                 + H_KUARTIL + H_TREN + H_ARTIKEL + H_SOURCES + MRG;
    const scale  = Math.min(1, 297 / totalH);
    const s      = (v: number) => +(v * scale).toFixed(3);

    // ── 5. Setup dokumen & helper ─────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // set font size (pt), return approx line-height mm
    const font = (pt: number, style: 'bold'|'normal'|'italic' = 'normal'): number => {
      doc.setFontSize(pt * scale);
      doc.setFont('helvetica', style);
      return pt * 0.3528 * scale * 1.15;
    };
    const hexRgb = (h: string): [number, number, number] =>
      [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb  = (h: string) => doc.setTextColor(...hexRgb(h));
    const fill = (h: string) => doc.setFillColor(...hexRgb(h));
    const strk = (h: string) => doc.setDrawColor(...hexRgb(h));

    let y = s(MRG);

    // helper: section title dengan bar kiri
    const sectionTitle = (title: string) => {
      fill('#0891b2'); doc.rect(s(MRG), y, s(2.5), s(5), 'F');
      const lh = font(9.5, 'bold'); rgb('#0c4a6e');
      doc.text(title, s(MRG + 4), y, { baseline: 'top' });
      y += lh + s(2);
    };

    // ── HEADER ───────────────────────────────────────────────────
    const fotoR  = s(FOTO_D / 2);
    const fotoCx = s(MRG + FOTO_D / 2);
    const fotoCy = y + fotoR;
    if (fotoImg) {
      doc.addImage(fotoImg, 'PNG', s(MRG), y, s(FOTO_D), s(FOTO_D));
      strk('#0891b2'); doc.setLineWidth(s(0.4));
      doc.circle(fotoCx, fotoCy, fotoR, 'S');
    } else {
      fill('#0891b2'); doc.circle(fotoCx, fotoCy, fotoR, 'F');
      const initials = (d.nama || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
      font(12, 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(initials, fotoCx, fotoCy, { align: 'center', baseline: 'middle' });
    }

    const txtX = s(MRG + FOTO_D + 3);
    const txtW = s(CW - FOTO_D - 3);
    let ty = y;

    let lh = font(13, 'bold'); rgb('#0c4a6e');
    doc.text(doc.splitTextToSize(d.nama || '', txtW)[0], txtX, ty, { baseline: 'top' });
    ty += lh;

    const affilStr = [d.pt_singkatan, d.dept_nama
      ? `${d.dept_nama}${d.dept_jenjang ? ` (${d.dept_jenjang})` : ''}`
      : ''].filter(Boolean).join('  ·  ');
    if (affilStr) {
      lh = font(8.5, 'normal'); rgb('#475569');
      doc.text(affilStr, txtX, ty, { baseline: 'top', maxWidth: txtW }); ty += lh;
    }
    if (d.url_profil) {
      lh = font(7.5, 'normal'); rgb('#0891b2');
      doc.text(d.url_profil, txtX, ty, { baseline: 'top', maxWidth: txtW }); ty += lh;
    }
    if (d.bidang_keilmuan?.length) {
      font(7, 'bold'); fill('#e0f7fa'); rgb('#0e7490');
      let tx = txtX;
      for (const tag of (d.bidang_keilmuan as string[]).slice(0, 6)) {
        const tw = doc.getTextWidth(tag) + s(4);
        if (tx + tw > s(MRG + CW)) break;
        doc.roundedRect(tx, ty, tw, s(4.5), s(1.5), s(1.5), 'F');
        doc.text(tag, tx + s(2), ty + s(0.5), { baseline: 'top' });
        tx += tw + s(2);
      }
      ty += s(6);
    }

    y = Math.max(ty, y + s(FOTO_D)) + s(2);
    strk('#0891b2'); doc.setLineWidth(s(0.6));
    doc.line(s(MRG), y, s(MRG + CW), y); y += s(2);

    // ── TAGLINE ──────────────────────────────────────────────────
    lh = font(7, 'italic'); rgb('#94a3b8');
    doc.text(
      `Profil Author SINTA — Digenerate: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`,
      s(MRG + CW), y, { align: 'right', baseline: 'top' }
    );
    y += lh + s(3);

    // ── SCORE CARDS ──────────────────────────────────────────────
    const scoreData = [
      { val: fmtNum(d.sinta_score_overall), lbl: 'Skor SINTA Overall', bg: '#0891b2' },
      { val: fmtNum(d.sinta_score_3year),   lbl: 'Skor SINTA 3 Tahun', bg: '#0e7490' },
      { val: fmtNum(d.affil_score),         lbl: 'Skor Afiliasi',      bg: '#7c3aed' },
      { val: fmtNum(d.affil_score_3year),   lbl: 'Afiliasi 3 Tahun',   bg: '#059669' },
    ];
    const cW = s((CW - 4.5) / 4), cH = s(20);
    let cx = s(MRG);
    for (const sc of scoreData) {
      fill(sc.bg); doc.roundedRect(cx, y, cW, cH, s(2), s(2), 'F');
      doc.setTextColor(255, 255, 255);
      font(12, 'bold'); doc.text(sc.val, cx + cW / 2, y + s(4), { align: 'center', baseline: 'top' });
      font(7,  'normal'); doc.text(sc.lbl, cx + cW / 2, y + s(13), { align: 'center', baseline: 'top', maxWidth: cW - s(2) });
      cx += cW + s(1.5);
    }
    y += cH + s(4);

    // ── TABEL STATISTIK ──────────────────────────────────────────
    sectionTitle('Statistik Publikasi');
    const colW = [s(CW * 0.32), s(CW * 0.23), s(CW * 0.23), s(CW * 0.22)];
    const colX = [s(MRG), s(MRG) + colW[0], s(MRG) + colW[0] + colW[1], s(MRG) + colW[0] + colW[1] + colW[2]];
    const rowH = s(5.5);
    const tblHeaders  = ['Metrik', 'Scopus', 'Google Scholar', 'Web of Science'];
    const tblHdrBg    = ['#f8fafc', '#e0f7fa', '#fce7f3', '#eff6ff'];
    const tblHdrFg    = ['#374151', '#0891b2', '#be185d', '#1d4ed8'];
    for (let i = 0; i < 4; i++) {
      fill(tblHdrBg[i]); doc.rect(colX[i], y, colW[i], rowH, 'F');
      rgb(tblHdrFg[i]); font(7.5, 'bold');
      doc.text(tblHeaders[i], colX[i] + colW[i] / 2, y + s(1), { align: 'center', baseline: 'top' });
    }
    strk('#e2e8f0'); doc.setLineWidth(s(0.2));
    doc.rect(s(MRG), y, s(CW), rowH, 'S');
    for (let i = 1; i < 4; i++) doc.line(colX[i], y, colX[i], y + rowH);
    y += rowH;

    const tblRows = [
      ['Artikel',   fmtNum(d.scopus_artikel),  fmtNum(d.gscholar_artikel),  fmtNum(d.wos_artikel)],
      ['Sitasi',    fmtNum(d.scopus_sitasi),    fmtNum(d.gscholar_sitasi),   fmtNum(d.wos_sitasi)],
      ['Cited Doc', fmtNum(d.scopus_cited_doc), fmtNum(d.gscholar_cited_doc),fmtNum(d.wos_cited_doc)],
      ['H-Index',   fmtNum(d.scopus_h_index),   fmtNum(d.gscholar_h_index),  fmtNum(d.wos_h_index)],
      ['i10-Index', fmtNum(d.scopus_i10_index),  fmtNum(d.gscholar_i10_index),'—'],
      ['G-Index',   fmtNum(d.scopus_g_index),    fmtNum(d.gscholar_g_index),  '—'],
    ];
    for (let ri = 0; ri < tblRows.length; ri++) {
      if (ri % 2 === 0) { fill('#fafafa'); doc.rect(s(MRG), y, s(CW), rowH, 'F'); }
      for (let ci = 0; ci < 4; ci++) {
        if (ci === 0) { rgb('#64748b'); font(8, 'normal'); doc.text(tblRows[ri][ci], colX[0] + s(2), y + s(1), { baseline: 'top' }); }
        else          { rgb('#1e293b'); font(8, 'bold');   doc.text(tblRows[ri][ci], colX[ci] + colW[ci] - s(2), y + s(1), { align: 'right', baseline: 'top' }); }
      }
      strk('#e2e8f0'); doc.setLineWidth(s(0.2));
      doc.rect(s(MRG), y, s(CW), rowH, 'S');
      for (let i = 1; i < 4; i++) doc.line(colX[i], y, colX[i], y + rowH);
      y += rowH;
    }
    y += s(3);

    // ── KUARTIL ──────────────────────────────────────────────────
    if (kuartilImg) {
      sectionTitle('Distribusi Kuartil Scopus');
      const kH = s(CW * KQ_H / KQ_W);
      fill('#f8fafc'); doc.roundedRect(s(MRG), y, s(CW), kH, s(1.5), s(1.5), 'F');
      doc.addImage(kuartilImg, 'PNG', s(MRG + 1), y + s(0.5), s(CW - 2), kH - s(1));
      y += kH + s(3);
    }

    // ── TREN CHART ───────────────────────────────────────────────
    if (trenImg) {
      sectionTitle('Tren Publikasi per Tahun');
      const tH = s(CW * CHART_H / CHART_W);
      fill('#f8fafc'); doc.roundedRect(s(MRG), y, s(CW), tH, s(1.5), s(1.5), 'F');
      doc.addImage(trenImg, 'PNG', s(MRG + 1), y + s(0.5), s(CW - 2), tH - s(1));
      y += tH + s(3);
    }

    // ── DAFTAR ARTIKEL SCOPUS ─────────────────────────────────────
    if (N_ART > 0) {
      const totalLabel = this.scopusTotal > N_ART ? ` dari ${this.scopusTotal}` : '';
      sectionTitle(`Daftar Artikel Scopus (${N_ART}${totalLabel})`);
      const qFgColor: Record<string, [number,number,number]> = {
        Q1:[22,163,74], Q2:[101,163,13], Q3:[202,138,4], Q4:[234,88,12], NoQ:[107,114,128]
      };
      const qBgColor: Record<string, [number,number,number]> = {
        Q1:[220,252,231], Q2:[236,252,203], Q3:[254,249,195], Q4:[255,237,213], NoQ:[241,245,249]
      };
      for (const a of this.scopusArtikels) {
        const qKey = (a.kuartil || 'NoQ') as string;
        const qFg = qFgColor[qKey] || qFgColor['NoQ'];
        const qBg = qBgColor[qKey] || qBgColor['NoQ'];
        // Q badge
        doc.setFillColor(...qBg); doc.roundedRect(s(MRG), y, s(7.5), s(4), s(1), s(1), 'F');
        doc.setTextColor(...qFg); font(6.5, 'bold');
        doc.text(qKey, s(MRG + 3.75), y + s(0.5), { align: 'center', baseline: 'top' });
        // Meta (tahun, sitasi, urutan penulis)
        rgb('#64748b'); font(7, 'normal');
        let mx = s(MRG + 9.5);
        doc.text(String(a.tahun ?? ''), mx, y + s(0.5), { baseline: 'top' }); mx += s(11);
        if (a.sitasi > 0) { doc.text(`Sitasi: ${a.sitasi}`, mx, y + s(0.5), { baseline: 'top' }); mx += s(17); }
        if (a.urutan_penulis) { doc.text(`Penulis ${a.urutan_penulis}/${a.total_penulis}`, mx, y + s(0.5), { baseline: 'top' }); }
        y += s(5);
        // Judul (maks 2 baris)
        rgb('#1e293b');
        const titleLines = doc.splitTextToSize(a.judul || '', s(CW));
        const titleLH = font(7.5, 'bold');
        const shownLines = titleLines.slice(0, 2);
        doc.text(shownLines, s(MRG), y, { baseline: 'top' });
        y += titleLH * shownLines.length;
        // Jurnal
        if (a.jurnal_nama) {
          rgb('#64748b');
          const jLH = font(7, 'italic');
          doc.text(a.jurnal_nama, s(MRG), y, { baseline: 'top', maxWidth: s(CW) });
          y += jLH;
        }
        // Separator
        strk('#e2e8f0'); doc.setLineWidth(s(0.15));
        doc.line(s(MRG), y + s(1), s(MRG + CW), y + s(1));
        y += s(3);
      }
    }

    // ── SUMBER DATA ──────────────────────────────────────────────
    strk('#e2e8f0'); doc.setLineWidth(s(0.2));
    doc.line(s(MRG), y, s(MRG + CW), y); y += s(2);
    rgb('#64748b');
    font(7.5, 'bold'); doc.text('Sumber data:', s(MRG), y, { baseline: 'top' });
    font(7.5, 'normal'); doc.text('SINTA Kemdiktisaintek · Scopus · Google Scholar · Web of Science', s(MRG + 23), y, { baseline: 'top' });
    if (d.scraped_at) {
      y += s(5); rgb('#94a3b8');
      font(6.5, 'italic'); doc.text(`Data diperbarui: ${fmtDate(d.scraped_at)}`, s(MRG), y, { baseline: 'top' });
    }

    // ── SIMPAN FILE ───────────────────────────────────────────────
    const safeName = (d.nama || 'author').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
    doc.save(`author-sinta-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  getTrend(trend: TrendItem[], jenis: string): TrendItem[] {
    if (!trend) { return []; }
    return trend
      .filter(t => t.jenis === jenis)
      .sort((a, b) => a.tahun - b.tahun);
  }

  getTrendPct(trend: TrendItem[], jenis: string, value: number): number {
    const items = this.getTrend(trend, jenis);
    const max   = Math.max(...items.map(t => t.jumlah), 1);
    return Math.round((value / max) * 100);
  }
}
