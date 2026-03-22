import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/* ──────────────────────────────────────────────────────────────────────────
   Data statis cluster SINTA untuk PTMA (Perguruan Tinggi Muhammadiyah
   dan Aisyiyah). Sumber referensi: sinta.kemdiktisaintek.go.id — data bersifat
   ilustratif dan perlu diperbarui secara berkala sesuai pembaruan SINTA.
   ────────────────────────────────────────────────────────────────────────── */
export interface PtCluster {
  no:       number;
  nama:     string;
  singkatan:string;
  kota:     string;
  provinsi: string;
  cluster:  number;   // 1–5
  skor3yr:  number;   // estimasi total skor 3 tahun terakhir
  penulis:  number;   // jumlah author SINTA terdaftar
  artikel:  number;   // total artikel terindeks
}

const DATA_PTMA: PtCluster[] = [
  { no:  1, nama:'Universitas Muhammadiyah Surakarta',      singkatan:'UMS',    kota:'Surakarta',   provinsi:'Jawa Tengah',    cluster:1, skor3yr:14820, penulis:1256, artikel:9420 },
  { no:  2, nama:'Universitas Muhammadiyah Yogyakarta',     singkatan:'UMY',    kota:'Yogyakarta',  provinsi:'DI Yogyakarta',  cluster:1, skor3yr:13540, penulis:1083, artikel:8650 },
  { no:  3, nama:'Universitas Muhammadiyah Malang',         singkatan:'UMM',    kota:'Malang',      provinsi:'Jawa Timur',     cluster:1, skor3yr:12980, penulis: 997, artikel:7890 },
  { no:  4, nama:'Universitas Ahmad Dahlan',                singkatan:'UAD',    kota:'Yogyakarta',  provinsi:'DI Yogyakarta',  cluster:1, skor3yr:11350, penulis: 870, artikel:6730 },
  { no:  5, nama:'Universitas Muhammadiyah Prof.Dr.Hamka',  singkatan:'UHAMKA', kota:'Jakarta',     provinsi:'DKI Jakarta',    cluster:1, skor3yr:10210, penulis: 793, artikel:6140 },
  { no:  6, nama:'Universitas Muhammadiyah Magelang',       singkatan:'UNIMMA', kota:'Magelang',    provinsi:'Jawa Tengah',    cluster:2, skor3yr: 4820, penulis: 384, artikel:2730 },
  { no:  7, nama:'Universitas Muhammadiyah Purwokerto',     singkatan:'UMP',    kota:'Purwokerto',  provinsi:'Jawa Tengah',    cluster:2, skor3yr: 4310, penulis: 357, artikel:2510 },
  { no:  8, nama:'Universitas Muhammadiyah Sidoarjo',       singkatan:'UMSIDA', kota:'Sidoarjo',    provinsi:'Jawa Timur',     cluster:2, skor3yr: 3970, penulis: 338, artikel:2280 },
  { no:  9, nama:'Universitas Muhammadiyah Makassar',       singkatan:'UNISMUH',kota:'Makassar',    provinsi:'Sulawesi Selatan',cluster:2,skor3yr: 3620, penulis: 312, artikel:2040 },
  { no: 10, nama:'Universitas Muhammadiyah Pontianak',      singkatan:'UM Pontianak', kota:'Pontianak', provinsi:'Kalimantan Barat', cluster:2, skor3yr:2980, penulis:264, artikel:1760 },
  { no: 11, nama:'Universitas Muhammadiyah Tasikmalaya',    singkatan:'UMTAS',  kota:'Tasikmalaya', provinsi:'Jawa Barat',     cluster:3, skor3yr: 1840, penulis: 180, artikel:1050 },
  { no: 12, nama:'Universitas Muhammadiyah Semarang',       singkatan:'UNIMUS', kota:'Semarang',    provinsi:'Jawa Tengah',    cluster:3, skor3yr: 1690, penulis: 165, artikel: 980 },
  { no: 13, nama:'Universitas Muhammadiyah Banjarmasin',    singkatan:'UM BJM', kota:'Banjarmasin', provinsi:'Kalimantan Selatan', cluster:3, skor3yr:1420, penulis:142, artikel:830 },
  { no: 14, nama:'Universitas Muhammadiyah Kupang',         singkatan:'UMK',    kota:'Kupang',      provinsi:'NTT',            cluster:3, skor3yr: 1180, penulis: 122, artikel: 680 },
  { no: 15, nama:'Universitas Aisyiyah Yogyakarta',         singkatan:'UNISA',  kota:'Yogyakarta',  provinsi:'DI Yogyakarta',  cluster:3, skor3yr: 1060, penulis: 109, artikel: 620 },
  { no: 16, nama:'Universitas Muhammadiyah Palembang',      singkatan:'UMP PLG',kota:'Palembang',   provinsi:'Sumatera Selatan',cluster:4, skor3yr: 680, penulis:  78, artikel: 380 },
  { no: 17, nama:'Universitas Muhammadiyah Kotabumi',       singkatan:'UM Kotabumi', kota:'Kotabumi', provinsi:'Lampung',    cluster:4, skor3yr: 520, penulis:  62, artikel: 290 },
  { no: 18, nama:'Universitas Muhammadiyah Sorong',         singkatan:'UM Sorong', kota:'Sorong',   provinsi:'Papua Barat',   cluster:4, skor3yr: 410, penulis:  51, artikel: 220 },
  { no: 19, nama:'Universitas Muhammadiyah Manado',         singkatan:'UM Manado', kota:'Manado',   provinsi:'Sulawesi Utara', cluster:4, skor3yr: 360, penulis:  44, artikel: 190 },
  { no: 20, nama:'Universitas Muhammadiyah Luwuk Banggai',  singkatan:'UM Luwuk', kota:'Luwuk',    provinsi:'Sulawesi Tengah',cluster:5, skor3yr: 180, penulis:  28, artikel:  90 },
  { no: 21, nama:'Universitas Muhammadiyah Papua',          singkatan:'UM Papua', kota:'Manokwari', provinsi:'Papua Barat',  cluster:5, skor3yr: 130, penulis:  21, artikel:  65 },
  { no: 22, nama:'STIKES Aisyiyah Palembang',               singkatan:'STIKES Aisyiyah PLG', kota:'Palembang', provinsi:'Sumatera Selatan', cluster:5, skor3yr:90, penulis:15, artikel:45 },
];

