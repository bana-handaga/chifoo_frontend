import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
      <select class="au-select" [(ngModel)]="filterPt" (change)="onFilterChange()">
        <option value="">Semua PT</option>
        <option *ngFor="let p of ptOptions" [value]="p.kode">{{ p.singkatan }}</option>
      </select>

      <!-- Ordering -->
      <select class="au-select" [(ngModel)]="ordering" (change)="onFilterChange()">
        <option value="-sinta_score_overall">Skor SINTA (tertinggi)</option>
        <option value="-sinta_score_3year">Skor 3 Tahun (tertinggi)</option>
        <option value="-scopus_artikel">Artikel Scopus (terbanyak)</option>
        <option value="-scopus_h_index">H-Index Scopus (tertinggi)</option>
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

  <!-- ── Count Info ── -->
  <div class="au-count-row" *ngIf="!loading && authors.length > 0">
    <span class="au-count">{{ totalCount | number }} author ditemukan</span>
  </div>

  <!-- ── Author Cards Grid ── -->
  <div class="au-grid" *ngIf="!loading && authors.length > 0">
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

      <!-- ── Stats Tabs ── -->
      <div class="au-modal__section">
        <div class="au-tabs">
          <button class="au-tab" [class.au-tab--active]="activeTab==='scopus'" (click)="activeTab='scopus'">Scopus</button>
          <button class="au-tab" [class.au-tab--active]="activeTab==='gscholar'" (click)="activeTab='gscholar'">Google Scholar</button>
          <button class="au-tab" [class.au-tab--active]="activeTab==='wos'" (click)="activeTab='wos'">Web of Science</button>
        </div>

        <!-- Scopus -->
        <table class="au-stats-table" *ngIf="activeTab==='scopus'">
          <tr><td>Artikel</td><td>{{ detail.scopus_artikel }}</td></tr>
          <tr><td>Sitasi</td><td>{{ detail.scopus_sitasi | number }}</td></tr>
          <tr><td>Cited Doc</td><td>{{ detail.scopus_cited_doc }}</td></tr>
          <tr><td>H-Index</td><td>{{ detail.scopus_h_index }}</td></tr>
          <tr><td>i10-Index</td><td>{{ detail.scopus_i10_index }}</td></tr>
          <tr><td>G-Index</td><td>{{ detail.scopus_g_index }}</td></tr>
        </table>

        <!-- Google Scholar -->
        <table class="au-stats-table" *ngIf="activeTab==='gscholar'">
          <tr><td>Artikel</td><td>{{ detail.gscholar_artikel }}</td></tr>
          <tr><td>Sitasi</td><td>{{ detail.gscholar_sitasi | number }}</td></tr>
          <tr><td>Cited Doc</td><td>{{ detail.gscholar_cited_doc }}</td></tr>
          <tr><td>H-Index</td><td>{{ detail.gscholar_h_index }}</td></tr>
          <tr><td>i10-Index</td><td>{{ detail.gscholar_i10_index }}</td></tr>
          <tr><td>G-Index</td><td>{{ detail.gscholar_g_index }}</td></tr>
        </table>

        <!-- WOS -->
        <table class="au-stats-table" *ngIf="activeTab==='wos'">
          <tr><td>Artikel</td><td>{{ detail.wos_artikel }}</td></tr>
          <tr><td>Sitasi</td><td>{{ detail.wos_sitasi | number }}</td></tr>
          <tr><td>Cited Doc</td><td>{{ detail.wos_cited_doc }}</td></tr>
          <tr><td>H-Index</td><td>{{ detail.wos_h_index }}</td></tr>
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
      grid-template-columns: 1fr 1fr 1fr auto;
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

    /* ── Count row ── */
    .au-count-row {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    .au-count {
      font-size: 13px;
      color: var(--au-muted);
      font-weight: 500;
    }

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
    .au-tbar--scopus   { background: #2563eb; }
    .au-tbar--research { background: #059669; }
    .au-tbar--service  { background: #d97706; }
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
    }
    .au-modal__scraped {
      font-size: 11px;
      color: #94a3b8;
    }
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
  searchQuery = '';
  filterPt    = '';
  ordering    = '-sinta_score_overall';

  private searchTimer: any = null;
  private destroy$ = new Subject<void>();

  // Modal
  modalOpen     = false;
  detailLoading = false;
  detail: AuthorDetail | null = null;
  selectedAuthor: AuthorList | null = null;
  activeTab: 'scopus' | 'gscholar' | 'wos' = 'scopus';

  constructor(private http: HttpClient) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadStats();
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
          this.buildPtOptions(res.results);
        },
        error: err => console.error('Author list error', err)
      });
  }

  private buildPtOptions(authors: AuthorList[]): void {
    if (this.ptOptions.length) { return; }
    const seen = new Set<string>();
    authors.forEach(a => {
      if (a.pt_kode && !seen.has(a.pt_kode)) {
        seen.add(a.pt_kode);
        this.ptOptions.push({ kode: a.pt_kode, singkatan: a.pt_singkatan });
      }
    });
    this.ptOptions.sort((a, b) => a.singkatan.localeCompare(b.singkatan));
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

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadAuthors();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadAuthors();
  }

  resetFilter(): void {
    this.searchQuery = '';
    this.filterPt    = '';
    this.ordering    = '-sinta_score_overall';
    this.pageSize    = 20;
    this.currentPage = 1;
    this.loadAuthors();
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
    this.selectedAuthor = author;
    this.detail         = null;
    this.activeTab      = 'scopus';
    this.modalOpen      = true;
    this.detailLoading  = true;
    document.body.style.overflow = 'hidden';

    this.http.get<AuthorDetail>(`${API}/sinta-author/${author.id}/`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.detailLoading = false)
      )
      .subscribe({
        next:  d => this.detail = d,
        error: err => {
          console.error('Author detail error', err);
          // Fallback: show list data as partial detail
          this.detail = author as unknown as AuthorDetail;
        }
      });
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
