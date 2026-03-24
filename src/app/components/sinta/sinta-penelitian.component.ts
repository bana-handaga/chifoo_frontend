import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface TrenItem      { tahun: number; jumlah: number; }
interface TopSkema      { skema: string; jumlah: number; }
interface TopSumber     { sumber: string; jumlah: number; }
interface TopKetua      { author_id: number; leader_nama: string; pt_singkatan: string; jumlah: number; }
interface SkemaKodeItem { skema_kode: string; skema: string; jumlah: number; }

interface AuthorTrendItem { jenis: string; tahun: number; jumlah: number; }
interface AuthorProfile {
  id: number; sinta_id: string; nama: string; foto_url: string; url_profil: string;
  pt_kode: string; pt_singkatan: string; dept_nama: string; dept_jenjang: string;
  bidang_keilmuan: string[];
  sinta_score_overall: number; sinta_score_3year: number;
  affil_score: number; affil_score_3year: number;
  scopus_artikel: number; scopus_sitasi: number; scopus_h_index: number;
  scopus_cited_doc: number; scopus_i10_index: number; scopus_g_index: number;
  scopus_q1: number; scopus_q2: number; scopus_q3: number; scopus_q4: number; scopus_noq: number;
  gscholar_artikel: number; gscholar_sitasi: number; gscholar_h_index: number;
  gscholar_cited_doc: number; gscholar_i10_index: number; gscholar_g_index: number;
  wos_artikel: number; wos_sitasi: number; wos_h_index: number;
  wos_cited_doc: number; wos_i10_index: number; wos_g_index: number;
  research_articles: number; research_conference: number; research_others: number;
  scraped_at: string;
  trend: AuthorTrendItem[];
}

interface StatsResponse {
  total_penelitian: number;
  total_author:     number;
  tren_research:    TrenItem[];
  tren_judul:       TrenItem[];
  top_skema:        TopSkema[];
  top_sumber:       TopSumber[];
  top_ketua:        TopKetua[];
  tahun_list:       number[];
  sumber_list:      string[];
  skema_kode_list:  SkemaKodeItem[];
}

interface PenelitianAuthor {
  author_id:    number;
  nama:         string;
  sinta_id:     string;
  pt_singkatan: string;
  is_leader:    boolean;
}
interface Penelitian {
  id:          number;
  judul:       string;
  leader_nama: string;
  skema:       string;
  skema_kode:  string;
  tahun:       number | null;
  dana:        string;
  status:      string;
  sumber:      string;
  authors:     PenelitianAuthor[];
}
interface PenelitianResponse {
  count:     number;
  page:      number;
  page_size: number;
  results:   Penelitian[];
}

