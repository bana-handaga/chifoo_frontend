import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  template: `
    <!-- ── Navbar ─────────────────────────────────────────── -->
    <header class="navbar">
      <div class="navbar-inner">
        <div class="brand">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-2 15v-5h4v5h3v-6.27l-5-2.73-5 2.73V18h3z"/>
          </svg>
          <span>PTMA Monitor</span>
        </div>
        <button class="btn-login-nav" (click)="router.navigate(['/login'])">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
          </svg>
          Masuk
        </button>
      </div>
    </header>

    <!-- ── Hero ──────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-badge">Sistem Informasi</div>
        <h1>Monitoring Perguruan Tinggi<br><span class="accent">Muhammadiyah &amp; Aisyiyah</span></h1>
        <p class="hero-desc">
          Platform terpadu untuk memantau data akademik, riset, dan perkembangan
          Perguruan Tinggi Muhammadiyah-Aisyiyah (PTMA) di seluruh Indonesia secara
          real-time dan komprehensif.
        </p>
        <div class="hero-actions">
          <button class="btn-cta" (click)="router.navigate(['/login'])">
            Masuk ke Sistem
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </button>
          <button class="btn-register" (click)="router.navigate(['/register'])">Daftar Akun</button>
          <a class="btn-scroll" href="#fitur">Pelajari Lebih Lanjut ↓</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-n">170+</span><span class="stat-l">Perguruan Tinggi</span></div>
          <div class="stat-div"></div>
          <div class="stat"><span class="stat-n">1.200+</span><span class="stat-l">Program Studi</span></div>
          <div class="stat-div"></div>
          <div class="stat"><span class="stat-n">30.000+</span><span class="stat-l">Dosen Terdaftar</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visual-card vc-1">
          <div class="vc-label">Akreditasi PT</div>
          <div class="vc-bars">
            <div class="vc-bar" style="width:80%;background:#6ee7b7"><span>A</span></div>
            <div class="vc-bar" style="width:60%;background:#93c5fd"><span>B</span></div>
            <div class="vc-bar" style="width:40%;background:#c4b5fd"><span>C</span></div>
            <div class="vc-bar" style="width:20%;background:#fde68a"><span>Baik</span></div>
          </div>
        </div>
        <div class="visual-card vc-2">
          <div class="vc-label">Tren Mahasiswa Aktif</div>
          <svg viewBox="0 0 160 60" class="vc-chart">
            <polyline points="0,50 30,40 60,35 90,25 120,20 160,10"
              fill="none" stroke="#6ee7b7" stroke-width="2.5" stroke-linecap="round"/>
            <polyline points="0,50 30,40 60,35 90,25 120,20 160,10"
              fill="url(#g1)" stroke="none" opacity="0.2"/>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6ee7b7"/>
                <stop offset="100%" stop-color="transparent"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="visual-card vc-3">
          <div class="vc-label">Skor SINTA</div>
          <div class="vc-sinta-rows">
            <div class="vc-sinta-row"><span>Scopus</span><div class="vc-bar-sm" style="width:85%;background:#f9a8d4"></div></div>
            <div class="vc-sinta-row"><span>GScholar</span><div class="vc-bar-sm" style="width:70%;background:#93c5fd"></div></div>
            <div class="vc-sinta-row"><span>WOS</span><div class="vc-bar-sm" style="width:45%;background:#86efac"></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Fitur ──────────────────────────────────────────── -->
    <section class="features" id="fitur">
      <div class="section-inner">
        <div class="section-tag">Fitur Utama</div>
        <h2 class="section-title">Semua yang Anda butuhkan<br>dalam satu platform</h2>
        <p class="section-sub">Data lengkap dan terintegrasi dari berbagai sumber resmi untuk mendukung pengambilan keputusan berbasis data.</p>

        <div class="feat-grid">
          <div class="feat-card">
            <div class="feat-icon" style="background:#eff6ff">
              <svg viewBox="0 0 24 24" fill="#3b82f6" width="24" height="24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
            </div>
            <h3>Perguruan Tinggi</h3>
            <p>Data lengkap institusi meliputi akreditasi BAN-PT, status, wilayah, dan informasi kontak seluruh PTMA.</p>
          </div>
          <div class="feat-card">
            <div class="feat-icon" style="background:#f0fdf4">
              <svg viewBox="0 0 24 24" fill="#22c55e" width="24" height="24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/></svg>
            </div>
            <h3>Program Studi</h3>
            <p>Informasi program studi per institusi termasuk akreditasi LAM, jenjang pendidikan, dan distribusi prodi.</p>
          </div>
          <div class="feat-card">
            <div class="feat-icon" style="background:#fdf4ff">
              <svg viewBox="0 0 24 24" fill="#a855f7" width="24" height="24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <h3>Data Dosen</h3>
            <p>Statistik dosen aktif, kualifikasi pendidikan, jabatan fungsional, dan sertifikasi per perguruan tinggi.</p>
          </div>
          <div class="feat-card">
            <div class="feat-icon" style="background:#fff7ed">
              <svg viewBox="0 0 24 24" fill="#f97316" width="24" height="24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
            </div>
            <h3>Tren Mahasiswa</h3>
            <p>Visualisasi tren mahasiswa aktif, baru, lulus, dan DO per semester dalam grafik interaktif per program studi.</p>
          </div>
          <div class="feat-card">
            <div class="feat-icon" style="background:#fef2f2">
              <svg viewBox="0 0 24 24" fill="#ef4444" width="24" height="24"><path d="M19.5 3.09L15 7.59V4h-2v7h7V9h-3.59l4.5-4.5-1.41-1.41zM4 13v2h3.59l-4.5 4.5 1.41 1.41L9 16.41V20h2v-7H4z"/></svg>
            </div>
            <h3>Data SINTA</h3>
            <p>Rekap data riset dari SINTA: jurnal, artikel Scopus, penelitian, pengabdian, dan profil author per afiliasi.</p>
          </div>
          <div class="feat-card">
            <div class="feat-icon" style="background:#f0f9ff">
              <svg viewBox="0 0 24 24" fill="#0ea5e9" width="24" height="24"><path d="M17 12a5 5 0 1 0-4.48 4.97V18h-2v2h2v1h2v-1h2v-2h-2v-1.03A5 5 0 0 0 17 12zm-5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM4 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm2-4a4 4 0 1 0 0 8A4 4 0 0 0 6 2zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
            </div>
            <h3>Jaringan Kolaborasi</h3>
            <p>Visualisasi network kolaborasi riset antar dosen dan institusi PTMA menggunakan peta jaringan interaktif.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Sumber Data ────────────────────────────────────── -->
    <section class="sources">
      <div class="section-inner">
        <div class="section-tag">Sumber Data</div>
        <h2 class="section-title">Data dari sumber resmi &amp; terpercaya</h2>
        <div class="src-grid">
          <div class="src-card">
            <div class="src-icon">📊</div>
            <div><strong>PDDikti</strong><p>Data mahasiswa, dosen, dan program studi resmi Kemdikbudristek.</p></div>
          </div>
          <div class="src-card">
            <div class="src-icon">🏅</div>
            <div><strong>BAN-PT &amp; LAM</strong><p>Data akreditasi terkini perguruan tinggi dan program studi.</p></div>
          </div>
          <div class="src-card">
            <div class="src-icon">🔬</div>
            <div><strong>SINTA Kemdiktisaintek</strong><p>Data riset, publikasi, dan skor peneliti dari portal SINTA.</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA Bottom ─────────────────────────────────────── -->
    <section class="cta-bottom">
      <div class="section-inner cta-inner">
        <h2>Siap mengakses data PTMA?</h2>
        <p>Login dengan akun yang telah diberikan untuk mengakses seluruh fitur monitoring.</p>
        <button class="btn-cta btn-cta-white" (click)="router.navigate(['/login'])">
          Masuk ke Sistem
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- ── Footer ─────────────────────────────────────────── -->
    <footer class="footer">
      <div class="section-inner footer-inner">
        <div class="footer-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-2 15v-5h4v5h3v-6.27l-5-2.73-5 2.73V18h3z"/>
          </svg>
          <span>PTMA Monitor</span>
        </div>
        <p class="footer-copy">
          Dikembangkan oleh <strong>Majelis Diktilitbang PP Muhammadiyah</strong><br>
          Sumber data: PDDikti · BAN-PT · LAM · SINTA Kemdiktisaintek
        </p>
        <button class="footer-login" (click)="router.navigate(['/login'])">Login</button>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Navbar ── */
    .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(0,20,70,0.92); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.08); }
    .navbar-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px;
      height: 60px; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 10px;
      color: white; font-size: 17px; font-weight: 700; }
    .btn-login-nav { display: flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
      color: white; padding: 8px 18px; border-radius: 8px; font-size: 14px;
      font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-login-nav:hover { background: rgba(255,255,255,0.22); }

    /* ── Hero ── */
    .hero { position: relative; min-height: 100vh; display: flex; align-items: center;
      overflow: hidden; padding: 100px 24px 60px; }
    .hero-bg { position: absolute; inset: 0; z-index: 0;
      background: linear-gradient(135deg, #000d33 0%, #001f5b 45%, #1a237e 75%, #283593 100%); }
    .hero-bg::after { content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 70% 50%, rgba(99,102,241,0.15) 0%, transparent 70%); }
    .hero-content { position: relative; z-index: 1; max-width: 560px; color: white; flex: 1; }
    .hero-badge { display: inline-block; background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 20px;
      padding: 5px 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
      text-transform: uppercase; margin-bottom: 20px; color: #a5b4fc; }
    h1 { font-size: clamp(28px, 4vw, 44px); font-weight: 800; line-height: 1.15;
      margin-bottom: 18px; color: white; }
    .accent { color: #a5b4fc; }
    .hero-desc { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.75);
      margin-bottom: 32px; max-width: 480px; }
    .hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 48px; }
    .btn-cta { display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white; border: none; padding: 14px 28px; border-radius: 10px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 20px rgba(99,102,241,0.4); transition: transform .2s, box-shadow .2s; }
    .btn-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,0.5); }
    .btn-register { display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.3);
      color: white; padding: 13px 24px; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-register:hover { background: rgba(255,255,255,0.2); }
    .btn-scroll { color: rgba(255,255,255,0.6); font-size: 14px; text-decoration: none;
      transition: color .2s; }
    .btn-scroll:hover { color: white; }
    .hero-stats { display: flex; align-items: center; gap: 0; }
    .stat { display: flex; flex-direction: column; gap: 2px; padding: 0 20px 0 0; }
    .stat:first-child { padding-left: 0; }
    .stat-n { font-size: 24px; font-weight: 800; color: white; }
    .stat-l { font-size: 12px; color: rgba(255,255,255,0.55); }
    .stat-div { width: 1px; height: 36px; background: rgba(255,255,255,0.15); margin: 0 20px; }
    .hero-visual { position: relative; z-index: 1; flex: 1; display: flex;
      flex-direction: column; gap: 14px; max-width: 340px; margin-left: auto;
      padding-top: 20px; }
    .visual-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px; padding: 16px; backdrop-filter: blur(8px); }
    .vc-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .vc-bars { display: flex; flex-direction: column; gap: 6px; }
    .vc-bar { height: 20px; border-radius: 4px; display: flex; align-items: center;
      padding-left: 8px; font-size: 11px; font-weight: 700; color: rgba(0,0,0,0.6); }
    .vc-chart { width: 100%; height: 50px; }
    .vc-sinta-rows { display: flex; flex-direction: column; gap: 8px; }
    .vc-sinta-row { display: flex; align-items: center; gap: 8px; font-size: 11px;
      color: rgba(255,255,255,0.6); }
    .vc-sinta-row span { width: 58px; flex-shrink: 0; }
    .vc-bar-sm { height: 8px; border-radius: 4px; flex: 0 0 auto; }

    /* ── Sections ── */
    .section-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .section-tag { display: inline-block; color: #6366f1; font-size: 12px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 12px; }
    .section-title { font-size: clamp(22px, 3vw, 34px); font-weight: 800;
      line-height: 1.2; margin-bottom: 14px; color: #111827; }
    .section-sub { font-size: 15px; color: #6b7280; line-height: 1.7;
      max-width: 560px; margin-bottom: 48px; }

    /* ── Features ── */
    .features { padding: 96px 0; background: #f9fafb; }
    .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .feat-card { background: white; border-radius: 16px; padding: 24px;
      border: 1px solid #f3f4f6; transition: box-shadow .2s, transform .2s; }
    .feat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-3px); }
    .feat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; margin-bottom: 16px; }
    .feat-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #111827; }
    .feat-card p { font-size: 13px; color: #6b7280; line-height: 1.6; }

    /* ── Sources ── */
    .sources { padding: 80px 0; background: white; }
    .src-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .src-card { display: flex; align-items: flex-start; gap: 16px;
      background: #f9fafb; border-radius: 14px; padding: 20px; }
    .src-icon { font-size: 28px; flex-shrink: 0; }
    .src-card strong { font-size: 15px; color: #111827; display: block; margin-bottom: 6px; }
    .src-card p { font-size: 13px; color: #6b7280; line-height: 1.5; }

    /* ── CTA Bottom ── */
    .cta-bottom { padding: 80px 0;
      background: linear-gradient(135deg, #001f5b 0%, #1a237e 60%, #4338ca 100%); }
    .cta-inner { text-align: center; }
    .cta-inner h2 { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: white; margin-bottom: 12px; }
    .cta-inner p { font-size: 15px; color: rgba(255,255,255,0.7); margin-bottom: 32px; }
    .btn-cta-white { background: white; color: #1a237e;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .btn-cta-white:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.3); }

    /* ── Footer ── */
    .footer { background: #050e2b; padding: 32px 0; }
    .footer-inner { display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px; }
    .footer-brand { display: flex; align-items: center; gap: 8px;
      color: white; font-size: 15px; font-weight: 700; }
    .footer-copy { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.6; text-align: center; }
    .footer-login { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7); padding: 8px 20px; border-radius: 8px;
      font-size: 13px; cursor: pointer; transition: background .2s; }
    .footer-login:hover { background: rgba(255,255,255,0.15); color: white; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .hero { flex-direction: column; text-align: center; padding-top: 90px; }
      .hero-desc { margin: 0 auto 32px; }
      .hero-actions { justify-content: center; }
      .hero-stats { justify-content: center; }
      .hero-visual { max-width: 100%; margin: 40px 0 0; flex-direction: row; flex-wrap: wrap; }
      .visual-card { flex: 1 1 140px; }
      .feat-grid { grid-template-columns: repeat(2, 1fr); }
      .src-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .feat-grid { grid-template-columns: 1fr; }
      .footer-inner { justify-content: center; text-align: center; }
    }
  `]
})
export class LandingComponent {
  constructor(public router: Router) {}
}