const CLUSTER_INFO = [
  { level:1, label:'Mandiri',  color:'#7c3aed', bg:'#f5f3ff', border:'#7c3aed', desc:'PT unggulan nasional — skor SINTA 3 tahun ≥ 10.000. Publikasi sangat produktif, dampak riset luas, terindeks internasional.', icon:'🏆', minSkor:'≥ 10.000' },
  { level:2, label:'Utama',    color:'#2563eb', bg:'#eff6ff', border:'#2563eb', desc:'PT berkinerja tinggi — skor 3.000–9.999. Aktif berpublikasi di jurnal terakreditasi dan/atau terindeks Scopus/WoS.', icon:'🥇', minSkor:'3.000 – 9.999' },
  { level:3, label:'Madya',    color:'#059669', bg:'#f0fdf4', border:'#059669', desc:'PT berkembang — skor 1.000–2.999. Terdapat aktivitas riset yang konsisten dan mulai meningkat.', icon:'🥈', minSkor:'1.000 – 2.999' },
  { level:4, label:'Binaan',   color:'#d97706', bg:'#fffbeb', border:'#d97706', desc:'PT tahap berkembang — skor 300–999. Publikasi masih terbatas, perlu dorongan dan pendampingan riset.', icon:'🥉', minSkor:'300 – 999' },
  { level:5, label:'Pemula',   color:'#dc2626', bg:'#fff1f2', border:'#dc2626', desc:'PT rintisan — skor < 300. Baru memulai membangun ekosistem riset dan publikasi ilmiah.', icon:'🌱', minSkor:'< 300' },
];

