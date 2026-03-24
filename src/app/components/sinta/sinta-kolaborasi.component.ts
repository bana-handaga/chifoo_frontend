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
  topik: string[];
  x: number; y: number; z: number;
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
interface ProjPos { x: number; y: number; sz: number; scale: number; }

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
      <select class="sk-select" [(ngModel)]="filterSumber" (change)="markDirty()">
        <option value="all">Semua (Penelitian + Pengabdian + Scopus)</option>
        <option value="penelitian">Penelitian saja</option>
        <option value="pengabdian">Pengabdian saja</option>
        <option value="scopus">Artikel Scopus saja</option>
      </select>
    </div>
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Min. Kolaborasi</label>
      <select class="sk-select" [(ngModel)]="filterMinBobot" (change)="markDirty()">
        <option value="1">≥ 1 kali</option>
        <option value="2">≥ 2 kali</option>
        <option value="3">≥ 3 kali</option>
        <option value="5">≥ 5 kali</option>
      </select>
    </div>
    <div class="sk-filter-group">
      <label class="sk-filter-lbl">Tampilkan</label>
      <select class="sk-select" [(ngModel)]="filterMaxNodes" (change)="markDirty()">
        <option value="200">200 peneliti teratas</option>
        <option value="400">400 peneliti teratas</option>
        <option value="600">600 peneliti teratas</option>
      </select>
    </div>
    <div class="sk-filter-group sk-filter-group--pt">
      <label class="sk-filter-lbl">Filter PT</label>
      <div class="sk-pt-wrap">
        <!-- Trigger -->
        <button class="sk-pt-trigger" (click)="ptDropdownOpen=!ptDropdownOpen"
                [class.sk-pt-trigger--active]="selectedPts.size > 0">
          <span *ngIf="selectedPts.size === 0">Semua PT</span>
          <span *ngIf="selectedPts.size > 0">{{ selectedPts.size }} PT dipilih</span>
          <span class="sk-pt-arrow">{{ ptDropdownOpen ? '▴' : '▾' }}</span>
        </button>
        <!-- Dropdown -->
        <div class="sk-pt-dropdown" *ngIf="ptDropdownOpen">
          <input class="sk-pt-search" [(ngModel)]="ptSearch" placeholder="🔍 Cari PT…"
                 (click)="$event.stopPropagation()" autocomplete="off">
          <div class="sk-pt-options">
            <label class="sk-pt-option" *ngFor="let pt of filteredPtList"
                   (click)="$event.preventDefault(); togglePt(pt)">
              <span class="sk-pt-checkbox" [class.sk-pt-checkbox--on]="selectedPts.has(pt)">
                <span *ngIf="selectedPts.has(pt)">✓</span>
              </span>
              <span class="sk-pt-name">{{ pt }}</span>
            </label>
            <div class="sk-pt-empty" *ngIf="!filteredPtList.length">Tidak ditemukan</div>
          </div>
          <div class="sk-pt-footer">
            <button class="sk-pt-clear-btn" (click)="clearPts()">Hapus semua</button>
            <button class="sk-pt-done-btn"  (click)="ptDropdownOpen=false">Selesai ✓</button>
          </div>
        </div>
        <!-- Click-outside overlay -->
        <div class="sk-pt-overlay" *ngIf="ptDropdownOpen" (click)="ptDropdownOpen=false"></div>
      </div>
      <!-- Selected chips -->
      <div class="sk-pt-chips" *ngIf="selectedPts.size > 0">
        <span class="sk-pt-chip" *ngFor="let pt of selectedPtsArray">
          {{ pt }}<span class="sk-pt-chip-x" (click)="togglePt(pt)">×</span>
        </span>
      </div>
    </div>
    <!-- Recreate button — muncul saat filter berubah -->
    <div class="sk-filter-group sk-filter-group--btn">
      <label class="sk-filter-lbl">&nbsp;</label>
      <button class="sk-apply-btn"
              [class.sk-apply-btn--dirty]="filtersDirty"
              [disabled]="loading"
              (click)="applyFilters()">
        <span *ngIf="filtersDirty">↻ Terapkan Filter</span>
        <span *ngIf="!filtersDirty">✓ Diterapkan</span>
      </button>
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
          {{ viewLabels[viewMode] }} — {{ visibleNodes.length | number }} peneliti,
          {{ visibleEdges.length | number }} tautan
        </span>
        <div class="sk-graph-controls">
          <!-- Pilihan tampilan -->
          <div class="sk-view-tabs">
            <button class="sk-view-tab" [class.sk-view-tab--active]="viewMode==='3d'"   (click)="setViewMode('3d')"      title="Tampilan 3D interaktif">🌌 3D</button>
            <button class="sk-view-tab" [class.sk-view-tab--active]="viewMode==='2d'"   (click)="setViewMode('2d')"      title="Peta 2D datar">🗺️ 2D</button>
            <button class="sk-view-tab" [class.sk-view-tab--active]="viewMode==='cluster'" (click)="setViewMode('cluster')" title="Klaster komunitas">🏘️ Klaster</button>
          </div>
          <ng-container *ngIf="viewMode==='3d'">
            <button class="sk-ctrl-btn" (click)="resetView()" title="Reset sudut pandang">↺ Reset</button>
            <button class="sk-ctrl-btn" [class.sk-ctrl-btn--active]="autoRotate" (click)="toggleAutoRotate()">⟳ Auto</button>
            <span class="sk-hint">🖱 seret untuk memutar</span>
          </ng-container>
          <span class="sk-hint" *ngIf="viewMode==='2d'">posisi spring layout</span>
          <span class="sk-hint" *ngIf="viewMode==='cluster'">dikelompokkan per komunitas</span>
        </div>
      </div>
      <div class="sk-graph-legend">
        <span class="sk-legend-item" *ngFor="let k of topKomunitas">
          <span class="sk-legend-dot" [style.background]="k.color"></span>{{ k.pt_dom || ('Kom. ' + k.id) }}
        </span>
      </div>

      <!-- Author search & focus bar -->
      <div class="sk-as-bar">
        <div class="sk-as-wrap">
          <span class="sk-as-icon">🔍</span>
          <input class="sk-as-input" [(ngModel)]="authorSearchQuery"
                 (input)="searchAuthor(authorSearchQuery)"
                 (focus)="authorSearchDropdownOpen = authorSearchResults.length > 0"
                 placeholder="Cari peneliti di jaringan…"
                 autocomplete="off">
          <button class="sk-as-clear-btn" *ngIf="focusAuthorId !== null" (click)="clearFocus()" title="Hapus fokus">✕</button>
          <!-- Dropdown -->
          <div class="sk-as-dropdown" *ngIf="authorSearchDropdownOpen">
            <div class="sk-as-item" *ngFor="let r of authorSearchResults"
                 (click)="selectFocusAuthor(r)">
              <span class="sk-as-dot" [style.background]="r.color"></span>
              <div class="sk-as-item-info">
                <span class="sk-as-nama">{{ r.nama }}</span>
                <span class="sk-as-pt">{{ r.pt }}</span>
              </div>
              <span class="sk-as-deg">{{ r.degree }} koneksi</span>
            </div>
          </div>
          <div class="sk-as-overlay" *ngIf="authorSearchDropdownOpen" (click)="authorSearchDropdownOpen=false"></div>
        </div>
        <!-- Focus info strip -->
        <div class="sk-as-focus-strip" *ngIf="focusAuthorId !== null">
          <span class="sk-as-focus-dot" [style.background]="graphNodeOf(focusAuthorId!)?.color"></span>
          <span class="sk-as-focus-name">{{ graphNodeOf(focusAuthorId!)?.nama }}</span>
          <span class="sk-as-focus-stat">{{ focusNeighborIds.size }} kolaborator langsung</span>
          <button class="sk-as-ego-btn" [class.sk-as-ego-btn--active]="focusEgoOnly"
                  (click)="focusEgoOnly = !focusEgoOnly">
            {{ focusEgoOnly ? '⊕ Tampilkan semua' : '⊙ Jaringan saja' }}
          </button>
          <button class="sk-as-profile-btn" (click)="openAuthorPopup(focusAuthorId!)">👤 Profil</button>
        </div>
      </div>

      <div class="sk-graph-container"
           [class.sk-graph-container--dark]="viewMode==='3d'"
           [class.sk-graph-container--light]="viewMode==='2d'"
           [class.sk-graph-container--cluster]="viewMode==='cluster'"
           #graphContainer>
        <svg class="sk-svg" [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH"
             [class.sk-svg--dragging]="isDragging"
             (mousedown)="viewMode==='3d' && onDragStart($event)"
             (mousemove)="onSvgMove($event)"
             (mouseup)="onDragEnd()"
             (mouseleave)="onDragEnd(); hoveredNode = null"
             (touchstart)="viewMode==='3d' && onTouchStart($event)"
             (touchmove)="viewMode==='3d' && onTouchMove($event)"
             (touchend)="onDragEnd()">

          <defs>
            <filter id="sk-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.12"/>
            </filter>
          </defs>

          <!-- Cluster: lingkaran komunitas -->
          <ng-container *ngIf="viewMode==='cluster'">
            <circle *ngFor="let c of clusterCenters"
                    [attr.cx]="c.cx" [attr.cy]="c.cy" [attr.r]="c.r + 6"
                    [attr.fill]="c.color" fill-opacity="0.06"
                    [attr.stroke]="c.color" stroke-opacity="0.25" stroke-width="1.5"/>
            <text *ngFor="let c of clusterCenters"
                  [attr.x]="c.cx" [attr.y]="c.cy - c.r - 10"
                  text-anchor="middle" font-size="9" font-weight="700"
                  [attr.fill]="c.color" opacity="0.8">{{ c.label }}</text>
          </ng-container>

          <!-- Edges -->
          <line *ngFor="let e of graphEdges"
                [attr.x1]="proj(e.source).x" [attr.y1]="proj(e.source).y"
                [attr.x2]="proj(e.target).x" [attr.y2]="proj(e.target).y"
                [attr.stroke-width]="edgeWidth(e.weight)"
                [attr.stroke]="edgeColor(e)"
                [attr.stroke-opacity]="edgeOpacity(e)"/>

          <!-- Nodes -->
          <g *ngFor="let n of graphNodes; trackBy: trackNode"
             [attr.transform]="'translate(' + proj(n.id).x + ',' + proj(n.id).y + ')'"
             class="sk-node"
             (click)="onNodeClick(n)"
             (mouseenter)="!isDragging && (hoveredNode = n)">
            <!-- Focus ring -->
            <circle *ngIf="focusAuthorId === n.id"
                    [attr.r]="nodeRadius(n) * proj(n.id).scale + 6"
                    fill="none" stroke="#f59e0b" stroke-width="2.5" opacity="0.9"/>
            <circle
              [attr.r]="nodeRadius(n) * proj(n.id).scale"
              [attr.fill]="nodeColor(n)"
              [attr.opacity]="nodeOpacity(n)"
              [attr.stroke]="nodeStroke(n)"
              [attr.stroke-width]="nodeStrokeWidth(n)"/>
            <text *ngIf="showLabel(n)"
                  text-anchor="middle" [attr.dy]="nodeRadius(n) * proj(n.id).scale + 9"
                  [attr.font-size]="viewMode==='3d' ? 8 * proj(n.id).scale : 8"
                  [attr.fill]="'#1e293b'"
                  font-weight="600" style="pointer-events:none">{{ n.nama | slice:0:18 }}</text>
            <!-- Topic tags — shown in focus mode for focused node + neighbors -->
            <ng-container *ngIf="focusAuthorId !== null && (focusAuthorId === n.id || focusNeighborIds.has(n.id)) && n.topik?.length">
              <text *ngFor="let t of n.topik; let ti = index"
                    text-anchor="middle"
                    [attr.dy]="nodeRadius(n) * proj(n.id).scale + 20 + ti * 11"
                    font-size="7"
                    [attr.fill]="focusAuthorId === n.id ? '#b45309' : '#64748b'"
                    font-weight="500" style="pointer-events:none">{{ t | slice:0:20 }}</text>
            </ng-container>
          </g>

          <!-- Hover tooltip -->
          <g *ngIf="hoveredNode && !isDragging" class="sk-tooltip-g"
             [attr.transform]="tooltipTransform()">
            <rect x="0" y="0" width="190" height="58" rx="6"
                  fill="white" stroke="#e2e8f0" stroke-width="1"
                  filter="url(#sk-shadow)"/>
            <text x="8" y="16" font-size="10" font-weight="700" fill="#111827">{{ hoveredNode.nama | slice:0:26 }}</text>
            <text x="8" y="29" font-size="9" fill="#6b7280">{{ hoveredNode.pt }}</text>
            <text x="8" y="42" font-size="9" fill="#374151">Koneksi: <tspan font-weight="700">{{ hoveredNode.degree }}</tspan>  ·  Skor: <tspan font-weight="700">{{ hoveredNode.sinta_score | number }}</tspan></text>
            <text x="8" y="54" font-size="8" fill="#9ca3af">klik untuk detail profil</text>
          </g>

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
        <!-- Tren tahunan sparklines -->
        <div class="ap-section" *ngIf="trenData(p,'scopus').length || trenData(p,'gscholar_pub').length || trenData(p,'research').length || trenData(p,'service').length">
          <div class="ap-section-lbl">Tren Tahunan</div>
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
      box-shadow: 0 1px 4px rgba(0,0,0,.07); align-items: flex-end;
    }
    .sk-filter-group { display: flex; flex-direction: column; gap: .25rem; }
    .sk-filter-group--btn { margin-left: auto; }
    .sk-filter-lbl { font-size: .72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .sk-select {
      padding: .4rem .65rem; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: .83rem; background: #f8fafc; color: #334155; cursor: pointer;
      outline: none;
    }
    .sk-select:focus { border-color: #7c3aed; }

    /* ── PT multi-select ── */
    .sk-filter-group--pt { flex: 1; min-width: 180px; }
    .sk-pt-wrap { position: relative; }
    .sk-pt-trigger {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: .4rem .65rem; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: .83rem; background: #f8fafc; color: #334155; cursor: pointer;
      text-align: left; white-space: nowrap;
    }
    .sk-pt-trigger--active { border-color: #7c3aed; background: #f5f3ff; color: #6d28d9; }
    .sk-pt-arrow { font-size: .65rem; color: #94a3b8; margin-left: .4rem; }
    .sk-pt-overlay { position: fixed; inset: 0; z-index: 49; }
    .sk-pt-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.13); width: 220px; overflow: hidden;
    }
    .sk-pt-search {
      width: 100%; padding: .5rem .75rem; border: none; border-bottom: 1px solid #f1f5f9;
      font-size: .82rem; outline: none; background: #f8fafc; box-sizing: border-box;
    }
    .sk-pt-options { max-height: 220px; overflow-y: auto; padding: .3rem 0; }
    .sk-pt-option {
      display: flex; align-items: center; gap: .5rem; padding: .35rem .75rem;
      cursor: pointer; font-size: .8rem; color: #334155; user-select: none;
      transition: background .1s;
    }
    .sk-pt-option:hover { background: #f5f3ff; }
    .sk-pt-checkbox {
      width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #d1d5db;
      display: flex; align-items: center; justify-content: center;
      font-size: .65rem; font-weight: 800; color: #fff; flex-shrink: 0;
      background: #fff; transition: all .15s;
    }
    .sk-pt-checkbox--on { background: #7c3aed; border-color: #7c3aed; }
    .sk-pt-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sk-pt-empty { padding: .5rem .75rem; font-size: .8rem; color: #94a3b8; }
    .sk-pt-footer {
      display: flex; justify-content: space-between; gap: .5rem;
      padding: .5rem .75rem; border-top: 1px solid #f1f5f9; background: #f8fafc;
    }
    .sk-pt-clear-btn {
      font-size: .75rem; color: #94a3b8; background: none; border: none;
      cursor: pointer; padding: .2rem .4rem; border-radius: 4px;
    }
    .sk-pt-clear-btn:hover { color: #dc2626; }
    .sk-pt-done-btn {
      font-size: .75rem; color: #fff; background: #7c3aed; border: none;
      cursor: pointer; padding: .25rem .75rem; border-radius: 5px; font-weight: 600;
    }
    .sk-pt-done-btn:hover { background: #6d28d9; }
    /* Chips */
    .sk-pt-chips { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .4rem; }
    .sk-pt-chip {
      display: inline-flex; align-items: center; gap: .25rem;
      background: #ede9fe; color: #5b21b6; font-size: .72rem; font-weight: 600;
      padding: .15rem .5rem; border-radius: 5px;
    }
    .sk-pt-chip-x {
      cursor: pointer; font-size: .85rem; line-height: 1; color: #7c3aed;
      margin-left: .1rem;
    }
    .sk-pt-chip-x:hover { color: #dc2626; }

    .sk-apply-btn {
      padding: .45rem 1.1rem; border-radius: 7px; font-size: .82rem; font-weight: 600;
      cursor: pointer; border: 1.5px solid #e2e8f0; background: #f8fafc; color: #64748b;
      transition: all .2s; white-space: nowrap;
    }
    .sk-apply-btn--dirty {
      background: #7c3aed; border-color: #7c3aed; color: #fff;
      box-shadow: 0 2px 8px rgba(124,58,237,.35);
      animation: sk-pulse .9s ease-in-out infinite alternate;
    }
    @keyframes sk-pulse {
      from { box-shadow: 0 2px 8px rgba(124,58,237,.3); }
      to   { box-shadow: 0 2px 18px rgba(124,58,237,.6); }
    }
    .sk-apply-btn:disabled { opacity: .6; cursor: not-allowed; }

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
      padding: .65rem 1.1rem; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: .5rem;
    }
    .sk-graph-title { font-size: .85rem; font-weight: 700; color: #334155; }
    .sk-graph-controls { display: flex; align-items: center; gap: .5rem; }
    .sk-ctrl-btn {
      padding: .3rem .7rem; border-radius: 6px; font-size: .75rem; font-weight: 600;
      border: 1.5px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer;
      transition: all .15s;
    }
    .sk-ctrl-btn:hover { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }
    .sk-ctrl-btn--active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    .sk-hint { font-size: .72rem; color: #94a3b8; }
    .sk-graph-legend { display: flex; flex-wrap: wrap; gap: .5rem; padding: .4rem 1.1rem; border-bottom: 1px solid #f1f5f9; }
    .sk-legend-item { display: flex; align-items: center; gap: .25rem; font-size: .72rem; color: #475569; }
    .sk-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .sk-graph-container { width: 100%; overflow: hidden; border-radius: 0 0 12px 12px; }
    .sk-graph-container--dark    { background: #f2f2f2; }
    .sk-graph-container--light   { background: #f8fafc; }
    .sk-graph-container--cluster { background: #fafafa; }
    .sk-svg { width: 100%; display: block; }
    .sk-svg--dragging { cursor: grabbing; }
    .sk-node { cursor: pointer; }

    /* View mode tabs */
    .sk-view-tabs { display: flex; border-radius: 7px; overflow: hidden; border: 1.5px solid #e2e8f0; }
    .sk-view-tab {
      padding: .28rem .75rem; font-size: .75rem; font-weight: 600;
      border: none; background: #f8fafc; color: #64748b; cursor: pointer;
      transition: all .15s; border-right: 1px solid #e2e8f0;
    }
    .sk-view-tab:last-child { border-right: none; }
    .sk-view-tab:hover { background: #ede9fe; color: #5b21b6; }
    .sk-view-tab--active { background: #7c3aed; color: #fff; }

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
    .ap-sparklines { display: flex; flex-direction: column; gap: 10px; }
    .ap-spark-item { }
    .ap-spark-lbl { font-size: 10px; color: #475569; font-weight: 600; margin-bottom: 3px; }
    .ap-spark { width: 100%; height: 40px; display: block; }

    /* ── Author search bar ── */
    .sk-as-bar {
      padding: .5rem 1.1rem; border-bottom: 1px solid #f1f5f9;
      display: flex; flex-direction: column; gap: .4rem; background: #fafafa;
    }
    .sk-as-wrap { position: relative; display: flex; align-items: center; gap: .5rem; }
    .sk-as-icon { font-size: .9rem; color: #94a3b8; flex-shrink: 0; }
    .sk-as-input {
      flex: 1; padding: .38rem .65rem; border: 1.5px solid #e2e8f0; border-radius: 7px;
      font-size: .82rem; background: #fff; color: #334155; outline: none;
      transition: border-color .15s;
    }
    .sk-as-input:focus { border-color: #7c3aed; }
    .sk-as-clear-btn {
      padding: .25rem .55rem; border-radius: 5px; font-size: .75rem;
      border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626;
      cursor: pointer; flex-shrink: 0;
    }
    .sk-as-clear-btn:hover { background: #fee2e2; }
    .sk-as-overlay { position: fixed; inset: 0; z-index: 49; }
    .sk-as-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.13); overflow: hidden;
    }
    .sk-as-item {
      display: flex; align-items: center; gap: .5rem; padding: .45rem .75rem;
      cursor: pointer; transition: background .1s; font-size: .8rem;
    }
    .sk-as-item:hover { background: #f5f3ff; }
    .sk-as-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sk-as-item-info { flex: 1; min-width: 0; }
    .sk-as-nama { font-weight: 600; color: #1e293b; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sk-as-pt { font-size: .72rem; color: #7c3aed; font-weight: 600; }
    .sk-as-deg { font-size: .75rem; color: #64748b; white-space: nowrap; font-weight: 600; flex-shrink: 0; }
    /* Focus strip */
    .sk-as-focus-strip {
      display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
      background: #fefce8; border: 1px solid #fde68a; border-radius: 7px;
      padding: .35rem .75rem; font-size: .8rem;
    }
    .sk-as-focus-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sk-as-focus-name { font-weight: 700; color: #1e293b; }
    .sk-as-focus-stat { color: #64748b; font-size: .75rem; }
    .sk-as-ego-btn {
      padding: .22rem .65rem; border-radius: 5px; font-size: .75rem; font-weight: 600;
      border: 1.5px solid #fbbf24; background: #fff; color: #92400e; cursor: pointer;
      transition: all .15s; margin-left: auto;
    }
    .sk-as-ego-btn:hover { background: #fef3c7; }
    .sk-as-ego-btn--active { background: #fbbf24; border-color: #f59e0b; color: #1c1917; }
    .sk-as-profile-btn {
      padding: .22rem .65rem; border-radius: 5px; font-size: .75rem; font-weight: 600;
      border: 1.5px solid #c4b5fd; background: #f5f3ff; color: #5b21b6; cursor: pointer;
    }
    .sk-as-profile-btn:hover { background: #ede9fe; }
  `]
})
export class SintaKolaboasiComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild('graphContainer') graphContainerRef!: ElementRef;

  readonly Math = Math;

  data:    GraphResponse | null = null;
  loading  = false;
  error    = '';
  isAdmin  = false;

  // ── Filters ─────────────────────────────────────────────────────────────────
  filterSumber   = 'all';
  filterMinBobot = '1';
  filterMaxNodes = '400';
  selectedPts    = new Set<string>();
  ptDropdownOpen = false;
  ptSearch       = '';

  // track what is currently displayed
  private loadedSumber   = '';
  private loadedMinBobot = '';
  private loadedMaxNodes = '';
  filtersDirty = false;

  // ── SVG canvas ───────────────────────────────────────────────────────────────
  svgW = 1000;
  svgH = 580;

  // ── View mode ────────────────────────────────────────────────────────────────
  viewMode: '3d' | '2d' | 'cluster' = '3d';
  readonly viewLabels: Record<string, string> = {
    '3d': 'Peta Jaringan 3D', '2d': 'Peta Jaringan 2D', 'cluster': 'Klaster Komunitas',
  };

  // ── 3D rotation state ────────────────────────────────────────────────────────
  rotX = 0.28;   // initial slight tilt
  rotY = 0.38;
  isDragging  = false;
  private dragMoved  = false;
  private lastDragX  = 0;
  private lastDragY  = 0;
  autoRotate  = false;
  private autoRafId  = 0;

  // ── Node maps & projection cache ─────────────────────────────────────────────
  private nodeMap = new Map<number, GraphNode>();
  private projMap = new Map<number, ProjPos>();   // cached projections
  private clusterPosMap = new Map<number, { x: number; y: number }>();
  clusterCenters: { cx: number; cy: number; r: number; color: string; label: string }[] = [];
  visibleNodes: GraphNode[] = [];
  visibleEdges: GraphEdge[] = [];
  _sortedVisibleNodes: GraphNode[] = [];
  ptList: string[] = [];

  hoveredNode: GraphNode | null = null;
  private mouseX = 0;
  private mouseY = 0;

  authorPopup:        AuthorProfile | null = null;
  authorPopupLoading  = false;

  // ── Author search / focus ────────────────────────────────────────────────────
  focusAuthorId:          number | null = null;
  focusNeighborIds        = new Set<number>();
  authorSearchQuery       = '';
  authorSearchResults:    GraphNode[] = [];
  authorSearchDropdownOpen = false;
  focusEgoOnly            = false;

  // ── Helpers ──────────────────────────────────────────────────────────────────
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

  showLabel(n: GraphNode): boolean {
    if (this.isDragging) return false;
    if (this.viewMode === 'cluster') return n.degree >= Math.max(2, this.labelMinDegree * 0.5);
    if (this.viewMode === '2d')      return n.degree >= Math.max(2, this.labelMinDegree * 0.6);
    return n.degree >= this.labelMinDegree;
  }

  get sortedVisibleNodes(): GraphNode[] { return this._sortedVisibleNodes; }

  trackNode(_: number, n: GraphNode) { return n.id; }

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadGraph(); }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRotate();
  }

  // ── Filter logic ─────────────────────────────────────────────────────────────
  markDirty() {
    this.filtersDirty =
      this.filterSumber   !== this.loadedSumber   ||
      this.filterMinBobot !== this.loadedMinBobot  ||
      this.filterMaxNodes !== this.loadedMaxNodes;
  }

  applyFilters() { this.loadGraph(false); }

  loadGraph(force = false) {
    this.loading     = true;
    this.error       = '';
    this.filtersDirty = false;
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
          this.loadedSumber   = this.filterSumber;
          this.loadedMinBobot = this.filterMinBobot;
          this.loadedMaxNodes = this.filterMaxNodes;
          this.clearFocus();
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

  get filteredPtList(): string[] {
    if (!this.ptSearch.trim()) return this.ptList;
    const q = this.ptSearch.toLowerCase();
    return this.ptList.filter(pt => pt.toLowerCase().includes(q));
  }

  get selectedPtsArray(): string[] {
    return Array.from(this.selectedPts).sort();
  }

  togglePt(pt: string) {
    if (this.selectedPts.has(pt)) this.selectedPts.delete(pt);
    else this.selectedPts.add(pt);
    this.selectedPts = new Set(this.selectedPts); // trigger change detection
    this.applyPtFilter();
  }

  clearPts() {
    this.selectedPts = new Set();
    this.applyPtFilter();
  }

  applyPtFilter() {
    if (!this.data) return;
    if (this.selectedPts.size === 0) {
      this.visibleNodes = this.data.nodes;
      this.visibleEdges = this.data.edges;
    } else {
      this.visibleNodes = this.data.nodes;
      const ptIds = new Set(
        this.data.nodes.filter(n => this.selectedPts.has(n.pt)).map(n => n.id)
      );
      this.visibleEdges = this.data.edges.filter(
        e => ptIds.has(e.source) && ptIds.has(e.target)
      );
    }
    if (this.viewMode === 'cluster') this.computeClusterPositions();
    if (this.viewMode !== '3d') {
      this._sortedVisibleNodes = [...this.visibleNodes].sort((a, b) => a.degree - b.degree);
    } else {
      this.updateProjections();
    }
  }

  // ── 3D Projection ────────────────────────────────────────────────────────────
  private project3D(x: number, y: number, z: number): ProjPos {
    const cx = x - 0.5, cy = y - 0.5, cz = z - 0.5;
    // Rotate around Y
    const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);
    const x1 = cx * cosY - cz * sinY;
    const z1 = cx * sinY + cz * cosY;
    // Rotate around X
    const cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX);
    const y2 = cy * cosX - z1 * sinX;
    const z2 = cy * sinX + z1 * cosX;
    // Perspective
    const fov = 1.8;
    const scale = fov / (fov + z2 * 0.55);
    const sx = Math.round((x1 * scale + 0.5) * (this.svgW - 80) + 40);
    const sy = Math.round((y2 * scale + 0.5) * (this.svgH - 80) + 40);
    return { x: sx, y: sy, sz: z2, scale };
  }

  private updateProjections() {
    this.projMap.clear();
    for (const n of (this.data?.nodes || [])) {
      this.projMap.set(n.id, this.project3D(n.x, n.y, n.z ?? 0.5));
    }
    // depth-sort: far (high sz) first
    this._sortedVisibleNodes = [...this.visibleNodes].sort((a, b) => {
      const szA = this.projMap.get(a.id)?.sz ?? 0;
      const szB = this.projMap.get(b.id)?.sz ?? 0;
      return szB - szA;
    });
  }

  proj(nodeId: number): ProjPos {
    if (this.viewMode === '3d') {
      return this.projMap.get(nodeId) ?? { x: 0, y: 0, sz: 0, scale: 1 };
    }
    if (this.viewMode === 'cluster') {
      const p = this.clusterPosMap.get(nodeId);
      return p ? { x: p.x, y: p.y, sz: 0, scale: 1 } : { x: 0, y: 0, sz: 0, scale: 1 };
    }
    // 2D — raw spring layout positions
    const n = this.nodeMap.get(nodeId);
    if (!n) return { x: 0, y: 0, sz: 0, scale: 1 };
    return {
      x: Math.round(n.x * (this.svgW - 80) + 40),
      y: Math.round(n.y * (this.svgH - 80) + 40),
      sz: 0, scale: 1,
    };
  }

  setViewMode(mode: '3d' | '2d' | 'cluster') {
    this.viewMode = mode;
    if (mode !== '3d') this.stopAutoRotate();
    if (mode === 'cluster') this.computeClusterPositions();
    // In 2D/cluster, depth sort is irrelevant — use degree sort instead
    if (mode !== '3d') {
      this._sortedVisibleNodes = [...this.visibleNodes]
        .sort((a, b) => a.degree - b.degree); // low degree first, high on top
    } else {
      this.updateProjections();
    }
  }

  private computeClusterPositions() {
    const byKom = new Map<number, GraphNode[]>();
    for (const n of this.data?.nodes ?? []) {
      if (!byKom.has(n.komunitas)) byKom.set(n.komunitas, []);
      byKom.get(n.komunitas)!.push(n);
    }
    const sorted = Array.from(byKom.entries()).sort((a, b) => b[1].length - a[1].length);
    const numKom = sorted.length;
    const cx = this.svgW / 2, cy = this.svgH / 2;
    const bigR = Math.min(this.svgW, this.svgH) * 0.39;

    this.clusterPosMap.clear();
    this.clusterCenters = [];

    sorted.forEach(([komId, nodes], idx) => {
      const angle  = (idx / numKom) * 2 * Math.PI - Math.PI / 2;
      const komCx  = cx + bigR * Math.cos(angle);
      const komCy  = cy + bigR * Math.sin(angle);
      const smallR = Math.min(55, Math.max(14, Math.sqrt(nodes.length) * 7));

      const color = nodes[0]?.color ?? '#7c3aed';
      const kom = this.data?.komunitas_list?.find(k => k.id === komId);
      this.clusterCenters.push({
        cx: Math.round(komCx), cy: Math.round(komCy),
        r: smallR, color,
        label: kom?.pt_dom || ('Kom ' + (idx + 1)),
      });

      nodes.forEach((n, ni) => {
        const na = nodes.length > 1 ? (ni / nodes.length) * 2 * Math.PI : 0;
        this.clusterPosMap.set(n.id, {
          x: Math.round(komCx + smallR * Math.cos(na)),
          y: Math.round(komCy + smallR * Math.sin(na)),
        });
      });
    });
  }

  nodeRadius(n: GraphNode): number {
    const degrees = this.visibleNodes.map(v => v.degree);
    const max = Math.max(...degrees, 1);
    return Math.max(3, Math.min(16, Math.round((n.degree / max) * 16)));
  }

  edgeWidth(weight: number): number {
    return Math.max(0.4, Math.min(3, weight * 0.35));
  }

  edgeColor(e: GraphEdge): string {
    if (e.sources.includes('scopus'))     return '#f59e0b';
    if (e.sources.includes('penelitian')) return '#10b981';
    return '#60a5fa';
  }

  // ── Drag / Rotate ────────────────────────────────────────────────────────────
  onDragStart(event: MouseEvent) {
    this.isDragging = true;
    this.dragMoved  = false;
    this.lastDragX  = event.clientX;
    this.lastDragY  = event.clientY;
    this.stopAutoRotate();
    event.preventDefault();
  }

  onDragMove(event: MouseEvent) { this.onSvgMove(event); }

  onSvgMove(event: MouseEvent) {
    if (this.isDragging && this.viewMode === '3d') {
      const dx = event.clientX - this.lastDragX;
      const dy = event.clientY - this.lastDragY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragMoved = true;
      this.rotY += dx * 0.006;
      this.rotX += dy * 0.006;
      this.rotX  = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotX));
      this.lastDragX = event.clientX;
      this.lastDragY = event.clientY;
      this.updateProjections();
      this.hoveredNode = null;
    } else {
      const el = event.currentTarget as SVGElement;
      const rect = el.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width)  * this.svgW;
      this.mouseY = ((event.clientY - rect.top)  / rect.height) * this.svgH;
    }
  }

  onDragEnd() { this.isDragging = false; }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    this.isDragging = true;
    this.dragMoved  = false;
    this.lastDragX  = event.touches[0].clientX;
    this.lastDragY  = event.touches[0].clientY;
    this.stopAutoRotate();
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - this.lastDragX;
    const dy = event.touches[0].clientY - this.lastDragY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragMoved = true;
    this.rotY += dx * 0.006;
    this.rotX += dy * 0.006;
    this.rotX  = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotX));
    this.lastDragX = event.touches[0].clientX;
    this.lastDragY = event.touches[0].clientY;
    this.updateProjections();
    event.preventDefault();
  }

  onNodeClick(n: GraphNode) {
    if (!this.dragMoved) this.openAuthorPopup(n.id);
  }

  resetView() {
    this.rotX = 0.28;
    this.rotY = 0.38;
    this.updateProjections();
  }

  // ── Auto rotate ───────────────────────────────────────────────────────────────
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    if (this.autoRotate) this.startAutoRotate(); else this.stopAutoRotate();
  }

  private startAutoRotate() {
    const step = () => {
      if (!this.autoRotate) return;
      this.rotY += 0.008;
      this.updateProjections();
      this.autoRafId = requestAnimationFrame(step);
    };
    this.autoRafId = requestAnimationFrame(step);
  }

  private stopAutoRotate() {
    this.autoRotate = false;
    if (this.autoRafId) { cancelAnimationFrame(this.autoRafId); this.autoRafId = 0; }
  }

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  tooltipTransform(): string {
    const tw = 200, th = 65;
    const x = this.mouseX + 14 + tw > this.svgW ? this.mouseX - tw - 6 : this.mouseX + 14;
    const y = this.mouseY + th > this.svgH ? this.mouseY - th - 6 : this.mouseY + 4;
    return `translate(${x},${y})`;
  }

  // ── Author popup ─────────────────────────────────────────────────────────────
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

  trenData(p: AuthorProfile, jenis: string): { tahun: number; jumlah: number }[] {
    return (p.trend || []).filter(t => t.jenis === jenis).sort((a, b) => a.tahun - b.tahun);
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

  barPct(val: number, max: number): number {
    return max ? Math.round(val / max * 100) : 0;
  }

  // ── Author search & focus ─────────────────────────────────────────────────────
  searchAuthor(q: string) {
    if (!q.trim()) {
      this.authorSearchResults  = [];
      this.authorSearchDropdownOpen = false;
      return;
    }
    const lower = q.toLowerCase();
    this.authorSearchResults = this.visibleNodes
      .filter(n => n.nama.toLowerCase().includes(lower) || n.pt.toLowerCase().includes(lower))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);
    this.authorSearchDropdownOpen = this.authorSearchResults.length > 0;
  }

  selectFocusAuthor(n: GraphNode) {
    this.focusAuthorId        = n.id;
    this.authorSearchQuery    = n.nama;
    this.authorSearchDropdownOpen = false;
    this.focusNeighborIds     = new Set<number>();
    for (const e of this.visibleEdges) {
      if (e.source === n.id) this.focusNeighborIds.add(e.target);
      if (e.target === n.id) this.focusNeighborIds.add(e.source);
    }
  }

  clearFocus() {
    this.focusAuthorId        = null;
    this.focusNeighborIds     = new Set();
    this.authorSearchQuery    = '';
    this.authorSearchResults  = [];
    this.authorSearchDropdownOpen = false;
    this.focusEgoOnly         = false;
  }

  // Getters used in template for focus-aware node/edge lists
  get graphNodes(): GraphNode[] {
    if (this.focusEgoOnly && this.focusAuthorId !== null) {
      const allowed = new Set([this.focusAuthorId, ...this.focusNeighborIds]);
      return this._sortedVisibleNodes.filter(n => allowed.has(n.id));
    }
    return this._sortedVisibleNodes;
  }

  get graphEdges(): GraphEdge[] {
    if (this.focusEgoOnly && this.focusAuthorId !== null) {
      return this.visibleEdges.filter(
        e => e.source === this.focusAuthorId || e.target === this.focusAuthorId
      );
    }
    return this.visibleEdges;
  }

  // Focus-aware node styling
  nodeColor(n: GraphNode): string {
    if (this.focusAuthorId !== null && !this.focusEgoOnly) {
      if (n.id !== this.focusAuthorId && !this.focusNeighborIds.has(n.id)) return '#cbd5e1';
    }
    if (this.selectedPts.size > 0 && !this.selectedPts.has(n.pt)) return '#e2e8f0';
    return n.color;
  }

  nodeOpacity(n: GraphNode): number {
    if (this.focusAuthorId !== null && !this.focusEgoOnly) {
      if (n.id === this.focusAuthorId) return 1;
      if (this.focusNeighborIds.has(n.id)) return 0.9;
      return 0.1;
    }
    if (this.selectedPts.size > 0 && !this.selectedPts.has(n.pt)) return 0.15;
    if (this.viewMode === '3d') return Math.max(0.65, this.proj(n.id).scale);
    return 1;
  }

  nodeStroke(n: GraphNode): string {
    if (this.focusAuthorId === n.id) return '#f59e0b';
    if (this.hoveredNode?.id === n.id) return '#1e293b';
    return 'rgba(255,255,255,0.7)';
  }

  nodeStrokeWidth(n: GraphNode): number {
    if (this.focusAuthorId === n.id) return 3;
    if (this.hoveredNode?.id === n.id) return 2.5;
    return 1;
  }

  edgeOpacity(e: GraphEdge): number {
    if (this.focusAuthorId !== null && !this.focusEgoOnly) {
      if (e.source === this.focusAuthorId || e.target === this.focusAuthorId) return 0.85;
      return 0.05;
    }
    return this.viewMode === '3d' ? 0.45 : 0.4;
  }
}
