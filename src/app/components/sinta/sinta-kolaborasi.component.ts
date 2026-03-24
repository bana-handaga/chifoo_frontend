import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface GraphNode {
  id: number; nama: string; pt: string;
  sinta_score: number; sinta_id: string;
  degree: number; betweenness: number;
  komunitas: number; color: string;
  x: number; y: number;
}
interface GraphEdge {
  source: number; target: number;
  weight: number; sources: string[];
}
interface KomunitasItem {
  id: number; size: number; pt_dom: string; color: string;
}
interface TopPair {
  author1_id: number; author1_nama: string; author1_pt: string;
  author2_id: number; author2_nama: string; author2_pt: string;
  weight: number; sources: string[];
}
interface TopNode {
  id: number; nama: string; pt: string;
  degree: number; betweenness: number; color: string;
}
interface GraphStats {
  total_nodes: number; total_edges: number; total_komunitas: number;
  display_nodes: number; display_edges: number;
  density: number; avg_degree: number;
}
interface GraphResponse {
  ready: boolean; error?: string;
  sumber: string; cached?: boolean; cached_at?: string;
  stats: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
  komunitas_list: KomunitasItem[];
  top_pairs: TopPair[];
  top_degree: TopNode[];
  top_betweenness: TopNode[];
  top_pt: { pt: string; total_kolaborasi: number }[];
}
interface AuthorTrendItem { jenis: string; tahun: number; jumlah: number; }
interface AuthorProfile {
  id: number; sinta_id: string; nama: string; foto_url: string; url_profil: string;
  pt_singkatan: string; dept_nama: string; dept_jenjang: string;
  bidang_keilmuan: string[];
  sinta_score_overall: number; sinta_score_3year: number;
  scopus_artikel: number; scopus_sitasi: number; scopus_h_index: number;
  scopus_q1: number; scopus_q2: number; scopus_q3: number; scopus_q4: number; scopus_noq: number;
  gscholar_artikel: number; gscholar_sitasi: number; gscholar_h_index: number;
  wos_artikel: number; wos_sitasi: number; wos_h_index: number;
  research_articles: number; research_conference: number; research_others: number;
  affil_score: number; affil_score_3year: number;
  scraped_at: string; trend: AuthorTrendItem[];
}