@Component({
  selector: 'app-sinta-cluster',
  template: `
<div class="sc-wrap">

  <!-- ── Back ── -->
  <div class="sc-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>

  <!-- ── Hero ── -->
  <div class="sc-hero">
    <div class="sc-hero__left">
      <div class="sc-hero__badge">SINTA — Science and Technology Index</div>
      <h1 class="sc-hero__title">Cluster Kinerja Riset PTMA</h1>
      <p class="sc-hero__desc">
        Kemdiktisaintek mengelompokkan perguruan tinggi ke dalam <strong>5 cluster</strong>
        berdasarkan total skor SINTA seluruh dosen terafiliasi selama 3 tahun terakhir.
        Cluster mencerminkan <strong>produktivitas dan dampak riset</strong> institusi secara agregat.
      </p>
      <div class="sc-hero__pills">
        <span class="sc-pill">{{ totalPt }} Perguruan Tinggi</span>
        <span class="sc-pill">{{ totalPenulis | number }} Penulis Aktif</span>
        <span class="sc-pill">{{ totalArtikel | number }} Total Artikel</span>
      </div>
    </div>
    <div class="sc-hero__right">
      <div class="sc-donut-wrap">
        <svg viewBox="0 0 200 200" width="180" height="180">
          <ng-container *ngFor="let seg of donutSegments; let i=index">
            <circle
              class="sc-donut-ring"
              cx="100" cy="100" r="70"
              [style.stroke]="seg.color"
              [style.stroke-dasharray]="seg.dash"
              [style.stroke-dashoffset]="seg.offset"
            />
          </ng-container>
          <text x="100" y="95"  text-anchor="middle" class="sc-donut-num">{{ totalPt }}</text>
          <text x="100" y="114" text-anchor="middle" class="sc-donut-lbl">PTMA</text>
        </svg>
        <div class="sc-donut-legend">
          <div *ngFor="let c of clusterInfo" class="sc-dl-item">
            <span class="sc-dl-dot" [style.background]="c.color"></span>
            <span class="sc-dl-label">C{{ c.level }} {{ c.label }}</span>
            <span class="sc-dl-count">{{ countByCluster(c.level) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Cluster Cards (legend) ── -->
  <div class="sc-section-title">Penjelasan Tiap Level Cluster</div>
  <div class="sc-cluster-grid">
    <div *ngFor="let c of clusterInfo" class="sc-ccard"
         [style.border-color]="c.border"
         [style.background]="c.bg"
         [class.sc-ccard--active]="filterCluster === c.level"
         (click)="toggleFilter(c.level)">
      <div class="sc-ccard__header" [style.background]="c.color">
        <span class="sc-ccard__icon">{{ c.icon }}</span>
        <span class="sc-ccard__num">Cluster {{ c.level }}</span>
        <span class="sc-ccard__label">{{ c.label }}</span>
      </div>
      <div class="sc-ccard__body">
        <div class="sc-ccard__skor">Skor 3 tahun: <strong>{{ c.minSkor }}</strong></div>
        <div class="sc-ccard__desc">{{ c.desc }}</div>
        <div class="sc-ccard__count">
          <span class="sc-ccard__count-num" [style.color]="c.color">{{ countByCluster(c.level) }}</span>
          <span class="sc-ccard__count-lbl">PTMA</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Cara Kerja SINTA Cluster ── -->
  <div class="sc-section-title">Bagaimana Cluster Ditentukan?</div>
  <div class="sc-howto">
    <div class="sc-step" *ngFor="let s of howtoSteps; let i=index">
      <div class="sc-step__num">{{ i + 1 }}</div>
      <div class="sc-step__body">
        <div class="sc-step__title">{{ s.title }}</div>
        <div class="sc-step__desc">{{ s.desc }}</div>
      </div>
    </div>
  </div>

  <!-- ── Tabel Ranking ── -->
  <div class="sc-section-title">
    Ranking PTMA per Cluster
    <span class="sc-filter-pills">
      <button class="sc-fp" [class.sc-fp--active]="filterCluster===0" (click)="filterCluster=0">Semua</button>
      <button *ngFor="let c of clusterInfo" class="sc-fp"
              [class.sc-fp--active]="filterCluster===c.level"
              [style.--fc]="c.color"
              (click)="toggleFilter(c.level)">
        C{{ c.level }} {{ c.label }}
      </button>
    </span>
  </div>

  <div class="sc-table-wrap">
    <table class="sc-table">
      <thead>
        <tr>
          <th class="sc-th-no">#</th>
          <th (click)="sort('nama')" class="sc-th-sortable">
            Perguruan Tinggi <span class="sc-sort-arr">{{ sortArr('nama') }}</span>
          </th>
          <th>Kota</th>
          <th (click)="sort('cluster')" class="sc-th-sortable sc-th-center">
            Cluster <span class="sc-sort-arr">{{ sortArr('cluster') }}</span>
          </th>
          <th (click)="sort('skor3yr')" class="sc-th-sortable sc-th-right">
            Skor 3 Tahun <span class="sc-sort-arr">{{ sortArr('skor3yr') }}</span>
          </th>
          <th (click)="sort('penulis')" class="sc-th-sortable sc-th-right">
            Penulis <span class="sc-sort-arr">{{ sortArr('penulis') }}</span>
          </th>
          <th (click)="sort('artikel')" class="sc-th-sortable sc-th-right">
            Artikel <span class="sc-sort-arr">{{ sortArr('artikel') }}</span>
          </th>
          <th class="sc-th-center">Skor Bar</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let pt of filteredData; let i=index" class="sc-row">
          <td class="sc-td-no">{{ i + 1 }}</td>
          <td class="sc-td-nama">
            <div class="sc-pt-name">{{ pt.nama }}</div>
            <div class="sc-pt-singkatan">{{ pt.singkatan }} · {{ pt.provinsi }}</div>
          </td>
          <td class="sc-td-kota">{{ pt.kota }}</td>
          <td class="sc-td-center">
            <span class="sc-cluster-badge"
                  [style.background]="clusterColor(pt.cluster)"
                  [style.color]="'#fff'">
              C{{ pt.cluster }} {{ clusterLabel(pt.cluster) }}
            </span>
          </td>
          <td class="sc-td-right">
            <strong [style.color]="clusterColor(pt.cluster)">{{ pt.skor3yr | number }}</strong>
          </td>
          <td class="sc-td-right">{{ pt.penulis | number }}</td>
          <td class="sc-td-right">{{ pt.artikel | number }}</td>
          <td class="sc-td-bar">
            <div class="sc-bar-bg">
              <div class="sc-bar-fill"
                   [style.width.%]="(pt.skor3yr / maxSkor) * 100"
                   [style.background]="clusterColor(pt.cluster)">
              </div>
            </div>
          </td>
        </tr>
        <tr *ngIf="filteredData.length === 0">
          <td colspan="8" class="sc-empty">Tidak ada data untuk filter ini.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Catatan ── -->
  <div class="sc-note">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <span>
      Data di atas bersifat <strong>ilustratif</strong> berdasarkan referensi publik SINTA.
      Skor aktual dapat berbeda dan akan diperbarui secara berkala sesuai pembaruan resmi
      <a href="https://sinta.kemdiktisaintek.go.id" target="_blank" rel="noopener">sinta.kemdiktisaintek.go.id</a>.
    </span>
  </div>

</div>
`,
  styles: [`
    .sc-wrap { padding: 1.25rem; max-width: 1200px; margin: 0 auto; }

    /* Back */
    .sc-back {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .83rem; color: #64748b; cursor: pointer;
      margin-bottom: 1rem; padding: .3rem .7rem;
      border-radius: 6px; transition: background .15s;
    }
    .sc-back:hover { background: #f1f5f9; color: #1e293b; }

    /* Hero */
    .sc-hero {
      display: flex; gap: 2rem; align-items: flex-start;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
      border-radius: 16px; padding: 2rem 2rem 1.75rem;
      color: #fff; margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(99,102,241,.25);
    }
    .sc-hero__left  { flex: 1; min-width: 0; }
    .sc-hero__right { flex-shrink: 0; }
    .sc-hero__badge {
      display: inline-block; background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.3); border-radius: 20px;
      font-size: .72rem; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; padding: .25rem .75rem;
      margin-bottom: .75rem; color: #c7d2fe;
    }
    .sc-hero__title { font-size: 1.7rem; font-weight: 900; margin: 0 0 .7rem; line-height: 1.2; }
    .sc-hero__desc  { font-size: .9rem; opacity: .9; margin: 0 0 1.25rem; line-height: 1.6; }
    .sc-hero__desc strong { color: #c7d2fe; }
    .sc-hero__pills { display: flex; flex-wrap: wrap; gap: .5rem; }
    .sc-pill {
      background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
      border-radius: 20px; font-size: .78rem; font-weight: 600;
      padding: .3rem .85rem; color: #e0e7ff;
    }

    /* Donut */
    .sc-donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .sc-donut-ring { fill: none; stroke-width: 28; stroke-linecap: butt; }
    .sc-donut-num { font-size: 28px; font-weight: 900; fill: #fff; }
    .sc-donut-lbl { font-size: 11px; fill: #c7d2fe; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .sc-donut-legend { display: flex; flex-direction: column; gap: .35rem; min-width: 140px; }
    .sc-dl-item { display: flex; align-items: center; gap: .45rem; font-size: .78rem; color: #e0e7ff; }
    .sc-dl-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .sc-dl-label{ flex: 1; }
    .sc-dl-count{ font-weight: 800; color: #fff; }

    /* Section title */
    .sc-section-title {
      font-size: 1rem; font-weight: 800; color: #1e293b;
      margin: 2rem 0 1rem; display: flex; align-items: center; gap: .75rem;
    }
    .sc-section-title::after {
      content: ''; flex: 1; height: 2px;
      background: linear-gradient(to right, #e2e8f0, transparent);
    }

    /* Cluster grid */
    .sc-cluster-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;
      margin-bottom: .5rem;
    }
    .sc-ccard {
      border: 2px solid; border-radius: 12px; overflow: hidden;
      cursor: pointer; transition: transform .15s, box-shadow .15s;
    }
    .sc-ccard:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }
    .sc-ccard--active { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.15); }
    .sc-ccard__header {
      display: flex; flex-direction: column; align-items: center;
      padding: .75rem .5rem; color: #fff; gap: .15rem;
    }
    .sc-ccard__icon  { font-size: 1.6rem; }
    .sc-ccard__num   { font-size: .65rem; font-weight: 700; opacity: .85; letter-spacing: .05em; text-transform: uppercase; }
    .sc-ccard__label { font-size: .85rem; font-weight: 800; }
    .sc-ccard__body  { padding: .75rem; }
    .sc-ccard__skor  { font-size: .72rem; color: #475569; margin-bottom: .4rem; }
    .sc-ccard__skor strong { font-weight: 700; color: #1e293b; }
    .sc-ccard__desc  { font-size: .75rem; color: #64748b; line-height: 1.5; margin-bottom: .6rem; }
    .sc-ccard__count { display: flex; align-items: baseline; gap: .3rem; }
    .sc-ccard__count-num { font-size: 1.5rem; font-weight: 900; }
    .sc-ccard__count-lbl { font-size: .75rem; color: #64748b; }

    /* Howto */
    .sc-howto {
      display: flex; gap: 0; margin-bottom: .5rem;
      background: #fff; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
    }
    .sc-step {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 1.25rem 1rem; position: relative;
      border-right: 1px solid #f1f5f9;
    }
    .sc-step:last-child { border-right: none; }
    .sc-step__num {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff; font-weight: 800; font-size: .9rem;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: .6rem; flex-shrink: 0;
    }
    .sc-step__title { font-size: .82rem; font-weight: 700; color: #1e293b; margin-bottom: .3rem; }
    .sc-step__desc  { font-size: .75rem; color: #64748b; line-height: 1.5; }

    /* Filter pills */
    .sc-filter-pills {
      display: flex; flex-wrap: wrap; gap: .4rem; font-weight: 400;
    }
    .sc-fp {
      padding: .25rem .7rem; border-radius: 20px; border: 1.5px solid #e2e8f0;
      background: #f8fafc; color: #475569; font-size: .75rem; font-weight: 600;
      cursor: pointer; transition: all .15s;
    }
    .sc-fp:hover { border-color: var(--fc, #4f46e5); color: var(--fc, #4f46e5); }
    .sc-fp--active {
      background: var(--fc, #4f46e5); border-color: var(--fc, #4f46e5);
      color: #fff !important;
    }
    .sc-fp:first-child.sc-fp--active { background: #1e293b; border-color: #1e293b; }

    /* Table */
    .sc-table-wrap {
      background: #fff; border-radius: 12px; overflow: auto;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); margin-bottom: 1.25rem;
    }
    .sc-table { width: 100%; border-collapse: collapse; font-size: .84rem; }
    .sc-table thead tr { background: #f8fafc; }
    .sc-table th {
      padding: .7rem 1rem; text-align: left; font-weight: 700;
      color: #475569; font-size: .77rem; text-transform: uppercase;
      letter-spacing: .05em; border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .sc-th-center { text-align: center !important; }
    .sc-th-right  { text-align: right !important; }
    .sc-th-sortable { cursor: pointer; user-select: none; }
    .sc-th-sortable:hover { color: #4f46e5; }
    .sc-th-no { width: 40px; text-align: center !important; }
    .sc-sort-arr { color: #94a3b8; margin-left: 2px; }
    .sc-row { border-bottom: 1px solid #f1f5f9; transition: background .1s; }
    .sc-row:hover { background: #f8fafc; }
    .sc-row:last-child { border-bottom: none; }
    .sc-table td { padding: .6rem 1rem; vertical-align: middle; }
    .sc-td-no     { text-align: center; color: #94a3b8; font-size: .78rem; }
    .sc-td-center { text-align: center; }
    .sc-td-right  { text-align: right; }
    .sc-td-kota   { color: #64748b; font-size: .8rem; white-space: nowrap; }
    .sc-pt-name   { font-weight: 600; color: #1e293b; line-height: 1.3; }
    .sc-pt-singkatan { font-size: .75rem; color: #94a3b8; margin-top: 1px; }
    .sc-cluster-badge {
      display: inline-block; padding: .2rem .65rem; border-radius: 20px;
      font-size: .72rem; font-weight: 700; white-space: nowrap;
    }
    .sc-bar-bg { width: 100px; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .sc-bar-fill { height: 100%; border-radius: 4px; transition: width .3s; }
    .sc-td-bar { min-width: 110px; }
    .sc-empty { text-align: center; padding: 2rem !important; color: #94a3b8; }

    /* Note */
    .sc-note {
      display: flex; align-items: flex-start; gap: .6rem;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .75rem 1rem; font-size: .78rem; color: #64748b;
      margin-bottom: 2rem;
    }
    .sc-note svg { flex-shrink: 0; color: #94a3b8; margin-top: 1px; }
    .sc-note strong { color: #475569; }
    .sc-note a { color: #4f46e5; text-decoration: none; }
    .sc-note a:hover { text-decoration: underline; }

    /* Responsive */
    @media (max-width: 1024px) {
      .sc-cluster-grid { grid-template-columns: repeat(3, 1fr); }
      .sc-hero { flex-direction: column; }
      .sc-hero__right { width: 100%; display: flex; justify-content: center; }
      .sc-donut-wrap { flex-direction: row; align-items: center; gap: 1.5rem; }
    }
    @media (max-width: 640px) {
      .sc-cluster-grid { grid-template-columns: repeat(2, 1fr); }
      .sc-howto { flex-direction: column; }
      .sc-step { border-right: none; border-bottom: 1px solid #f1f5f9; }
    }
  `]
})
export class SintaClusterComponent implements OnInit {

