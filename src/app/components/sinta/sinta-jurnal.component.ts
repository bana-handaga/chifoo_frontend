import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sinta-jurnal',
  template: `
<div class="page-wrap">

  <!-- Back -->
  <div class="back-link" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- Header -->
  <div class="page-header">
    <div class="page-header__icon">
      <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zm-7-1h2v-4h4V9h-4V7h-2v2H9v2h4z"/>
      </svg>
    </div>
    <div>
      <h1 class="page-header__title">Jurnal Ilmiah PTMA</h1>
      <p class="page-header__sub">
        Daftar jurnal ilmiah yang diterbitkan fakultas/unit PTMA dan terindeks di
        <strong>SINTA</strong> — lengkap dengan peringkat, sitasi, dan tautan portal jurnal.
      </p>
    </div>
  </div>

  <!-- Stats bar -->
  <div class="stats-bar" *ngIf="stats">
    <div class="stat-chip">
      <span class="stat-chip__val">{{ stats.total | number }}</span>
      <span class="stat-chip__lbl">Total Jurnal</span>
    </div>
    <div class="stat-chip stat-chip--scopus" *ngIf="stats.scopus > 0">
      <span class="stat-chip__val">{{ stats.scopus }}</span>
      <span class="stat-chip__lbl">Scopus Indexed</span>
    </div>
    <div class="stat-chip stat-chip--garuda" *ngIf="stats.garuda > 0">
      <span class="stat-chip__val">{{ stats.garuda }}</span>
      <span class="stat-chip__lbl">Garuda Indexed</span>
    </div>
    <div class="stat-chip stat-chip--grade" *ngFor="let d of stats.distribusi_akreditasi">
      <span class="stat-chip__val">{{ d.jumlah }}</span>
      <span class="stat-chip__lbl">{{ d.akreditasi }}</span>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="filter-bar">
    <div class="filter-bar__search">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="filter-bar__search-icon">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        type="text"
        placeholder="Cari nama jurnal, ISSN, atau PT…"
        [(ngModel)]="search"
        (input)="onSearchInput()"
        class="filter-bar__input"
      />
      <button *ngIf="search" class="filter-bar__clear" (click)="clearSearch()">✕</button>
    </div>

    <div class="filter-row">
      <select [(ngModel)]="filterAkreditasi" (change)="applyFilter()">
        <option value="">Semua Akreditasi</option>
        <option *ngFor="let g of grades" [value]="g">{{ g }}</option>
      </select>

      <select [(ngModel)]="filterScopus" (change)="applyFilter()">
        <option value="">Scopus: Semua</option>
        <option value="true">Scopus Indexed</option>
        <option value="false">Non-Scopus</option>
      </select>

      <select [(ngModel)]="filterGaruda" (change)="applyFilter()">
        <option value="">Garuda: Semua</option>
        <option value="true">Garuda Indexed</option>
        <option value="false">Non-Garuda</option>
      </select>

      <select [(ngModel)]="filterPt" (change)="applyFilter()" *ngIf="ptOptions.length">
        <option value="">Semua PT</option>
        <option *ngFor="let p of ptOptions" [value]="p.id">{{ p.singkatan || p.nama }}</option>
      </select>

      <select [(ngModel)]="orderBy" (change)="applyFilter()">
        <option value="-impact">Urutkan: Impact ↓</option>
        <option value="impact">Urutkan: Impact ↑</option>
        <option value="-h5_index">H5-Index ↓</option>
        <option value="-sitasi_total">Total Sitasi ↓</option>
        <option value="nama">Nama A–Z</option>
        <option value="akreditasi">Akreditasi</option>
      </select>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading-wrap" *ngIf="loading">
    <div class="spinner"></div>
    <span>Memuat data jurnal…</span>
  </div>

  <!-- Empty -->
  <div class="empty-wrap" *ngIf="!loading && journals.length === 0">
    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="color:#cbd5e1">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
    <div class="empty-wrap__text">Tidak ada jurnal ditemukan</div>
    <button class="btn-reset" (click)="resetFilter()">Reset Filter</button>
  </div>

  <!-- Pagination atas + info -->
  <div class="pagination pagination--top" *ngIf="!loading && journals.length > 0">
    <span class="pg-count">{{ totalCount | number }} jurnal</span>
    <div class="pg-nav" *ngIf="totalCount > pageSize">
      <button class="pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹</button>
      <span class="pg-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">›</button>
    </div>
  </div>

  <!-- Journal grid -->
  <div class="journal-grid" *ngIf="!loading && journals.length > 0">
    <div class="journal-card" *ngFor="let j of journals">

      <!-- Logo + Grade -->
      <div class="jc-logo-wrap">
        <img
          *ngIf="j.logo_base64"
          [src]="j.logo_base64"
          class="jc-logo"
          [alt]="j.nama"
          (error)="onLogoError($event)"
        />
        <div class="jc-logo jc-logo--placeholder" *ngIf="!j.logo_base64">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <span class="jc-grade" [class]="'jc-grade--' + j.akreditasi.toLowerCase()">{{ j.akreditasi }}</span>
      </div>

      <!-- Body -->
      <div class="jc-body">
        <div class="jc-name">{{ j.nama }}</div>
        <div class="jc-pt" *ngIf="j.perguruan_tinggi_singkatan">
          {{ j.perguruan_tinggi_singkatan }}
          <span class="jc-pt__aff" *ngIf="j.afiliasi_teks"> — {{ j.afiliasi_teks }}</span>
        </div>

        <!-- ISSN -->
        <div class="jc-issn" *ngIf="j.p_issn || j.e_issn">
          <span *ngIf="j.p_issn">P-ISSN {{ j.p_issn | issn }}</span>
          <span *ngIf="j.e_issn">E-ISSN {{ j.e_issn | issn }}</span>
        </div>

        <!-- Subject area -->
        <div class="jc-subject" *ngIf="j.subject_area">{{ j.subject_area }}</div>

        <!-- Metrics -->
        <div class="jc-metrics">
          <div class="jc-metric" title="Impact Factor">
            <span class="jc-metric__val">{{ j.impact | number:'1.2-2' }}</span>
            <span class="jc-metric__lbl">Impact</span>
          </div>
          <div class="jc-metric" title="H5-Index">
            <span class="jc-metric__val">{{ j.h5_index }}</span>
            <span class="jc-metric__lbl">H5-Index</span>
          </div>
          <div class="jc-metric" title="Sitasi 5 Tahun">
            <span class="jc-metric__val">{{ j.sitasi_5yr | number }}</span>
            <span class="jc-metric__lbl">Sit. 5yr</span>
          </div>
          <div class="jc-metric" title="Total Sitasi">
            <span class="jc-metric__val">{{ j.sitasi_total | number }}</span>
            <span class="jc-metric__lbl">Total Sit.</span>
          </div>
        </div>

        <!-- Index badges -->
        <div class="jc-badges">
          <span class="jc-badge jc-badge--scopus" *ngIf="j.is_scopus">Scopus</span>
          <span class="jc-badge jc-badge--garuda" *ngIf="j.is_garuda">Garuda</span>
        </div>

        <!-- Links -->
        <div class="jc-links">
          <a *ngIf="j.url_website && j.url_website !== '#!'" [href]="j.url_website" target="_blank" class="jc-link jc-link--web" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Website
          </a>
          <a *ngIf="j.url_scholar && j.url_scholar !== '#!'" [href]="j.url_scholar" target="_blank" class="jc-link jc-link--scholar" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
            Scholar
          </a>
          <a *ngIf="j.url_garuda && j.url_garuda !== '#!'" [href]="j.url_garuda" target="_blank" class="jc-link jc-link--garuda" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Garuda
          </a>
        </div>
      </div>

    </div>
  </div>

  <!-- Pagination -->
  <div class="pagination" *ngIf="totalCount > pageSize">
    <button class="pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹</button>
    <span class="pg-info">{{ currentPage }} / {{ totalPages }}</span>
    <button class="pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">›</button>
    <span class="pg-count">{{ totalCount | number }} jurnal</span>
  </div>

</div>
  `,
  styles: [`
    .page-wrap { padding: 1.25rem; max-width: 960px; margin: 0 auto; overflow: hidden; }

    /* Back */
    .back-link {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .83rem; color: #64748b; cursor: pointer;
      margin-bottom: 1rem; padding: .3rem .6rem;
      border-radius: 6px; transition: background .15s;
    }
    .back-link:hover { background: #f1f5f9; color: #1e293b; }

    /* Header */
    .page-header {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1.1rem 1.4rem; border-radius: 12px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      color: #fff; margin-bottom: 1.25rem;
      box-shadow: 0 4px 16px rgba(8,145,178,.3);
    }
    .page-header__icon { flex-shrink: 0; opacity: .9; margin-top: 2px; }
    .page-header__title { font-size: 1.3rem; font-weight: 800; margin: 0 0 .3rem; color: #fff; }
    .page-header__sub { font-size: .87rem; color: #e0f7fa; margin: 0; line-height: 1.55; }
    .page-header__sub strong { font-weight: 700; color: #fff; }

    /* Stats bar */
    .stats-bar {
      display: flex; flex-wrap: wrap; gap: .5rem;
      margin-bottom: 1.1rem;
    }
    .stat-chip {
      display: flex; flex-direction: column; align-items: center;
      padding: .45rem .9rem; border-radius: 10px;
      background: #fff; border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
      min-width: 70px;
    }
    .stat-chip__val { font-size: 1.1rem; font-weight: 800; color: #1e293b; }
    .stat-chip__lbl { font-size: .7rem; color: #64748b; margin-top: 1px; }
    .stat-chip--scopus { border-color: #bfdbfe; background: #eff6ff; }
    .stat-chip--scopus .stat-chip__val { color: #1d4ed8; }
    .stat-chip--garuda { border-color: #bbf7d0; background: #f0fdf4; }
    .stat-chip--garuda .stat-chip__val { color: #15803d; }
    .stat-chip--grade { border-color: #fed7aa; background: #fff7ed; }
    .stat-chip--grade .stat-chip__val { color: #ea580c; }

    /* Filter bar */
    .filter-bar {
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: .9rem 1rem;
      margin-bottom: 1.1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .filter-bar__search {
      position: relative; display: flex; align-items: center;
      margin-bottom: .7rem;
    }
    .filter-bar__search-icon {
      position: absolute; left: .7rem; color: #94a3b8; flex-shrink: 0;
    }
    .filter-bar__input {
      width: 100%; padding: .55rem .7rem .55rem 2.1rem;
      border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: .875rem; outline: none;
      transition: border-color .15s;
    }
    .filter-bar__input:focus { border-color: #0891b2; }
    .filter-bar__clear {
      position: absolute; right: .6rem;
      background: none; border: none; cursor: pointer;
      color: #94a3b8; font-size: .85rem; padding: 0;
    }
    .filter-row {
      display: flex; flex-direction: column; gap: .45rem;
    }
    .filter-row select {
      width: 100%; padding: .42rem .6rem;
      border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: .82rem; background: #f8fafc; color: #334155;
      outline: none; cursor: pointer;
    }
    .filter-row select:focus { border-color: #0891b2; }
    @media (min-width: 640px) {
      .filter-row { flex-direction: row; flex-wrap: nowrap; gap: .5rem; }
      .filter-row select { width: auto; flex: 1; min-width: 0; }
    }

    /* Loading */
    .loading-wrap {
      display: flex; align-items: center; justify-content: center; gap: .75rem;
      padding: 3rem; color: #64748b; font-size: .875rem;
    }
    .spinner {
      width: 24px; height: 24px; border: 3px solid #e2e8f0;
      border-top-color: #0891b2; border-radius: 50%;
      animation: spin .7s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty */
    .empty-wrap {
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
      padding: 3.5rem; background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0; text-align: center;
    }
    .empty-wrap__text { font-size: .9rem; color: #64748b; font-weight: 600; }
    .btn-reset {
      padding: .4rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px;
      background: #f8fafc; color: #475569; font-size: .82rem; cursor: pointer;
      transition: background .15s;
    }
    .btn-reset:hover { background: #e2e8f0; }

    /* Journal grid */
    .journal-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: .75rem;
      margin-bottom: 1.25rem;
      min-width: 0;
    }
    @media (min-width: 900px) {
      .journal-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* Journal card */
    .journal-card {
      display: flex; gap: .875rem;
      padding: 1rem;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05);
      transition: box-shadow .15s, border-color .15s;
      min-width: 0; overflow: hidden;
    }
    .journal-card:hover {
      box-shadow: 0 4px 14px rgba(8,145,178,.12);
      border-color: #a5f3fc;
    }

    /* Logo */
    .jc-logo-wrap { flex-shrink: 0; position: relative; }
    .jc-logo {
      width: 64px; height: 64px; object-fit: cover;
      border-radius: 8px; border: 1px solid #e2e8f0;
      display: block;
    }
    .jc-logo--placeholder {
      display: flex; align-items: center; justify-content: center;
      background: #f1f5f9; color: #94a3b8;
    }
    .jc-grade {
      position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
      font-size: .65rem; font-weight: 800; padding: 1px 6px;
      border-radius: 6px; white-space: nowrap;
      border: 1px solid transparent;
    }
    .jc-grade--s1 { background: #7c3aed; color: #fff; border-color: #6d28d9; }
    .jc-grade--s2 { background: #2563eb; color: #fff; border-color: #1d4ed8; }
    .jc-grade--s3 { background: #0891b2; color: #fff; border-color: #0e7490; }
    .jc-grade--s4 { background: #059669; color: #fff; border-color: #047857; }
    .jc-grade--s5 { background: #d97706; color: #fff; border-color: #b45309; }
    .jc-grade--s6 { background: #dc2626; color: #fff; border-color: #b91c1c; }

    /* Card body */
    .jc-body { flex: 1; min-width: 0; }
    .jc-name {
      font-size: .88rem; font-weight: 700; color: #1e293b;
      line-height: 1.35; margin-bottom: .25rem;
    }
    .jc-pt {
      font-size: .76rem; color: #0891b2; font-weight: 600;
      margin-bottom: .25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .jc-pt__aff { color: #64748b; font-weight: 400; }
    .jc-issn {
      font-size: .72rem; color: #94a3b8;
      margin-bottom: .25rem; display: flex; gap: .5rem; flex-wrap: wrap;
    }
    .jc-subject {
      font-size: .73rem; color: #7c3aed;
      background: #f5f3ff; padding: 1px 6px; border-radius: 4px;
      display: inline-block; margin-bottom: .35rem;
    }

    /* Metrics */
    .jc-metrics {
      display: flex; gap: .5rem; margin-bottom: .4rem;
    }
    .jc-metric {
      display: flex; flex-direction: column; align-items: center;
      min-width: 44px;
    }
    .jc-metric__val { font-size: .82rem; font-weight: 800; color: #0f172a; }
    .jc-metric__lbl { font-size: .62rem; color: #94a3b8; }

    /* Badges */
    .jc-badges {
      display: flex; gap: .35rem; margin-bottom: .4rem; flex-wrap: wrap;
    }
    .jc-badge {
      font-size: .65rem; font-weight: 700; padding: 1px 6px;
      border-radius: 5px; border: 1px solid transparent;
    }
    .jc-badge--scopus { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .jc-badge--garuda { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

    /* Links */
    .jc-links {
      display: flex; gap: .4rem; flex-wrap: wrap;
    }
    .jc-link {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .7rem; font-weight: 600; padding: 2px 7px;
      border-radius: 5px; border: 1px solid transparent;
      text-decoration: none; transition: background .12s;
    }
    .jc-link--web   { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .jc-link--web:hover { background: #e2e8f0; }
    .jc-link--scholar { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .jc-link--scholar:hover { background: #dbeafe; }
    .jc-link--garuda  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .jc-link--garuda:hover { background: #dcfce7; }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: .75rem;
      padding: .75rem 0;
    }
    .pagination--top {
      justify-content: space-between;
      padding: .4rem 0 .6rem;
      margin-bottom: .1rem;
    }
    .pg-nav { display: flex; align-items: center; gap: .5rem; }
    .pg-btn {
      width: 34px; height: 34px; border: 1px solid #e2e8f0; border-radius: 8px;
      background: #fff; font-size: 1.1rem; cursor: pointer; color: #475569;
      transition: background .12s;
    }
    .pg-btn:hover:not(:disabled) { background: #f1f5f9; }
    .pg-btn:disabled { opacity: .4; cursor: default; }
    .pg-info { font-size: .875rem; color: #475569; font-weight: 600; }
    .pg-count { font-size: .78rem; color: #94a3b8; }
  `]
})
export class SintaJurnalComponent implements OnInit {

