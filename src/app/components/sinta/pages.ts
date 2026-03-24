/**
 * Placeholder components untuk tiap submenu SINTA.
 * Masing-masing akan dikembangkan menjadi halaman penuh secara terpisah.
 */
import { Component } from '@angular/core';

// ─── Base template helper ─────────────────────────────────────────────────────
function placeholderTemplate(icon: string, title: string, desc: string, color: string): string {
  return `
<div class="ph-wrap">
  <div class="ph-back" routerLink="/sinta">‹ Kembali ke PTMA di SINTA</div>
  <div class="ph-hero" style="--accent:${color}">
    <div class="ph-icon">${icon}</div>
    <div>
      <h1 class="ph-title">${title}</h1>
      <p class="ph-desc">${desc}</p>
    </div>
  </div>
  <div class="ph-body">
    <div class="ph-soon">
      <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="color:#94a3b8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <div class="ph-soon__title">Halaman dalam Pengembangan</div>
      <div class="ph-soon__desc">Fitur <strong>${title}</strong> sedang dibangun dan akan segera tersedia.</div>
    </div>
  </div>
</div>`;
}

const PH_STYLES = [`
  .ph-wrap { padding: 1.25rem 1.25rem 2rem; max-width: 1400px; margin: 0 auto; }
  .ph-back {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .83rem; color: #64748b; cursor: pointer;
    margin-bottom: 1rem; padding: .3rem .6rem;
    border-radius: 6px; transition: background .15s;
  }
  .ph-back:hover { background: #f1f5f9; color: #1e293b; }
  .ph-hero {
    display: flex; align-items: flex-start; gap: 1rem;
    padding: 1.1rem 1.4rem; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 75%, #000));
    color: #fff; margin-bottom: 1.5rem;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .ph-icon { font-size: 2rem; flex-shrink: 0; margin-top: 2px; }
  .ph-title { font-size: 1.3rem; font-weight: 800; margin: 0 0 .3rem; }
  .ph-desc  { font-size: .85rem; opacity: .9; margin: 0; }
  .ph-body {
    background: #fff; border-radius: 12px; padding: 3rem 2rem;
    box-shadow: 0 1px 4px rgba(0,0,0,.07); text-align: center;
  }
  .ph-soon { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
  .ph-soon__title { font-size: 1rem; font-weight: 700; color: #334155; }
  .ph-soon__desc  { font-size: .875rem; color: #64748b; }
  .ph-soon__desc strong { color: #1e293b; font-weight: 600; }
`];

// ─── KELOMPOK I ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-sinta-afiliasi',
  template: placeholderTemplate(
    '🏛️', 'Afiliasi Perguruan Tinggi',
    'Profil dan peringkat institusi PTMA di SINTA berdasarkan skor agregat publikasi dosen.',
    '#2563eb'
  ),
  styles: PH_STYLES
})
export class SintaAfiliasiComponent {}

// ─── KELOMPOK II ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-sinta-artikel',
  template: placeholderTemplate(
    '📄', 'Artikel Ilmiah',
    'Publikasi jurnal nasional dan internasional dosen PTMA — terindeks Scopus, WoS, DOAJ, dan lainnya.',
    '#ea580c'
  ),
  styles: PH_STYLES
})
export class SintaArtikelComponent {}


@Component({
  selector: 'app-sinta-ipr',
  template: placeholderTemplate(
    '🛡️', 'Kekayaan Intelektual (IPR)',
    'Paten, hak cipta, merek dagang, dan kekayaan intelektual lainnya yang dimiliki dosen PTMA.',
    '#b45309'
  ),
  styles: PH_STYLES
})
export class SintaIprComponent {}

@Component({
  selector: 'app-sinta-buku',
  template: placeholderTemplate(
    '📚', 'Buku',
    'Karya buku ber-ISBN yang ditulis atau disunting oleh dosen PTMA dan tercatat di SINTA.',
    '#be185d'
  ),
  styles: PH_STYLES
})
export class SintaBukuComponent {}
