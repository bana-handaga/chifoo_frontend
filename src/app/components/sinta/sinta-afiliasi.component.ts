import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const API      = environment.apiUrl;
const MEDIA    = (environment as any).mediaUrl ?? '';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ClusterMin {
  cluster_name: string;
  total_score:  number;
  periode:      string;
  score_publication:       number;
  score_hki:               number;
  score_kelembagaan:       number;
  score_research:          number;
  score_community_service: number;
  score_sdm:               number;
}

interface SintaAfiliasi {
  id: number;
  sinta_id:          string;
  nama_sinta:        string;
  singkatan_sinta:   string;
  lokasi_sinta:      string;
  sinta_profile_url: string;
  logo_base64:       string;
  pt_logo:           string;
  jumlah_authors:    number;
  jumlah_departments:number;
  jumlah_journals:   number;
  sinta_score_overall:            number;
  sinta_score_3year:              number;
  sinta_score_productivity:       number;
  sinta_score_productivity_3year: number;
  scopus_dokumen:             number;
  scopus_sitasi:              number;
  scopus_dokumen_disitasi:    number;
  scopus_sitasi_per_peneliti: number;
  scopus_q1: number; scopus_q2: number; scopus_q3: number;
  scopus_q4: number; scopus_noq: number;
  gscholar_dokumen:             number;
  gscholar_sitasi:              number;
  gscholar_dokumen_disitasi:    number;
  gscholar_sitasi_per_peneliti: number;
  wos_dokumen:             number;
  wos_sitasi:              number;
  wos_dokumen_disitasi:    number;
  wos_sitasi_per_peneliti: number;
  garuda_dokumen:             number;
  garuda_sitasi:              number;
  garuda_dokumen_disitasi:    number;
  garuda_sitasi_per_peneliti: number;
  sinta_last_update: string;
  scraped_at:        string;
  pt_nama:       string;
  pt_singkatan:  string;
  pt_kota:       string;
  pt_provinsi:   string;
  pt_kode:       string;
  pt_akreditasi: string;
  cluster:       ClusterMin | null;
  trend_tahunan?: TrendItem[];
  wcu_tahunan?:   WcuItem[];
}

interface TrendItem {
  jenis: string; tahun: number; jumlah: number;
  research_article: number; research_conference: number; research_others: number;
}

interface WcuItem {
  tahun: number; overall: number;
  natural_sciences: number; engineering_technology: number;
  life_sciences_medicine: number; social_sciences_management: number;
  arts_humanities: number;
}