// ─── Component ───────────────────────────────────────────────────────────────
@Component({
  selector: 'app-sinta-penelitian',
  template: `
<div class="sp-wrap">

  <!-- ── Breadcrumb ── -->
  <div class="sp-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Page Header ── -->
  <div class="sp-header">
    <div class="sp-header__icon">🔬</div>
    <div>
      <h1 class="sp-header__title">Penelitian PTMA</h1>
      <p class="sp-header__sub">Rekap kegiatan Research dosen Perguruan Tinggi Muhammadiyah–Aisyiyah di SINTA</p>
    </div>
  </div>

  <!-- ── Loading Stats ── -->
  <div class="sp-loading" *ngIf="statsLoading">
    <div class="sp-spinner"></div> Memuat statistik…
  </div>

  <ng-container *ngIf="stats">

    <!-- ── Summary Cards ── -->
    <div class="sp-cards">
      <div class="sp-card sp-card--green">
        <div class="sp-card__val">{{ stats.total_penelitian | number }}</div>
        <div class="sp-card__lbl">Total Penelitian</div>
        <div class="sp-card__note">judul penelitian unik</div>
      </div>
      <div class="sp-card sp-card--teal">
        <div class="sp-card__val">{{ stats.total_author | number }}</div>
        <div class="sp-card__lbl">Dosen Terlibat</div>
        <div class="sp-card__note">ketua &amp; anggota</div>
      </div>
      <div class="sp-card sp-card--emerald">
        <div class="sp-card__val">{{ stats.top_skema.length | number }}</div>
        <div class="sp-card__lbl">Skema</div>
        <div class="sp-card__note">jenis skema tercatat</div>
      </div>
      <div class="sp-card sp-card--orange">
        <div class="sp-card__val">{{ latestYear }}</div>
        <div class="sp-card__lbl">Tahun Terbaru</div>
        <div class="sp-card__note">data ter-update</div>
      </div>
    </div>

    <!-- ══ ACCORDION 1: Tren & Statistik ══ -->
    <div class="sp-accordion" [class.sp-accordion--open]="acc1Open">
      <button class="sp-accordion__header" (click)="acc1Open = !acc1Open">
        <span class="sp-accordion__icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
        </span>
        <span class="sp-accordion__title">Tren &amp; Statistik</span>
        <span class="sp-accordion__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>

      <div class="sp-accordion__body">

        <!-- Tren tabs -->
        <div class="sp-section">
          <div class="sp-section__head">
            <h2 class="sp-section__title">Tren Penelitian PTMA</h2>
            <span class="sp-section__note">Agregat dari semua dosen yang sudah ter-scrape</span>
          </div>
          <div class="sp-tren-tabs">
            <button class="sp-tren-tab" [class.active]="trenTab==='research'" (click)="trenTab='research'">Jumlah Kegiatan (Author Trend)</button>
            <button class="sp-tren-tab" [class.active]="trenTab==='judul'" (click)="trenTab='judul'">Jumlah Judul Unik</button>
          </div>
          <ng-container *ngIf="trenTab==='research'">
            <ng-container *ngTemplateOutlet="lineChart; context:{data: stats.tren_research, color:'#059669', fill:'#d1fae5'}"></ng-container>
          </ng-container>
          <ng-container *ngIf="trenTab==='judul'">
            <ng-container *ngTemplateOutlet="lineChart; context:{data: stats.tren_judul, color:'#0d9488', fill:'#ccfbf1'}"></ng-container>
          </ng-container>

          <ng-template #lineChart let-data="data" let-color="color" let-fill="fill">
            <div class="sp-linechart-wrap" *ngIf="data && data.length">
              <svg class="sp-linechart" viewBox="0 0 700 200" preserveAspectRatio="xMidYMid meet">
                <line *ngFor="let g of lcGridY(data)"
                      [attr.x1]="56" [attr.x2]="690"
                      [attr.y1]="lcY(data, g)" [attr.y2]="lcY(data, g)"
                      stroke="#f3f4f6" stroke-width="1"/>
                <text *ngFor="let g of lcGridY(data)"
                      [attr.x]="50" [attr.y]="lcY(data, g) + 4"
                      text-anchor="end" font-size="10" fill="#9ca3af">
                  {{ g >= 1000 ? (g / 1000 | number:'1.0-1') + 'k' : g }}
                </text>
                <path [attr.d]="lcAreaPath(data)" [attr.fill]="fill" opacity="0.5"/>
                <path [attr.d]="lcLinePath(data)" [attr.stroke]="color"
                      fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
                <g *ngFor="let pt of lcPoints(data)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4"
                          [attr.fill]="color" stroke="#fff" stroke-width="2">
                    <title>{{ pt.tahun }}: {{ pt.jumlah | number }}</title>
                  </circle>
                  <text [attr.x]="pt.x" [attr.y]="pt.y - 9"
                        text-anchor="middle" font-size="9.5" [attr.fill]="color" font-weight="600">
                    {{ pt.jumlah >= 1000 ? (pt.jumlah / 1000 | number:'1.0-1') + 'k' : pt.jumlah }}
                  </text>
                </g>
                <text *ngFor="let pt of lcLabelPoints(data)"
                      [attr.x]="pt.x" [attr.y]="196"
                      text-anchor="middle" font-size="9" fill="#6b7280">{{ pt.tahun }}</text>
                <line x1="56" [attr.x2]="690" [attr.y1]="175" [attr.y2]="175"
                      stroke="#e5e7eb" stroke-width="1"/>
              </svg>
            </div>
            <div class="sp-empty" *ngIf="!data || !data.length">Belum ada data tren.</div>
          </ng-template>
        </div>

        <!-- 2-col: Top Skema + Top Sumber -->
        <div class="sp-grid-2">
          <div class="sp-section">
            <h2 class="sp-section__title">Top Skema Penelitian</h2>
            <div class="sp-bar-list">
              <div class="sp-bar-row" *ngFor="let s of stats.top_skema">
                <span class="sp-bar-lbl" [title]="s.skema">{{ s.skema | slice:0:40 }}{{ s.skema.length > 40 ? '…' : '' }}</span>
                <div class="sp-bar-wrap">
                  <div class="sp-bar sp-bar--green" [style.width.%]="barPct(s.jumlah, stats.top_skema[0].jumlah)"></div>
                </div>
                <span class="sp-bar-val">{{ s.jumlah | number }}</span>
              </div>
              <div class="sp-empty" *ngIf="!stats.top_skema.length">Belum ada data.</div>
            </div>
          </div>
          <div class="sp-section">
            <h2 class="sp-section__title">Distribusi Sumber Dana</h2>
            <div class="sp-donut-wrap">
              <svg viewBox="0 0 160 160" width="140" height="140">
                <g *ngFor="let seg of donutSegments(stats.top_sumber)">
                  <path [attr.d]="seg.path" [attr.fill]="seg.color">
                    <title>{{ seg.label }}: {{ seg.jumlah | number }}</title>
                  </path>
                </g>
                <circle cx="80" cy="80" r="46" fill="white"/>
                <text x="80" y="75" text-anchor="middle" font-size="13" font-weight="700" fill="#1e293b">{{ stats.total_penelitian | number }}</text>
                <text x="80" y="92" text-anchor="middle" font-size="9" fill="#64748b">penelitian</text>
              </svg>
              <div class="sp-donut-legend">
                <div class="sp-legend-item" *ngFor="let seg of donutSegments(stats.top_sumber)">
                  <span class="sp-legend-dot" [style.background]="seg.color"></span>
                  <span class="sp-legend-lbl">{{ seg.label }}</span>
                  <span class="sp-legend-val">{{ seg.jumlah | number }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ ACCORDION 2: Top Ketua ══ -->
    <div class="sp-accordion" [class.sp-accordion--open]="acc2Open">
      <button class="sp-accordion__header" (click)="acc2Open = !acc2Open">
        <span class="sp-accordion__icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </span>
        <span class="sp-accordion__title">Top 10 Ketua Penelitian</span>
        <span class="sp-accordion__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
      <div class="sp-accordion__body">
        <div class="sp-section">
          <div class="sp-top-list">
            <div class="sp-top-row" *ngFor="let k of stats.top_ketua; let i = index"
                 [class.sp-top-row--clickable]="k.author_id"
                 (click)="k.author_id && openAuthorPopup(k.author_id)">
              <span class="sp-rank">{{ i + 1 }}</span>
              <div class="sp-top-info">
                <div class="sp-top-nama">{{ k.leader_nama | titleCaseId }}</div>
                <div class="sp-top-pt" *ngIf="k.pt_singkatan">{{ k.pt_singkatan }}</div>
              </div>
              <span class="sp-top-n">{{ k.jumlah }}<small> pen.</small></span>
              <span class="sp-top-arrow" *ngIf="k.author_id">›</span>
            </div>
            <div class="sp-empty" *ngIf="!stats.top_ketua.length">Belum ada data.</div>
          </div>
        </div>
      </div>
    </div>

  </ng-container>

  <!-- ══ ACCORDION 3: Daftar Penelitian ══ -->
  <div class="sp-accordion" [class.sp-accordion--open]="acc3Open">
    <button class="sp-accordion__header" (click)="acc3Open = !acc3Open">
      <span class="sp-accordion__icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
      </span>
      <span class="sp-accordion__title">Daftar Kegiatan Penelitian</span>
      <span class="sp-accordion__badge" *ngIf="listTotal">{{ listTotal | number }} penelitian</span>
      <span class="sp-accordion__chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </button>

    <div class="sp-accordion__body">

      <!-- Filter bar -->
      <div class="sp-filters">
        <input class="sp-filter-input" type="text" placeholder="Cari judul atau nama ketua…"
               [(ngModel)]="filterSearch" (input)="onSearchInput()" />

        <select class="sp-filter-select" [(ngModel)]="filterTahun" (change)="loadList(1)">
          <option value="">Semua Tahun</option>
          <option *ngFor="let t of (stats?.tahun_list || [])" [value]="t">{{ t }}</option>
        </select>

        <select class="sp-filter-select" [(ngModel)]="filterSumber" (change)="loadList(1)">
          <option value="">Semua Sumber Dana</option>
          <option *ngFor="let s of (stats?.sumber_list || [])" [value]="s">{{ s }}</option>
        </select>

        <button class="sp-filter-reset" (click)="resetFilters()" *ngIf="filterSearch || filterTahun || filterSumber">
          ✕ Reset
        </button>
      </div>

      <!-- Loading -->
      <div class="sp-loading sp-loading--list" *ngIf="listLoading">
        <div class="sp-spinner"></div> Memuat data…
      </div>

      <!-- Table -->
      <div class="sp-table-wrap" *ngIf="!listLoading">
        <table class="sp-table" *ngIf="list.length">
          <thead>
            <tr>
              <th class="sp-th sp-th--no">#</th>
              <th class="sp-th sp-th--judul sp-th--sort" (click)="toggleSort('judul')">
                Judul Penelitian <span class="sp-sort-icon" [class.sp-sort-icon--active]="sortField==='judul'">{{ sortIcon('judul') }}</span>
              </th>
              <th class="sp-th sp-th--skema sp-th--sort" (click)="toggleSort('skema_kode')">
                Skema <span class="sp-sort-icon" [class.sp-sort-icon--active]="sortField==='skema_kode'">{{ sortIcon('skema_kode') }}</span>
              </th>
              <th class="sp-th sp-th--tahun sp-th--sort" (click)="toggleSort('tahun')">
                Tahun <span class="sp-sort-icon" [class.sp-sort-icon--active]="sortField==='tahun'">{{ sortIcon('tahun') }}</span>
              </th>
              <th class="sp-th sp-th--dana sp-th--sort" (click)="toggleSort('dana')">
                Dana <span class="sp-sort-icon" [class.sp-sort-icon--active]="sortField==='dana'">{{ sortIcon('dana') }}</span>
              </th>
              <th class="sp-th sp-th--sumber sp-th--sort" (click)="toggleSort('sumber')">
                Sumber <span class="sp-sort-icon" [class.sp-sort-icon--active]="sortField==='sumber'">{{ sortIcon('sumber') }}</span>
              </th>
              <th class="sp-th sp-th--team">Tim</th>
            </tr>
          </thead>
          <tbody>
            <tr class="sp-tr" *ngFor="let p of list; let i = index"
                [class.sp-tr--expanded]="expandedId === p.id"
                (click)="toggleExpand(p.id)">
              <td class="sp-td sp-td--no">{{ (listPage - 1) * listPageSize + i + 1 }}</td>
              <td class="sp-td sp-td--judul">
                <div class="sp-judul-text">{{ p.judul | titleCaseId }}</div>
                <!-- Expanded authors -->
                <div class="sp-authors" *ngIf="expandedId === p.id && p.authors.length">
                  <span class="sp-author-chip" *ngFor="let a of p.authors"
                        [class.sp-author-chip--leader]="a.is_leader"
                        (click)="openAuthorPopup(a.author_id, $event)">
                    {{ a.is_leader ? '👤 ' : '' }}{{ a.nama | titleCaseId }}
                    <span class="sp-author-pt" *ngIf="a.pt_singkatan">· {{ a.pt_singkatan }}</span>
                  </span>
                </div>
              </td>
              <td class="sp-td sp-td--skema">
                <span class="sp-skema-badge" *ngIf="p.skema_kode">{{ p.skema_kode }}</span>
                <span class="sp-skema-name" *ngIf="p.skema && !p.skema_kode">{{ p.skema | slice:0:30 }}</span>
              </td>
              <td class="sp-td sp-td--tahun">{{ p.tahun || '–' }}</td>
              <td class="sp-td sp-td--dana">{{ p.dana || '–' }}</td>
              <td class="sp-td sp-td--sumber">
                <span class="sp-sumber-badge" *ngIf="p.sumber" [class]="'sp-sumber-' + sumberClass(p.sumber)">{{ p.sumber }}</span>
                <span *ngIf="!p.sumber">–</span>
              </td>
              <td class="sp-td sp-td--team">
                <span class="sp-team-count" *ngIf="p.authors.length">{{ p.authors.length }}</span>
                <span *ngIf="!p.authors.length">–</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="sp-empty" *ngIf="!list.length && !listLoading">
          Tidak ada data yang cocok dengan filter.
        </div>
      </div>

      <!-- Pagination -->
      <div class="sp-pagination" *ngIf="listTotalPages > 1">
        <button class="sp-page-btn" [disabled]="listPage === 1" (click)="loadList(listPage - 1)">‹</button>
        <span class="sp-page-info">{{ listPage }} / {{ listTotalPages }}</span>
        <button class="sp-page-btn" [disabled]="listPage === listTotalPages" (click)="loadList(listPage + 1)">›</button>
        <span class="sp-page-total">{{ listTotal | number }} penelitian</span>
      </div>

    </div>
  </div>

<!-- ══ Author Popup Overlay ══ -->
<div class="ap-overlay" *ngIf="authorPopup || authorPopupLoading" (click)="closeAuthorPopup()">
  <div class="ap-popup" (click)="$event.stopPropagation()">

    <div class="ap-loading" *ngIf="authorPopupLoading && !authorPopup">
      <div class="sp-spinner sp-spinner--lg"></div>
    </div>

    <ng-container *ngIf="authorPopup as p">
      <button class="ap-close" (click)="closeAuthorPopup()">✕</button>

      <div class="ap-header">
        <img class="ap-foto" [src]="p.foto_url || 'assets/avatar.png'"
             (error)="$any($event.target).src='assets/avatar.png'" alt="foto">
        <div class="ap-header-info">
          <div class="ap-nama">{{ p.nama | titleCaseId }}</div>
          <div class="ap-dept" *ngIf="p.dept_nama">{{ p.dept_jenjang }} {{ p.dept_nama }}</div>
          <div class="ap-pt">{{ p.pt_singkatan }}</div>
          <div class="ap-tags">
            <span class="ap-tag" *ngFor="let b of p.bidang_keilmuan">{{ b }}</span>
          </div>
        </div>
      </div>

      <div class="ap-section">
        <div class="ap-section-lbl">SINTA Score</div>
        <div class="ap-score-row">
          <div class="ap-score-box ap-score-box--blue">
            <div class="ap-score-val">{{ p.sinta_score_overall | number }}</div>
            <div class="ap-score-lbl">Overall</div>
          </div>
          <div class="ap-score-box ap-score-box--sky">
            <div class="ap-score-val">{{ p.sinta_score_3year | number }}</div>
            <div class="ap-score-lbl">3 Tahun</div>
          </div>
          <div class="ap-score-box ap-score-box--teal" *ngIf="p.affil_score">
            <div class="ap-score-val">{{ p.affil_score | number }}</div>
            <div class="ap-score-lbl">Afiliasi</div>
          </div>
        </div>
      </div>

      <div class="ap-section">
        <div class="ap-section-lbl">Statistik Publikasi</div>
        <table class="ap-table">
          <thead>
            <tr><th>Sumber</th><th>Artikel</th><th>Sitasi</th><th>H</th><th>i10</th><th>G</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="ap-src ap-src--scopus">Scopus</span></td>
              <td>{{ p.scopus_artikel | number }}</td><td>{{ p.scopus_sitasi | number }}</td>
              <td>{{ p.scopus_h_index }}</td><td>{{ p.scopus_i10_index }}</td><td>{{ p.scopus_g_index }}</td>
            </tr>
            <tr>
              <td><span class="ap-src ap-src--gs">G.Scholar</span></td>
              <td>{{ p.gscholar_artikel | number }}</td><td>{{ p.gscholar_sitasi | number }}</td>
              <td>{{ p.gscholar_h_index }}</td><td>{{ p.gscholar_i10_index }}</td><td>{{ p.gscholar_g_index }}</td>
            </tr>
            <tr>
              <td><span class="ap-src ap-src--wos">WoS</span></td>
              <td>{{ p.wos_artikel | number }}</td><td>{{ p.wos_sitasi | number }}</td>
              <td>{{ p.wos_h_index }}</td><td>{{ p.wos_i10_index }}</td><td>{{ p.wos_g_index }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="ap-section" *ngIf="totalScopusQ(p) > 0">
        <div class="ap-section-lbl">Distribusi Kuartil Scopus</div>
        <div class="ap-kuartil-bars">
          <div class="ap-qbar-row" *ngIf="p.scopus_q1 > 0">
            <span class="ap-qbadge ap-qbadge--q1">Q1</span>
            <div class="ap-qbar-wrap"><div class="ap-qbar ap-qbar--q1" [style.width.%]="barPct(p.scopus_q1, totalScopusQ(p))"></div></div>
            <span class="ap-qval">{{ p.scopus_q1 }}</span>
          </div>
          <div class="ap-qbar-row" *ngIf="p.scopus_q2 > 0">
            <span class="ap-qbadge ap-qbadge--q2">Q2</span>
            <div class="ap-qbar-wrap"><div class="ap-qbar ap-qbar--q2" [style.width.%]="barPct(p.scopus_q2, totalScopusQ(p))"></div></div>
            <span class="ap-qval">{{ p.scopus_q2 }}</span>
          </div>
          <div class="ap-qbar-row" *ngIf="p.scopus_q3 > 0">
            <span class="ap-qbadge ap-qbadge--q3">Q3</span>
            <div class="ap-qbar-wrap"><div class="ap-qbar ap-qbar--q3" [style.width.%]="barPct(p.scopus_q3, totalScopusQ(p))"></div></div>
            <span class="ap-qval">{{ p.scopus_q3 }}</span>
          </div>
          <div class="ap-qbar-row" *ngIf="p.scopus_q4 > 0">
            <span class="ap-qbadge ap-qbadge--q4">Q4</span>
            <div class="ap-qbar-wrap"><div class="ap-qbar ap-qbar--q4" [style.width.%]="barPct(p.scopus_q4, totalScopusQ(p))"></div></div>
            <span class="ap-qval">{{ p.scopus_q4 }}</span>
          </div>
          <div class="ap-qbar-row" *ngIf="p.scopus_noq > 0">
            <span class="ap-qbadge ap-qbadge--noq">NoQ</span>
            <div class="ap-qbar-wrap"><div class="ap-qbar ap-qbar--noq" [style.width.%]="barPct(p.scopus_noq, totalScopusQ(p))"></div></div>
            <span class="ap-qval">{{ p.scopus_noq }}</span>
          </div>
        </div>
      </div>

      <div class="ap-section">
        <div class="ap-section-lbl">Output Riset &amp; Pengabdian (SINTA)</div>
        <div class="ap-output-row">
          <div class="ap-output-item">
            <div class="ap-output-val ap-output-val--green">{{ (p.research_articles || 0) | number }}</div>
            <div class="ap-output-lbl">Artikel</div>
          </div>
          <div class="ap-output-item">
            <div class="ap-output-val ap-output-val--purple">{{ (p.research_conference || 0) | number }}</div>
            <div class="ap-output-lbl">Konferensi</div>
          </div>
          <div class="ap-output-item">
            <div class="ap-output-val ap-output-val--orange">{{ (p.research_others || 0) | number }}</div>
            <div class="ap-output-lbl">Lainnya</div>
          </div>
          <div class="ap-output-item">
            <div class="ap-output-val ap-output-val--teal">{{ trenTotal(p, 'research') | number }}</div>
            <div class="ap-output-lbl">Penelitian</div>
          </div>
          <div class="ap-output-item">
            <div class="ap-output-val ap-output-val--blue">{{ trenTotal(p, 'service') | number }}</div>
            <div class="ap-output-lbl">Pengabdian</div>
          </div>
        </div>
      </div>

      <div class="ap-section" *ngIf="trenData(p,'scopus').length || trenData(p,'gscholar_pub').length || trenData(p,'research').length || trenData(p,'service').length">
        <div class="ap-section-lbl">Tren Tahunan (semua tahun)</div>
        <div class="ap-sparklines">
          <div class="ap-spark-item" *ngIf="trenData(p,'scopus').length">
            <div class="ap-spark-lbl">🟠 Artikel Scopus</div>
            <svg class="ap-spark" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path [attr.d]="sparkPath(trenData(p,'scopus'))" fill="none" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkArea(trenData(p,'scopus'))" fill="#fde68a" opacity="0.5"/>
              <circle *ngFor="let pt of sparkPts(trenData(p,'scopus'))"
                      [attr.cx]="pt.x" [attr.cy]="pt.y" r="2" fill="#d97706">
                <title>{{ pt.tahun }}: {{ pt.v }}</title>
              </circle>
            </svg>
          </div>
          <div class="ap-spark-item" *ngIf="trenData(p,'gscholar_pub').length">
            <div class="ap-spark-lbl">🔵 Artikel G.Scholar</div>
            <svg class="ap-spark" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path [attr.d]="sparkPath(trenData(p,'gscholar_pub'))" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkArea(trenData(p,'gscholar_pub'))" fill="#bfdbfe" opacity="0.5"/>
              <circle *ngFor="let pt of sparkPts(trenData(p,'gscholar_pub'))"
                      [attr.cx]="pt.x" [attr.cy]="pt.y" r="2" fill="#2563eb">
                <title>{{ pt.tahun }}: {{ pt.v }}</title>
              </circle>
            </svg>
          </div>
          <div class="ap-spark-item" *ngIf="trenData(p,'research').length">
            <div class="ap-spark-lbl">🔬 Penelitian</div>
            <svg class="ap-spark" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path [attr.d]="sparkPath(trenData(p,'research'))" fill="none" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkArea(trenData(p,'research'))" fill="#a7f3d0" opacity="0.5"/>
              <circle *ngFor="let pt of sparkPts(trenData(p,'research'))"
                      [attr.cx]="pt.x" [attr.cy]="pt.y" r="2" fill="#059669">
                <title>{{ pt.tahun }}: {{ pt.v }}</title>
              </circle>
            </svg>
          </div>
          <div class="ap-spark-item" *ngIf="trenData(p,'service').length">
            <div class="ap-spark-lbl">🤝 Pengabdian</div>
            <svg class="ap-spark" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path [attr.d]="sparkPath(trenData(p,'service'))" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkArea(trenData(p,'service'))" fill="#bae6fd" opacity="0.5"/>
              <circle *ngFor="let pt of sparkPts(trenData(p,'service'))"
                      [attr.cx]="pt.x" [attr.cy]="pt.y" r="2" fill="#0284c7">
                <title>{{ pt.tahun }}: {{ pt.v }}</title>
              </circle>
            </svg>
          </div>
        </div>
      </div>

      <div class="ap-footer">
        <a [href]="p.url_profil" target="_blank" rel="noopener" class="ap-link-sinta">
          Lihat profil SINTA lengkap ↗
        </a>
      </div>
    </ng-container>
  </div>
</div>

</div>
`,
  styles: [`
    .sp-wrap { padding: 1.25rem 1.25rem 3rem; max-width: 1400px; margin: 0 auto; }

    .sp-back {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .83rem; color: #64748b; cursor: pointer;
      margin-bottom: 1rem; padding: .3rem .6rem;
      border-radius: 6px; transition: background .15s;
    }
    .sp-back:hover { background: #f1f5f9; color: #1e293b; }

    .sp-header {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1.1rem 1.4rem; border-radius: 12px;
      background: linear-gradient(135deg, #059669, #065f46);
      color: #fff; margin-bottom: 1.5rem;
      box-shadow: 0 4px 16px rgba(5,150,105,.35);
    }
    .sp-header__icon { font-size: 2rem; flex-shrink: 0; margin-top: 2px; }
    .sp-header__title { font-size: 1.3rem; font-weight: 800; margin: 0 0 .3rem; }
    .sp-header__sub { font-size: .85rem; opacity: .9; margin: 0; }

    .sp-loading { display: flex; align-items: center; gap: .75rem; color: #64748b; font-size: .875rem; padding: 1rem 0; }
    .sp-loading--list { justify-content: center; padding: 2rem; }
    .sp-spinner {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid #e2e8f0; border-top-color: #059669;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sp-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: .75rem; margin-bottom: 1.5rem; }
    .sp-card {
      background: #fff; border-radius: 10px; padding: .9rem 1.1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      border-left: 4px solid transparent;
    }
    .sp-card--green   { border-color: #059669; }
    .sp-card--teal    { border-color: #0d9488; }
    .sp-card--emerald { border-color: #10b981; }
    .sp-card--orange  { border-color: #ea580c; }
    .sp-card__val  { font-size: 1.6rem; font-weight: 800; color: #1e293b; line-height: 1; }
    .sp-card__lbl  { font-size: .78rem; font-weight: 600; color: #475569; margin-top: .3rem; }
    .sp-card__note { font-size: .72rem; color: #94a3b8; margin-top: .15rem; }

    .sp-accordion {
      background: #fff; border-radius: 12px; margin-bottom: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); overflow: hidden;
    }
    .sp-accordion__header {
      display: flex; align-items: center; gap: .6rem;
      width: 100%; padding: .9rem 1.2rem; background: none; border: none;
      cursor: pointer; font-size: .92rem; font-weight: 700; color: #1e293b;
      transition: background .15s;
    }
    .sp-accordion__header:hover { background: #f8fafc; }
    .sp-accordion__icon { display: flex; color: #059669; }
    .sp-accordion__title { flex: 1; text-align: left; }
    .sp-accordion__badge {
      font-size: .72rem; font-weight: 600; color: #059669;
      background: #d1fae5; padding: .15rem .5rem; border-radius: 20px;
    }
    .sp-accordion__chevron { display: flex; color: #94a3b8; transition: transform .2s; }
    .sp-accordion--open .sp-accordion__chevron { transform: rotate(180deg); }
    .sp-accordion__body { display: none; padding: 1rem 1.2rem 1.2rem; border-top: 1px solid #f1f5f9; }
    .sp-accordion--open .sp-accordion__body { display: block; }

    .sp-section { margin-bottom: 1.5rem; }
    .sp-section:last-child { margin-bottom: 0; }
    .sp-section__head { margin-bottom: .75rem; }
    .sp-section__title { font-size: .95rem; font-weight: 700; color: #1e293b; margin: 0 0 .2rem; }
    .sp-section__note  { font-size: .78rem; color: #94a3b8; display: block; }

    .sp-tren-tabs { display: flex; gap: .5rem; margin-bottom: .75rem; flex-wrap: wrap; }
    .sp-tren-tab {
      padding: .35rem .8rem; font-size: .8rem; border-radius: 6px; border: 1px solid #e2e8f0;
      background: #f8fafc; color: #475569; cursor: pointer; transition: all .15s;
    }
    .sp-tren-tab.active { background: #059669; color: #fff; border-color: #059669; font-weight: 600; }

    .sp-linechart-wrap { overflow-x: auto; }
    .sp-linechart { width: 100%; min-width: 400px; display: block; }

    .sp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 640px) { .sp-grid-2 { grid-template-columns: 1fr; } }

    .sp-bar-list { display: flex; flex-direction: column; gap: .5rem; }
    .sp-bar-row  { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
    .sp-bar-lbl  { width: 160px; flex-shrink: 0; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sp-bar-wrap { flex: 1; background: #f1f5f9; border-radius: 4px; height: 10px; overflow: hidden; }
    .sp-bar      { height: 100%; border-radius: 4px; transition: width .4s; }
    .sp-bar--green { background: #059669; }
    .sp-bar-val  { width: 36px; text-align: right; font-weight: 600; color: #334155; }

    .sp-donut-wrap { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .sp-donut-legend { display: flex; flex-direction: column; gap: .4rem; }
    .sp-legend-item  { display: flex; align-items: center; gap: .4rem; font-size: .78rem; }
    .sp-legend-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sp-legend-lbl   { flex: 1; color: #475569; }
    .sp-legend-val   { font-weight: 600; color: #334155; }

    .sp-top-list  { display: flex; flex-direction: column; gap: .5rem; }
    .sp-top-row   { display: flex; align-items: center; gap: .75rem; padding: .5rem .75rem; border-radius: 8px; background: #f8fafc; }
    .sp-rank      { width: 24px; height: 24px; border-radius: 50%; background: #059669; color: #fff; font-size: .75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sp-top-info  { flex: 1; min-width: 0; }
    .sp-top-nama  { font-size: .875rem; font-weight: 600; color: #1e293b; }
    .sp-top-n     { font-size: .875rem; font-weight: 700; color: #059669; white-space: nowrap; }
    .sp-top-n small { font-weight: 400; color: #94a3b8; font-size: .75rem; }
    .sp-top-row--clickable { cursor: pointer; }
    .sp-top-row--clickable:hover { background: #d1fae5; }
    .sp-top-pt   { font-size: .72rem; color: #059669; font-weight: 600; margin-top: .1rem; }
    .sp-top-arrow { color: #94a3b8; font-size: 1rem; margin-left: .25rem; }

    .sp-filters { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .sp-filter-input {
      flex: 1; min-width: 200px; padding: .45rem .75rem;
      border: 1px solid #e2e8f0; border-radius: 8px; font-size: .85rem;
      outline: none; transition: border .15s;
    }
    .sp-filter-input:focus { border-color: #059669; box-shadow: 0 0 0 2px rgba(5,150,105,.15); }
    .sp-filter-select {
      padding: .45rem .75rem; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: .85rem; background: #fff; color: #334155; cursor: pointer; outline: none;
    }
    .sp-filter-select:focus { border-color: #059669; }
    .sp-filter-reset {
      padding: .45rem .75rem; border-radius: 8px; border: 1px solid #fca5a5;
      background: #fef2f2; color: #dc2626; font-size: .82rem; cursor: pointer;
    }

    .sp-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #f1f5f9; }
    .sp-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .sp-th {
      padding: .6rem .75rem; background: #f8fafc; font-weight: 700; color: #475569;
      text-align: left; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
    }
    .sp-th--no     { width: 42px; }
    .sp-th--tahun  { width: 64px; }
    .sp-th--dana   { width: 160px; }
    .sp-th--sumber { width: 90px; }
    .sp-th--skema  { width: 240px; }
    .sp-th--sort   { cursor: pointer; user-select: none; white-space: nowrap; }
    .sp-th--sort:hover { background: #f1f5f9; }
    .sp-sort-icon  { font-size: .7rem; color: #cbd5e1; margin-left: 3px; }
    .sp-sort-icon--active { color: #059669; font-weight: 700; }
    .sp-th--team   { width: 48px; text-align: center; }
    .sp-td { padding: .55rem .75rem; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
    .sp-tr { cursor: pointer; transition: background .1s; }
    .sp-tr:hover { background: #f8fafc; }
    .sp-tr--expanded { background: #ecfdf5; }
    .sp-td--no { color: #94a3b8; font-size: .75rem; }
    .sp-td--tahun, .sp-td--team { text-align: center; }
    .sp-td--dana { font-size: .78rem; text-align: right; }

    .sp-judul-text { font-weight: 500; line-height: 1.4; }

    .sp-authors { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .5rem; }
    .sp-author-chip {
      font-size: .72rem; padding: .2rem .5rem; border-radius: 20px;
      background: #d1fae5; color: #065f46; cursor: pointer; transition: background .12s, color .12s;
    }
    .sp-author-chip:hover { background: #059669; color: #fff; }
    .sp-author-chip--leader { background: #fef3c7; color: #92400e; font-weight: 600; }
    .sp-author-chip--leader:hover { background: #d97706; color: #fff; }
    .sp-author-pt { color: #64748b; }

    .sp-skema-badge {
      display: inline-block; padding: .15rem .45rem; border-radius: 4px;
      background: #d1fae5; color: #065f46; font-size: .72rem; font-weight: 600;
    }
    .sp-skema-name { font-size: .75rem; color: #64748b; }
    .sp-team-count {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      background: #d1fae5; color: #065f46; font-weight: 700; font-size: .75rem;
    }

    .sp-sumber-badge {
      display: inline-block; padding: .15rem .45rem; border-radius: 4px; font-size: .72rem; font-weight: 600;
    }
    .sp-sumber-dikti   { background: #dcfce7; color: #166534; }
    .sp-sumber-mandiri { background: #fef9c3; color: #854d0e; }
    .sp-sumber-industri{ background: #fce7f3; color: #9d174d; }
    .sp-sumber-other   { background: #f1f5f9; color: #475569; }

    .sp-pagination {
      display: flex; align-items: center; gap: .5rem; justify-content: center;
      margin-top: 1rem; font-size: .85rem;
    }
    .sp-page-btn {
      padding: .35rem .7rem; border-radius: 6px; border: 1px solid #e2e8f0;
      background: #fff; cursor: pointer; font-size: .9rem; color: #475569;
    }
    .sp-page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .sp-page-info { font-weight: 600; color: #1e293b; }
    .sp-page-total { color: #94a3b8; font-size: .78rem; }

    .sp-empty { color: #94a3b8; font-size: .875rem; padding: 1.5rem; text-align: center; }
    .sp-spinner--lg { width: 32px; height: 32px; border-width: 3px; }

    /* ══ Author Popup ══ */
    .ap-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .ap-popup {
      background: #fff; border-radius: 14px; width: 100%; max-width: 460px;
      box-shadow: 0 24px 64px rgba(0,0,0,.28);
      position: relative; max-height: 90vh; overflow-y: auto; padding: 20px;
    }
    .ap-close {
      position: absolute; top: 12px; right: 14px;
      border: none; background: none; font-size: 16px;
      color: #94a3b8; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px;
    }
    .ap-close:hover { background: #f1f5f9; color: #1e293b; }
    .ap-loading { display: flex; justify-content: center; padding: 40px; }

    .ap-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .ap-foto {
      width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
      border: 2px solid #e2e8f0; flex-shrink: 0;
    }
    .ap-nama { font-size: 14px; font-weight: 800; color: #111827; line-height: 1.3; }
    .ap-dept { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .ap-pt   { font-size: 12px; font-weight: 700; color: #059669; margin-top: 3px; }
    .ap-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .ap-tag  { font-size: 10px; background: #f0fdf4; color: #15803d; border-radius: 4px; padding: 2px 6px; }

    .ap-section { border-top: 1px solid #f3f4f6; padding-top: 10px; margin-bottom: 10px; }
    .ap-section-lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }

    .ap-score-row { display: flex; gap: 8px; }
    .ap-score-box { flex: 1; border-radius: 8px; padding: 8px 10px; text-align: center; }
    .ap-score-box--blue  { background: #eff6ff; }
    .ap-score-box--sky   { background: #f0f9ff; }
    .ap-score-box--teal  { background: #f0fdfa; }
    .ap-score-val { font-size: 18px; font-weight: 800; color: #1e40af; }
    .ap-score-lbl { font-size: 10px; color: #6b7280; margin-top: 1px; }

    .ap-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .ap-table th { text-align: left; color: #9ca3af; font-weight: 600; font-size: 10px; padding: 3px 6px; border-bottom: 1px solid #f3f4f6; }
    .ap-table td { padding: 4px 6px; color: #111827; }
    .ap-table tr:nth-child(even) td { background: #f9fafb; }
    .ap-src { font-size: 10px; padding: 2px 5px; border-radius: 4px; font-weight: 700; white-space: nowrap; }
    .ap-src--scopus { background: #fef3c7; color: #92400e; }
    .ap-src--gs     { background: #dbeafe; color: #1e40af; }
    .ap-src--wos    { background: #ede9fe; color: #5b21b6; }

    .ap-kuartil-bars { display: flex; flex-direction: column; gap: 5px; }
    .ap-qbar-row { display: flex; align-items: center; gap: 6px; }
    .ap-qbadge { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; width: 28px; text-align: center; flex-shrink: 0; }
    .ap-qbadge--q1  { background: #166534; color: #fff; }
    .ap-qbadge--q2  { background: #15803d; color: #fff; }
    .ap-qbadge--q3  { background: #ca8a04; color: #fff; }
    .ap-qbadge--q4  { background: #dc2626; color: #fff; }
    .ap-qbadge--noq { background: #6b7280; color: #fff; }
    .ap-qbar-wrap { flex: 1; background: #f1f5f9; border-radius: 4px; height: 8px; overflow: hidden; }
    .ap-qbar { height: 100%; border-radius: 4px; transition: width .4s; }
    .ap-qbar--q1  { background: #166534; }
    .ap-qbar--q2  { background: #16a34a; }
    .ap-qbar--q3  { background: #ca8a04; }
    .ap-qbar--q4  { background: #dc2626; }
    .ap-qbar--noq { background: #9ca3af; }
    .ap-qval { width: 28px; text-align: right; font-size: 11px; font-weight: 600; color: #374151; flex-shrink: 0; }

    .ap-output-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .ap-output-item { flex: 1; min-width: 52px; background: #f8fafc; border-radius: 8px; padding: 7px 6px; text-align: center; }
    .ap-output-val { font-size: 16px; font-weight: 800; line-height: 1; }
    .ap-output-val--green  { color: #16a34a; }
    .ap-output-val--purple { color: #7c3aed; }
    .ap-output-val--orange { color: #ea580c; }
    .ap-output-val--blue   { color: #0284c7; }
    .ap-output-val--teal   { color: #0d9488; }
    .ap-output-lbl { font-size: 9px; color: #94a3b8; margin-top: 3px; font-weight: 600; text-transform: uppercase; }

    .ap-sparklines { display: flex; flex-direction: column; gap: 10px; }
    .ap-spark-lbl { font-size: 10px; color: #475569; font-weight: 600; margin-bottom: 3px; }
    .ap-spark { width: 100%; height: 40px; display: block; }

    .ap-footer { border-top: 1px solid #f3f4f6; padding-top: 10px; text-align: center; }
    .ap-link-sinta {
      display: inline-block; font-size: 12px; color: #059669;
      text-decoration: none; font-weight: 600;
      padding: .35rem .9rem; border: 1px solid #a7f3d0; border-radius: 6px;
      background: #f0fdf4; transition: background .15s;
    }
    .ap-link-sinta:hover { background: #d1fae5; }
  `]
})
export class SintaPenelitianComponent implements OnInit, OnDestroy {
  private destroy$    = new Subject<void>();
  private searchTimer: any;

