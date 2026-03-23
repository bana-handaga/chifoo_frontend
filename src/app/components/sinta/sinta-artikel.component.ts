import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

const API = environment.apiUrl;

interface TrenItem { tahun: number; jumlah: number; sitasi?: number; }
interface TrenKuartil { tahun: number; kuartil: string; jumlah: number; }
interface DistKuartil { kuartil: string; jumlah: number; sitasi: number; }
interface TopJurnal { jurnal_nama: string; jumlah: number; sitasi: number; }
interface TopAuthor { author__nama: string; author__afiliasi__perguruan_tinggi__singkatan: string; jumlah: number; }

interface WordItem    { word: string; score: number; }
interface LdaTopic   { id: number; label: string; keywords: string[]; article_count: number; deskripsi?: string; wcu_field?: string; wcu_color?: string; wcu_id?: string; }
interface WcuItem    { field: string; field_id: string; color: string; count: number; pct: number; topics: string[]; }
interface WcuTrendItem { field: string; field_id: string; color: string; count: number; pct: number; }
interface TrendYrItem{ word: string; score: number; }
interface TopicYrItem{ label: string; count: number; }

interface RisetAnalisis {
  ready:           boolean;
  total_titles:    number;
  word_cloud:      WordItem[];
  lda_topics:      LdaTopic[];
  trending_by_year:{ [yr: string]: TrendYrItem[] };
  topic_per_year:  { [yr: string]: TopicYrItem[] };
  wcu_distribution:WcuItem[];
  wcu_trend_year:  { [yr: string]: WcuTrendItem[] };
}

interface StatsResponse {
  total_artikel: number;
  total_sitasi: number;
  total_jurnal: number;
  total_author: number;
  q1q2: number;
  dist_kuartil: DistKuartil[];
  tren_artikel: TrenItem[];
  tren_kuartil: TrenKuartil[];
  tren_scopus_author: TrenItem[];
  tren_gscholar_pub: TrenItem[];
  tren_gscholar_cite: TrenItem[];
  top_jurnal: TopJurnal[];
  top_author: TopAuthor[];
}

interface Artikel {
  id: number; eid: string; judul: string;
  tahun: number | null; sitasi: number; kuartil: string;
  jurnal_nama: string; jurnal_url: string; scopus_url: string;
  urutan_penulis: number | null; total_penulis: number | null; nama_singkat: string | null;
}

interface ArtikelResponse { count: number; page: number; page_size: number; results: Artikel[]; }