  readonly clusterInfo = CLUSTER_INFO;
  readonly howtoSteps = [
    { title: 'Dosen Mendaftar ke SINTA', desc: 'Dosen mengklaim profil di SINTA dan menautkan publikasi mereka dari berbagai database (Scopus, GScholar, DOAJ, dll).' },
    { title: 'Skor Publikasi Dihitung', desc: 'Setiap artikel diberi skor berdasarkan indeks dan kuartil jurnal. Jumlah sitasi turut memengaruhi skor akhir.' },
    { title: 'Agregasi per Institusi', desc: 'Total skor semua dosen terafiliasi dalam 3 tahun terakhir dijumlahkan menjadi skor institusi.' },
    { title: 'Penetapan Cluster', desc: 'Skor institusi dibandingkan dengan ambang batas cluster yang ditetapkan Kemdiktisaintek (diperbarui setiap tahun).' },
    { title: 'Publikasi di SINTA', desc: 'Cluster resmi tercantum di halaman profil institusi pada sinta.kemdiktisaintek.go.id dan dipakai dalam berbagai akreditasi.' },
  ];

  allData: PtCluster[] = DATA_PTMA;
  filterCluster = 0;
  sortField  = 'skor3yr';
  sortDir    = -1; // -1 = desc, 1 = asc