interface Stats {
  total_pt: number;
  total_authors: number;
  total_scopus: number;
  total_gscholar: number;
  total_garuda: number;
  avg_score: number;
  max_score: number;
  distribusi_cluster: { cluster_name: string; jumlah: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CLUSTER_META: Record<string, { label: string; color: string; bg: string; short: string }> = {
  'Cluster Mandiri': { label: 'Mandiri', color: '#7c3aed', bg: '#f5f3ff', short: 'M' },
  'Cluster Utama':   { label: 'Utama',   color: '#2563eb', bg: '#eff6ff', short: 'U' },
  'Cluster Madya':   { label: 'Madya',   color: '#059669', bg: '#f0fdf4', short: 'Md' },
  'Cluster Pratama': { label: 'Pratama', color: '#d97706', bg: '#fffbeb', short: 'Pr' },
  'Cluster Binaan':  { label: 'Binaan',  color: '#dc2626', bg: '#fff1f2', short: 'B' },
};

const INDEX_TABS = [
  { key: 'scopus',   label: 'Scopus',         icon: '🔵', color: '#2563eb' },
  { key: 'gscholar', label: 'Google Scholar',  icon: '🟡', color: '#d97706' },
  { key: 'wos',      label: 'Web of Science',  icon: '🟢', color: '#059669' },
  { key: 'garuda',   label: 'Garuda',          icon: '🦅', color: '#dc2626' },
];

@Component({
  selector: 'app-sinta-afiliasi',
  template: `
<div class="sa-wrap">

  <!-- ── Back ── -->
  <div class="sa-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Hero ── -->
  <div class="sa-hero">
    <div class="sa-hero__left">
      <div class="sa-hero__badge">SINTA — Science and Technology Index</div>
      <h1 class="sa-hero__title">Afiliasi Perguruan Tinggi PTMA</h1>
      <p class="sa-hero__desc">
        Profil dan peringkat <strong>PTMA (Perguruan Tinggi Muhammadiyah & Aisyiyah)</strong>
        di SINTA — menampilkan skor riset, produktivitas publikasi, dan posisi klaster
        berdasarkan data resmi Kemdiktisaintek.
      </p>
      <div class="sa-hero__stats" *ngIf="stats">
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.total_pt }}</div>
          <div class="sa-hstat__lbl">PT Terdaftar</div>
        </div>
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.total_authors | number }}</div>
          <div class="sa-hstat__lbl">Penulis Aktif</div>
        </div>
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.total_scopus | number }}</div>
          <div class="sa-hstat__lbl">Dok. Scopus</div>
        </div>
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.total_gscholar | number }}</div>
          <div class="sa-hstat__lbl">Dok. GScholar</div>
        </div>
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.total_garuda | number }}</div>
          <div class="sa-hstat__lbl">Dok. Garuda</div>
        </div>
        <div class="sa-hstat">
          <div class="sa-hstat__num">{{ stats.avg_score | number:'1.0-0' }}</div>
          <div class="sa-hstat__lbl">Rerata Skor</div>
        </div>
      </div>
    </div>
    <!-- Cluster distribution mini-bar -->
    <div class="sa-hero__right" *ngIf="stats && stats.distribusi_cluster.length">
      <div class="sa-dist-title">Distribusi Cluster PTMA</div>
      <div *ngFor="let c of stats.distribusi_cluster" class="sa-dist-row"
           (click)="setClusterFilter(c.cluster_name)"
           [class.sa-dist-row--active]="filterCluster === c.cluster_name">
        <span class="sa-dist-badge"
              [style.background]="clusterColor(c.cluster_name)"
              [style.color]="'#fff'">
          {{ clusterShort(c.cluster_name) }}
        </span>
        <div class="sa-dist-bar-wrap">
          <div class="sa-dist-bar"
               [style.width.%]="(c.jumlah / stats!.total_pt) * 100"
               [style.background]="clusterColor(c.cluster_name)">
          </div>
        </div>
        <span class="sa-dist-lbl">{{ clusterLabel(c.cluster_name) }}</span>
        <span class="sa-dist-num">{{ c.jumlah }}</span>
      </div>
    </div>
  </div>

  <!-- ── Filter & Sort Bar ── -->
  <div class="sa-toolbar">
    <div class="sa-search-wrap">
      <svg class="sa-search-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16a6.47 6.47 0 004.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <input class="sa-search" [(ngModel)]="searchQuery" (ngModelChange)="onSearch()"
             placeholder="Cari nama universitas, kota, provinsi…" />
    </div>
    <div class="sa-filter-cluster">
      <button class="sa-fc-btn" [class.active]="filterCluster===''" (click)="setClusterFilter('')">Semua Cluster</button>
      <button *ngFor="let c of clusterOptions" class="sa-fc-btn"
              [class.active]="filterCluster===c.key"
              [style.--cc]="c.color"
              (click)="setClusterFilter(c.key)">
        {{ c.label }}
      </button>
    </div>
    <div class="sa-sort-wrap">
      <label class="sa-sort-lbl">Urutkan:</label>
      <select class="sa-sort-sel" [(ngModel)]="sortField" (ngModelChange)="loadData()">
        <option value="-sinta_score_overall">Skor SINTA ↓</option>
        <option value="sinta_score_overall">Skor SINTA ↑</option>
        <option value="-sinta_score_3year">Skor 3 Thn ↓</option>
        <option value="-scopus_dokumen">Dok. Scopus ↓</option>
        <option value="-scopus_sitasi">Sitasi Scopus ↓</option>
        <option value="-gscholar_dokumen">Dok. GScholar ↓</option>
        <option value="-jumlah_authors">Jumlah Penulis ↓</option>
        <option value="nama_sinta">Nama A–Z</option>
      </select>
    </div>
  </div>

  <!-- ── Loading ── -->
  <div class="sa-loading" *ngIf="loading">
    <div class="sa-spinner"></div>
    <span>Memuat data afiliasi…</span>
  </div>

  <!-- ── Ranking Cards ── -->
  <div class="sa-list" *ngIf="!loading">
    <div *ngFor="let pt of data; let i=index"
         class="sa-card"
         [class.sa-card--active]="selectedPt?.id === pt.id"
         (click)="openDetail(pt)">

      <!-- Rank -->
      <div class="sa-rank" [class.sa-rank--top3]="i < 3">#{{ i + 1 }}</div>

      <!-- Logo -->
      <div class="sa-logo-wrap">
        <img *ngIf="logoSrc(pt)" [src]="logoSrc(pt)"
             [alt]="pt.pt_singkatan" class="sa-logo" loading="lazy" />
        <div *ngIf="!logoSrc(pt)" class="sa-logo-ph">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
      </div>

      <!-- Info utama -->
      <div class="sa-info">
        <div class="sa-info__top">
          <div class="sa-name">{{ pt.pt_nama || pt.nama_sinta }}</div>
          <div class="sa-sub">{{ pt.singkatan_sinta }} · {{ pt.pt_kota }}, {{ pt.pt_provinsi }}</div>
        </div>
        <div class="sa-tags">
          <span *ngIf="pt.cluster" class="sa-tag-cluster"
                [style.background]="clusterBg(pt.cluster.cluster_name)"
                [style.color]="clusterColor(pt.cluster.cluster_name)"
                [style.border-color]="clusterColor(pt.cluster.cluster_name)">
            {{ clusterLabel(pt.cluster.cluster_name) }}
          </span>
          <span class="sa-tag-grey">{{ pt.jumlah_authors | number }} penulis</span>
          <span class="sa-tag-grey">{{ pt.jumlah_departments }} departemen</span>
          <span class="sa-tag-grey">{{ pt.jumlah_journals }} jurnal</span>
        </div>
        <!-- Metric row -->
        <div class="sa-metrics">
          <div class="sa-metric sa-metric--scopus">
            <span class="sa-metric__icon">🔵</span>
            <span class="sa-metric__val">{{ pt.scopus_dokumen | number:'1.0-0' }}</span>
            <span class="sa-metric__lbl">Scopus dok</span>
          </div>
          <div class="sa-metric sa-metric--scopus">
            <span class="sa-metric__icon">💬</span>
            <span class="sa-metric__val">{{ pt.scopus_sitasi | number:'1.0-0' }}</span>
            <span class="sa-metric__lbl">Scopus sitasi</span>
          </div>
          <div class="sa-metric sa-metric--gscholar">
            <span class="sa-metric__icon">🟡</span>
            <span class="sa-metric__val">{{ pt.gscholar_dokumen | number:'1.0-0' }}</span>
            <span class="sa-metric__lbl">GScholar dok</span>
          </div>
          <div class="sa-metric sa-metric--garuda">
            <span class="sa-metric__icon">🦅</span>
            <span class="sa-metric__val">{{ pt.garuda_dokumen | number:'1.0-0' }}</span>
            <span class="sa-metric__lbl">Garuda dok</span>
          </div>
        </div>
      </div>

      <!-- Skor SINTA -->
      <div class="sa-score-block">
        <div class="sa-score-ring" [style.--clr]="clusterColor(pt.cluster?.cluster_name || '')">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" stroke-width="7"/>
            <circle cx="40" cy="40" r="32" fill="none"
                    [attr.stroke]="clusterColor(pt.cluster?.cluster_name || '#94a3b8')"
                    stroke-width="7" stroke-linecap="round"
                    [attr.stroke-dasharray]="scoreArc(pt.sinta_score_overall)"
                    stroke-dashoffset="50" transform="rotate(-90 40 40)"/>
            <text x="40" y="37" text-anchor="middle" class="sa-score-num">{{ formatScore(pt.sinta_score_overall) }}</text>
            <text x="40" y="51" text-anchor="middle" class="sa-score-lbl">SINTA</text>
          </svg>
        </div>
        <div class="sa-score-3yr">3yr: <strong>{{ formatScore(pt.sinta_score_3year) }}</strong></div>
      </div>

    </div>

    <!-- Empty -->
    <div class="sa-empty" *ngIf="data.length === 0 && !loading">
      <div class="sa-empty__icon">🔍</div>
      <div>Tidak ada data yang cocok dengan filter saat ini.</div>
    </div>
  </div>

</div>

<!-- ══ MODAL DETAIL ══════════════════════════════════════════════════════════ -->
<div class="sa-overlay" *ngIf="selectedPt" (click)="closeDetail()">
  <div class="sa-modal" (click)="$event.stopPropagation()">

    <!-- Header modal -->
    <div class="sa-modal__header" [style.background]="clusterColor(selectedPt.cluster?.cluster_name || '')">
      <div class="sa-modal__logo-wrap">
        <img *ngIf="logoSrc(selectedPt)" [src]="logoSrc(selectedPt)"
             class="sa-modal__logo" [alt]="selectedPt.pt_singkatan" />
        <div *ngIf="!logoSrc(selectedPt)" class="sa-modal__logo-ph">
          <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
      </div>
      <div class="sa-modal__hinfo">
        <div class="sa-modal__pt-name">{{ selectedPt.pt_nama || selectedPt.nama_sinta }}</div>
        <div class="sa-modal__pt-sub">
          {{ selectedPt.singkatan_sinta }} · {{ selectedPt.pt_kota }}, {{ selectedPt.pt_provinsi }}
        </div>
        <div class="sa-modal__badges">
          <span *ngIf="selectedPt.cluster" class="sa-modal__badge-cluster">
            {{ clusterLabel(selectedPt.cluster.cluster_name) }}
          </span>
          <a *ngIf="selectedPt.sinta_profile_url" [href]="selectedPt.sinta_profile_url"
             target="_blank" rel="noopener" class="sa-modal__badge-link">
            Profil SINTA ↗
          </a>
        </div>
      </div>
      <button class="sa-modal__close" (click)="closeDetail()">✕</button>
    </div>

    <!-- Body modal -->
    <div class="sa-modal__body" *ngIf="!loadingDetail">

      <!-- Skor SINTA ringkasan -->
      <div class="sa-modal__score-row">
        <div class="sa-mscore" *ngFor="let s of scoreSummary(selectedPt)">
          <div class="sa-mscore__val" [style.color]="s.color">{{ s.val | number }}</div>
          <div class="sa-mscore__lbl">{{ s.lbl }}</div>
        </div>
      </div>

      <!-- Tab index database -->
      <div class="sa-modal__section-title">Statistik per Database Indeks</div>
      <div class="sa-modal__tab-bar">
        <button *ngFor="let t of indexTabs" class="sa-modal__tab"
                [class.active]="activeTab === t.key"
                [style.--tc]="t.color"
                (click)="activeTab = t.key">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>
      <ng-container *ngFor="let t of indexTabs">
        <div class="sa-modal__index-panel" *ngIf="activeTab === t.key">
          <div class="sa-idx-grid">
            <div class="sa-idx-card" *ngFor="let m of indexMetrics(selectedPt, t.key)">
              <div class="sa-idx-val" [style.color]="t.color">{{ m.val | number:'1.0-1' }}</div>
              <div class="sa-idx-lbl">{{ m.lbl }}</div>
            </div>
          </div>
          <!-- Quartile Scopus -->
          <ng-container *ngIf="t.key === 'scopus'">
            <div class="sa-modal__section-title" style="margin-top:1rem">Distribusi Kuartil Publikasi Scopus</div>
            <div class="sa-quartile-row">
              <div *ngFor="let q of quartileData(selectedPt)" class="sa-q-item">
                <div class="sa-q-bar-wrap">
                  <div class="sa-q-bar" [style.height.%]="q.pct" [style.background]="q.color"></div>
                </div>
                <div class="sa-q-val">{{ q.val }}</div>
                <div class="sa-q-lbl">{{ q.label }}</div>
              </div>
            </div>
            <div class="sa-quartile-note">
              Q1 = jurnal paling bergengsi (top 25%), Q4 = kuartil terendah, NoQ = tidak terkuartil
            </div>
          </ng-container>
        </div>
      </ng-container>

      <!-- Cluster detail -->
      <ng-container *ngIf="selectedPt.cluster">
        <div class="sa-modal__section-title">Detail Skor Cluster SINTA ({{ selectedPt.cluster.periode }})</div>
        <div class="sa-cluster-score-grid">
          <div *ngFor="let cs of clusterScores(selectedPt.cluster)" class="sa-cs-item">
            <div class="sa-cs-bar-wrap">
              <div class="sa-cs-bar"
                   [style.width.%]="cs.pct"
                   [style.background]="clusterColor(selectedPt.cluster!.cluster_name)">
              </div>
            </div>
            <div class="sa-cs-info">
              <span class="sa-cs-lbl">{{ cs.lbl }}</span>
              <span class="sa-cs-val">{{ cs.val | number:'1.0-2' }}</span>
            </div>
          </div>
        </div>
        <div class="sa-cluster-total">
          Total Skor Cluster: <strong [style.color]="clusterColor(selectedPt.cluster.cluster_name)">
            {{ selectedPt.cluster.total_score | number:'1.0-2' }}
          </strong>
        </div>
      </ng-container>

      <!-- Ringkasan SDM & Output -->
      <div class="sa-modal__section-title">Ringkasan SDM & Output</div>
      <div class="sa-sdm-grid">
        <div class="sa-sdm-item">
          <div class="sa-sdm-val">{{ selectedPt.jumlah_authors | number }}</div>
          <div class="sa-sdm-lbl">👤 Penulis Terdaftar</div>
        </div>
        <div class="sa-sdm-item">
          <div class="sa-sdm-val">{{ selectedPt.jumlah_departments }}</div>
          <div class="sa-sdm-lbl">🏛️ Departemen</div>
        </div>
        <div class="sa-sdm-item">
          <div class="sa-sdm-val">{{ selectedPt.jumlah_journals }}</div>
          <div class="sa-sdm-lbl">📰 Jurnal</div>
        </div>
        <div class="sa-sdm-item">
          <div class="sa-sdm-val">{{ selectedPt.sinta_score_productivity | number }}</div>
          <div class="sa-sdm-lbl">⚡ Produktivitas</div>
        </div>
        <div class="sa-sdm-item">
          <div class="sa-sdm-val">{{ selectedPt.sinta_score_productivity_3year | number }}</div>
          <div class="sa-sdm-lbl">⚡ Produktivitas 3yr</div>
        </div>
        <div class="sa-sdm-item" *ngIf="selectedPt.sinta_last_update">
          <div class="sa-sdm-val" style="font-size:.9rem">{{ selectedPt.sinta_last_update }}</div>
          <div class="sa-sdm-lbl">🕒 Update SINTA</div>
        </div>
      </div>

    </div><!-- /body -->

    <div class="sa-modal__loading" *ngIf="loadingDetail">
      <div class="sa-spinner"></div><span>Memuat detail…</span>
    </div>

  </div><!-- /modal -->
</div><!-- /overlay -->
`,
  styles: [`
    .sa-wrap { padding: 1.25rem 1.25rem 2rem; max-width: 1400px; margin: 0 auto; }

    /* Back */
    .sa-back {
      display: inline-flex; align-items: center;
      font-size: .83rem; color: #64748b; cursor: pointer;
      margin-bottom: 1rem; padding: .3rem .7rem;
      border-radius: 6px; transition: background .15s;
    }
    .sa-back:hover { background: #f1f5f9; color: #1e293b; }

    /* Hero */
    .sa-hero {
      display: flex; gap: 2rem; align-items: flex-start;
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 60%, #0284c7 100%);
      border-radius: 16px; padding: 1.75rem 2rem;
      color: #fff; margin-bottom: 1.5rem;
      box-shadow: 0 8px 28px rgba(3,105,161,.28);
    }
    .sa-hero__left  { flex: 1; min-width: 0; }
    .sa-hero__right { flex-shrink: 0; min-width: 240px; }
    .sa-hero__badge {
      display: inline-block; background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.3); border-radius: 20px;
      font-size: .72rem; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; padding: .25rem .75rem; margin-bottom: .75rem; color: #bae6fd;
    }
    .sa-hero__title { font-size: 1.6rem; font-weight: 900; margin: 0 0 .6rem; }
    .sa-hero__desc  { font-size: .88rem; opacity: .9; margin: 0 0 1.25rem; line-height: 1.6; }
    .sa-hero__desc strong { color: #bae6fd; }
    .sa-hero__stats { display: flex; flex-wrap: wrap; gap: .75rem; }
    .sa-hstat {
      background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
      border-radius: 10px; padding: .5rem .9rem; text-align: center; min-width: 80px;
    }
    .sa-hstat__num { font-size: 1.2rem; font-weight: 800; color: #fff; }
    .sa-hstat__lbl { font-size: .68rem; color: #bae6fd; margin-top: 1px; }

    /* Cluster distribution */
    .sa-dist-title {
      font-size: .72rem; font-weight: 700; letter-spacing: .05em;
      text-transform: uppercase; color: #bae6fd; margin-bottom: .6rem;
    }
    .sa-dist-row {
      display: flex; align-items: center; gap: .5rem;
      padding: .3rem .4rem; border-radius: 6px; cursor: pointer;
      transition: background .15s; margin-bottom: .2rem;
    }
    .sa-dist-row:hover, .sa-dist-row--active { background: rgba(255,255,255,.1); }
    .sa-dist-badge {
      width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
      font-size: .65rem; font-weight: 800; display: flex; align-items: center;
      justify-content: center;
    }
    .sa-dist-bar-wrap { flex: 1; height: 6px; background: rgba(255,255,255,.15); border-radius: 3px; overflow: hidden; }
    .sa-dist-bar      { height: 100%; border-radius: 3px; transition: width .4s; opacity: .85; }
    .sa-dist-lbl { font-size: .75rem; color: #e0f2fe; min-width: 60px; }
    .sa-dist-num { font-size: .75rem; font-weight: 700; color: #fff; }

    /* Toolbar */
    .sa-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: .75rem;
      margin-bottom: 1.25rem;
    }
    .sa-search-wrap {
      flex: 1; min-width: 220px; position: relative;
      display: flex; align-items: center;
    }
    .sa-search-icon {
      position: absolute; left: .65rem; width: 18px; height: 18px;
      color: #94a3b8; pointer-events: none;
    }
    .sa-search {
      width: 100%; padding: .55rem .75rem .55rem 2.2rem;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      font-size: .85rem; color: #1e293b; background: #fff;
      transition: border .15s;
    }
    .sa-search:focus { outline: none; border-color: #0284c7; }
    .sa-filter-cluster { display: flex; flex-wrap: wrap; gap: .35rem; }
    .sa-fc-btn {
      padding: .3rem .7rem; border-radius: 20px;
      border: 1.5px solid #e2e8f0; background: #f8fafc;
      color: #475569; font-size: .75rem; font-weight: 600; cursor: pointer;
      transition: all .15s;
    }
    .sa-fc-btn:hover  { border-color: var(--cc, #0284c7); color: var(--cc, #0284c7); }
    .sa-fc-btn.active {
      background: var(--cc, #0284c7); border-color: var(--cc, #0284c7);
      color: #fff !important;
    }
    .sa-fc-btn:first-child.active { background: #1e293b; border-color: #1e293b; }
    .sa-sort-wrap { display: flex; align-items: center; gap: .4rem; }
    .sa-sort-lbl { font-size: .78rem; color: #64748b; white-space: nowrap; }
    .sa-sort-sel {
      padding: .45rem .7rem; border: 1.5px solid #e2e8f0;
      border-radius: 8px; font-size: .8rem; color: #1e293b;
      background: #fff; cursor: pointer;
    }
    .sa-sort-sel:focus { outline: none; border-color: #0284c7; }

    /* Loading */
    .sa-loading {
      display: flex; align-items: center; justify-content: center; gap: .75rem;
      padding: 3rem; color: #94a3b8; font-size: .875rem;
    }
    .sa-spinner {
      width: 24px; height: 24px; border: 3px solid #e2e8f0;
      border-top-color: #0284c7; border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Card list */
    .sa-list { display: flex; flex-direction: column; gap: .75rem; }
    .sa-card {
      display: flex; align-items: center; gap: 1rem;
      background: #fff; border-radius: 12px; padding: 1rem 1.25rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      border: 2px solid transparent; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    .sa-card:hover, .sa-card--active {
      border-color: #0284c7; box-shadow: 0 4px 16px rgba(2,132,199,.15);
      transform: translateY(-1px);
    }

    /* Rank */
    .sa-rank {
      width: 32px; flex-shrink: 0; text-align: center;
      font-size: .85rem; font-weight: 800; color: #94a3b8;
    }
    .sa-rank--top3 { color: #f59e0b; font-size: 1rem; }

    /* Logo */
    .sa-logo-wrap {
      width: 64px; height: 64px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px; overflow: hidden; background: #f8fafc;
    }
    .sa-logo { width: 100%; height: 100%; object-fit: contain; }
    .sa-logo-ph {
      display: flex; align-items: center; justify-content: center;
      color: #cbd5e1; width: 100%; height: 100%;
    }

    /* Info */
    .sa-info { flex: 1; min-width: 0; }
    .sa-info__top { margin-bottom: .35rem; }
    .sa-name { font-size: .95rem; font-weight: 700; color: #1e293b; line-height: 1.3; }
    .sa-sub  { font-size: .75rem; color: #94a3b8; margin-top: 2px; }
    .sa-tags { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .45rem; }
    .sa-tag-cluster {
      display: inline-block; padding: .15rem .6rem; border-radius: 20px;
      font-size: .7rem; font-weight: 700; border: 1.5px solid;
    }
    .sa-tag-grey {
      display: inline-block; padding: .15rem .6rem; border-radius: 20px;
      font-size: .7rem; color: #475569; background: #f1f5f9;
    }
    .sa-metrics { display: flex; flex-wrap: wrap; gap: .5rem; }
    .sa-metric {
      display: flex; align-items: center; gap: .25rem;
      background: #f8fafc; border-radius: 6px; padding: .2rem .55rem;
      font-size: .75rem;
    }
    .sa-metric__icon { font-size: .8rem; }
    .sa-metric__val  { font-weight: 700; color: #1e293b; }
    .sa-metric__lbl  { color: #94a3b8; font-size: .7rem; }

    /* Score ring */
    .sa-score-block { flex-shrink: 0; text-align: center; }
    .sa-score-num { font-size: 13px; font-weight: 900; fill: #1e293b; }
    .sa-score-lbl { font-size: 8px; fill: #94a3b8; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .sa-score-3yr { font-size: .72rem; color: #94a3b8; margin-top: .2rem; }
    .sa-score-3yr strong { color: #475569; }

    /* Empty */
    .sa-empty {
      text-align: center; padding: 3rem; color: #94a3b8;
      font-size: .875rem; display: flex; flex-direction: column;
      align-items: center; gap: .5rem;
    }
    .sa-empty__icon { font-size: 2rem; }

    /* ── Modal ── */
    .sa-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      backdrop-filter: blur(3px); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem; animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    .sa-modal {
      background: #fff; border-radius: 16px; width: 100%; max-width: 780px;
      max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
      animation: slideUp .22s ease; box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }
    @keyframes slideUp { from { transform:translateY(30px); opacity:0 } to { transform:translateY(0); opacity:1 } }

    /* Modal header */
    .sa-modal__header {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem 1.5rem; border-radius: 14px 14px 0 0; position: relative;
    }
    .sa-modal__logo-wrap {
      width: 80px; height: 80px; flex-shrink: 0;
      background: rgba(255,255,255,.9); border-radius: 12px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
    }
    .sa-modal__logo    { width: 100%; height: 100%; object-fit: contain; }
    .sa-modal__logo-ph { display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#cbd5e1; }
    .sa-modal__hinfo   { flex: 1; color: #fff; }
    .sa-modal__pt-name { font-size: 1.15rem; font-weight: 800; line-height: 1.3; }
    .sa-modal__pt-sub  { font-size: .82rem; opacity: .85; margin-top: 3px; }
    .sa-modal__badges  { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5rem; }
    .sa-modal__badge-cluster {
      background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4);
      border-radius: 20px; font-size: .72rem; font-weight: 700;
      padding: .2rem .65rem; color: #fff;
    }
    .sa-modal__badge-link {
      background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4);
      border-radius: 20px; font-size: .72rem; font-weight: 600;
      padding: .2rem .65rem; color: #fff; text-decoration: none;
      transition: background .15s;
    }
    .sa-modal__badge-link:hover { background: rgba(255,255,255,.35); }
    .sa-modal__close {
      position: absolute; top: .75rem; right: .75rem;
      background: rgba(255,255,255,.2); border: none; border-radius: 50%;
      width: 30px; height: 30px; color: #fff; font-size: .9rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .sa-modal__close:hover { background: rgba(255,255,255,.35); }

    /* Modal body */
    .sa-modal__body    { padding: 1.25rem 1.5rem; flex: 1; }
    .sa-modal__loading {
      padding: 2rem; display: flex; align-items: center;
      justify-content: center; gap: .75rem; color: #94a3b8;
    }
    .sa-modal__section-title {
      font-size: .78rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: .06em; color: #64748b; margin: 1.25rem 0 .6rem;
      padding-bottom: .4rem; border-bottom: 1.5px solid #f1f5f9;
    }

    /* Score summary */
    .sa-modal__score-row {
      display: flex; flex-wrap: wrap; gap: .75rem;
      background: #f8fafc; border-radius: 10px; padding: .85rem 1rem;
      margin-bottom: .5rem;
    }
    .sa-mscore { flex: 1; min-width: 100px; text-align: center; }
    .sa-mscore__val { font-size: 1.35rem; font-weight: 900; }
    .sa-mscore__lbl { font-size: .72rem; color: #94a3b8; margin-top: 2px; }

    /* Tab bar */
    .sa-modal__tab-bar { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .75rem; }
    .sa-modal__tab {
      padding: .35rem .85rem; border-radius: 20px;
      border: 1.5px solid #e2e8f0; background: #f8fafc;
      font-size: .78rem; font-weight: 600; color: #475569; cursor: pointer;
      transition: all .15s;
    }
    .sa-modal__tab:hover { border-color: var(--tc); color: var(--tc); }
    .sa-modal__tab.active {
      background: var(--tc); border-color: var(--tc); color: #fff;
    }

    /* Index panel */
    .sa-modal__index-panel { }
    .sa-idx-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: .6rem;
      margin-bottom: .75rem;
    }
    .sa-idx-card {
      background: #f8fafc; border-radius: 8px; padding: .65rem .75rem; text-align: center;
    }
    .sa-idx-val { font-size: 1.15rem; font-weight: 800; }
    .sa-idx-lbl { font-size: .7rem; color: #94a3b8; margin-top: 2px; line-height: 1.3; }

    /* Quartile */
    .sa-quartile-row {
      display: flex; gap: .75rem; align-items: flex-end;
      height: 100px; padding: 0 .5rem;
    }
    .sa-q-item { display: flex; flex-direction: column; align-items: center; flex: 1; gap: .2rem; }
    .sa-q-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; max-height: 70px; }
    .sa-q-bar      { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height .4s; }
    .sa-q-val      { font-size: .8rem; font-weight: 700; color: #1e293b; }
    .sa-q-lbl      { font-size: .68rem; color: #94a3b8; }
    .sa-quartile-note { font-size: .72rem; color: #94a3b8; margin-top: .5rem; }

    /* Cluster scores */
    .sa-cluster-score-grid { display: flex; flex-direction: column; gap: .5rem; margin-bottom: .5rem; }
    .sa-cs-item { }
    .sa-cs-bar-wrap { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: .25rem; }
    .sa-cs-bar     { height: 100%; border-radius: 4px; transition: width .4s; }
    .sa-cs-info    { display: flex; justify-content: space-between; }
    .sa-cs-lbl     { font-size: .78rem; color: #475569; }
    .sa-cs-val     { font-size: .78rem; font-weight: 700; color: #1e293b; }
    .sa-cluster-total {
      text-align: right; font-size: .82rem; color: #64748b; margin-top: .4rem;
    }
    .sa-cluster-total strong { font-size: 1rem; }

    /* SDM Grid */
    .sa-sdm-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem;
    }
    .sa-sdm-item {
      background: #f8fafc; border-radius: 8px; padding: .65rem .75rem; text-align: center;
    }
    .sa-sdm-val { font-size: 1.05rem; font-weight: 800; color: #1e293b; }
    .sa-sdm-lbl { font-size: .7rem; color: #94a3b8; margin-top: 2px; }

    /* Responsive */
    @media (max-width: 768px) {
      .sa-hero { flex-direction: column; }
      .sa-card { flex-wrap: wrap; }
      .sa-score-block { flex-basis: 100%; display: flex; align-items: center; gap: .75rem; }
      .sa-idx-grid { grid-template-columns: repeat(2, 1fr); }
      .sa-sdm-grid { grid-template-columns: repeat(2, 1fr); }
      .sa-toolbar { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class SintaAfiliasiComponent implements OnInit, OnDestroy {

  data:          SintaAfiliasi[] = [];
  stats:         Stats | null    = null;
  selectedPt:    SintaAfiliasi | null = null;
  loading        = true;
  loadingDetail  = false;
  searchQuery    = '';
  filterCluster  = '';
  sortField      = '-sinta_score_overall';
  activeTab      = 'scopus';

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  readonly indexTabs = INDEX_TABS;
  readonly clusterOptions = Object.entries(CLUSTER_META).map(([key, v]) => ({ key, ...v }));

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }

  loadStats() {
    this.http.get<Stats>(`${API}/sinta-afiliasi/stats/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: d => this.stats = d, error: () => {} });
  }

  loadData() {
    this.loading = true;
    const params: any = { ordering: this.sortField };
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.filterCluster)      params['cluster__cluster_name__icontains'] = this.filterCluster.replace('Cluster ', '');

    this.http.get<any>(`${API}/sinta-afiliasi/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          this.data = Array.isArray(res) ? res : (res.results ?? []);
        },
        error: () => { this.data = []; }
      });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadData(), 350);
  }

  setClusterFilter(key: string) {
    this.filterCluster = this.filterCluster === key ? '' : key;
    this.loadData();
  }

  openDetail(pt: SintaAfiliasi) {
    document.body.style.overflow = 'hidden';
    if (pt.trend_tahunan !== undefined) {
      this.selectedPt = pt;
      return;
    }
    this.loadingDetail = true;
    this.selectedPt = pt;
    this.http.get<SintaAfiliasi>(`${API}/sinta-afiliasi/${pt.id}/`)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loadingDetail = false))
      .subscribe({
        next: detail => {
          this.selectedPt = detail;
          const idx = this.data.findIndex(d => d.id === detail.id);
          if (idx >= 0) this.data[idx] = detail;
        },
        error: () => {}
      });
  }

  closeDetail() {
    this.selectedPt = null;
    document.body.style.overflow = '';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  logoSrc(pt: SintaAfiliasi): string {
    if (pt.logo_base64) return pt.logo_base64;
    if (pt.pt_logo)     return MEDIA + pt.pt_logo;
    return '';
  }

  clusterColor(name: string) { return CLUSTER_META[name]?.color ?? '#94a3b8'; }
  clusterBg(name: string)    { return CLUSTER_META[name]?.bg    ?? '#f8fafc'; }
  clusterLabel(name: string) { return CLUSTER_META[name]?.label ?? name; }
  clusterShort(name: string) { return CLUSTER_META[name]?.short ?? '?'; }

  formatScore(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0)     + 'K';
    return String(n);
  }

  scoreArc(score: number): string {
    const max = this.data.reduce((m, d) => Math.max(m, d.sinta_score_overall), 1);
    const pct = Math.min(score / max, 1);
    const circ = 2 * Math.PI * 32;
    return `${pct * circ} ${circ}`;
  }

  scoreSummary(pt: SintaAfiliasi) {
    return [
      { val: pt.sinta_score_overall,  lbl: 'Skor SINTA',    color: this.clusterColor(pt.cluster?.cluster_name ?? '') },
      { val: pt.sinta_score_3year,    lbl: 'Skor 3 Tahun',  color: '#0284c7' },
      { val: pt.sinta_score_productivity,      lbl: 'Produktivitas', color: '#059669' },
      { val: pt.sinta_score_productivity_3year,lbl: 'Prod. 3 Thn',   color: '#059669' },
    ];
  }

  indexMetrics(pt: SintaAfiliasi, key: string) {
    const map: Record<string, { lbl: string; val: number }[]> = {
      scopus: [
        { lbl: 'Total Dokumen',       val: pt.scopus_dokumen },
        { lbl: 'Total Sitasi',        val: pt.scopus_sitasi },
        { lbl: 'Dokumen Disitasi',    val: pt.scopus_dokumen_disitasi },
        { lbl: 'Sitasi/Peneliti',     val: pt.scopus_sitasi_per_peneliti },
      ],
      gscholar: [
        { lbl: 'Total Dokumen',       val: pt.gscholar_dokumen },
        { lbl: 'Total Sitasi',        val: pt.gscholar_sitasi },
        { lbl: 'Dokumen Disitasi',    val: pt.gscholar_dokumen_disitasi },
        { lbl: 'Sitasi/Peneliti',     val: pt.gscholar_sitasi_per_peneliti },
      ],
      wos: [
        { lbl: 'Total Dokumen',       val: pt.wos_dokumen },
        { lbl: 'Total Sitasi',        val: pt.wos_sitasi },
        { lbl: 'Dokumen Disitasi',    val: pt.wos_dokumen_disitasi },
        { lbl: 'Sitasi/Peneliti',     val: pt.wos_sitasi_per_peneliti },
      ],
      garuda: [
        { lbl: 'Total Dokumen',       val: pt.garuda_dokumen },
        { lbl: 'Total Sitasi',        val: pt.garuda_sitasi },
        { lbl: 'Dokumen Disitasi',    val: pt.garuda_dokumen_disitasi },
        { lbl: 'Sitasi/Peneliti',     val: pt.garuda_sitasi_per_peneliti },
      ],
    };
    return map[key] ?? [];
  }

  quartileData(pt: SintaAfiliasi) {
    const vals = [
      { label: 'Q1', val: pt.scopus_q1,  color: '#7c3aed' },
      { label: 'Q2', val: pt.scopus_q2,  color: '#2563eb' },
      { label: 'Q3', val: pt.scopus_q3,  color: '#059669' },
      { label: 'Q4', val: pt.scopus_q4,  color: '#d97706' },
      { label: 'NoQ',val: pt.scopus_noq, color: '#94a3b8' },
    ];
    const maxV = Math.max(...vals.map(v => v.val), 1);
    return vals.map(v => ({ ...v, pct: (v.val / maxV) * 100 }));
  }

  clusterScores(c: ClusterMin) {
    const items = [
      { lbl: 'Publikasi (25%)',       val: c.score_publication },
      { lbl: 'HKI (10%)',             val: c.score_hki },
      { lbl: 'Kelembagaan (15%)',     val: c.score_kelembagaan },
      { lbl: 'Penelitian (15%)',      val: c.score_research },
      { lbl: 'Pengabdian (15%)',      val: c.score_community_service },
      { lbl: 'SDM (15%)',             val: c.score_sdm },
    ];
    const maxV = Math.max(...items.map(i => i.val), 1);
    return items.map(i => ({ ...i, pct: (i.val / maxV) * 100 }));
  }
}