  stats:       StatsResponse | null = null;
  statsLoading = true;

  list:        Penelitian[] = [];
  listTotal    = 0;
  listPage     = 1;
  listPageSize = 20;
  listLoading  = false;
  get listTotalPages() { return Math.ceil(this.listTotal / this.listPageSize); }

  acc1Open = false;
  acc2Open = false;
  acc3Open = false;
  trenTab  = 'research';

  filterSearch = '';
  filterTahun  = '';
  filterSumber = '';

  sortField: string = 'tahun';
  sortDir:   'asc' | 'desc' = 'desc';

  expandedId: number | null = null;

  authorPopup:        AuthorProfile | null = null;
  authorPopupLoading  = false;

  get latestYear(): string {
    const currentYear = new Date().getFullYear();
    const allYears = [
      ...(this.stats?.tren_research || []),
      ...(this.stats?.tren_judul    || []),
    ].map(t => t.tahun).filter(y => y <= currentYear);
    if (!allYears.length) return '–';
    return String(Math.max(...allYears));
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.loadList(1);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  loadStats() {
    this.statsLoading = true;
    this.http.get<StatsResponse>(`${API}/sinta-penelitian/stats/`)
      .pipe(takeUntil(this.destroy$), finalize(() => this.statsLoading = false))
      .subscribe({ next: d => this.stats = d, error: () => {} });
  }

  loadList(page: number) {
    this.listPage    = page;
    this.listLoading = true;
    let params = new HttpParams()
      .set('page',      String(page))
      .set('page_size', String(this.listPageSize));
    if (this.filterSearch) params = params.set('search',  this.filterSearch);
    if (this.filterTahun)  params = params.set('tahun',   this.filterTahun);
    if (this.filterSumber) params = params.set('sumber',  this.filterSumber);
    params = params.set('ordering', (this.sortDir === 'desc' ? '-' : '') + this.sortField);

    this.http.get<PenelitianResponse>(`${API}/sinta-penelitian/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => this.listLoading = false))
      .subscribe({ next: d => { this.list = d.results; this.listTotal = d.count; }, error: () => {} });
  }

  onSearchInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadList(1), 400);
  }

  resetFilters() {
    this.filterSearch = '';
    this.filterTahun  = '';
    this.filterSumber = '';
    this.loadList(1);
  }

  toggleSort(field: string) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.sortField = field;
      this.sortDir   = field === 'tahun' ? 'desc' : 'asc';
    }
    this.loadList(1);
  }

  sortIcon(field: string): string {
    if (this.sortField !== field) return '⇅';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  toggleExpand(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  openAuthorPopup(authorId: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.authorPopup        = null;
    this.authorPopupLoading = true;
    this.http.get<AuthorProfile>(`${API}/sinta-author/${authorId}/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  p  => { this.authorPopup = p; this.authorPopupLoading = false; },
        error: () => { this.authorPopupLoading = false; },
      });
  }