@Component({
  selector: 'app-sinta-artikel',
  template: `
<div class="sa-wrap">

  <!-- ── Breadcrumb ── -->
  <div class="sa-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Page Header ── -->
  <div class="sa-header">
    <div class="sa-header__icon">📄</div>
    <div>
      <h1 class="sa-header__title">Artikel Ilmiah PTMA</h1>
      <p class="sa-header__sub">Publikasi Scopus & tren riset seluruh dosen Perguruan Tinggi Muhammadiyah–Aisyiyah</p>
    </div>
  </div>

  <!-- ── Loading Stats ── -->
  <div class="sa-stats-loading" *ngIf="statsLoading">
    <div class="sa-spinner"></div> Memuat statistik…
  </div>

  <ng-container *ngIf="stats">

    <!-- ── Summary Cards ── -->
    <div class="sa-cards">
      <div class="sa-card sa-card--blue">
        <div class="sa-card__val">{{ stats.total_artikel | number }}</div>
        <div class="sa-card__lbl">Artikel Scopus</div>
        <div class="sa-card__note">terindeks di DB</div>
      </div>
      <div class="sa-card sa-card--green">
        <div class="sa-card__val">{{ stats.total_sitasi | number }}</div>
        <div class="sa-card__lbl">Total Sitasi</div>
        <div class="sa-card__note">avg {{ stats.total_artikel ? (stats.total_sitasi / stats.total_artikel | number:'1.1-1') : 0 }} per artikel</div>
      </div>
      <div class="sa-card sa-card--purple">
        <div class="sa-card__val">{{ stats.q1q2 | number }}</div>
        <div class="sa-card__lbl">Artikel Q1 + Q2</div>
        <div class="sa-card__note">{{ stats.total_artikel ? (stats.q1q2 / stats.total_artikel * 100 | number:'1.0-0') : 0 }}% dari total</div>
      </div>
      <div class="sa-card sa-card--orange">
        <div class="sa-card__val">{{ stats.total_jurnal | number }}</div>
        <div class="sa-card__lbl">Jurnal Unik</div>
        <div class="sa-card__note">berbagai publisher</div>
      </div>
      <div class="sa-card sa-card--teal">
        <div class="sa-card__val">{{ stats.total_author | number }}</div>
        <div class="sa-card__lbl">Author Berkontribusi</div>
        <div class="sa-card__note">dari seluruh PTMA</div>
      </div>
    </div>

    <!-- ══ ACCORDION 1: Statistik & Tren ══ -->
    <div class="sa-accordion" [class.sa-accordion--open]="acc1Open">
      <button class="sa-accordion__header" (click)="acc1Open = !acc1Open">
        <span class="sa-accordion__icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3l5 5h-3v4h-4v-4H7l5-5z"/></svg>
        </span>
        <span class="sa-accordion__title">Statistik &amp; Tren Publikasi</span>
        <span class="sa-accordion__chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      <div class="sa-accordion__body">

        <!-- Tren Gabungan — Line Chart -->
        <div class="sa-section">
          <div class="sa-section__head">
            <h2 class="sa-section__title">Tren Publikasi Gabungan PTMA</h2>
            <span class="sa-section__note">Agregat dari seluruh author yang sudah ter-scrape</span>
          </div>
          <div class="sa-tren-tabs">
            <button class="sa-tren-tab" [class.active]="trenTab==='scopus'" (click)="trenTab='scopus'">Scopus Publikasi</button>
            <button class="sa-tren-tab" [class.active]="trenTab==='gs_pub'" (click)="trenTab='gs_pub'">GScholar Publikasi</button>
            <button class="sa-tren-tab" [class.active]="trenTab==='gs_cite'" (click)="trenTab='gs_cite'">GScholar Sitasi</button>
          </div>

          <ng-container *ngIf="trenTab==='scopus'">
            <ng-container *ngTemplateOutlet="lineChart; context:{data: filteredTren(stats.tren_scopus_author), color:'#3b82f6', fill:'#dbeafe', label:'publikasi'}"></ng-container>
          </ng-container>
          <ng-container *ngIf="trenTab==='gs_pub'">
            <ng-container *ngTemplateOutlet="lineChart; context:{data: filteredTren(stats.tren_gscholar_pub), color:'#7c3aed', fill:'#ede9fe', label:'publikasi'}"></ng-container>
          </ng-container>
          <ng-container *ngIf="trenTab==='gs_cite'">
            <ng-container *ngTemplateOutlet="lineChart; context:{data: filteredTren(stats.tren_gscholar_cite), color:'#db2777', fill:'#fce7f3', label:'sitasi'}"></ng-container>
          </ng-container>

          <!-- Line chart template -->
          <ng-template #lineChart let-data="data" let-color="color" let-fill="fill" let-label="label">
            <div class="sa-linechart-wrap" *ngIf="data && data.length">
              <svg class="sa-linechart" [attr.viewBox]="'0 0 700 200'" preserveAspectRatio="xMidYMid meet">

                <!-- Grid lines horizontal -->
                <line *ngFor="let g of lcGridY(data)"
                      [attr.x1]="56" [attr.x2]="690"
                      [attr.y1]="lcY(data, g)" [attr.y2]="lcY(data, g)"
                      stroke="#f3f4f6" stroke-width="1"/>

                <!-- Grid label Y -->
                <text *ngFor="let g of lcGridY(data)"
                      [attr.x]="50" [attr.y]="lcY(data, g) + 4"
                      text-anchor="end" font-size="10" fill="#9ca3af">
                  {{ g | number:'1.0-0' }}
                </text>

                <!-- Area fill -->
                <path [attr.d]="lcAreaPath(data)"
                      [attr.fill]="fill" opacity="0.5"/>

                <!-- Line -->
                <path [attr.d]="lcLinePath(data)"
                      [attr.stroke]="color" fill="none"
                      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

                <!-- Dots + tooltip -->
                <g *ngFor="let pt of lcPoints(data)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4"
                          [attr.fill]="color" stroke="#fff" stroke-width="2">
                    <title>{{ pt.tahun }}: {{ pt.jumlah | number }} {{ label }}</title>
                  </circle>
                  <!-- Value label on top -->
                  <text [attr.x]="pt.x" [attr.y]="pt.y - 9"
                        text-anchor="middle" font-size="9.5" [attr.fill]="color" font-weight="600">
                    {{ pt.jumlah >= 1000 ? (pt.jumlah / 1000 | number:'1.0-1') + 'k' : pt.jumlah }}
                  </text>
                </g>

                <!-- X axis labels (tahun) -->
                <text *ngFor="let pt of lcPoints(data)"
                      [attr.x]="pt.x" [attr.y]="196"
                      text-anchor="middle" font-size="10" fill="#6b7280">
                  {{ pt.tahun }}
                </text>

                <!-- X axis line -->
                <line x1="56" [attr.x2]="690" [attr.y1]="175" [attr.y2]="175"
                      stroke="#e5e7eb" stroke-width="1"/>
              </svg>
            </div>
          </ng-template>
        </div>

        <!-- 2-col: Distribusi Kuartil + Top Author -->
        <div class="sa-grid-2">
          <div class="sa-section">
            <h2 class="sa-section__title">Distribusi Kuartil Scopus</h2>
            <div class="sa-kuartil-bars">
              <div class="sa-kuartil-row" *ngFor="let d of stats.dist_kuartil">
                <span class="sa-kuartil-lbl">
                  <span class="sa-qbadge" [class]="'sa-qbadge--' + (d.kuartil || 'noq').toLowerCase()">{{ d.kuartil || 'NoQ' }}</span>
                </span>
                <div class="sa-kuartil-wrap">
                  <div class="sa-kuartil-bar" [class]="'sa-kuartil-bar--' + (d.kuartil || 'noq').toLowerCase()" [style.width.%]="kuartilPct(d.jumlah)"></div>
                </div>
                <span class="sa-kuartil-val">{{ d.jumlah | number }}</span>
              </div>
            </div>
            <div class="sa-stacked-bar">
              <div *ngFor="let d of stats.dist_kuartil"
                   [class]="'sa-stacked-seg sa-stacked-seg--' + (d.kuartil || 'noq').toLowerCase()"
                   [style.flex]="d.jumlah"
                   [title]="(d.kuartil || 'NoQ') + ': ' + d.jumlah">
              </div>
            </div>
          </div>
          <div class="sa-section">
            <h2 class="sa-section__title">Top 10 Author</h2>
            <div class="sa-top-author-list">
              <div class="sa-top-author-row" *ngFor="let a of stats.top_author; let i = index">
                <span class="sa-rank">{{ i + 1 }}</span>
                <div class="sa-top-author-info">
                  <div class="sa-top-author-nama">{{ a['author__nama'] }}</div>
                  <div class="sa-top-author-pt">{{ a['author__afiliasi__perguruan_tinggi__singkatan'] || '–' }}</div>
                </div>
                <span class="sa-top-author-n">{{ a.jumlah }}<small> art</small></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Jurnal -->
        <div class="sa-section">
          <h2 class="sa-section__title">Top 20 Jurnal</h2>
          <div class="sa-jurnal-list">
            <div class="sa-jurnal-row" *ngFor="let j of stats.top_jurnal; let i = index">
              <span class="sa-rank">{{ i + 1 }}</span>
              <div class="sa-jurnal-info">
                <div class="sa-jurnal-nama">{{ j.jurnal_nama }}</div>
                <div class="sa-jurnal-meta">{{ j.sitasi | number }} sitasi</div>
              </div>
              <div class="sa-jurnal-bar-wrap">
                <div class="sa-jurnal-bar" [style.width.%]="jurnalPct(j.jumlah)" [title]="j.jumlah + ' artikel'"></div>
              </div>
              <span class="sa-jurnal-val">{{ j.jumlah }}</span>
            </div>
          </div>
        </div>

      </div><!-- /accordion body -->
    </div><!-- /accordion 1 -->

  </ng-container>

  <!-- ══ ACCORDION 2: Daftar Artikel ══ -->
  <div class="sa-accordion" [class.sa-accordion--open]="acc2Open">
    <button class="sa-accordion__header" (click)="acc2Open = !acc2Open">
      <span class="sa-accordion__icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17h8v2H8v-2zm0-4h8v2H8v-2zm0-4h5v2H8V9z"/></svg>
      </span>
      <span class="sa-accordion__title">
        Daftar Artikel Scopus
        <span class="sa-accordion__badge" *ngIf="totalArtikel > 0">{{ totalArtikel | number }}</span>
      </span>
      <span class="sa-accordion__chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </button>

    <div class="sa-accordion__body">
      <div class="sa-section">
        <!-- Filter bar -->
        <div class="sa-filter-bar">
          <input class="sa-search" type="text" placeholder="Cari judul atau jurnal…"
                 [(ngModel)]="filterSearch" (keyup.enter)="loadArtikels(true)">
          <select class="sa-select" [(ngModel)]="filterKuartil" (change)="loadArtikels(true)">
            <option value="">Semua Kuartil</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
          <input class="sa-input-yr" type="number" placeholder="Dari tahun" [(ngModel)]="filterTahunMin" (change)="loadArtikels(true)" min="2000" max="2026">
          <input class="sa-input-yr" type="number" placeholder="Sampai tahun" [(ngModel)]="filterTahunMax" (change)="loadArtikels(true)" min="2000" max="2026">
          <select class="sa-select" [(ngModel)]="filterOrdering" (change)="loadArtikels(true)">
            <option value="-sitasi">Sitasi ↓</option>
            <option value="-tahun">Terbaru</option>
            <option value="tahun">Terlama</option>
            <option value="jurnal_nama">Nama Jurnal</option>
          </select>
          <button class="sa-btn-search" (click)="loadArtikels(true)">Cari</button>
        </div>

        <div class="sa-list-loading" *ngIf="listLoading"><div class="sa-spinner"></div> Memuat…</div>
        <div class="sa-list-empty" *ngIf="!listLoading && artikels.length === 0">Tidak ada artikel ditemukan.</div>

        <div class="sa-artikel-list" *ngIf="!listLoading && artikels.length > 0">
          <div class="sa-artikel-item" *ngFor="let a of artikels">
            <div class="sa-artikel-top">
              <a class="sa-artikel-judul"
                 [href]="a.scopus_url || ('https://www.scopus.com/record/display.uri?eid=' + a.eid)"
                 target="_blank" rel="noopener">{{ a.judul }}</a>
              <span class="sa-qbadge sa-qbadge--sm" [class]="'sa-qbadge--' + (a.kuartil || 'noq').toLowerCase()" *ngIf="a.kuartil">{{ a.kuartil }}</span>
            </div>
            <div class="sa-artikel-meta">
              <span class="sa-meta-jurnal" *ngIf="a.jurnal_nama">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>
                {{ a.jurnal_nama }}
              </span>
              <span *ngIf="a.tahun" class="sa-meta-chip">{{ a.tahun }}</span>
              <span class="sa-meta-chip sa-meta-chip--cite">
                <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                {{ a.sitasi | number }} sitasi
              </span>
              <span class="sa-meta-chip" *ngIf="a.eid">EID: {{ a.eid }}</span>
            </div>
          </div>
        </div>

        <div class="sa-pagination" *ngIf="totalArtikel > pageSize">
          <button class="sa-pg-btn" [disabled]="currentPage <= 1" (click)="loadArtikels(false, currentPage - 1)">‹</button>
          <span class="sa-pg-info">{{ currentPage }} / {{ totalPages() }}</span>
          <button class="sa-pg-btn" [disabled]="currentPage >= totalPages()" (click)="loadArtikels(false, currentPage + 1)">›</button>
        </div>
      </div>
    </div><!-- /accordion body -->
  </div><!-- /accordion 2 -->

  <!-- ══ ACCORDION 3: Analisis Riset ══ -->
  <div class="sa-accordion" [class.sa-accordion--open]="acc3Open">
    <button class="sa-accordion__header" (click)="acc3Open = !acc3Open; acc3Open && loadRiset()">
      <span class="sa-accordion__icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      </span>
      <span class="sa-accordion__title">Analisis Aktivitas Riset PTMA</span>
      <span class="sa-accordion__badge">ML · TF-IDF · LDA</span>
      <!-- Tombol regenerasi — hanya untuk admin -->
      <button class="sa-riset-regen-btn"
              *ngIf="isAdminUser && acc3Open"
              [disabled]="risetRegenerating"
              (click)="$event.stopPropagation(); regenerateRiset()"
              [title]="risetRegenerating ? 'Sedang memproses…' : 'Jalankan analisis ulang (admin)'">
        <svg *ngIf="!risetRegenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        <svg *ngIf="risetRegenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="animation:spin .8s linear infinite">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        {{ risetRegenerating ? 'Memproses…' : 'Perbarui Analisis' }}
      </button>
      <span class="sa-accordion__chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </button>

    <div class="sa-accordion__body">

      <div class="sa-riset-loading" *ngIf="risetLoading || risetRegenerating">
        <div class="sa-spinner sa-spinner--lg"></div>
        <div class="sa-riset-loading__text">
          <strong>{{ risetRegenerating ? 'Menjalankan analisis baru…' : 'Memuat hasil analisis…' }}</strong>
          <span *ngIf="risetRegenerating">TF-IDF · LDA · AI lokal (Qwen2.5) — estimasi ~2 menit</span>
        </div>
      </div>

      <!-- Cache kosong, user bukan admin -->
      <div class="sa-riset-not-ready" *ngIf="risetNotReady && !isAdminUser">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
        <div>
          <strong>Analisis belum tersedia</strong>
          <span>Hubungi administrator untuk menjalankan analisis riset.</span>
        </div>
      </div>

      <!-- Cache kosong, user adalah admin -->
      <div class="sa-riset-not-ready sa-riset-not-ready--admin" *ngIf="risetNotReady && isAdminUser">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
        <div>
          <strong>Analisis belum pernah dijalankan</strong>
          <span>Klik <em>Perbarui Analisis</em> di header accordion untuk memulai (~2 menit).</span>
        </div>
      </div>

      <ng-container *ngIf="riset && !risetLoading">

        <!-- ── Word Cloud ── -->
        <div class="sa-section">
          <div class="sa-section__head">
            <h2 class="sa-section__title">Word Cloud Kata Kunci Riset</h2>
            <span class="sa-section__note">TF-IDF dari {{ riset.total_titles | number }} judul artikel</span>
          </div>
          <div class="sa-wordcloud">
            <span class="sa-wc-word"
                  *ngFor="let w of riset.word_cloud"
                  [style.fontSize.px]="wcFontSize(w.score, riset.word_cloud)"
                  [style.opacity]="wcOpacity(w.score, riset.word_cloud)"
                  [title]="w.word + ' (skor: ' + w.score + ')'">
              {{ w.word }}
            </span>
          </div>
        </div>

        <!-- ── WCU Broad Subject Areas ── -->
        <div class="sa-section" *ngIf="riset.wcu_distribution?.length">
          <div class="sa-section__head">
            <h2 class="sa-section__title">5 Broad Subject Areas (WCU)</h2>
            <span class="sa-section__note">Klasifikasi {{ riset.total_titles | number }} artikel ke standar QS/Scopus</span>
          </div>

          <!-- Stacked bar proporsi -->
          <div class="sa-wcu-stacked">
            <div class="sa-wcu-seg" *ngFor="let w of riset.wcu_distribution"
                 [style.flex]="w.count"
                 [style.background]="w.color"
                 [title]="w.field + ': ' + w.count + ' artikel (' + w.pct + '%)'">
            </div>
          </div>

          <!-- 5 kartu WCU -->
          <div class="sa-wcu-grid">
            <div class="sa-wcu-card" *ngFor="let w of riset.wcu_distribution; let i = index"
                 [style.--wc]="w.color">
              <div class="sa-wcu-card__stripe" [style.background]="w.color"></div>
              <div class="sa-wcu-card__body">
                <div class="sa-wcu-card__rank">#{{ i + 1 }}</div>
                <div class="sa-wcu-card__field">{{ w.field }}</div>
                <div class="sa-wcu-card__count">
                  <span class="sa-wcu-card__num" [style.color]="w.color">{{ w.count | number }}</span>
                  <span class="sa-wcu-card__sub">artikel</span>
                </div>
                <div class="sa-wcu-card__bar-wrap">
                  <div class="sa-wcu-card__bar" [style.width.%]="w.pct" [style.background]="w.color + '99'"></div>
                  <span class="sa-wcu-card__pct">{{ w.pct }}%</span>
                </div>
                <!-- Related LDA topics -->
                <div class="sa-wcu-card__topics" *ngIf="w.topics?.length">
                  <span class="sa-wcu-topic-tag" *ngFor="let tl of w.topics">{{ tl }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- WCU Tren per tahun -->
          <div class="sa-section__head" style="margin-top:20px">
            <h3 class="sa-section__title" style="font-size:13px">Tren Bidang per Tahun</h3>
            <select class="sa-select sa-select--sm" [(ngModel)]="risetYearSel">
              <option *ngFor="let yr of risetYears()" [value]="yr">{{ yr }}</option>
            </select>
          </div>
          <div class="sa-wcu-trend" *ngIf="riset.wcu_trend_year?.[risetYearSel]">
            <div class="sa-wcu-trend-row" *ngFor="let w of riset.wcu_trend_year[risetYearSel]">
              <span class="sa-wcu-trend-dot" [style.background]="w.color"></span>
              <span class="sa-wcu-trend-lbl">{{ w.field }}</span>
              <div class="sa-wcu-trend-bar-wrap">
                <div class="sa-wcu-trend-bar" [style.width.%]="w.pct" [style.background]="w.color + 'aa'"></div>
              </div>
              <span class="sa-wcu-trend-pct">{{ w.pct }}%</span>
              <span class="sa-wcu-trend-n">{{ w.count }}</span>
            </div>
          </div>
        </div>

        <!-- ── LDA Topics ── -->
        <div class="sa-section">
          <div class="sa-section__head">
            <h2 class="sa-section__title">Klaster Topik Riset</h2>
            <span class="sa-section__note">{{ riset.lda_topics.length }} topik dideteksi otomatis via LDA dari {{ riset.total_titles | number }} judul artikel</span>
          </div>
          <div class="sa-topic-grid">
            <div class="sa-topic-card" *ngFor="let t of riset.lda_topics; let i = index"
                 [style.--tc]="topicColor(i)">
              <!-- Header kartu -->
              <div class="sa-topic-card__top">
                <div class="sa-topic-card__accent" [style.background]="topicColor(i)"></div>
                <div class="sa-topic-card__main">
                  <div class="sa-topic-card__label">{{ t.label }}</div>
                  <div class="sa-topic-card__meta">
                    <span class="sa-topic-card__badge" [style.background]="topicColor(i) + '22'" [style.color]="topicColor(i)">
                      {{ t.article_count | number }} artikel
                    </span>
                    <span class="sa-topic-card__pct">{{ topicPct(t.article_count) | number:'1.0-0' }}% dari total</span>
                    <span class="sa-topic-card__wcu" *ngIf="t.wcu_field"
                          [style.background]="t.wcu_color + '18'" [style.color]="t.wcu_color"
                          [style.borderColor]="t.wcu_color + '44'">
                      {{ wcuShort(t.wcu_field) }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- Progress bar -->
              <div class="sa-topic-card__bar-wrap">
                <div class="sa-topic-card__bar" [style.width.%]="topicPct(t.article_count)" [style.background]="topicColor(i)"></div>
              </div>
              <!-- Deskripsi LLM -->
              <div class="sa-topic-card__desc" *ngIf="t.deskripsi">
                <span class="sa-topic-card__ai-badge">✦ AI</span>
                {{ t.deskripsi }}
              </div>
              <div class="sa-topic-card__desc sa-topic-card__desc--empty" *ngIf="!t.deskripsi">
                <em>Deskripsi sedang dibuat…</em>
              </div>
              <!-- Kata kunci -->
              <div class="sa-topic-card__keywords">
                <span class="sa-topic-card__kw" *ngFor="let kw of t.keywords">{{ kw }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Trending per Tahun ── -->
        <div class="sa-grid-2">

          <!-- Trending keywords per year -->
          <div class="sa-section">
            <div class="sa-section__head">
              <h2 class="sa-section__title">Kata Kunci Trending</h2>
              <select class="sa-select sa-select--sm" [(ngModel)]="risetYearSel">
                <option *ngFor="let yr of risetYears()" [value]="yr">{{ yr }}</option>
              </select>
            </div>
            <div class="sa-trending-list" *ngIf="riset.trending_by_year[risetYearSel]">
              <div class="sa-trending-row" *ngFor="let kw of riset.trending_by_year[risetYearSel]; let i = index">
                <span class="sa-rank">{{ i + 1 }}</span>
                <span class="sa-trending-word">{{ kw.word }}</span>
                <div class="sa-trending-bar-wrap">
                  <div class="sa-trending-bar"
                       [style.width.%]="(kw.score / (riset.trending_by_year[risetYearSel][0]?.score || 1)) * 100">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top topics per year -->
          <div class="sa-section">
            <div class="sa-section__head">
              <h2 class="sa-section__title">Dominasi Topik {{ risetYearSel }}</h2>
            </div>
            <div class="sa-trending-list" *ngIf="riset.topic_per_year[risetYearSel]">
              <div class="sa-trending-row" *ngFor="let t of riset.topic_per_year[risetYearSel]; let i = index">
                <span class="sa-rank">{{ i + 1 }}</span>
                <span class="sa-trending-word sa-trending-word--sm">{{ t.label }}</span>
                <div class="sa-trending-bar-wrap">
                  <div class="sa-trending-bar sa-trending-bar--topic"
                       [style.width.%]="(t.count / maxTopicYrCount(risetYearSel)) * 100">
                  </div>
                </div>
                <span class="sa-trending-val">{{ t.count }}</span>
              </div>
            </div>
          </div>

        </div>

      </ng-container>
    </div>
  </div><!-- /accordion 3 -->

</div>
  `,
  styles: [`
    .sa-wrap {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.25rem 1.25rem 2rem;
      font-family: inherit;
    }
    .sa-back {
      display: inline-flex; align-items: center; gap: 4px;
      color: #6b7280; font-size: 13px; cursor: pointer; margin-bottom: 1rem;
      &:hover { color: #1d4ed8; }
    }

    /* Header */
    .sa-header {
      display: flex; align-items: flex-start; gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      border-radius: 14px;
      color: #fff;
      box-shadow: 0 4px 16px rgba(29,78,216,.3);
    }
    .sa-header__icon { font-size: 2.25rem; flex-shrink: 0; opacity: .9; margin-top: 2px; }
    .sa-header__title { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0 0 .35rem; }
    .sa-header__sub { font-size: .875rem; color: rgba(255,255,255,.9); margin: 0; line-height: 1.55; }

    /* Loading */
    .sa-stats-loading {
      display: flex; align-items: center; gap: 10px;
      color: #6b7280; padding: 40px 0; justify-content: center;
    }
    .sa-spinner {
      width: 20px; height: 20px; border: 2px solid #e5e7eb;
      border-top-color: #3b82f6; border-radius: 50%; animation: spin .7s linear infinite;
      flex-shrink: 0;
    }
    .sa-spinner--lg { width: 32px; height: 32px; border-width: 3px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sa-riset-loading {
      display: flex; align-items: center; gap: 16px;
      padding: 32px 24px; background: #f8fafc; border-radius: 10px;
      border: 1px dashed #cbd5e1; margin: 8px 0;
    }
    .sa-riset-loading__text {
      display: flex; flex-direction: column; gap: 4px;
      font-size: 13px; color: #374151;
    }
    .sa-riset-loading__text span { font-size: 12px; color: #9ca3af; }
    .sa-riset-not-ready {
      display: flex; align-items: center; gap: 16px;
      padding: 28px 24px; background: #f8fafc; border-radius: 10px;
      border: 1px dashed #cbd5e1; margin: 8px 0; color: #64748b;
    }
    .sa-riset-not-ready div { display: flex; flex-direction: column; gap: 4px; }
    .sa-riset-not-ready strong { font-size: 13px; color: #374151; }
    .sa-riset-not-ready span { font-size: 12px; }
    .sa-riset-not-ready--admin { border-color: #f59e0b44; background: #fffbeb; color: #92400e; }
    .sa-riset-not-ready--admin strong { color: #92400e; }
    .sa-riset-regen-btn {
      display: inline-flex; align-items: center; gap: 5px;
      margin-left: auto; margin-right: 8px;
      padding: 4px 10px; border-radius: 6px; border: 1px solid #d1d5db;
      background: #fff; color: #374151; font-size: 11px; font-weight: 600;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .sa-riset-regen-btn:hover:not(:disabled) { background: #f0fdf4; border-color: #16a34a; color: #16a34a; }
    .sa-riset-regen-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* Cards */
    .sa-cards {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: .75rem;
      margin-bottom: 1.75rem;
    }
    @media (max-width: 900px) { .sa-cards { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px) { .sa-cards { grid-template-columns: repeat(2, 1fr); } }
    .sa-card {
      border-radius: 12px; padding: 1rem 1.1rem;
      border-left: 4px solid transparent;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .sa-card--blue   { background: #eff6ff; border-color: #3b82f6; }
    .sa-card--green  { background: #f0fdf4; border-color: #22c55e; }
    .sa-card--purple { background: #faf5ff; border-color: #a855f7; }
    .sa-card--orange { background: #fff7ed; border-color: #f97316; }
    .sa-card--teal   { background: #f0fdfa; border-color: #14b8a6; }
    .sa-card__val  { font-size: 1.375rem; font-weight: 700; color: #111827; }
    .sa-card__lbl  { font-size: .75rem; font-weight: 600; color: #374151; margin: 2px 0; }
    .sa-card__note { font-size: .6875rem; color: #9ca3af; }

    /* Accordion */
    .sa-accordion {
      border: 1px solid #e5e7eb; border-radius: 12px;
      margin-bottom: 1rem; overflow: hidden; background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }
    .sa-accordion__header {
      width: 100%; display: flex; align-items: center; gap: .625rem;
      padding: .875rem 1.125rem; background: #f9fafb; border: none; cursor: pointer;
      border-bottom: 1px solid transparent; transition: background .15s;
      &:hover { background: #f3f4f6; }
    }
    .sa-accordion--open .sa-accordion__header {
      border-bottom-color: #e5e7eb; background: #f3f4f6;
    }
    .sa-accordion__icon { color: #6b7280; flex-shrink: 0; }
    .sa-accordion__title {
      flex: 1; text-align: left; font-size: .9rem; font-weight: 700;
      color: #1e293b; display: flex; align-items: center; gap: .5rem;
    }
    .sa-accordion__badge {
      font-size: .688rem; font-weight: 600; background: #dbeafe;
      color: #1d4ed8; padding: 2px 8px; border-radius: 20px;
    }
    .sa-accordion__chevron {
      color: #9ca3af; transition: transform .2s; flex-shrink: 0;
    }
    .sa-accordion--open .sa-accordion__chevron { transform: rotate(180deg); }
    .sa-accordion__body {
      display: none; padding: 1rem;
    }
    .sa-accordion--open .sa-accordion__body { display: block; }

    /* Section */
    .sa-section {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 1.25rem; margin-bottom: 1rem;
    }
    .sa-accordion__body .sa-section:last-child { margin-bottom: 0; }
    .sa-section__head {
      display: flex; align-items: baseline; gap: .625rem; margin-bottom: .875rem;
    }
    .sa-section__title { font-size: .9375rem; font-weight: 700; color: #1e293b; margin: 0 0 .875rem; }
    .sa-section__head .sa-section__title { margin: 0; }
    .sa-section__note { font-size: .75rem; color: #9ca3af; }

    /* Tren tabs */
    .sa-tren-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .sa-tren-tab {
      padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
      border: 1px solid #e5e7eb; background: #f9fafb; color: #374151; cursor: pointer;
      transition: all .15s;
      &.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
      &:hover:not(.active) { background: #f3f4f6; }
    }

    /* Line chart */
    .sa-linechart-wrap { width: 100%; overflow-x: auto; }
    .sa-linechart { width: 100%; height: 200px; display: block; }

    /* Grid 2 col */
    .sa-grid-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    @media (max-width: 700px) { .sa-grid-2 { grid-template-columns: 1fr; } }

    /* Kuartil */
    .sa-kuartil-bars { margin-bottom: 12px; }
    .sa-kuartil-row {
      display: grid; grid-template-columns: 50px 1fr 44px;
      align-items: center; gap: 8px; margin-bottom: 6px;
    }
    .sa-kuartil-lbl { text-align: right; }
    .sa-kuartil-wrap { background: #f3f4f6; border-radius: 4px; height: 18px; overflow: hidden; }
    .sa-kuartil-bar { height: 100%; border-radius: 4px; transition: width .3s; min-width: 2px; }
    .sa-kuartil-bar--q1  { background: #22c55e; }
    .sa-kuartil-bar--q2  { background: #3b82f6; }
    .sa-kuartil-bar--q3  { background: #f59e0b; }
    .sa-kuartil-bar--q4  { background: #ef4444; }
    .sa-kuartil-bar--noq { background: #9ca3af; }
    .sa-kuartil-val { font-size: 12px; color: #374151; font-weight: 600; }

    /* Stacked bar */
    .sa-stacked-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; margin-top: 6px; }
    .sa-stacked-seg--q1  { background: #22c55e; }
    .sa-stacked-seg--q2  { background: #3b82f6; }
    .sa-stacked-seg--q3  { background: #f59e0b; }
    .sa-stacked-seg--q4  { background: #ef4444; }
    .sa-stacked-seg--noq { background: #9ca3af; }

    /* Badges */
    .sa-qbadge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      font-size: 11px; font-weight: 700; color: #fff;
    }
    .sa-qbadge--q1  { background: #22c55e; }
    .sa-qbadge--q2  { background: #3b82f6; }
    .sa-qbadge--q3  { background: #f59e0b; }
    .sa-qbadge--q4  { background: #ef4444; }
    .sa-qbadge--noq { background: #9ca3af; }
    .sa-qbadge--sm  { padding: 1px 6px; font-size: 10px; flex-shrink: 0; }

    /* Top Author */
    .sa-top-author-list { display: flex; flex-direction: column; gap: 6px; }
    .sa-top-author-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 8px; border-radius: 6px; background: #f9fafb;
    }
    .sa-rank { font-size: 11px; color: #9ca3af; font-weight: 700; width: 18px; text-align: center; flex-shrink: 0; }
    .sa-top-author-info { flex: 1; min-width: 0; }
    .sa-top-author-nama { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sa-top-author-pt { font-size: 11px; color: #6b7280; }
    .sa-top-author-n { font-size: 13px; font-weight: 700; color: #3b82f6; white-space: nowrap; }
    .sa-top-author-n small { font-size: 10px; font-weight: 400; color: #9ca3af; margin-left: 2px; }

    /* Top Jurnal */
    .sa-jurnal-list { display: flex; flex-direction: column; gap: 6px; }
    .sa-jurnal-row {
      display: grid; grid-template-columns: 26px 1fr 140px 44px;
      align-items: center; gap: 10px; padding: 4px 0;
    }
    .sa-jurnal-info { min-width: 0; }
    .sa-jurnal-nama { font-size: 13px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sa-jurnal-meta { font-size: 11px; color: #9ca3af; }
    .sa-jurnal-bar-wrap { background: #f3f4f6; border-radius: 3px; height: 14px; overflow: hidden; }
    .sa-jurnal-bar { height: 100%; background: linear-gradient(90deg,#ea580c,#fb923c); border-radius: 3px; min-width: 2px; }
    .sa-jurnal-val { font-size: 12px; font-weight: 700; color: #374151; text-align: right; }

    /* Filter bar */
    .sa-filter-bar {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      margin-bottom: 14px;
    }
    .sa-search {
      flex: 1; min-width: 200px; padding: 7px 10px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 13px;
      &:focus { outline: none; border-color: #3b82f6; }
    }
    .sa-select, .sa-input-yr {
      padding: 7px 8px; border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 13px; background: #fff;
      &:focus { outline: none; border-color: #3b82f6; }
    }
    .sa-input-yr { width: 100px; }
    .sa-btn-search {
      padding: 7px 14px; background: #1d4ed8; color: #fff; border: none;
      border-radius: 6px; font-size: 13px; cursor: pointer;
      &:hover { background: #1e40af; }
    }

    /* List */
    .sa-list-loading, .sa-list-empty {
      display: flex; align-items: center; gap: 8px;
      padding: 30px; justify-content: center; color: #6b7280; font-size: 14px;
    }
    .sa-artikel-list { display: flex; flex-direction: column; gap: 10px; }
    .sa-artikel-item {
      padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
      background: #fff; transition: box-shadow .15s;
      &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    }
    .sa-artikel-top {
      display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px;
    }
    .sa-artikel-judul {
      flex: 1; font-size: 14px; font-weight: 600; color: #1d4ed8;
      text-decoration: none; line-height: 1.4;
      &:hover { text-decoration: underline; }
    }
    .sa-artikel-meta {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    }
    .sa-meta-jurnal {
      font-size: 12px; color: #374151; display: flex; align-items: center; gap: 3px;
    }
    .sa-meta-chip {
      font-size: 11px; padding: 2px 7px; background: #f3f4f6;
      border-radius: 4px; color: #4b5563;
    }
    .sa-meta-chip--cite {
      background: #eff6ff; color: #1d4ed8;
      display: inline-flex; align-items: center; gap: 3px;
    }

    /* Pagination */
    .sa-pagination {
      display: flex; align-items: center; gap: 10px; justify-content: center;
      margin-top: 16px;
    }
    .sa-pg-btn {
      padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 6px;
      background: #fff; cursor: pointer; font-size: 16px;
      &:hover:not(:disabled) { background: #f3f4f6; }
      &:disabled { opacity: .4; cursor: default; }
    }
    .sa-pg-info { font-size: 13px; color: #374151; }

    /* Word Cloud */
    .sa-wordcloud {
      display: flex; flex-wrap: wrap; gap: 8px 12px;
      align-items: baseline; padding: 10px 4px; line-height: 1.8;
    }
    .sa-wc-word {
      cursor: default; color: #1d4ed8; font-weight: 600;
      transition: opacity .2s;
      &:hover { opacity: 1 !important; color: #7c3aed; }
    }

    /* LDA Topics */
    .sa-topic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .sa-topic-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
      transition: box-shadow .2s;
    }
    .sa-topic-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .sa-topic-card__top {
      display: flex;
      gap: 0;
    }
    .sa-topic-card__accent {
      width: 4px;
      flex-shrink: 0;
      border-radius: 12px 0 0 0;
    }
    .sa-topic-card__main {
      flex: 1;
      padding: 14px 14px 10px;
    }
    .sa-topic-card__label {
      font-size: 13.5px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .sa-topic-card__meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sa-topic-card__badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .sa-topic-card__pct {
      font-size: 11px;
      color: #9ca3af;
    }
    .sa-topic-card__wcu {
      font-size: 10px; font-weight: 600; padding: 1px 6px;
      border-radius: 10px; border: 1px solid; white-space: nowrap;
    }

    /* ── WCU Broad Subject Areas ── */
    .sa-wcu-stacked {
      display: flex; height: 10px; border-radius: 6px; overflow: hidden;
      margin-bottom: 20px; gap: 2px;
    }
    .sa-wcu-seg { transition: flex .6s ease; min-width: 2px; }
    .sa-wcu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px; margin-bottom: 8px;
    }
    .sa-wcu-card {
      display: flex; border-radius: 10px; overflow: hidden;
      border: 1px solid #e5e7eb; background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .sa-wcu-card__stripe { width: 5px; flex-shrink: 0; }
    .sa-wcu-card__body { flex: 1; padding: 12px 12px 10px; }
    .sa-wcu-card__rank { font-size: 10px; color: #d1d5db; font-weight: 700; margin-bottom: 2px; }
    .sa-wcu-card__field { font-size: 12px; font-weight: 700; color: #111827; line-height: 1.3; margin-bottom: 8px; }
    .sa-wcu-card__count { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
    .sa-wcu-card__num { font-size: 22px; font-weight: 800; line-height: 1; }
    .sa-wcu-card__sub { font-size: 11px; color: #9ca3af; }
    .sa-wcu-card__bar-wrap {
      display: flex; align-items: center; gap: 6px;
      background: #f3f4f6; border-radius: 4px; height: 6px;
      position: relative; margin-bottom: 10px; overflow: visible;
    }
    .sa-wcu-card__bar { height: 100%; border-radius: 4px; transition: width .6s; }
    .sa-wcu-card__pct { font-size: 11px; color: #6b7280; white-space: nowrap; position: absolute; right: -32px; }
    .sa-wcu-card__topics { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .sa-wcu-topic-tag {
      font-size: 9.5px; padding: 1px 5px; background: #f3f4f6;
      border-radius: 8px; color: #6b7280; border: 1px solid #e5e7eb;
    }
    .sa-wcu-trend { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .sa-wcu-trend-row { display: flex; align-items: center; gap: 8px; }
    .sa-wcu-trend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .sa-wcu-trend-lbl { font-size: 12px; color: #374151; width: 220px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sa-wcu-trend-bar-wrap { flex: 1; background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden; }
    .sa-wcu-trend-bar { height: 100%; border-radius: 4px; transition: width .5s; }
    .sa-wcu-trend-pct { font-size: 11px; color: #6b7280; width: 36px; text-align: right; }
    .sa-wcu-trend-n { font-size: 11px; color: #9ca3af; width: 30px; text-align: right; }
    .sa-topic-card__bar-wrap {
      height: 4px;
      background: #f3f4f6;
      margin: 0 14px 0 18px;
    }
    .sa-topic-card__bar {
      height: 100%;
      border-radius: 2px;
      transition: width .6s ease;
    }
    .sa-topic-card__desc {
      font-size: 12.5px;
      line-height: 1.65;
      color: #374151;
      padding: 10px 14px 4px 18px;
      position: relative;
    }
    .sa-topic-card__desc--empty {
      color: #9ca3af;
      font-style: italic;
    }
    .sa-topic-card__ai-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      padding: 1px 5px;
      border-radius: 4px;
      margin-right: 5px;
      vertical-align: middle;
      letter-spacing: .3px;
    }
    .sa-topic-card__keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 8px 14px 14px 18px;
    }
    .sa-topic-kw, .sa-topic-card__kw {
      font-size: 11px; padding: 2px 7px; background: #f3f4f6;
      border: 1px solid #e5e7eb; border-radius: 12px; color: #6b7280;
    }

    /* Trending */
    .sa-trending-list { display: flex; flex-direction: column; gap: 6px; }
    .sa-trending-row { display: flex; align-items: center; gap: 8px; }
    .sa-trending-word {
      font-size: 13px; color: #111827; font-weight: 500; width: 110px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
    }
    .sa-trending-word--sm { font-size: 11px; width: 130px; }
    .sa-trending-bar-wrap { flex: 1; background: #f3f4f6; border-radius: 4px; height: 14px; overflow: hidden; }
    .sa-trending-bar { height: 100%; background: linear-gradient(90deg,#3b82f6,#60a5fa); border-radius: 4px; transition: width .3s; }
    .sa-trending-bar--topic { background: linear-gradient(90deg,#7c3aed,#a78bfa); }
    .sa-trending-val { font-size: 12px; color: #6b7280; width: 30px; text-align: right; }
    .sa-select--sm { padding: 3px 6px; font-size: 12px; }
  `]
})
export class SintaArtikelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: StatsResponse | null = null;
  statsLoading = false;

  // Accordion state
  acc1Open = false;
  acc2Open = false;
  acc3Open = false;

  // Riset analisis
  riset: RisetAnalisis | null = null;
  risetLoading    = false;
  risetLoaded     = false;
  risetNotReady   = false;   // cache kosong, butuh admin untuk generate
  risetRegenerating = false; // admin sedang trigger regenerasi
  risetYearSel    = '2023';

  // Tren tab
  trenTab: 'scopus' | 'gs_pub' | 'gs_cite' = 'scopus';

  // Artikel list
  artikels: Artikel[] = [];
  totalArtikel = 0;
  currentPage = 1;
  pageSize = 20;
  listLoading = false;
  filterSearch = '';
  filterKuartil = '';
  filterTahunMin: number | null = null;
  filterTahunMax: number | null = null;
  filterOrdering = '-sitasi';

  isAdminUser = false;

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    // Subscribe ke perubahan user (termasuk setelah refreshCurrentUser async)
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.isAdminUser = !!(u && u.is_staff);
      // Jika is_staff belum ada di cache lama, trigger refresh sekali
      if (u && u.is_staff === undefined && this.auth.getToken()) {
        this.auth.refreshCurrentUser();
      }
    });
    this.loadStats();
    this.loadArtikels(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRiset(): void {
    if (this.risetLoaded) return;
    this.risetLoading = true;
    this.risetNotReady = false;
    this.http.get<RisetAnalisis>(`${API}/sinta-scopus-artikel/riset-analisis/`)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.risetLoading = false; this.risetLoaded = true; }))
      .subscribe({ next: d => {
        if (!(d as any).ready) { this.risetNotReady = true; return; }
        this.riset = d;
        const yrs = Object.keys(d.trending_by_year).sort();
        this.risetYearSel = yrs[yrs.length - 2] || yrs[yrs.length - 1] || '2023';
      }, error: () => {} });
  }

  regenerateRiset(): void {
    if (!this.isAdminUser || this.risetRegenerating) return;
    this.risetRegenerating = true;
    this.risetLoaded = false;
    this.riset = null;
    this.risetNotReady = false;
    this.http.post<RisetAnalisis>(`${API}/sinta-scopus-artikel/riset-analisis/`, {})
      .pipe(takeUntil(this.destroy$), finalize(() => { this.risetRegenerating = false; this.risetLoaded = true; }))
      .subscribe({ next: d => {
        this.riset = d;
        const yrs = Object.keys(d.trending_by_year).sort();
        this.risetYearSel = yrs[yrs.length - 2] || yrs[yrs.length - 1] || '2023';
      }, error: () => {} });
  }

  loadStats(): void {
    this.statsLoading = true;
    this.http.get<StatsResponse>(`${API}/sinta-scopus-artikel/stats/`)
      .pipe(takeUntil(this.destroy$), finalize(() => this.statsLoading = false))
      .subscribe({ next: d => this.stats = d, error: () => {} });
  }

  loadArtikels(reset: boolean, page?: number): void {
    if (reset) this.currentPage = 1;
    if (page) this.currentPage = page;
    this.listLoading = true;

    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('page_size', this.pageSize.toString())
      .set('ordering', this.filterOrdering);
    if (this.filterSearch)   params = params.set('search', this.filterSearch);
    if (this.filterKuartil)  params = params.set('kuartil', this.filterKuartil);
    if (this.filterTahunMin) params = params.set('tahun__gte', this.filterTahunMin.toString());
    if (this.filterTahunMax) params = params.set('tahun__lte', this.filterTahunMax.toString());

    this.http.get<ArtikelResponse>(`${API}/sinta-scopus-artikel/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => this.listLoading = false))
      .subscribe({ next: r => { this.artikels = r.results; this.totalArtikel = r.count; }, error: () => {} });
  }

  totalPages(): number {
    return Math.ceil(this.totalArtikel / this.pageSize);
  }

  // Helpers
  filteredTren(tren: TrenItem[]): TrenItem[] {
    if (!tren) return [];
    return tren.filter(t => t.tahun >= 2010 && t.tahun <= 2025);
  }

  barPct(tren: TrenItem[], value: number): number {
    const max = Math.max(...tren.map(t => t.jumlah), 1);
    return Math.round((value / max) * 100);
  }

  // ── Line chart helpers ──────────────────────────────────────────
  private readonly LC = { x0: 58, x1: 688, y0: 20, y1: 172 };

  lcPoints(data: TrenItem[]): { x: number; y: number; tahun: number; jumlah: number }[] {
    if (!data || data.length < 2) return [];
    const minT = data[0].tahun, maxT = data[data.length - 1].tahun;
    const maxV = Math.max(...data.map(d => d.jumlah), 1);
    const { x0, x1, y0, y1 } = this.LC;
    const rangeT = maxT - minT || 1;
    return data.map(d => ({
      x: Math.round(x0 + (d.tahun - minT) / rangeT * (x1 - x0)),
      y: Math.round(y1 - (d.jumlah / maxV) * (y1 - y0)),
      tahun: d.tahun,
      jumlah: d.jumlah,
    }));
  }

  lcLinePath(data: TrenItem[]): string {
    const pts = this.lcPoints(data);
    if (!pts.length) return '';
    return pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  }

  lcAreaPath(data: TrenItem[]): string {
    const pts = this.lcPoints(data);
    if (!pts.length) return '';
    const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    return `${line} L${pts[pts.length - 1].x},${this.LC.y1} L${pts[0].x},${this.LC.y1} Z`;
  }

  lcY(data: TrenItem[], value: number): number {
    const maxV = Math.max(...data.map(d => d.jumlah), 1);
    return Math.round(this.LC.y1 - (value / maxV) * (this.LC.y1 - this.LC.y0));
  }

  lcGridY(data: TrenItem[]): number[] {
    const maxV = Math.max(...data.map(d => d.jumlah), 1);
    const step = this.niceStep(maxV, 4);
    const result: number[] = [];
    for (let v = step; v <= maxV; v += step) result.push(v);
    return result;
  }

  private niceStep(max: number, steps: number): number {
    const raw = max / steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    return nice * mag;
  }

  kuartilPct(jumlah: number): number {
    if (!this.stats) return 0;
    const max = Math.max(...this.stats.dist_kuartil.map(d => d.jumlah), 1);
    return Math.round((jumlah / max) * 100);
  }

  jurnalPct(jumlah: number): number {
    if (!this.stats || !this.stats.top_jurnal.length) return 0;
    const max = Math.max(...this.stats.top_jurnal.map(j => j.jumlah), 1);
    return Math.round((jumlah / max) * 100);
  }

  // ── Riset analisis helpers ──────────────────────────────────────
  wcFontSize(score: number, words: WordItem[]): number {
    const max = words[0]?.score || 1;
    return Math.round(11 + (score / max) * 26);
  }

  wcOpacity(score: number, words: WordItem[]): number {
    const max = words[0]?.score || 1;
    return Math.round((0.45 + (score / max) * 0.55) * 100) / 100;
  }

  topicColor(idx: number): string {
    const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899'];
    return colors[idx % colors.length];
  }

  wcuShort(field: string): string {
    const map: Record<string, string> = {
      'Engineering & Technology':      'Eng & Tech',
      'Life Sciences & Medicine':      'Life Sci',
      'Natural Sciences':              'Natural Sci',
      'Social Sciences & Management':  'Social Sci',
      'Arts & Humanities':             'Arts & Hum',
    };
    return map[field] ?? field;
  }

  topicPct(count: number): number {
    if (!this.riset) return 0;
    const max = Math.max(...this.riset.lda_topics.map(t => t.article_count), 1);
    return Math.round((count / max) * 100);
  }

  risetYears(): string[] {
    if (!this.riset) return [];
    return Object.keys(this.riset.trending_by_year).sort();
  }

  maxTopicYrCount(yr: string): number {
    if (!this.riset?.topic_per_year[yr]) return 1;
    return Math.max(...this.riset.topic_per_year[yr].map(t => t.count), 1);
  }
}