  get totalPt()      { return this.allData.length; }
  get totalPenulis() { return this.allData.reduce((s, d) => s + d.penulis, 0); }
  get totalArtikel() { return this.allData.reduce((s, d) => s + d.artikel, 0); }
  get maxSkor()      { return Math.max(...this.allData.map(d => d.skor3yr)); }

  get filteredData(): PtCluster[] {
    let d = this.filterCluster ? this.allData.filter(x => x.cluster === this.filterCluster) : [...this.allData];
    const f = this.sortField as keyof PtCluster;
    return d.sort((a, b) => {
      const va = a[f], vb = b[f];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * this.sortDir;
      return String(va).localeCompare(String(vb)) * this.sortDir;
    });
  }

  countByCluster(c: number) { return this.allData.filter(d => d.cluster === c).length; }
  clusterColor(c: number)   { return CLUSTER_INFO[c - 1]?.color ?? '#94a3b8'; }
  clusterLabel(c: number)   { return CLUSTER_INFO[c - 1]?.label ?? ''; }

  toggleFilter(c: number) { this.filterCluster = this.filterCluster === c ? 0 : c; }

  sort(field: string) {
    if (this.sortField === field) { this.sortDir *= -1; }
    else { this.sortField = field; this.sortDir = -1; }
  }
  sortArr(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === -1 ? '↓' : '↑';
  }

  // ── Donut chart segments ──────────────────────────────────────────────────
  get donutSegments() {
    const CIRCUMFERENCE = 2 * Math.PI * 70; // r=70
    const total = this.allData.length;
    let offset = 0;
    return CLUSTER_INFO.map(c => {
      const count = this.countByCluster(c.level);
      const dash  = `${(count / total) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      // Start from top: rotate by -90deg equivalent via offset
      const seg = { color: c.color, dash, offset: -offset + CIRCUMFERENCE * 0.25 };
      offset += (count / total) * CIRCUMFERENCE;
      return seg;
    });
  }

  constructor(private router: Router) {}
  ngOnInit() {}
}
