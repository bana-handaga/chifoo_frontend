import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sinta',
  template: `
<div class="page-wrap">

  <!-- Header -->
  <div class="sinta-header">
    <div class="sinta-header__logo">
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M19.5 3.09L15 7.59V4h-2v7h7V9h-3.59l4.5-4.5-1.41-1.41zM4 13v2h3.59l-4.5 4.5 1.41 1.41L9 16.41V20h2v-7H4z"/>
      </svg>
    </div>
    <div>
      <h1 class="sinta-header__title">PTMA di SINTA</h1>
      <p class="sinta-header__sub">
        Data kinerja riset, publikasi, dan pengabdian Perguruan Tinggi Muhammadiyah &amp; Aisyiyah
        berdasarkan platform <strong>SINTA</strong> — Science and Technology Index Kemdiktisaintek.
      </p>
    </div>
  </div>

  <!-- KELOMPOK I -->
  <div class="sinta-group">
    <div class="sinta-group__label">
      <span class="sinta-group__num">I</span>
      <div>
        <div class="sinta-group__title">Institusi &amp; SDM</div>
        <div class="sinta-group__desc">Data afiliasi, departemen, dan profil penulis PTMA di SINTA</div>
      </div>
    </div>
    <div class="sinta-cards">

      <div class="sinta-card sinta-card--inst" (click)="go('afiliasi')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Afiliasi Perguruan Tinggi</div>
          <div class="sinta-card__desc">Profil dan peringkat institusi PTMA di SINTA berdasarkan skor agregat publikasi dosen.</div>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--inst" (click)="go('departemen')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Departemen</div>
          <div class="sinta-card__desc">Kinerja riset per departemen / program studi berdasarkan kontribusi dosen pada SINTA.</div>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--inst" (click)="go('author')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Author / Penulis</div>
          <div class="sinta-card__desc">Profil dan skor SINTA dosen PTMA sebagai penulis — terhubung ke data ProfilDosen.</div>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

    </div>
  </div>

  <!-- KELOMPOK II -->
  <div class="sinta-group">
    <div class="sinta-group__label">
      <span class="sinta-group__num">II</span>
      <div>
        <div class="sinta-group__title">Output Riset &amp; Pengabdian</div>
        <div class="sinta-group__desc">Rekap artikel, penelitian, pengabdian, kekayaan intelektual, dan buku dosen PTMA</div>
      </div>
    </div>
    <div class="sinta-cards">

      <div class="sinta-card sinta-card--output" (click)="go('artikel')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM9 13h6v2H9zm0-4h2v2H9zm0 8h6v2H9z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Artikel Ilmiah</div>
          <div class="sinta-card__desc">Publikasi jurnal nasional dan internasional dosen PTMA — terindeks Scopus, WoS, DOAJ, dan lainnya.</div>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--output" (click)="go('penelitian')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Penelitian</div>
          <div class="sinta-card__desc">Data hibah dan proyek penelitian dosen PTMA yang tercatat di SINTA / BIMA Kemdiktisaintek.</div>
          <span class="sinta-badge sinta-badge--live">● Tersedia</span>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--output" (click)="go('pengabdian')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" opacity=".3"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Pengabdian Masyarakat</div>
          <div class="sinta-card__desc">Rekap kegiatan pengabdian kepada masyarakat (Community Services) dosen PTMA di SINTA.</div>
          <span class="sinta-badge sinta-badge--ready">● Tersedia</span>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--output" (click)="go('ipr')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Kekayaan Intelektual (IPR)</div>
          <div class="sinta-card__desc">Paten, hak cipta, merek dagang, dan kekayaan intelektual lainnya yang dimiliki dosen PTMA.</div>
          <span class="sinta-badge sinta-badge--soon">Segera Hadir</span>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--output" (click)="go('buku')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Buku</div>
          <div class="sinta-card__desc">Karya buku ber-ISBN yang ditulis atau disunting oleh dosen PTMA dan tercatat di SINTA.</div>
          <span class="sinta-badge sinta-badge--soon">Segera Hadir</span>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

      <div class="sinta-card sinta-card--output" (click)="go('cluster')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Cluster SINTA</div>
          <div class="sinta-card__desc">Pengelompokan kinerja riset PTMA berdasarkan skor cluster SINTA — menggambarkan produktivitas dan dampak riset institusi.</div>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

    </div>
  </div>

  <!-- KELOMPOK III -->
  <div class="sinta-group">
    <div class="sinta-group__label">
      <span class="sinta-group__num">III</span>
      <div>
        <div class="sinta-group__title">Media Ilmiah</div>
        <div class="sinta-group__desc">Jurnal ilmiah yang diterbitkan oleh fakultas atau unit di lingkungan PTMA</div>
      </div>
    </div>
    <div class="sinta-cards">

      <div class="sinta-card sinta-card--media" (click)="go('jurnal')">
        <div class="sinta-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zm-7-1h2v-4h4V9h-4V7h-2v2H9v2h4z"/></svg>
        </div>
        <div class="sinta-card__body">
          <div class="sinta-card__title">Jurnal Ilmiah</div>
          <div class="sinta-card__desc">
            Daftar jurnal ilmiah yang diterbitkan oleh fakultas / unit PTMA dan terindeks di SINTA —
            lengkap dengan peringkat, subjek, dan tautan ke portal jurnal.
          </div>
          <span class="sinta-badge sinta-badge--ready">● Tersedia</span>
        </div>
        <div class="sinta-card__arrow">›</div>
      </div>

    </div>
  </div>

  <!-- Info note -->
  <div class="sinta-note">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="flex-shrink:0;margin-top:1px">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
    <span>
      Data SINTA diambil dari <strong>sinta.kemdiktisaintek.go.id</strong> melalui proses scraping berkala.
      Fitur-fitur di atas sedang dalam pengembangan — akan diaktifkan secara bertahap.
    </span>
  </div>

</div>
  `,
  styles: [`
    .page-wrap { padding: 1.25rem 1.25rem 2rem; max-width: 1400px; margin: 0 auto; }

    /* ── Header ── */
    .sinta-header {
      display: flex; align-items: flex-start; gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #ea580c, #c2410c);
      border-radius: 14px;
      color: #fff;
      box-shadow: 0 4px 16px rgba(234,88,12,.3);
    }
    .sinta-header__logo {
      flex-shrink: 0; opacity: .9; margin-top: 2px;
    }
    .sinta-header__title {
      font-size: 1.5rem; font-weight: 800; margin: 0 0 .35rem;
    }
    .sinta-header__sub {
      font-size: .875rem; opacity: .9; margin: 0; line-height: 1.55;
    }
    .sinta-header__sub strong { font-weight: 700; }

    /* ── Group ── */
    .sinta-group { margin-bottom: 1.75rem; }
    .sinta-group__label {
      display: flex; align-items: flex-start; gap: .75rem;
      margin-bottom: 1rem;
    }
    .sinta-group__num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: #ea580c; color: #fff;
      font-size: .8rem; font-weight: 800; flex-shrink: 0; margin-top: 1px;
    }
    .sinta-group__title {
      font-size: 1rem; font-weight: 700; color: #1e293b;
    }
    .sinta-group__desc {
      font-size: .82rem; color: #64748b; margin-top: 2px;
    }

    /* ── Cards grid ── */
    .sinta-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: .75rem;
    }
    @media (min-width: 600px) {
      .sinta-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 900px) {
      .sinta-cards { grid-template-columns: repeat(3, 1fr); }
    }

    /* ── Card ── */
    .sinta-card {
      display: flex; align-items: flex-start; gap: .875rem;
      padding: 1rem 1.1rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      cursor: pointer;
      transition: box-shadow .15s, transform .15s, border-color .15s;
      position: relative;
    }
    .sinta-card:hover {
      box-shadow: 0 4px 16px rgba(234,88,12,.15);
      border-color: #fdba74;
      transform: translateY(-2px);
    }
    .sinta-card--inst .sinta-card__icon { color: #2563eb; }
    .sinta-card--output .sinta-card__icon { color: #ea580c; }
    .sinta-card--media .sinta-card__icon { color: #0891b2; background: #e0f2fe; }

    .sinta-card__icon {
      width: 38px; height: 38px; flex-shrink: 0;
      padding: .45rem;
      border-radius: 10px;
      background: #fff7ed;
    }
    .sinta-card--inst .sinta-card__icon { background: #eff6ff; }
    .sinta-card__icon svg { width: 100%; height: 100%; }

    .sinta-card__body { flex: 1; min-width: 0; }
    .sinta-card__title {
      font-size: .9rem; font-weight: 700; color: #1e293b;
      margin-bottom: .3rem;
    }
    .sinta-card__desc {
      font-size: .78rem; color: #64748b; line-height: 1.5;
      margin-bottom: .5rem;
    }

    .sinta-card__arrow {
      font-size: 1.25rem; color: #cbd5e1;
      align-self: center; flex-shrink: 0;
      transition: color .15s;
    }
    .sinta-card:hover .sinta-card__arrow { color: #ea580c; }

    /* ── Badges ── */
    .sinta-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: .7rem; font-weight: 600;
    }
    .sinta-badge--soon {
      background: #fef3c7; color: #92400e;
      border: 1px solid #fde68a;
    }
    .sinta-badge--ready {
      background: #dcfce7; color: #166534;
      border: 1px solid #86efac;
    }
    .sinta-badge--journal {
      background: #e0f2fe; color: #0369a1;
      border: 1px solid #bae6fd;
    }

    /* ── Info note ── */
    .sinta-note {
      display: flex; align-items: flex-start; gap: .5rem;
      padding: .75rem 1rem;
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 10px;
      font-size: .8rem; color: #92400e;
      margin-top: .5rem;
    }
    .sinta-note strong { font-weight: 700; }
  `]
})
export class SintaComponent {
  constructor(private router: Router) {}

  go(sub: string) {
    this.router.navigate(['/sinta', sub]);
  }
}
