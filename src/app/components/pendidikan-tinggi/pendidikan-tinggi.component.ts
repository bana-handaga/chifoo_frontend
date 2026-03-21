import { Component } from '@angular/core';

@Component({
  selector: 'app-pendidikan-tinggi',
  template: `
    <div class="pt-page">
      <div class="pt-header">
        <h1 class="pt-title">Pendidikan Tinggi</h1>
        <p class="pt-subtitle">Pilih menu untuk melihat data</p>
      </div>

      <div class="pt-grid">
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
          <svg class="pt-card__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
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
          <svg class="pt-card__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </a>

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
          <svg class="pt-card__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </a>

        <a class="pt-card pt-card--teal" routerLink="/mahasiswa">
          <div class="pt-card__icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6c0-2.21-1.79-4-4-4S8 3.79 8 6s1.79 4 4 4 4-1.79 4-4zm-8 2c0-1.1.9-2 2-2h.01c0 .55.45 1 1 1H13c.55 0 1-.45 1-1 .55.45 1 1 1 2 0 1.1-.9 2-2 2s-2-.9-2-2zM12 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-7 7v7h14v-7c0-2.67-5.33-4-7-4s-7 1.33-7 4zm2 0c0-.5 1.97-2 5-2s5 1.5 5 2v5H7v-5zm9-2.5l3 3-3 3v-6z"/>
            </svg>
          </div>
          <div class="pt-card__body">
            <div class="pt-card__name">Mahasiswa</div>
            <div class="pt-card__desc">Tren mahasiswa aktif per semester seluruh perguruan tinggi</div>
          </div>
          <svg class="pt-card__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </a>

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
          <svg class="pt-card__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .pt-page { max-width: 700px; margin: 0 auto; padding: 8px 0; }

    .pt-header { margin-bottom: 24px; }
    .pt-title { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
    .pt-subtitle { font-size: 14px; color: #64748b; margin: 0; }

    .pt-grid { display: flex; flex-direction: column; gap: 12px; }

    .pt-card {
      display: flex; align-items: center; gap: 16px;
      padding: 20px; border-radius: 14px;
      text-decoration: none; color: inherit;
      box-shadow: -4px 0 0 0 currentColor, 0 1px 6px rgba(0,0,0,0.08);
      background: #fff; border: 1px solid #e2e8f0;
      transition: transform 0.15s, box-shadow 0.15s;
      cursor: pointer;
    }
    .pt-card:hover { transform: translateX(4px); box-shadow: -4px 0 0 0 currentColor, 0 4px 16px rgba(0,0,0,0.12); }

    .pt-card--blue  { color: #3b82f6; }
    .pt-card--green { color: #22c55e; }
    .pt-card--orange{ color: #f97316; }
    .pt-card--teal  { color: #0891b2; }
    .pt-card--purple{ color: #8b5cf6; }

    .pt-card__icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: currentColor; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .pt-card__icon svg { width: 28px; height: 28px; color: #fff; fill: #fff; }

    .pt-card__body { flex: 1; }
    .pt-card__name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .pt-card__desc { font-size: 13px; color: #64748b; line-height: 1.4; }

    .pt-card__arrow { width: 20px; height: 20px; flex-shrink: 0; opacity: 0.3; }
    .pt-card:hover .pt-card__arrow { opacity: 0.8; }
  `]
})
export class PendidikanTinggiComponent {}