  closeAuthorPopup(): void {
    this.authorPopup        = null;
    this.authorPopupLoading = false;
  }

  totalScopusQ(p: AuthorProfile): number {
    return (p.scopus_q1 || 0) + (p.scopus_q2 || 0) + (p.scopus_q3 || 0) + (p.scopus_q4 || 0) + (p.scopus_noq || 0);
  }

  trenData(p: AuthorProfile, jenis: string): { tahun: number; jumlah: number }[] {
    return (p.trend || [])
      .filter(t => t.jenis === jenis)
      .sort((a, b) => a.tahun - b.tahun);
  }

  trenTotal(p: AuthorProfile, jenis: string): number {
    return this.trenData(p, jenis).reduce((s, t) => s + t.jumlah, 0);
  }

  sparkPts(data: { tahun: number; jumlah: number }[]): { x: number; y: number; tahun: number; v: number }[] {
    if (!data?.length) return [];
    const max = Math.max(...data.map(d => d.jumlah), 1);
    const W = 200, H = 36, pad = 4;
    return data.map((d, i) => ({
      x: data.length > 1 ? pad + i * (W - 2 * pad) / (data.length - 1) : W / 2,
      y: H - pad - (d.jumlah / max) * (H - 2 * pad),
      tahun: d.tahun,
      v: d.jumlah,
    }));
  }

