import { Component } from '@angular/core';

@Component({
  selector: 'app-pendidikan-tinggi',
  template: `
<div class="pt-page">

  <!-- Header -->
  <div class="pt-header">
    <div class="pt-header__icon">
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
    </div>
    <div>
      <h1 class="pt-header__title">Pendidikan Tinggi</h1>
      <p class="pt-header__sub">Data kelembagaan, akademik, dan sumber daya manusia Perguruan Tinggi Muhammadiyah &amp; Aisyiyah</p>
    </div>
  </div>

  <!-- KELOMPOK I: Institusi -->
  <div class="pt-group">
    <div class="pt-group__label">
      <span class="pt-group__num">I</span>
      <div>
        <div class="pt-group__title">Institusi</div>
        <div class="pt-group__desc">Data profil dan program akademik seluruh PTMA</div>
      </div>
    </div>
    <div class="pt-cards">

      <a class="pt-card pt-card--blue" routerLink="/perguruan-tinggi">
        <div class="pt-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <div class="pt-card__body">
          <div class="pt-card__name">Perguruan Tinggi</div>
          <div class="pt-card__desc">Data dan profil perguruan tinggi Muhammadiyah &amp; Aisyiyah</div>
        </div>
        <div class="pt-card__arrow">›</div>
      </a>

      <a class="pt-card pt-card--green" routerLink="/program-studi">
        <div class="pt-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/>
          </svg>
        </div>
        <div class="pt-card__body">
          <div class="pt-card__name">Program Studi</div>
          <div class="pt-card__desc">Daftar program studi aktif beserta akreditasi</div>
        </div>
        <div class="pt-card__arrow">›</div>
      </a>

    </div>
  </div>

  <!-- KELOMPOK II: Sumber Daya Manusia -->
  <div class="pt-group">
    <div class="pt-group__label">
      <span class="pt-group__num">II</span>
      <div>
        <div class="pt-group__title">Sumber Daya Manusia</div>
        <div class="pt-group__desc">Data dosen dan mahasiswa aktif seluruh PTMA</div>
      </div>
    </div>
    <div class="pt-cards">

      <a class="pt-card pt-card--orange" routerLink="/dosen">
        <div class="pt-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div class="pt-card__body">
          <div class="pt-card__name">Dosen</div>
          <div class="pt-card__desc">Data dosen tetap seluruh perguruan tinggi</div>
        </div>
        <div class="pt-card__arrow">›</div>
      </a>

      <a class="pt-card pt-card--teal" routerLink="/mahasiswa">
        <div class="pt-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6c0-2.21-1.79-4-4-4S8 3.79 8 6s1.79 4 4 4 4-1.79 4-4zm-8 2c0-1.1.9-2 2-2h.01c0 .55.45 1 1 1H13c.55 0 1-.45 1-1 .55.45 1 1 1 2 0 1.1-.9 2-2 2s-2-.9-2-2zM12 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-7 7v7h14v-7c0-2.67-5.33-4-7-4s-7 1.33-7 4zm2 0c0-.5 1.97-2 5-2s5 1.5 5 2v5H7v-5zm9-2.5l3 3-3 3v-6z"/>
          </svg>
        </div>
        <div class="pt-card__body">
          <div class="pt-card__name">Mahasiswa</div>
          <div class="pt-card__desc">Tren mahasiswa aktif per semester seluruh perguruan tinggi. Dilengkapi dengan data estimasi mahasiswa baru dan mahasiswa lulus</div>
        </div>
        <div class="pt-card__arrow">›</div>
      </a>

    </div>
  </div>

  <!-- KELOMPOK III: Pelaporan -->
  <div class="pt-group">
    <div class="pt-group__label">
      <span class="pt-group__num">III</span>
      <div>
        <div class="pt-group__title">Pelaporan</div>
        <div class="pt-group__desc">Distribusi, statistik, dan snapshot laporan PTMA</div>
      </div>
    </div>
    <div class="pt-cards">

      <a class="pt-card pt-card--purple" routerLink="/statistik">
        <div class="pt-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
          </svg>
        </div>
        <div class="pt-card__body">
          <div class="pt-card__name">Laporan</div>
          <div class="pt-card__desc">Distribusi, daftar prodi, dan snapshot laporan</div>
        </div>
        <div class="pt-card__arrow">›</div>
      </a>

    </div>
  </div>

</div>
  `,
  styles: [`
    .pt-page { padding: 1.25rem 1.25rem 2rem; max-width: 1400px; margin: 0 auto; }

    /* ── Header ── */
    .pt-header {
      display: flex; align-items: flex-start; gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #0891b2, #0e6e8c);
      border-radius: 14px;
      color: #fff;
      box-shadow: 0 4px 16px rgba(8,145,178,.3);
    }
    .pt-header__icon { flex-shrink: 0; opacity: .9; margin-top: 2px; }
    .pt-header__title { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0 0 .35rem; }
    .pt-header__sub { font-size: .875rem; color: rgba(255,255,255,.88); margin: 0; line-height: 1.55; }

    /* ── Group ── */
    .pt-group { margin-bottom: 1.75rem; }
    .pt-group__label {
      display: flex; align-items: flex-start; gap: .75rem;
      margin-bottom: 1rem;
    }
    .pt-group__num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: #475569; color: #fff;
      font-size: .8rem; font-weight: 800; flex-shrink: 0; margin-top: 1px;
    }
    .pt-group__title { font-size: 1rem; font-weight: 700; color: #1e293b; }
    .pt-group__desc { font-size: .82rem; color: #64748b; margin-top: 2px; }

    /* ── Cards grid ── */
    .pt-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: .75rem;
    }
    @media (min-width: 600px) {
      .pt-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 900px) {
      .pt-cards { grid-template-columns: repeat(3, 1fr); }
    }

    /* ── Card ── */
    .pt-card {
      display: flex; align-items: flex-start; gap: .875rem;
      padding: 1rem 1.1rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      text-decoration: none; color: inherit;
      cursor: pointer;
      transition: box-shadow .15s, transform .15s, border-color .15s;
      position: relative;
    }

    .pt-card--blue:hover   { box-shadow: 0 4px 16px rgba(59,130,246,.18); border-color: #93c5fd; transform: translateY(-2px); }
    .pt-card--green:hover  { box-shadow: 0 4px 16px rgba(34,197,94,.18);  border-color: #86efac; transform: translateY(-2px); }
    .pt-card--orange:hover { box-shadow: 0 4px 16px rgba(249,115,22,.18); border-color: #fdba74; transform: translateY(-2px); }
    .pt-card--teal:hover   { box-shadow: 0 4px 16px rgba(8,145,178,.18);  border-color: #67e8f9; transform: translateY(-2px); }
    .pt-card--purple:hover { box-shadow: 0 4px 16px rgba(139,92,246,.18); border-color: #c4b5fd; transform: translateY(-2px); }

    /* ── Card icon ── */
    .pt-card__icon {
      width: 38px; height: 38px; flex-shrink: 0;
      padding: .45rem; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .pt-card__icon svg { width: 100%; height: 100%; }

    .pt-card--blue   .pt-card__icon { background: #eff6ff; color: #3b82f6; }
    .pt-card--green  .pt-card__icon { background: #f0fdf4; color: #22c55e; }
    .pt-card--orange .pt-card__icon { background: #fff7ed; color: #f97316; }
    .pt-card--teal   .pt-card__icon { background: #ecfeff; color: #0891b2; }
    .pt-card--purple .pt-card__icon { background: #f5f3ff; color: #8b5cf6; }

    /* ── Card body ── */
    .pt-card__body { flex: 1; min-width: 0; }
    .pt-card__name { font-size: .9rem; font-weight: 700; color: #1e293b; margin-bottom: .3rem; }
    .pt-card__desc { font-size: .78rem; color: #64748b; line-height: 1.5; }

    /* ── Arrow ── */
    .pt-card__arrow { font-size: 1.25rem; color: #cbd5e1; align-self: center; flex-shrink: 0; transition: color .15s; }
    .pt-card--blue:hover   .pt-card__arrow { color: #3b82f6; }
    .pt-card--green:hover  .pt-card__arrow { color: #22c55e; }
    .pt-card--orange:hover .pt-card__arrow { color: #f97316; }
    .pt-card--teal:hover   .pt-card__arrow { color: #0891b2; }
    .pt-card--purple:hover .pt-card__arrow { color: #8b5cf6; }
  `]
})
export class PendidikanTinggiComponent {}