@Component({
  selector: 'app-sinta-kolaborasi',
  template: `
<div class="sk-wrap">

  <!-- Breadcrumb -->
  <div class="sk-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- Header -->
  <div class="sk-header">
    <div class="sk-header__icon">🕸️</div>
    <div>
      <h1 class="sk-header__title">Jaringan Kerjasama Peneliti PTMA</h1>
      <p class="sk-header__sub">Co-authorship network dari data Penelitian, Pengabdian, dan Artikel Scopus</p>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="sk-filterbar">
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Sumber Data</label>
      <select class="sk-select" [(ngModel)]="filterSumber" (change)="loadGraph()">
        <option value="all">Semua (Penelitian + Pengabdian + Scopus)</option>
        <option value="penelitian">Penelitian saja</option>
        <option value="pengabdian">Pengabdian saja</option>
        <option value="scopus">Artikel Scopus saja</option>
      </select>
    </div>
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Min. Kolaborasi</label>
      <select class="sk-select" [(ngModel)]="filterMinBobot" (change)="loadGraph()">
        <option value="1">≥ 1 kali</option>
        <option value="2">≥ 2 kali</option>
        <option value="3">≥ 3 kali</option>
        <option value="5">≥ 5 kali</option>
      </select>
    </div>
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Tampilkan</label>
      <select class="sk-select" [(ngModel)]="filterMaxNodes" (change)="loadGraph()">
        <option value="200">200 peneliti teratas</option>
        <option value="400">400 peneliti teratas</option>
        <option value="600">600 peneliti teratas</option>
      </select>
    </div>
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Filter PT</label>
      <select class="sk-select" [(ngModel)]="filterPt" (change)="applyPtFilter()">
        <option value="">Semua PT</option>
        <option *ngFor="let pt of ptList" [value]="pt">{{ pt }}</option>
      </select>
    </div>
  </div>

  <!-- Loading -->
  <div class="sk-loading" *ngIf="loading">
    <div class="sk-spinner"></div>
    <span>Membangun jaringan kolaborasi… (maks ~15 detik)</span>
  </div>

  <!-- Error -->
  <div class="sk-error" *ngIf="error && !loading">⚠ {{ error }}</div>

  <ng-container *ngIf="data && !loading">

    <!-- Summary cards -->
    <div class="sk-cards">
      <div class="sk-card sk-card--purple">
        <div class="sk-card__val">{{ data.stats.total_nodes | number }}</div>
        <div class="sk-card__lbl">Peneliti Terhubung</div>
        <div class="sk-card__note">dari seluruh PTMA</div>
      </div>
      <div class="sk-card sk-card--blue">
        <div class="sk-card__val">{{ data.stats.total_edges | number }}</div>
        <div class="sk-card__lbl">Tautan Kolaborasi</div>
        <div class="sk-card__note">pasangan yang pernah bekerja sama</div>
      </div>
      <div class="sk-card sk-card--teal">
        <div class="sk-card__val">{{ data.stats.total_komunitas }}</div>
        <div class="sk-card__lbl">Komunitas Terdeteksi</div>
        <div class="sk-card__note">klaster kerjasama (Louvain)</div>
      </div>
      <div class="sk-card sk-card--green">
        <div class="sk-card__val">{{ data.stats.avg_degree }}</div>
        <div class="sk-card__lbl">Rata-rata Koneksi</div>
        <div class="sk-card__note">kolaborator per peneliti</div>
      </div>
    </div>

    <!-- Cache info -->
    <div class="sk-cache-info" *ngIf="data.cached">
      📦 Data dari cache {{ data.cached_at | date:'dd MMM yyyy HH:mm' }}
      <span *ngIf="isAdmin" class="sk-recompute" (click)="recompute()">↻ Hitung ulang</span>
    </div>

    <!-- ═══ GRAPH CANVAS ═══ -->
    <div class="sk-graph-card">
      <div class="sk-graph-head">
        <span class="sk-graph-title">
          Peta Jaringan — menampilkan {{ visibleNodes.length | number }} peneliti,
          {{ visibleEdges.length | number }} tautan
        </span>
        <div class="sk-graph-legend">
          <span class="sk-legend-item" *ngFor="let k of topKomunitas">
            <span class="sk-legend-dot" [style.background]="k.color"></span>{{ k.pt_dom || ('Kom. ' + k.id) }}
          </span>
        </div>
      </div>

      <div class="sk-graph-container" #graphContainer>
        <svg class="sk-svg" [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH"
             (mousemove)="onSvgMouseMove($event)"
             (mouseleave)="hoveredNode = null">

          <!-- Edges -->
          <line *ngFor="let e of visibleEdges"
                [attr.x1]="nodePos(e.source).x" [attr.y1]="nodePos(e.source).y"
                [attr.x2]="nodePos(e.target).x" [attr.y2]="nodePos(e.target).y"
                [attr.stroke-width]="edgeWidth(e.weight)"
                [attr.stroke]="edgeColor(e)"
                stroke-opacity="0.35"/>

          <!-- Nodes -->
          <g *ngFor="let n of visibleNodes"
             [attr.transform]="'translate(' + nodePos(n.id).x + ',' + nodePos(n.id).y + ')'"
             class="sk-node"
             (click)="openAuthorPopup(n.id)"
             (mouseenter)="hoveredNode = n">
            <circle [attr.r]="nodeRadius(n)"
                    [attr.fill]="filterPt && n.pt !== filterPt ? '#e2e8f0' : n.color"
                    [attr.opacity]="filterPt && n.pt !== filterPt ? 0.25 : 0.9"
                    stroke="#fff" [attr.stroke-width]="hoveredNode?.id === n.id ? 2.5 : 1.5"/>
            <text *ngIf="n.degree >= labelMinDegree"
                  text-anchor="middle" [attr.dy]="nodeRadius(n) + 9"
                  font-size="8" fill="#374151" font-weight="600"
                  style="pointer-events:none">{{ n.nama | slice:0:16 }}</text>
          </g>

          <!-- Hover tooltip inside SVG -->
          <g *ngIf="hoveredNode" class="sk-tooltip-g"
             [attr.transform]="tooltipTransform()">
            <rect x="0" y="0" width="180" height="56" rx="6"
                  fill="white" stroke="#e2e8f0" stroke-width="1"
                  filter="url(#sk-shadow)"/>
            <text x="8" y="16" font-size="10" font-weight="700" fill="#111827">{{ hoveredNode.nama | slice:0:24 }}</text>
            <text x="8" y="29" font-size="9" fill="#6b7280">{{ hoveredNode.pt }}</text>
            <text x="8" y="42" font-size="9" fill="#374151">Koneksi: <tspan font-weight="700">{{ hoveredNode.degree }}</tspan>  ·  Skor: <tspan font-weight="700">{{ hoveredNode.sinta_score | number }}</tspan></text>
            <text x="8" y="53" font-size="8" fill="#9ca3af">klik untuk detail profil</text>
          </g>

          <defs>
            <filter id="sk-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.12"/>
            </filter>
          </defs>
        </svg>
      </div>
    </div>

    <!-- ═══ 2-col statistik ═══ -->
    <div class="sk-grid-2">

      <!-- Top pasangan -->
      <div class="sk-section-card">
        <h2 class="sk-sec-title">🔗 Top Pasangan Berkolaborasi</h2>
        <div class="sk-pair-list">
          <div class="sk-pair-row" *ngFor="let p of data.top_pairs; let i = index">
            <span class="sk-pair-rank">{{ i + 1 }}</span>
            <div class="sk-pair-info">
              <div class="sk-pair-names">
                <span class="sk-pair-name sk-clickable"
                      (click)="openAuthorPopup(p.author1_id)">{{ p.author1_nama | titlecase }}</span>
                <span class="sk-pair-sep">↔</span>
                <span class="sk-pair-name sk-clickable"
                      (click)="openAuthorPopup(p.author2_id)">{{ p.author2_nama | titlecase }}</span>
              </div>
              <div class="sk-pair-meta">
                <span class="sk-pt-badge">{{ p.author1_pt }}</span>
                <span *ngIf="p.author2_pt !== p.author1_pt" class="sk-pt-badge">{{ p.author2_pt }}</span>
                <span class="sk-src-badge" *ngFor="let s of p.sources">{{ s }}</span>
              </div>
            </div>
            <span class="sk-pair-weight">{{ p.weight }}<small>×</small></span>
          </div>
        </div>
      </div>

      <!-- Top by degree -->
      <div class="sk-section-card">
        <h2 class="sk-sec-title">🌐 Paling Terhubung (Degree)</h2>
        <div class="sk-rank-list">
          <div class="sk-rank-row" *ngFor="let n of data.top_degree; let i = index"
               (click)="openAuthorPopup(n.id)">
            <span class="sk-rank-num">{{ i + 1 }}</span>
            <span class="sk-rank-dot" [style.background]="n.color"></span>
            <div class="sk-rank-info">
              <div class="sk-rank-nama">{{ n.nama | titlecase }}</div>
              <div class="sk-rank-pt">{{ n.pt }}</div>
            </div>
            <span class="sk-rank-val">{{ n.degree }}<small> koneksi</small></span>
          </div>
        </div>
      </div>

      <!-- Top betweenness -->
      <div class="sk-section-card">
        <h2 class="sk-sec-title">🌉 Broker / Jembatan Jaringan</h2>
        <p class="sk-sec-note">Peneliti yang menjembatani kelompok berbeda (betweenness centrality)</p>
        <div class="sk-rank-list">
          <div class="sk-rank-row" *ngFor="let n of data.top_betweenness; let i = index"
               (click)="openAuthorPopup(n.id)">
            <span class="sk-rank-num">{{ i + 1 }}</span>
            <span class="sk-rank-dot" [style.background]="n.color"></span>
            <div class="sk-rank-info">
              <div class="sk-rank-nama">{{ n.nama | titlecase }}</div>
              <div class="sk-rank-pt">{{ n.pt }}</div>
            </div>
            <span class="sk-rank-val">{{ (n.betweenness * 100) | number:'1.2-2' }}<small>%</small></span>
          </div>
        </div>
      </div>

      <!-- Top komunitas -->
      <div class="sk-section-card">
        <h2 class="sk-sec-title">🏘️ Komunitas Terbesar</h2>
        <div class="sk-kom-list">
          <div class="sk-kom-row" *ngFor="let k of data.komunitas_list | slice:0:15; let i = index">
            <span class="sk-kom-dot" [style.background]="k.color"></span>
            <div class="sk-kom-info">
              <span class="sk-kom-name">{{ k.pt_dom || ('Komunitas ' + (i + 1)) }}</span>
            </div>
            <div class="sk-kom-bar-wrap">
              <div class="sk-kom-bar" [style.width.%]="barPct(k.size, data.komunitas_list[0].size)"
                   [style.background]="k.color"></div>
            </div>
            <span class="sk-kom-val">{{ k.size }} peneliti</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Top PT -->
    <div class="sk-section-card sk-section-card--full">
      <h2 class="sk-sec-title">🏛️ Aktivitas Kolaborasi per PT</h2>
      <div class="sk-bar-list">
        <div class="sk-bar-row" *ngFor="let p of data.top_pt">
          <span class="sk-bar-lbl">{{ p.pt }}</span>
          <div class="sk-bar-wrap">
            <div class="sk-bar sk-bar--purple"
                 [style.width.%]="barPct(p.total_kolaborasi, data.top_pt[0].total_kolaborasi)"></div>
          </div>
          <span class="sk-bar-val">{{ p.total_kolaborasi | number }}</span>
        </div>
      </div>
    </div>

  </ng-container>

  <!-- ═══ Author Popup ═══ -->
  <div class="ap-overlay" *ngIf="authorPopup || authorPopupLoading" (click)="closePopup()">
    <div class="ap-popup" (click)="$event.stopPropagation()">
      <div class="ap-loading" *ngIf="authorPopupLoading && !authorPopup">
        <div class="sk-spinner sk-spinner--lg"></div>
      </div>
      <ng-container *ngIf="authorPopup as p">
        <button class="ap-close" (click)="closePopup()">✕</button>
        <div class="ap-header">
          <img class="ap-foto" [src]="p.foto_url || 'assets/avatar.png'"
               (error)="$any($event.target).src='assets/avatar.png'" alt="foto">
          <div class="ap-header-info">
            <div class="ap-nama">{{ p.nama | titlecase }}</div>
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
            <div class="ap-score-box ap-score-box--purple" *ngIf="graphNodeOf(p.id) as n">
              <div class="ap-score-val">{{ n.degree }}</div>
              <div class="ap-score-lbl">Koneksi</div>
            </div>
          </div>
        </div>
        <div class="ap-section">
          <div class="ap-section-lbl">Statistik Publikasi</div>
          <table class="ap-table">
            <thead><tr><th>Sumber</th><th>Artikel</th><th>Sitasi</th><th>H-index</th></tr></thead>
            <tbody>
              <tr>
                <td><span class="ap-src ap-src--scopus">Scopus</span></td>
                <td>{{ p.scopus_artikel | number }}</td>
                <td>{{ p.scopus_sitasi | number }}</td>
                <td>{{ p.scopus_h_index }}</td>
              </tr>
              <tr>
                <td><span class="ap-src ap-src--gs">G.Scholar</span></td>
                <td>{{ p.gscholar_artikel | number }}</td>
                <td>{{ p.gscholar_sitasi | number }}</td>
                <td>{{ p.gscholar_h_index }}</td>
              </tr>
              <tr>
                <td><span class="ap-src ap-src--wos">WoS</span></td>
                <td>{{ p.wos_artikel | number }}</td>
                <td>{{ p.wos_sitasi | number }}</td>
                <td>{{ p.wos_h_index }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="ap-section">
          <div class="ap-section-lbl">Output Riset</div>
          <div class="ap-output-row">
            <div class="ap-output-item">
              <div class="ap-output-val ap-output-val--green">{{ trenTotal(p,'research') | number }}</div>
              <div class="ap-output-lbl">Penelitian</div>
            </div>
            <div class="ap-output-item">
              <div class="ap-output-val ap-output-val--blue">{{ trenTotal(p,'service') | number }}</div>
              <div class="ap-output-lbl">Pengabdian</div>
            </div>
            <div class="ap-output-item">
              <div class="ap-output-val ap-output-val--orange">{{ p.research_articles | number }}</div>
              <div class="ap-output-lbl">Artikel</div>
            </div>
          </div>
        </div>
        <div class="ap-footer">
          <a [href]="p.url_profil" target="_blank" rel="noopener" class="ap-link">
            Lihat profil SINTA lengkap ↗
          </a>
        </div>
      </ng-container>
    </div>
  </div>

</div>
`,
  styles: [`
    .sk-wrap { padding: 1.25rem 1.25rem 3rem; max-width: 1400px; margin: 0 auto; }

    .sk-back {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .83rem; color: #64748b; cursor: pointer;
      margin-bottom: 1rem; padding: .3rem .6rem;
      border-radius: 6px; transition: background .15s;
    }
    .sk-back:hover { background: #f1f5f9; color: #1e293b; }

    .sk-header {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1.1rem 1.4rem; border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #4c1d95);
      color: #fff; margin-bottom: 1.25rem;
      box-shadow: 0 4px 16px rgba(124,58,237,.35);
    }
    .sk-header__icon { font-size: 2rem; flex-shrink: 0; margin-top: 2px; }
    .sk-header__title { font-size: 1.3rem; font-weight: 800; margin: 0 0 .3rem; }
    .sk-header__sub { font-size: .85rem; opacity: .9; margin: 0; }

    /* Filter bar */
    .sk-filterbar {
      display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1.25rem;
      background: #fff; border-radius: 10px; padding: .75rem 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
    }
    .sk-filter-group { display: flex; flex-direction: column; gap: .25rem; }
    .sk-filter-lbl { font-size: .72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .sk-select {
      padding: .4rem .65rem; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: .83rem; background: #f8fafc; color: #334155; cursor: pointer;
      outline: none;
    }
    .sk-select:focus { border-color: #7c3aed; }

    /* Loading */
    .sk-loading {
      display: flex; align-items: center; gap: .75rem;
      color: #64748b; font-size: .875rem; padding: 2rem;
      background: #fff; border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); margin-bottom: 1rem;
    }
    .sk-spinner {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid #e2e8f0; border-top-color: #7c3aed;
      animation: spin .7s linear infinite; flex-shrink: 0;
    }
    .sk-spinner--lg { width: 32px; height: 32px; border-width: 3px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sk-error { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 1rem 1.25rem; color: #dc2626; font-size: .875rem; }

    /* Cards */
    .sk-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: .75rem; margin-bottom: 1rem; }
    .sk-card { background: #fff; border-radius: 10px; padding: .9rem 1.1rem; box-shadow: 0 1px 4px rgba(0,0,0,.07); border-left: 4px solid transparent; }
    .sk-card--purple  { border-color: #7c3aed; }
    .sk-card--blue    { border-color: #2563eb; }
    .sk-card--teal    { border-color: #0d9488; }
    .sk-card--green   { border-color: #16a34a; }
    .sk-card__val  { font-size: 1.6rem; font-weight: 800; color: #1e293b; line-height: 1; }
    .sk-card__lbl  { font-size: .78rem; font-weight: 600; color: #475569; margin-top: .3rem; }
    .sk-card__note { font-size: .72rem; color: #94a3b8; margin-top: .15rem; }

    .sk-cache-info {
      font-size: .78rem; color: #94a3b8; margin-bottom: .75rem; padding: .3rem .6rem;
      background: #f8fafc; border-radius: 6px; display: inline-block;
    }
    .sk-recompute { color: #7c3aed; cursor: pointer; font-weight: 600; margin-left: .5rem; }
    .sk-recompute:hover { text-decoration: underline; }

    /* Graph */
    .sk-graph-card {
      background: #fff; border-radius: 12px; margin-bottom: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); overflow: hidden;
    }
    .sk-graph-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: .75rem 1.1rem; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: .5rem;
    }
    .sk-graph-title { font-size: .85rem; font-weight: 700; color: #334155; }
    .sk-graph-legend { display: flex; flex-wrap: wrap; gap: .5rem; }
    .sk-legend-item { display: flex; align-items: center; gap: .25rem; font-size: .72rem; color: #475569; }
    .sk-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .sk-graph-container { width: 100%; overflow: hidden; background: #f8fafc; }
    .sk-svg { width: 100%; display: block; cursor: grab; }
    .sk-node { cursor: pointer; }
    .sk-node:hover circle { stroke: #1e293b; stroke-width: 2.5px; }

    /* 2-col grid */
    .sk-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    @media (max-width: 768px) { .sk-grid-2 { grid-template-columns: 1fr; } }

    .sk-section-card { background: #fff; border-radius: 12px; padding: 1rem 1.2rem; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
    .sk-section-card--full { margin-bottom: 1rem; }
    .sk-sec-title { font-size: .92rem; font-weight: 700; color: #1e293b; margin: 0 0 .3rem; }
    .sk-sec-note { font-size: .75rem; color: #94a3b8; margin: 0 0 .75rem; }

    /* Pairs */
    .sk-pair-list { display: flex; flex-direction: column; gap: .5rem; }
    .sk-pair-row { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
    .sk-pair-rank { width: 20px; height: 20px; border-radius: 50%; background: #7c3aed; color: #fff; font-size: .68rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sk-pair-info { flex: 1; min-width: 0; }
    .sk-pair-names { display: flex; align-items: center; gap: .3rem; flex-wrap: wrap; }
    .sk-pair-name { font-weight: 600; color: #1e293b; }
    .sk-pair-sep { color: #94a3b8; }
    .sk-pair-meta { display: flex; gap: .3rem; margin-top: .2rem; flex-wrap: wrap; }
    .sk-pt-badge { font-size: .68rem; background: #ede9fe; color: #6d28d9; padding: .1rem .35rem; border-radius: 4px; font-weight: 600; }
    .sk-src-badge { font-size: .68rem; background: #f1f5f9; color: #475569; padding: .1rem .35rem; border-radius: 4px; }
    .sk-pair-weight { font-weight: 800; color: #7c3aed; white-space: nowrap; font-size: .9rem; }
    .sk-pair-weight small { font-weight: 400; color: #94a3b8; font-size: .72rem; }
    .sk-clickable { cursor: pointer; }
    .sk-clickable:hover { color: #7c3aed; text-decoration: underline; }

    /* Rank list */
    .sk-rank-list { display: flex; flex-direction: column; gap: .4rem; }
    .sk-rank-row { display: flex; align-items: center; gap: .5rem; padding: .4rem .5rem; border-radius: 6px; cursor: pointer; font-size: .8rem; }
    .sk-rank-row:hover { background: #f5f3ff; }
    .sk-rank-num { width: 18px; text-align: center; font-size: .72rem; color: #94a3b8; flex-shrink: 0; }
    .sk-rank-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sk-rank-info { flex: 1; min-width: 0; }
    .sk-rank-nama { font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sk-rank-pt { font-size: .7rem; color: #7c3aed; font-weight: 600; }
    .sk-rank-val { font-weight: 700; color: #1e293b; white-space: nowrap; }
    .sk-rank-val small { font-weight: 400; color: #94a3b8; font-size: .7rem; }

    /* Komunitas */
    .sk-kom-list { display: flex; flex-direction: column; gap: .4rem; }
    .sk-kom-row { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
    .sk-kom-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sk-kom-info { width: 130px; flex-shrink: 0; }
    .sk-kom-name { color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .sk-kom-bar-wrap { flex: 1; background: #f1f5f9; border-radius: 4px; height: 8px; overflow: hidden; }
    .sk-kom-bar { height: 100%; border-radius: 4px; transition: width .4s; }
    .sk-kom-val { white-space: nowrap; color: #64748b; font-size: .75rem; width: 80px; text-align: right; }

    /* Bar list */
    .sk-bar-list { display: flex; flex-direction: column; gap: .45rem; }
    .sk-bar-row { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
    .sk-bar-lbl { width: 100px; flex-shrink: 0; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .sk-bar-wrap { flex: 1; background: #f1f5f9; border-radius: 4px; height: 10px; overflow: hidden; }
    .sk-bar { height: 100%; border-radius: 4px; transition: width .4s; }
    .sk-bar--purple { background: #7c3aed; }
    .sk-bar-val { width: 40px; text-align: right; font-weight: 600; color: #334155; }

    /* ══ Author Popup ══ */
    .ap-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .ap-popup { background: #fff; border-radius: 14px; width: 100%; max-width: 420px; box-shadow: 0 24px 64px rgba(0,0,0,.28); position: relative; max-height: 90vh; overflow-y: auto; padding: 20px; }
    .ap-close { position: absolute; top: 12px; right: 14px; border: none; background: none; font-size: 16px; color: #94a3b8; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px; }
    .ap-close:hover { background: #f1f5f9; color: #1e293b; }
    .ap-loading { display: flex; justify-content: center; padding: 40px; }
    .ap-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .ap-foto { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0; flex-shrink: 0; }
    .ap-nama { font-size: 14px; font-weight: 800; color: #111827; line-height: 1.3; }
    .ap-dept { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .ap-pt   { font-size: 12px; font-weight: 700; color: #7c3aed; margin-top: 3px; }
    .ap-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .ap-tag  { font-size: 10px; background: #f5f3ff; color: #6d28d9; border-radius: 4px; padding: 2px 6px; }
    .ap-section { border-top: 1px solid #f3f4f6; padding-top: 10px; margin-bottom: 10px; }
    .ap-section-lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
    .ap-score-row { display: flex; gap: 8px; }
    .ap-score-box { flex: 1; border-radius: 8px; padding: 8px 10px; text-align: center; }
    .ap-score-box--blue   { background: #eff6ff; }
    .ap-score-box--sky    { background: #f0f9ff; }
    .ap-score-box--purple { background: #f5f3ff; }
    .ap-score-val { font-size: 18px; font-weight: 800; color: #1e40af; }
    .ap-score-lbl { font-size: 10px; color: #6b7280; margin-top: 1px; }
    .ap-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .ap-table th { text-align: left; color: #9ca3af; font-weight: 600; font-size: 10px; padding: 3px 6px; border-bottom: 1px solid #f3f4f6; }
    .ap-table td { padding: 4px 6px; color: #111827; }
    .ap-table tr:nth-child(even) td { background: #f9fafb; }
    .ap-src { font-size: 10px; padding: 2px 5px; border-radius: 4px; font-weight: 700; }
    .ap-src--scopus { background: #fef3c7; color: #92400e; }
    .ap-src--gs     { background: #dbeafe; color: #1e40af; }
    .ap-src--wos    { background: #ede9fe; color: #5b21b6; }
    .ap-output-row { display: flex; gap: 8px; }
    .ap-output-item { flex: 1; background: #f8fafc; border-radius: 8px; padding: 7px 6px; text-align: center; }
    .ap-output-val { font-size: 16px; font-weight: 800; line-height: 1; }
    .ap-output-val--green  { color: #16a34a; }
    .ap-output-val--blue   { color: #0284c7; }
    .ap-output-val--orange { color: #ea580c; }
    .ap-output-lbl { font-size: 9px; color: #94a3b8; margin-top: 3px; font-weight: 600; text-transform: uppercase; }
    .ap-footer { border-top: 1px solid #f3f4f6; padding-top: 10px; text-align: center; }
    .ap-link { display: inline-block; font-size: 12px; color: #7c3aed; text-decoration: none; font-weight: 600; padding: .35rem .9rem; border: 1px solid #ddd6fe; border-radius: 6px; background: #f5f3ff; }
    .ap-link:hover { background: #ede9fe; }
  `]
})
export class SintaKolaboasiComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild('graphContainer') graphContainerRef!: ElementRef;

  data:    GraphResponse | null = null;
  loading  = false;
  error    = '';
  isAdmin  = false;

  filterSumber   = 'all';
  filterMinBobot = '1';
  filterMaxNodes = '400';
  filterPt       = '';

  // SVG canvas dimensions
  svgW = 1000;
  svgH = 600;

  // Node lookup maps built after data loads
  private nodeMap = new Map<number, GraphNode>();
  visibleNodes: GraphNode[] = [];
  visibleEdges: GraphEdge[] = [];
  ptList: string[] = [];

  hoveredNode: GraphNode | null = null;
  private mouseX = 0;
  private mouseY = 0;

  authorPopup:        AuthorProfile | null = null;
  authorPopupLoading  = false;

  // Author popup ── for connection count overlay
  graphNodeOf(authorId: number): GraphNode | undefined {
    return this.nodeMap.get(authorId);
  }

  get topKomunitas(): KomunitasItem[] {
    return (this.data?.komunitas_list || []).slice(0, 8);
  }

  get labelMinDegree(): number {
    const degrees = this.visibleNodes.map(n => n.degree);
    const max = Math.max(...degrees, 1);
    return Math.max(3, Math.round(max * 0.25));
  }

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadGraph(); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadGraph(force = false) {
    this.loading = true;
    this.error   = '';
    const params: Record<string, string> = {
      sumber:    this.filterSumber,
      min_bobot: this.filterMinBobot,
      max_nodes: this.filterMaxNodes,
    };
    if (force) params['force'] = '1';

    this.http.get<GraphResponse>(`${API}/sinta-kolaborasi/graph/`, { params })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: d => {
          if (!d.ready) { this.error = d.error || 'Gagal membangun graph.'; return; }
          this.data = d;
          this.buildNodeMap(d);
          this.buildPtList(d);
          this.applyPtFilter();
        },
        error: () => { this.error = 'Koneksi ke server gagal.'; },
      });
  }

  recompute() { this.loadGraph(true); }

  private buildNodeMap(d: GraphResponse) {
    this.nodeMap.clear();
    for (const n of d.nodes) this.nodeMap.set(n.id, n);
  }

  private buildPtList(d: GraphResponse) {
    const set = new Set<string>();
    for (const n of d.nodes) if (n.pt) set.add(n.pt);
    this.ptList = Array.from(set).sort();
  }

  applyPtFilter() {
    if (!this.data) return;
    if (!this.filterPt) {
      this.visibleNodes = this.data.nodes;
      this.visibleEdges = this.data.edges;
    } else {
      // Show all nodes but dim non-PT; only keep edges within PT
      this.visibleNodes = this.data.nodes;
      const ptIds = new Set(this.data.nodes.filter(n => n.pt === this.filterPt).map(n => n.id));
      this.visibleEdges = this.data.edges.filter(
        e => ptIds.has(e.source) && ptIds.has(e.target)
      );
    }
  }

  // ── SVG helpers ────────────────────────────────────────────────────────────
  nodePos(nodeId: number): { x: number; y: number } {
    const n = this.nodeMap.get(nodeId);
    if (!n) return { x: 0, y: 0 };
    return {
      x: Math.round(n.x * (this.svgW - 40) + 20),
      y: Math.round(n.y * (this.svgH - 40) + 20),
    };
  }

  nodeRadius(n: GraphNode): number {
    const degrees = this.visibleNodes.map(v => v.degree);
    const max = Math.max(...degrees, 1);
    return Math.max(3, Math.min(18, Math.round((n.degree / max) * 18)));
  }

  edgeWidth(weight: number): number {
    return Math.max(0.5, Math.min(3.5, weight * 0.4));
  }

  edgeColor(e: GraphEdge): string {
    if (e.sources.includes('scopus'))     return '#d97706';
    if (e.sources.includes('penelitian')) return '#059669';
    return '#0284c7';
  }

  onSvgMouseMove(event: MouseEvent) {
    const el = event.currentTarget as SVGElement;
    const rect = el.getBoundingClientRect();
    this.mouseX = ((event.clientX - rect.left) / rect.width)  * this.svgW;
    this.mouseY = ((event.clientY - rect.top)  / rect.height) * this.svgH;
  }

  tooltipTransform(): string {
    const tw = 190, th = 60;
    const x = this.mouseX + 14 + tw > this.svgW ? this.mouseX - tw - 6 : this.mouseX + 14;
    const y = this.mouseY + th > this.svgH ? this.mouseY - th - 6 : this.mouseY + 4;
    return `translate(${x},${y})`;
  }

  // ── Author popup ────────────────────────────────────────────────────────────
  openAuthorPopup(authorId: number) {
    this.authorPopup        = null;
    this.authorPopupLoading = true;
    this.http.get<AuthorProfile>(`${API}/sinta-author/${authorId}/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  p  => { this.authorPopup = p; this.authorPopupLoading = false; },
        error: () => { this.authorPopupLoading = false; },
      });
  }

  closePopup() { this.authorPopup = null; this.authorPopupLoading = false; }

  trenTotal(p: AuthorProfile, jenis: string): number {
    return (p.trend || []).filter(t => t.jenis === jenis).reduce((s, t) => s + t.jumlah, 0);
  }

  barPct(val: number, max: number): number {
    return max ? Math.round(val / max * 100) : 0;
  }
}
