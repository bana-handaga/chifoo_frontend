import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
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

  <!-- Stats bar — tiap chip bisa diklik sebagai filter -->
  <div class="stats-bar" *ngIf="stats">
    <button class="stat-chip" [class.stat-chip--active]="isChipActive('all')" (click)="clickStat('all')">
      <span class="stat-chip__val">{{ stats.total | number }}</span>
      <span class="stat-chip__lbl">Total Jurnal</span>
    </button>
    <button class="stat-chip stat-chip--scopus" [class.stat-chip--active]="isChipActive('scopus')"
            *ngIf="stats.scopus > 0" (click)="clickStat('scopus')">
      <span class="stat-chip__val">{{ stats.scopus }}</span>
      <span class="stat-chip__lbl">Scopus</span>
    </button>
    <button class="stat-chip stat-chip--garuda" [class.stat-chip--active]="isChipActive('garuda')"
            *ngIf="stats.garuda > 0" (click)="clickStat('garuda')">
      <span class="stat-chip__val">{{ stats.garuda }}</span>
      <span class="stat-chip__lbl">Garuda</span>
    </button>
    <button class="stat-chip stat-chip--grade"
            [class.stat-chip--active]="isChipActive('grade', d.akreditasi)"
            *ngFor="let d of stats.distribusi_akreditasi"
            (click)="clickStat('grade', d.akreditasi)">
      <span class="stat-chip__val">{{ d.jumlah }}</span>
      <span class="stat-chip__lbl">{{ d.akreditasi }}</span>
    </button>
  </div>

  <!-- WCU chips -->
  <div class="wcu-bar" *ngIf="stats?.distribusi_wcu?.length">
    <span class="wcu-bar__label">Bidang WCU:</span>
    <button class="wcu-chip"
            [class.wcu-chip--active]="isChipActive('wcu', d.wcu_area)"
            *ngFor="let d of stats.distribusi_wcu"
            (click)="clickStat('wcu', d.wcu_area)"
            [title]="d.wcu_area">
      <span class="wcu-chip__icon">{{ wcuIcon(d.wcu_area) }}</span>
      <span class="wcu-chip__lbl">{{ wcuShort(d.wcu_area) }}</span>
      <span class="wcu-chip__val">{{ d.jumlah }}</span>
    </button>
  </div>

  <!-- Filter bar -->
  <div class="filter-bar">
    <div class="filter-bar__search">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="filter-bar__search-icon">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input type="text" placeholder="Cari nama jurnal, ISSN, atau PT…"
        [(ngModel)]="search" (input)="onSearchInput()" class="filter-bar__input"/>
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
      <select [(ngModel)]="filterWcu" (change)="applyFilter()">
        <option value="">Semua Bidang</option>
        <option *ngFor="let w of wcuGroups" [value]="w.value">{{ w.label }}</option>
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

  <!-- Toolbar: count + view toggle + export + pagination -->
  <div class="toolbar" *ngIf="!loading && journals.length > 0">

    <!-- Kiri: count -->
    <span class="pg-count">{{ totalCount | number }} jurnal</span>

    <!-- Tengah: view toggle -->
    <div class="view-toggle">
      <button class="vt-btn" [class.vt-btn--active]="viewMode==='card'" (click)="viewMode='card'" title="Tampilan Kartu">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z"/>
        </svg>
      </button>
      <button class="vt-btn" [class.vt-btn--active]="viewMode==='list'" (click)="viewMode='list'" title="Tampilan Tabel">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M3 13h18v-2H3v2zm0 7h18v-2H3v2zM3 6v2h18V6H3z"/>
        </svg>
      </button>
    </div>

    <!-- Kanan: export (list mode) + pagination -->
    <div class="toolbar-right">
      <ng-container *ngIf="viewMode==='list'">
        <button class="export-btn export-btn--csv" (click)="exportCsv()" [disabled]="exporting" title="Export ke CSV">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
          <span *ngIf="!exporting">CSV</span>
          <span *ngIf="exporting">…</span>
        </button>
        <button class="export-btn export-btn--xlsx" (click)="exportXlsx()" [disabled]="exporting" title="Export ke Excel">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
          <span *ngIf="!exporting">XLSX</span>
          <span *ngIf="exporting">…</span>
        </button>
      </ng-container>
      <div class="pg-nav" *ngIf="totalCount > pageSize">
        <button class="pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹</button>
        <span class="pg-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">›</button>
      </div>
    </div>

  </div>

  <!-- ═══════════════ CARD VIEW ═══════════════ -->
  <div class="journal-grid" *ngIf="!loading && journals.length > 0 && viewMode==='card'">
    <div class="journal-card" [class]="'journal-card journal-card--' + j.akreditasi.toLowerCase()" *ngFor="let j of journals" (click)="openDetail(j)">
      <!-- Logo -->
      <div class="jc-logo-wrap">
        <img *ngIf="j.logo_base64" [src]="j.logo_base64" class="jc-logo" [alt]="j.nama" (error)="onLogoError($event)"/>
        <div class="jc-logo jc-logo--placeholder" *ngIf="!j.logo_base64">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
      </div>
      <!-- Body -->
      <div class="jc-body">
        <div class="jc-name-row">
          <span class="jc-name">{{ j.nama }}</span>
          <span class="jc-wcu-tag" *ngFor="let w of (j.wcu_area || '').split(',')" [title]="w.trim()">{{ wcuIcon(w.trim()) }}</span>
        </div>
        <div class="jc-pt" *ngIf="j.perguruan_tinggi_singkatan">
          {{ j.perguruan_tinggi_singkatan }}
          <span class="jc-pt__aff" *ngIf="j.afiliasi_teks"> — {{ j.afiliasi_teks }}</span>
        </div>
        <div class="jc-issn" *ngIf="j.p_issn || j.e_issn">
          <span *ngIf="j.p_issn">P {{ j.p_issn | issn }}</span>
          <span *ngIf="j.e_issn">E {{ j.e_issn | issn }}</span>
        </div>
        <div class="jc-metrics">
          <div class="jc-metric" title="Impact"><span class="jc-metric__val">{{ j.impact | number:'1.2-2' }}</span><span class="jc-metric__lbl">Impact</span></div>
          <div class="jc-metric" title="H5-Index"><span class="jc-metric__val">{{ j.h5_index }}</span><span class="jc-metric__lbl">H5</span></div>
          <div class="jc-metric" title="Sitasi 5yr"><span class="jc-metric__val">{{ j.sitasi_5yr | number }}</span><span class="jc-metric__lbl">Sit.5yr</span></div>
          <div class="jc-metric" title="Total Sitasi"><span class="jc-metric__val">{{ j.sitasi_total | number }}</span><span class="jc-metric__lbl">Sitasi</span></div>
        </div>
        <div class="jc-badges">
          <span class="jc-badge jc-badge--scopus" *ngIf="j.is_scopus">Scopus</span>
          <span class="jc-badge jc-badge--garuda" *ngIf="j.is_garuda">Garuda</span>
        </div>
        <div class="jc-links" (click)="$event.stopPropagation()">

          <a *ngIf="j.url_website && j.url_website !== '#!'" [href]="j.url_website" target="_blank" class="jc-link jc-link--web" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Web
          </a>
          <a *ngIf="j.url_scholar && j.url_scholar !== '#!'" [href]="j.url_scholar" target="_blank" class="jc-link jc-link--scholar" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
            Scholar
          </a>
          <a *ngIf="j.url_garuda && j.url_garuda !== '#!'" [href]="j.url_garuda" target="_blank" class="jc-link jc-link--garuda" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Garuda
          </a>
        </div>
      </div>
      <!-- FAB Akreditasi -->
      <div class="jc-grade-fab" [class]="'jc-grade-fab--' + j.akreditasi.toLowerCase()">
        <span class="jc-grade-fab__val">{{ j.akreditasi }}</span>
        <span class="jc-grade-fab__lbl">Akred.</span>
      </div>
    </div>
  </div>

  <!-- ═══════════════ LIST VIEW (TABEL) ═══════════════ -->
  <div class="table-wrap" *ngIf="!loading && journals.length > 0 && viewMode==='list'">
    <table class="jt">
      <thead>
        <tr>
          <th class="jt-no">#</th>
          <th class="jt-logo"></th>
          <th class="jt-nama">
            <button class="jt-sort" (click)="toggleSort('nama')" [class.jt-sort--active]="sortField()==='nama'">
              Nama Jurnal <span class="jt-sort__arr">{{ sortField()==='nama' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-wcu">
            <button class="jt-sort" (click)="toggleSort('wcu_area')" [class.jt-sort--active]="sortField()==='wcu_area'">
              Bidang <span class="jt-sort__arr">{{ sortField()==='wcu_area' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-pt">
            <button class="jt-sort" (click)="toggleSort('perguruan_tinggi__nama')" [class.jt-sort--active]="sortField()==='perguruan_tinggi__nama'">
              Perguruan Tinggi <span class="jt-sort__arr">{{ sortField()==='perguruan_tinggi__nama' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-grade">
            <button class="jt-sort" (click)="toggleSort('akreditasi')" [class.jt-sort--active]="sortField()==='akreditasi'">
              Akred. <span class="jt-sort__arr">{{ sortField()==='akreditasi' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-issn">ISSN</th>
          <th class="jt-num jt-impact">
            <button class="jt-sort jt-sort--right" (click)="toggleSort('impact')" [class.jt-sort--active]="sortField()==='impact'">
              Impact <span class="jt-sort__arr">{{ sortField()==='impact' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-num">
            <button class="jt-sort jt-sort--right" (click)="toggleSort('h5_index')" [class.jt-sort--active]="sortField()==='h5_index'">
              H5 <span class="jt-sort__arr">{{ sortField()==='h5_index' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-num">
            <button class="jt-sort jt-sort--right" (click)="toggleSort('sitasi_5yr')" [class.jt-sort--active]="sortField()==='sitasi_5yr'">
              Sit.5yr <span class="jt-sort__arr">{{ sortField()==='sitasi_5yr' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
          <th class="jt-num">
            <button class="jt-sort jt-sort--right" (click)="toggleSort('sitasi_total')" [class.jt-sort--active]="sortField()==='sitasi_total'">
              Sitasi <span class="jt-sort__arr">{{ sortField()==='sitasi_total' ? (sortDir()==='asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let j of journals; let i = index" (click)="openDetail(j)">
          <td class="jt-no">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
          <td class="jt-logo">
            <img *ngIf="j.logo_base64" [src]="j.logo_base64" class="jt-img" [alt]="j.nama" (error)="onLogoError($event)"/>
            <div *ngIf="!j.logo_base64" class="jt-img jt-img--ph">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div class="jt-logo-links" (click)="$event.stopPropagation()">
              <a *ngIf="j.url_website && j.url_website !== '#!'" [href]="j.url_website" target="_blank" class="jt-a" rel="noopener" title="Website">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
              </a>
              <a *ngIf="j.url_scholar && j.url_scholar !== '#!'" [href]="j.url_scholar" target="_blank" class="jt-a jt-a--scholar" rel="noopener" title="Google Scholar">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
              </a>
              <a *ngIf="j.url_garuda && j.url_garuda !== '#!'" [href]="j.url_garuda" target="_blank" class="jt-a jt-a--garuda" rel="noopener" title="Garuda">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
              </a>
            </div>
            <span class="jc-badge jc-badge--garuda jt-garuda-badge" *ngIf="j.is_garuda">Garuda</span>
          </td>
          <td class="jt-nama">
            <div class="jt-nama__text">{{ j.nama }}</div>
            <div class="jt-nama__aff" *ngIf="j.afiliasi_teks">{{ j.afiliasi_teks }}</div>
          </td>
          <td class="jt-wcu">
            <ng-container *ngFor="let w of (j.wcu_area || '').split(',')">
              <span class="jt-wcu-tag" *ngIf="w.trim()" [title]="w.trim()">{{ wcuIcon(w.trim()) }} {{ wcuShort(w.trim()) }}</span>
            </ng-container>
          </td>
          <td class="jt-pt">
            <div class="jt-pt__singkatan">{{ j.perguruan_tinggi_singkatan }}</div>
            <div class="jt-pt__nama">{{ j.perguruan_tinggi_nama }}</div>
          </td>
          <td class="jt-grade">
            <span class="jc-grade jc-grade--inline" [class]="'jc-grade--' + j.akreditasi.toLowerCase()">{{ j.akreditasi }}</span>
          </td>
          <td class="jt-issn">
            <div *ngIf="j.p_issn" class="jt-issn__row"><span class="jt-issn__lbl">P</span>{{ j.p_issn | issn }}</div>
            <div *ngIf="j.e_issn" class="jt-issn__row"><span class="jt-issn__lbl">E</span>{{ j.e_issn | issn }}</div>
          </td>
          <td class="jt-num jt-impact">{{ j.impact | number:'1.2-2' }}</td>
          <td class="jt-num">{{ j.h5_index }}</td>
          <td class="jt-num">{{ j.sitasi_5yr | number }}</td>
          <td class="jt-num">{{ j.sitasi_total | number }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══════════════ DETAIL MODAL ═══════════════ -->
  <div class="modal-overlay" *ngIf="selectedJournal" (click)="closeDetail()">
    <div class="modal-card" (click)="$event.stopPropagation()">
      <button class="modal-close" (click)="closeDetail()">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>

      <!-- Logo + badge -->
      <div class="modal-top">
        <div class="modal-logo-col">
          <div class="modal-logo-box">
            <img *ngIf="selectedJournal.logo_base64" [src]="selectedJournal.logo_base64"
                 class="modal-logo-img" [alt]="selectedJournal.nama" (error)="onLogoError($event)"/>
            <div *ngIf="!selectedJournal.logo_base64" class="modal-logo-ph">
              <svg viewBox="0 0 24 24" fill="currentColor" width="52" height="52">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
          </div>
          <div class="modal-index-badges">
            <span class="jc-badge jc-badge--scopus" *ngIf="selectedJournal.is_scopus">Scopus</span>
            <span class="jc-badge jc-badge--garuda" *ngIf="selectedJournal.is_garuda">Garuda</span>
          </div>
        </div>
        <!-- Info -->
        <div class="modal-info-col">
          <h2 class="modal-jname">{{ selectedJournal.nama }}</h2>
          <div class="modal-pt-row" *ngIf="selectedJournal.perguruan_tinggi_nama">
            <span class="modal-pt-singkatan">{{ selectedJournal.perguruan_tinggi_singkatan }}</span>
            <span class="modal-pt-nama">{{ selectedJournal.perguruan_tinggi_nama }}</span>
          </div>
          <div class="modal-aff" *ngIf="selectedJournal.afiliasi_teks">{{ selectedJournal.afiliasi_teks }}</div>
          <div class="modal-subject" *ngIf="selectedJournal.subject_area">{{ selectedJournal.subject_area }}</div>
          <div class="modal-issn-row" *ngIf="selectedJournal.p_issn || selectedJournal.e_issn">
            <span *ngIf="selectedJournal.p_issn" class="modal-issn-item"><em>P-ISSN</em> {{ selectedJournal.p_issn | issn }}</span>
            <span *ngIf="selectedJournal.e_issn" class="modal-issn-item"><em>E-ISSN</em> {{ selectedJournal.e_issn | issn }}</span>
          </div>
          <div class="modal-sinta-id" *ngIf="selectedJournal.sinta_id">SINTA ID: {{ selectedJournal.sinta_id }}</div>
        </div>
        <!-- FAB Akreditasi -->
        <div class="modal-grade-fab" [class]="'modal-grade-fab--' + selectedJournal.akreditasi.toLowerCase()">
          <span class="modal-grade-fab__val">{{ selectedJournal.akreditasi }}</span>
          <span class="modal-grade-fab__lbl">Akreditasi</span>
        </div>
      </div>

      <!-- Metrics -->
      <div class="modal-metrics">
        <div class="modal-metric"><span class="modal-metric__val">{{ selectedJournal.impact | number:'1.2-2' }}</span><span class="modal-metric__lbl">Impact Score</span></div>
        <div class="modal-metric"><span class="modal-metric__val">{{ selectedJournal.h5_index }}</span><span class="modal-metric__lbl">H5-Index</span></div>
        <div class="modal-metric"><span class="modal-metric__val">{{ selectedJournal.sitasi_5yr | number }}</span><span class="modal-metric__lbl">Sitasi 5yr</span></div>
        <div class="modal-metric"><span class="modal-metric__val">{{ selectedJournal.sitasi_total | number }}</span><span class="modal-metric__lbl">Total Sitasi</span></div>
      </div>

      <!-- Links -->
      <div class="modal-links">
        <a *ngIf="selectedJournal.url_website && selectedJournal.url_website !== '#!'" [href]="selectedJournal.url_website" target="_blank" rel="noopener" class="modal-link modal-link--web">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          Website Jurnal
        </a>
        <a *ngIf="selectedJournal.url_scholar && selectedJournal.url_scholar !== '#!'" [href]="selectedJournal.url_scholar" target="_blank" rel="noopener" class="modal-link modal-link--scholar">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
          Google Scholar
        </a>
        <a *ngIf="selectedJournal.url_editor && selectedJournal.url_editor !== '#!'" [href]="selectedJournal.url_editor" target="_blank" rel="noopener" class="modal-link modal-link--editor">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          Portal Editor
        </a>
        <a *ngIf="selectedJournal.url_garuda && selectedJournal.url_garuda !== '#!'" [href]="selectedJournal.url_garuda" target="_blank" rel="noopener" class="modal-link modal-link--garuda">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Garuda
        </a>
      </div>
    </div>
  </div>

  <!-- Pagination bawah -->
  <div class="pagination" *ngIf="!loading && totalCount > pageSize">
    <button class="pg-btn" [disabled]="currentPage === 1" (click)="goPage(currentPage - 1)">‹</button>
    <span class="pg-info">{{ currentPage }} / {{ totalPages }}</span>
    <button class="pg-btn" [disabled]="currentPage === totalPages" (click)="goPage(currentPage + 1)">›</button>
    <span class="pg-count">{{ totalCount | number }} jurnal</span>
  </div>

</div>
  `,
  styles: [`
    .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 40px; overflow: hidden; }

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
    .stats-bar { display: flex; flex-wrap: wrap; gap: .45rem; margin-bottom: 1rem; }
    .stat-chip {
      display: flex; flex-direction: column; align-items: center;
      padding: .4rem .85rem; border-radius: 10px;
      background: #fff; border: 1.5px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
      min-width: 64px; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .1s;
    }
    .stat-chip:hover { border-color: #0891b2; box-shadow: 0 2px 8px rgba(8,145,178,.15); transform: translateY(-1px); }
    .stat-chip--active { border-color: #0891b2 !important; background: #ecfeff !important; box-shadow: 0 2px 8px rgba(8,145,178,.2) !important; }
    .stat-chip__val { font-size: 1.05rem; font-weight: 800; color: #1e293b; }
    .stat-chip__lbl { font-size: .68rem; color: #64748b; margin-top: 1px; }
    .stat-chip--scopus { border-color: #bfdbfe; background: #eff6ff; }
    .stat-chip--scopus .stat-chip__val { color: #1d4ed8; }
    .stat-chip--scopus.stat-chip--active { background: #dbeafe !important; border-color: #2563eb !important; }
    .stat-chip--garuda { border-color: #bbf7d0; background: #f0fdf4; }
    .stat-chip--garuda .stat-chip__val { color: #15803d; }
    .stat-chip--garuda.stat-chip--active { background: #dcfce7 !important; border-color: #16a34a !important; }
    .stat-chip--grade { border-color: #fed7aa; background: #fff7ed; }
    .stat-chip--grade .stat-chip__val { color: #ea580c; }
    .stat-chip--grade.stat-chip--active { background: #ffedd5 !important; border-color: #ea580c !important; }

    /* WCU bar */
    .wcu-bar {
      display: flex; align-items: center; flex-wrap: wrap; gap: .4rem;
      margin-bottom: 1rem;
    }
    .wcu-bar__label { font-size: .72rem; color: #94a3b8; font-weight: 600; white-space: nowrap; margin-right: .2rem; }
    .wcu-chip {
      display: inline-flex; align-items: center; gap: .3rem;
      padding: .3rem .75rem; border-radius: 20px;
      border: 1.5px solid #e2e8f0; background: #fff;
      font-size: .75rem; cursor: pointer;
      transition: border-color .15s, background .15s, transform .1s;
      white-space: nowrap;
    }
    .wcu-chip:hover { border-color: #0891b2; background: #ecfeff; transform: translateY(-1px); }
    .wcu-chip--active { border-color: #0891b2 !important; background: #ecfeff !important; font-weight: 700; }
    .wcu-chip__icon { font-size: .85rem; }
    .wcu-chip__lbl { color: #334155; }
    .wcu-chip__val { color: #94a3b8; font-size: .7rem; margin-left: 1px; }
    .wcu-chip--active .wcu-chip__lbl { color: #0e7490; }
    .wcu-chip--active .wcu-chip__val { color: #0891b2; }

    /* Filter bar */
    .filter-bar {
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: .9rem 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .filter-bar__search {
      position: relative; display: flex; align-items: center; margin-bottom: .7rem;
    }
    .filter-bar__search-icon { position: absolute; left: .7rem; color: #94a3b8; }
    .filter-bar__input {
      width: 100%; padding: .55rem .7rem .55rem 2.1rem;
      border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: .875rem; outline: none; transition: border-color .15s;
    }
    .filter-bar__input:focus { border-color: #0891b2; }
    .filter-bar__clear {
      position: absolute; right: .6rem;
      background: none; border: none; cursor: pointer; color: #94a3b8; font-size: .85rem; padding: 0;
    }
    .filter-row { display: flex; flex-direction: column; gap: .45rem; }
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

    /* Loading / empty */
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
    .empty-wrap {
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
      padding: 3.5rem; background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0; text-align: center;
    }
    .empty-wrap__text { font-size: .9rem; color: #64748b; font-weight: 600; }
    .btn-reset {
      padding: .4rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px;
      background: #f8fafc; color: #475569; font-size: .82rem; cursor: pointer; transition: background .15s;
    }
    .btn-reset:hover { background: #e2e8f0; }

    /* Toolbar */
    .toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: .5rem; padding: .4rem 0 .65rem; flex-wrap: wrap;
    }
    .toolbar-right { display: flex; align-items: center; gap: .4rem; }
    .pg-count { font-size: .78rem; color: #94a3b8; white-space: nowrap; }

    /* View toggle */
    .view-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .vt-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 30px; border: none; background: #f8fafc;
      color: #94a3b8; cursor: pointer; transition: background .12s, color .12s;
    }
    .vt-btn:hover { background: #e2e8f0; color: #475569; }
    .vt-btn--active { background: #0891b2; color: #fff; }
    .vt-btn + .vt-btn { border-left: 1px solid #e2e8f0; }

    /* Export buttons */
    .export-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: .3rem .7rem; border-radius: 7px; border: 1px solid transparent;
      font-size: .75rem; font-weight: 700; cursor: pointer;
      transition: background .12s; white-space: nowrap;
    }
    .export-btn:disabled { opacity: .5; cursor: default; }
    .export-btn--csv  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .export-btn--csv:hover:not(:disabled)  { background: #dcfce7; }
    .export-btn--xlsx { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .export-btn--xlsx:hover:not(:disabled) { background: #dbeafe; }

    /* Pagination */
    .pg-nav { display: flex; align-items: center; gap: .4rem; }
    .pg-btn {
      width: 30px; height: 30px; border: 1px solid #e2e8f0; border-radius: 7px;
      background: #fff; font-size: 1rem; cursor: pointer; color: #475569; transition: background .12s;
    }
    .pg-btn:hover:not(:disabled) { background: #f1f5f9; }
    .pg-btn:disabled { opacity: .4; cursor: default; }
    .pg-info { font-size: .82rem; color: #475569; font-weight: 600; white-space: nowrap; }
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: .75rem;
      padding: .75rem 0;
    }

    /* ── CARD GRID ── */
    .journal-grid {
      display: grid; grid-template-columns: 1fr;
      gap: .75rem; margin-bottom: 1.25rem; min-width: 0;
    }
    @media (min-width: 900px) {
      .journal-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* Journal card */
    .journal-card {
      display: flex; gap: .875rem; padding: 1rem;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05);
      transition: box-shadow .15s, border-color .15s;
      min-width: 0; overflow: hidden; align-items: flex-start;
    }
    .journal-card:hover { box-shadow: 0 4px 14px rgba(8,145,178,.12); border-color: #a5f3fc; cursor: pointer; }
    /* FAB Akreditasi card */
    .jc-grade-fab {
      flex-shrink: 0; align-self: center;
      width: 72px; height: 72px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,.2);
    }
    .jc-grade-fab__val { font-size: 1.6rem; font-weight: 900; line-height: 1; }
    .jc-grade-fab__lbl { font-size: .55rem; font-weight: 700; opacity: .85; margin-top: 1px; letter-spacing: .05em; text-transform: uppercase; }
    .jc-grade-fab--s1 { background: linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; }
    .jc-grade-fab--s2 { background: linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; }
    .jc-grade-fab--s3 { background: linear-gradient(135deg,#0891b2,#0e7490); color:#fff; }
    .jc-grade-fab--s4 { background: linear-gradient(135deg,#059669,#047857); color:#fff; }
    .jc-grade-fab--s5 { background: linear-gradient(135deg,#d97706,#b45309); color:#fff; }
    .jc-grade-fab--s6 { background: linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; }
    /* Warna card tipis sesuai akreditasi */
    .journal-card--s1 { background: #f5f3ff; border-color: #ddd6fe; }
    .journal-card--s2 { background: #eff6ff; border-color: #bfdbfe; }
    .journal-card--s3 { background: #ecfeff; border-color: #a5f3fc; }
    .journal-card--s4 { background: #f0fdf4; border-color: #bbf7d0; }
    .journal-card--s5 { background: #fff7ed; border-color: #fed7aa; }
    .journal-card--s6 { background: #fef2f2; border-color: #fecaca; }

    /* Logo */
    .jc-logo-wrap { flex-shrink: 0; position: relative; }
    .jc-logo {
      width: 64px; height: 64px; object-fit: cover;
      border-radius: 8px; border: 1px solid #e2e8f0; display: block;
    }
    .jc-logo--placeholder {
      display: flex; align-items: center; justify-content: center;
      background: #f1f5f9; color: #94a3b8;
    }
    .jc-grade {
      position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
      font-size: .63rem; font-weight: 800; padding: 1px 6px;
      border-radius: 6px; white-space: nowrap; border: 1px solid transparent;
    }
    .jc-grade--inline { position: static; transform: none; display: inline-block; }
    .jc-grade--s1 { background: #7c3aed; color: #fff; border-color: #6d28d9; }
    .jc-grade--s2 { background: #2563eb; color: #fff; border-color: #1d4ed8; }
    .jc-grade--s3 { background: #0891b2; color: #fff; border-color: #0e7490; }
    .jc-grade--s4 { background: #059669; color: #fff; border-color: #047857; }
    .jc-grade--s5 { background: #d97706; color: #fff; border-color: #b45309; }
    .jc-grade--s6 { background: #dc2626; color: #fff; border-color: #b91c1c; }

    /* Card body */
    .jc-body { flex: 1; min-width: 0; }
    .jc-name-row { display: flex; align-items: flex-start; gap: .35rem; flex-wrap: wrap; margin-bottom: .25rem; }
    .jc-name { font-size: 1.05rem; font-weight: 700; color: #1e293b; line-height: 1.35; }
    .jc-wcu-tag {
      display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;
      font-size: .66rem; font-weight: 600; padding: 1px 6px; border-radius: 10px;
      background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;
      white-space: nowrap; margin-top: 3px;
    }
    .jt-wcu-tag {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: .63rem; font-weight: 600; padding: 1px 5px; border-radius: 8px;
      background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;
      white-space: nowrap; margin-left: 4px;
    }
    .jt-nama__row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0; }
    .jt-nama__text { font-weight: 600; color: #1e293b; line-height: 1.3; margin-right: 2px; }
    .jc-pt { font-size: .85rem; color: #0891b2; font-weight: 600; margin-bottom: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .jc-pt__aff { color: #64748b; font-weight: 400; }
    .jc-issn { font-size: .8rem; color: #94a3b8; margin-bottom: .25rem; display: flex; gap: .5rem; }
    .jc-subject { font-size: .78rem; color: #7c3aed; background: #f5f3ff; padding: 1px 6px; border-radius: 4px; display: inline-block; margin-bottom: .3rem; }
    .jc-metrics { display: flex; gap: .5rem; margin-bottom: .35rem; }
    .jc-metric { display: flex; flex-direction: column; align-items: center; min-width: 40px; }
    .jc-metric__val { font-size: .9rem; font-weight: 800; color: #0f172a; }
    .jc-metric__lbl { font-size: .68rem; color: #94a3b8; }
    .jc-badges { display: flex; gap: .3rem; margin-bottom: .35rem; flex-wrap: wrap; }
    .jc-badge { font-size: .64rem; font-weight: 700; padding: 1px 6px; border-radius: 5px; border: 1px solid transparent; }
    .jc-badge--scopus { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .jc-badge--garuda { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .jc-links { display: flex; gap: .35rem; flex-wrap: wrap; }
    .jc-link {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .69rem; font-weight: 600; padding: 2px 7px;
      border-radius: 5px; border: 1px solid transparent; text-decoration: none; transition: background .12s;
    }
    .jc-link--web    { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .jc-link--web:hover { background: #e2e8f0; }
    .jc-link--scholar { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .jc-link--scholar:hover { background: #dbeafe; }
    .jc-link--garuda  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .jc-link--garuda:hover { background: #dcfce7; }

    /* ── TABLE VIEW ── */
    .table-wrap { overflow-x: auto; margin-bottom: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; }
    .jt { width: 100%; border-collapse: collapse; font-size: .8rem; }
    .jt thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    .jt th {
      padding: .6rem .75rem; text-align: left;
      font-size: .72rem; font-weight: 700; color: #64748b;
      white-space: nowrap;
    }
    .jt td { padding: .55rem .75rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .jt tbody tr:last-child td { border-bottom: none; }
    .jt tbody tr { cursor: pointer; }
    .jt tbody tr:hover td { background: #e0f2fe; }
    .jt-no  { width: 36px; color: #94a3b8; font-size: .72rem; text-align: right; }
    .jt-logo { width: 58px; vertical-align: top; }
    .jt-img  { width: 36px; height: 36px; object-fit: cover; border-radius: 5px; border: 1px solid #e2e8f0; display: block; }
    .jt-img--ph { display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #94a3b8; }
    .jt-logo-links { display: flex; gap: 2px; margin-top: 4px; flex-wrap: nowrap; }
    .jt-logo-links .jt-a { width: 17px; height: 17px; margin-right: 0; }
    .jt-garuda-badge { display: block; margin-top: 4px; font-size: .6rem; }
    .jt-impact { background: #fff7ed !important; }
    .jt thead .jt-impact { background: #fff7ed !important; }
    .jt-nama { min-width: 180px; max-width: 260px; }
    .jt-nama__aff  { font-size: .7rem; color: #94a3b8; margin-top: 1px; }
    .jt-pt  { min-width: 120px; }
    .jt-pt__singkatan { color: #0891b2; font-weight: 700; font-size: .75rem; white-space: nowrap; }
    .jt-pt__nama { color: #64748b; font-size: .68rem; line-height: 1.3; margin-top: 2px; }
    .jt-grade { text-align: center; }
    .jt-issn { white-space: nowrap; color: #64748b; font-size: .72rem; }
    .jt-issn__row { display: flex; align-items: center; gap: 3px; line-height: 1.6; }
    .jt-issn__lbl { font-size: .63rem; font-weight: 700; color: #94a3b8; min-width: 10px; }
    .jt-num  { text-align: right; white-space: nowrap; font-weight: 600; color: #334155; }
    .jt-idx  { white-space: nowrap; }
    .jt-link { white-space: nowrap; }
    .jt-wcu { min-width: 110px; max-width: 160px; vertical-align: middle; }
    .jt-wcu-tag {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: .63rem; font-weight: 600; padding: 2px 6px; border-radius: 8px;
      background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;
      white-space: nowrap; margin: 1px 2px 1px 0;
    }
    /* Sort button in header */
    .jt-sort {
      display: inline-flex; align-items: center; gap: 3px;
      background: none; border: none; padding: 2px 4px; border-radius: 5px;
      font-size: .72rem; font-weight: 700; color: #64748b;
      cursor: pointer; white-space: nowrap; transition: background .12s, color .12s;
    }
    .jt-sort:hover { background: #e2e8f0; color: #1e293b; }
    .jt-sort--active { color: #0891b2; }
    .jt-sort--right { justify-content: flex-end; width: 100%; }
    .jt-sort__arr { font-size: .7rem; opacity: .7; }
    .jt-a {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 5px;
      background: #f1f5f9; color: #475569;
      text-decoration: none; transition: background .12s;
      margin-right: 2px;
    }
    .jt-a:hover { background: #e2e8f0; }
    .jt-a--scholar { background: #eff6ff; color: #2563eb; }
    .jt-a--scholar:hover { background: #dbeafe; }
    .jt-a--garuda  { background: #f0fdf4; color: #15803d; }
    .jt-a--garuda:hover { background: #dcfce7; }

    /* ── MODAL ── */
    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(15,23,42,.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem; animation: fade-in .15s ease;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 680px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,.35);
      position: relative; animation: slide-up .18s ease;
    }
    @keyframes slide-up { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-close {
      position: sticky; top: .6rem; float: right; margin: .6rem .6rem 0 0; z-index: 10;
      width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e2e8f0;
      background: #fff; color: #64748b;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .12s; flex-shrink: 0;
    }
    .modal-close:hover { background: #f1f5f9; color: #1e293b; }
    .modal-top {
      display: flex; gap: 1.25rem; padding: 1.25rem 1.25rem 1rem;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 16px 16px 0 0; border-bottom: 1px solid #e2e8f0;
    }
    .modal-logo-col {
      flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: .5rem;
    }
    .modal-logo-box {
      width: 148px; height: 148px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.08);
    }
    .modal-logo-img {
      max-width: 136px; max-height: 136px;
      width: auto; height: auto; object-fit: contain;
    }
    .modal-logo-ph { color: #cbd5e1; }
    .modal-index-badges { display: flex; gap: .3rem; justify-content: center; flex-wrap: wrap; }
    /* FAB Akreditasi */
    .modal-grade-fab {
      flex-shrink: 0; align-self: center;
      width: 88px; height: 88px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(0,0,0,.22);
      transition: transform .15s;
    }
    .modal-grade-fab:hover { transform: scale(1.06); }
    .modal-grade-fab__val { font-size: 2rem; font-weight: 900; line-height: 1; }
    .modal-grade-fab__lbl { font-size: .62rem; font-weight: 600; opacity: .85; margin-top: 2px; letter-spacing: .04em; text-transform: uppercase; }
    .modal-grade-fab--s1 { background: linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; }
    .modal-grade-fab--s2 { background: linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; }
    .modal-grade-fab--s3 { background: linear-gradient(135deg,#0891b2,#0e7490); color:#fff; }
    .modal-grade-fab--s4 { background: linear-gradient(135deg,#059669,#047857); color:#fff; }
    .modal-grade-fab--s5 { background: linear-gradient(135deg,#d97706,#b45309); color:#fff; }
    .modal-grade-fab--s6 { background: linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; }
    .modal-info-col { flex: 1; min-width: 0; padding-top: .2rem; }
    .modal-jname { font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.35; margin: 0 0 .5rem; }
    .modal-pt-row { display: flex; align-items: baseline; gap: .4rem; margin-bottom: .2rem; flex-wrap: wrap; }
    .modal-pt-singkatan { font-size: .82rem; font-weight: 800; color: #0891b2; }
    .modal-pt-nama { font-size: .78rem; color: #64748b; }
    .modal-aff { font-size: .75rem; color: #94a3b8; margin-bottom: .2rem; }
    .modal-subject { display: inline-block; font-size: .72rem; color: #7c3aed; background: #f5f3ff; padding: 2px 8px; border-radius: 5px; margin-bottom: .35rem; }
    .modal-issn-row { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: .2rem; }
    .modal-issn-item { font-size: .78rem; color: #475569; }
    .modal-issn-item em { font-style: normal; font-weight: 700; color: #94a3b8; margin-right: 3px; }
    .modal-sinta-id { font-size: .72rem; color: #94a3b8; margin-top: .1rem; }
    .modal-metrics {
      display: flex; justify-content: space-around;
      padding: .85rem 1.25rem; background: #fff; border-bottom: 1px solid #f1f5f9;
    }
    .modal-metric { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .modal-metric__val { font-size: 1.35rem; font-weight: 900; color: #0f172a; }
    .modal-metric__lbl { font-size: .68rem; color: #94a3b8; font-weight: 500; }
    .modal-links { display: flex; flex-wrap: wrap; gap: .5rem; padding: .9rem 1.25rem 1.1rem; }
    .modal-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: .45rem 1rem; border-radius: 8px; border: 1px solid transparent;
      font-size: .8rem; font-weight: 600; text-decoration: none; transition: background .12s;
    }
    .modal-link--web    { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .modal-link--web:hover { background: #e2e8f0; }
    .modal-link--scholar { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .modal-link--scholar:hover { background: #dbeafe; }
    .modal-link--editor  { background: #fdf4ff; color: #7c3aed; border-color: #e9d5ff; }
    .modal-link--editor:hover { background: #f3e8ff; }
    .modal-link--garuda  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .modal-link--garuda:hover { background: #dcfce7; }
  `]
})
export class SintaJurnalComponent implements OnInit {

  journals: any[] = [];
  stats: any = null;
  ptOptions: any[] = [];
  loading = true;
  exporting = false;
  selectedJournal: any = null;
  private _viewMode: 'card' | 'list' = 'list';
  get viewMode(): 'card' | 'list' { return this._viewMode; }
  set viewMode(v: 'card' | 'list') {
    this._viewMode = v;
    this.pageSize = v === 'list' ? 5 : 20;
    this.currentPage = 1;
    this.loadJournals();
  }

  // Filters
  search = '';
  filterAkreditasi = '';
  filterScopus = '';
  filterGaruda = '';
  filterWcu = '';
  filterPt = '';
  orderBy = '-impact';

  readonly wcuGroups = [
    { value: 'Natural Sciences',            label: '🔬 Sains Alam' },
    { value: 'Engineering & Technology',    label: '⚙️ Rekayasa & Teknologi' },
    { value: 'Life Sciences & Medicine',    label: '🌿 Hayati & Kesehatan' },
    { value: 'Social Sciences & Management',label: '📊 Sosial & Manajemen' },
    { value: 'Arts & Humanities',           label: '🎨 Seni & Humaniora' },
  ];

  grades = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  private searchTimeout: any;

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadPtOptions();
    this.loadJournals();
  }

  // ── Sort helpers ──────────────────────────────────────
  sortField(): string { return this.orderBy.startsWith('-') ? this.orderBy.slice(1) : this.orderBy; }
  sortDir(): 'asc' | 'desc' { return this.orderBy.startsWith('-') ? 'desc' : 'asc'; }

  toggleSort(field: string): void {
    if (this.sortField() === field) {
      this.orderBy = this.sortDir() === 'desc' ? field : '-' + field;
    } else {
      this.orderBy = '-' + field;
    }
    this.currentPage = 1;
    this.loadJournals();
  }

  // ── Stat chip helpers ─────────────────────────────────
  isChipActive(type: string, value?: string): boolean {
    if (type === 'all')    return !this.filterAkreditasi && !this.filterScopus && !this.filterGaruda && !this.filterWcu;
    if (type === 'scopus') return this.filterScopus === 'true' && !this.filterAkreditasi && !this.filterWcu;
    if (type === 'garuda') return this.filterGaruda === 'true' && !this.filterAkreditasi && !this.filterWcu;
    if (type === 'grade')  return this.filterAkreditasi === value && !this.filterWcu;
    if (type === 'wcu')    return this.filterWcu === value;
    return false;
  }

  clickStat(type: string, value?: string): void {
    this.filterAkreditasi = '';
    this.filterScopus = '';
    this.filterGaruda = '';
    this.filterWcu = '';
    if (type === 'scopus') this.filterScopus = 'true';
    if (type === 'garuda') this.filterGaruda = 'true';
    if (type === 'grade' && value) this.filterAkreditasi = value;
    if (type === 'wcu'   && value) this.filterWcu = value;
    this.currentPage = 1;
    this.loadJournals();
  }

  wcuIcon(area: string): string {
    const map: Record<string,string> = {
      'Natural Sciences': '🔬',
      'Engineering & Technology': '⚙️',
      'Life Sciences & Medicine': '🌿',
      'Social Sciences & Management': '📊',
      'Arts & Humanities': '🎨',
    };
    return map[area] ?? '📌';
  }

  wcuShort(area: string): string {
    const map: Record<string,string> = {
      'Natural Sciences': 'Sains Alam',
      'Engineering & Technology': 'Rekayasa',
      'Life Sciences & Medicine': 'Hayati & Kes.',
      'Social Sciences & Management': 'Sosial & Mgmt',
      'Arts & Humanities': 'Seni & Hum.',
    };
    return map[area] ?? area;
  }

  // ── Data loading ──────────────────────────────────────
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
    this.apiService.getSintaJurnalList(this.buildParams(this.currentPage, this.pageSize)).subscribe({
      next: (data) => {
        this.journals = data.results || data;
        this.totalCount = data.count || this.journals.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildParams(page: number, pageSize: number): any {
    const p: any = { page, page_size: pageSize, ordering: this.orderBy };
    if (this.search)           p['search'] = this.search;
    if (this.filterAkreditasi) p['akreditasi'] = this.filterAkreditasi;
    if (this.filterScopus)     p['is_scopus'] = this.filterScopus;
    if (this.filterGaruda)     p['is_garuda'] = this.filterGaruda;
    if (this.filterWcu)        p['wcu_area__icontains'] = this.filterWcu;
    if (this.filterPt)         p['perguruan_tinggi'] = this.filterPt;
    return p;
  }

  // ── Filter / search ───────────────────────────────────
  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => { this.currentPage = 1; this.loadJournals(); }, 400);
  }

  clearSearch(): void { this.search = ''; this.currentPage = 1; this.loadJournals(); }

  applyFilter(): void { this.currentPage = 1; this.loadJournals(); }

  resetFilter(): void {
    this.search = ''; this.filterAkreditasi = ''; this.filterScopus = '';
    this.filterGaruda = ''; this.filterWcu = ''; this.filterPt = ''; this.orderBy = '-impact';
    this.currentPage = 1; this.loadJournals();
  }

  goPage(page: number): void {
    this.currentPage = page;
    this.loadJournals();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onLogoError(event: any): void { event.target.style.display = 'none'; }

  openDetail(j: any): void {
    this.selectedJournal = j;
    document.body.style.overflow = 'hidden';
  }

  closeDetail(): void {
    this.selectedJournal = null;
    document.body.style.overflow = '';
  }

  // ── Export ────────────────────────────────────────────
  private async fetchAllForExport(): Promise<any[]> {
    const PAGE = 200;
    const first = await this.apiService.getSintaJurnalList(this.buildParams(1, PAGE)).toPromise();
    const total = first.count || first.results?.length || 0;
    let all: any[] = first.results || first;
    const pages = Math.ceil(total / PAGE);
    for (let p = 2; p <= pages; p++) {
      const res = await this.apiService.getSintaJurnalList(this.buildParams(p, PAGE)).toPromise();
      all = all.concat(res.results || res);
    }
    return all;
  }

  private toRows(data: any[]): any[][] {
    const header = ['No','Nama','Perguruan Tinggi','Akreditasi','P-ISSN','E-ISSN',
                    'Impact','H5-Index','Sitasi 5yr','Sitasi Total','Scopus','Garuda',
                    'Subject Area','URL Website','URL Scholar'];
    const rows = data.map((j, i) => [
      i + 1, j.nama, j.perguruan_tinggi_singkatan || j.perguruan_tinggi_nama,
      j.akreditasi, j.p_issn, j.e_issn,
      j.impact, j.h5_index, j.sitasi_5yr, j.sitasi_total,
      j.is_scopus ? 'Ya' : 'Tidak', j.is_garuda ? 'Ya' : 'Tidak',
      j.subject_area, j.url_website, j.url_scholar,
    ]);
    return [header, ...rows];
  }

  async exportCsv(): Promise<void> {
    this.exporting = true;
    try {
      const data = await this.fetchAllForExport();
      const rows = this.toRows(data);
      const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `jurnal_sinta_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
    } finally { this.exporting = false; }
  }

  async exportXlsx(): Promise<void> {
    this.exporting = true;
    try {
      const data = await this.fetchAllForExport();
      const rows = this.toRows(data);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // lebar kolom otomatis
      ws['!cols'] = [
        {wch:4},{wch:40},{wch:18},{wch:8},{wch:12},{wch:12},
        {wch:8},{wch:8},{wch:10},{wch:10},{wch:7},{wch:7},
        {wch:20},{wch:35},{wch:35},
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jurnal SINTA');
      XLSX.writeFile(wb, `jurnal_sinta_${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally { this.exporting = false; }
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