  sparkPath(data: { tahun: number; jumlah: number }[]): string {
    const pts = this.sparkPts(data);
    return pts.length ? 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ') : '';
  }

  sparkArea(data: { tahun: number; jumlah: number }[]): string {
    const pts = this.sparkPts(data);
    if (!pts.length) return '';
    const bottom = 36;
    return `M ${pts[0].x},${bottom} L ` +
           pts.map(p => `${p.x},${p.y}`).join(' L ') +
           ` L ${pts[pts.length - 1].x},${bottom} Z`;
  }

  sumberClass(sumber: string): string {
    const s = sumber.toLowerCase();
    if (s.includes('dikti') || s.includes('kemdik') || s.includes('kemendik')) return 'dikti';
    if (s.includes('mandiri')) return 'mandiri';
    if (s.includes('industri') || s.includes('swasta')) return 'industri';
    return 'other';
  }

  barPct(val: number, max: number): number {
    return max ? Math.round(val / max * 100) : 0;
  }

  private readonly LC = { l: 56, r: 690, t: 15, b: 175 };

  lcPoints(data: TrenItem[]): { x: number; y: number; tahun: number; jumlah: number }[] {
    if (!data?.length) return [];
    const max = Math.max(...data.map(d => d.jumlah), 1);
    const { l, r, t, b } = this.LC;
    return data.map((d, i) => ({
      x: data.length > 1 ? l + i * (r - l) / (data.length - 1) : (l + r) / 2,
      y: b - (d.jumlah / max) * (b - t),
      tahun: d.tahun,
      jumlah: d.jumlah,
    }));
  }
  lcLinePath(data: TrenItem[]): string {
    const pts = this.lcPoints(data);
    return pts.length ? 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ') : '';
  }
  lcAreaPath(data: TrenItem[]): string {
    const pts = this.lcPoints(data);
    if (!pts.length) return '';
    return `M ${pts[0].x},${this.LC.b} L ` + pts.map(p => `${p.x},${p.y}`).join(' L ') +
           ` L ${pts[pts.length - 1].x},${this.LC.b} Z`;
  }
  lcLabelPoints(data: TrenItem[]): { x: number; y: number; tahun: number; jumlah: number }[] {
    const pts = this.lcPoints(data);
    if (pts.length <= 12) return pts;
    const step = Math.ceil(pts.length / 12);
    return pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % step === 0);
  }
  lcGridY(data: TrenItem[]): number[] {
    const max = Math.max(...(data || []).map(d => d.jumlah), 1);
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const vals: number[] = [];
    for (let v = 0; v <= max; v += step) vals.push(v);
    return vals;
  }
  lcY(data: TrenItem[], val: number): number {
    const max = Math.max(...data.map(d => d.jumlah), 1);
    const { t, b } = this.LC;
    return b - (val / max) * (b - t);
  }

  private readonly DONUT_COLORS = [
    '#059669','#0d9488','#0284c7','#ea580c','#7c3aed',
    '#db2777','#d97706','#0891b2','#4f46e5','#dc2626',
  ];
  donutSegments(data: TopSumber[]): { path: string; color: string; label: string; jumlah: number }[] {
    if (!data?.length) return [];
    const total = data.reduce((s, d) => s + d.jumlah, 0) || 1;
    const cx = 80, cy = 80, r = 70;
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const slice = (d.jumlah / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const path = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${large},1 ${x2},${y2} Z`;
      return { path, color: this.DONUT_COLORS[i % this.DONUT_COLORS.length], label: d.sumber, jumlah: d.jumlah };
    });
  }
}