  journals: any[] = [];
  stats: any = null;
  ptOptions: any[] = [];
  loading = true;

  // Filters
  search = '';
  filterAkreditasi = '';
  filterScopus = '';
  filterGaruda = '';
  filterPt = '';
  orderBy = '-impact';

  grades = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;

  private searchTimeout: any;

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadPtOptions();
    this.loadJournals();
  }

  loadStats(): void {
    this.apiService.getSintaJurnalStats().subscribe({
      next: (data) => { this.stats = data; },
      error: () => {}
    });
  }

  loadPtOptions(): void {
    this.apiService.getPerguruanTinggiList({ page_size: 200, is_active: true }).subscribe({
      next: (data) => {
        const list = data.results || data;
        this.ptOptions = list
          .map((p: any) => ({ id: p.id, nama: p.nama, singkatan: p.singkatan }))
          .sort((a: any, b: any) => (a.singkatan || a.nama).localeCompare(b.singkatan || b.nama, 'id'));
      },
      error: () => {}
    });
  }

  loadJournals(): void {
    this.loading = true;
    const params: any = {
      page: this.currentPage,
      page_size: this.pageSize,
      ordering: this.orderBy,
    };
    if (this.search)           params['search'] = this.search;
    if (this.filterAkreditasi) params['akreditasi'] = this.filterAkreditasi;
    if (this.filterScopus)     params['is_scopus'] = this.filterScopus;
    if (this.filterGaruda)     params['is_garuda'] = this.filterGaruda;
    if (this.filterPt)         params['perguruan_tinggi'] = this.filterPt;

    this.apiService.getSintaJurnalList(params).subscribe({
      next: (data) => {
        this.journals = data.results || data;
        this.totalCount = data.count || this.journals.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadJournals();
    }, 400);
  }

  clearSearch(): void {
    this.search = '';
    this.currentPage = 1;
    this.loadJournals();
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadJournals();
  }

  resetFilter(): void {
    this.search = '';
    this.filterAkreditasi = '';
    this.filterScopus = '';
    this.filterGaruda = '';
    this.filterPt = '';
    this.orderBy = '-impact';
    this.currentPage = 1;
    this.loadJournals();
  }

  goPage(page: number): void {
    this.currentPage = page;
    this.loadJournals();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onLogoError(event: any): void {
    event.target.style.display = 'none';
  }
}

// Pipe bantu format ISSN: "08520682" → "0852-0682"
@Pipe({ name: 'issn' })
export class IssnPipe implements PipeTransform {
  transform(value: string): string {
    if (!value || value.length < 8) return value;
    return value.replace(/(\d{4})(\d{4})/, '$1-$2');
  }
}
