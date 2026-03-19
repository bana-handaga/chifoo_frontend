import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  template: `
    <!-- ── Top Bar ─────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-brand">
        <span class="brand-icon">🏛️</span>
        <span class="brand-name">PTMA Monitor</span>
      </div>

      <!-- Nav items — tampil di desktop -->
      <nav class="topbar-nav">
        <a routerLink="/dashboard" routerLinkActive="active">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </a>
        <a routerLink="/perguruan-tinggi" routerLinkActive="active">
          <span class="nav-icon">🏫</span>
          <span class="nav-label">Perguruan Tinggi</span>
        </a>
        <a routerLink="/program-studi" routerLinkActive="active">
          <span class="nav-icon">📚</span>
          <span class="nav-label">Program Studi</span>
        </a>
        <a routerLink="/dosen" routerLinkActive="active">
          <span class="nav-icon">👨‍🏫</span>
          <span class="nav-label">Dosen</span>
        </a>
        <a routerLink="/statistik" routerLinkActive="active">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Laporan</span>
        </a>
      </nav>

      <!-- Kanan: user / login -->
      <div class="topbar-right">
        <ng-container *ngIf="currentUser; else guestBtn">
          <div class="user-chip">
            <span class="user-avatar">{{ userInitial }}</span>
            <span class="user-name">{{ currentUser.first_name || currentUser.username }}</span>
          </div>
          <button class="icon-btn" (click)="logout()" title="Keluar">🚪</button>
        </ng-container>
        <ng-template #guestBtn>
          <button class="btn-login" (click)="goLogin()">🔑 Login</button>
        </ng-template>
      </div>
    </header>

    <!-- ── Konten utama ─────────────────────────────── -->
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>

    <!-- ── Bottom Tab Bar — mobile only ───────────────── -->
    <nav class="bottom-tabs">
      <a routerLink="/dashboard" routerLinkActive="active">
        <span class="tab-icon">📊</span>
        <span class="tab-label">Dashboard</span>
      </a>
      <a routerLink="/perguruan-tinggi" routerLinkActive="active">
        <span class="tab-icon">🏫</span>
        <span class="tab-label">PT</span>
      </a>
      <a routerLink="/program-studi" routerLinkActive="active">
        <span class="tab-icon">📚</span>
        <span class="tab-label">Prodi</span>
      </a>
      <a routerLink="/dosen" routerLinkActive="active">
        <span class="tab-icon">👨‍🏫</span>
        <span class="tab-label">Dosen</span>
      </a>
      <a routerLink="/statistik" routerLinkActive="active">
        <span class="tab-icon">📊</span>
        <span class="tab-label">Laporan</span>
      </a>
    </nav>
  `,
  styles: [`
    /* ── Top Bar ─────────────────────────────────────── */
    .topbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      height: 56px; background: #001f5b; color: white;
      display: flex; align-items: center; gap: 0;
      padding: 0 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }

    .topbar-brand {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 15px; white-space: nowrap;
      text-decoration: none; color: white; flex-shrink: 0;
    }
    .brand-icon { font-size: 20px; }
    .brand-name { display: none; }

    /* ── Top Bar Nav ─────────────────────────────────── */
    .topbar-nav {
      display: none;
      flex: 1; align-items: center; gap: 4px;
      margin-left: 24px;
    }
    .topbar-nav a {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      color: rgba(255,255,255,0.75); text-decoration: none;
      font-size: 14px; font-weight: 500; white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .topbar-nav a:hover { background: rgba(255,255,255,0.1); color: white; }
    .topbar-nav a.active { background: rgba(255,255,255,0.18); color: white; }
    .nav-icon { font-size: 16px; }

    /* ── Right section ───────────────────────────────── */
    .topbar-right {
      margin-left: auto; display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .user-chip {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.12); border-radius: 20px;
      padding: 4px 12px 4px 4px;
    }
    .user-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: #fbbf24; color: #1a237e;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }
    .user-name { font-size: 13px; font-weight: 600; display: none; }
    .icon-btn {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
      color: white; border-radius: 8px; padding: 6px 10px;
      cursor: pointer; font-size: 16px; transition: background 0.15s;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.2); }
    .btn-login {
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
      color: white; border-radius: 8px; padding: 6px 14px;
      cursor: pointer; font-size: 13px; font-weight: 600;
      display: flex; align-items: center; gap: 6px;
      transition: background 0.15s;
    }
    .btn-login:hover { background: rgba(255,255,255,0.25); }

    /* ── Main Content ────────────────────────────────── */
    .main-content {
      /* top: topbar 56px + inner pad 12px; bottom: bottom-tabs 60px + inner pad 8px */
      padding: 68px 12px 76px;
      min-height: 100vh;
    }

    /* ── Bottom Tab Bar (mobile only) ───────────────── */
    .bottom-tabs {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
      height: 60px; background: #001f5b;
      display: flex; align-items: stretch;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.2);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .bottom-tabs a {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      color: rgba(255,255,255,0.55); text-decoration: none;
      font-size: 10px; font-weight: 500;
      transition: color 0.15s, background 0.15s;
      border-radius: 0; position: relative;
    }
    .bottom-tabs a:hover { color: white; background: rgba(255,255,255,0.06); }
    .bottom-tabs a.active { color: white; }
    .bottom-tabs a.active::before {
      content: '';
      position: absolute; top: 0; left: 20%; right: 20%;
      height: 3px; background: #60a5fa; border-radius: 0 0 4px 4px;
    }
    .tab-icon { font-size: 20px; line-height: 1; }
    .tab-label { font-size: 10px; letter-spacing: 0.2px; }

    /* ── Tablet ≥ 640px ──────────────────────────────── */
    @media (min-width: 640px) {
      .brand-name { display: inline; }
      .user-name { display: inline; }
    }

    /* ── Desktop ≥ 768px — switch to top nav, hide bottom tabs ── */
    @media (min-width: 768px) {
      .topbar { padding: 0 24px; }
      .topbar-nav { display: flex; }
      .bottom-tabs { display: none; }
      .main-content { padding: 72px 20px 24px; }
    }

    @media (min-width: 1024px) {
      .topbar { padding: 0 32px; }
      .topbar-nav a { padding: 8px 16px; font-size: 14px; }
      .nav-icon { font-size: 17px; }
      .main-content { padding: 72px 32px 32px; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  currentUser: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
  }

  get userInitial(): string {
    if (!this.currentUser) return '?';
    const name = this.currentUser.first_name || this.currentUser.username || '';
    return name.charAt(0).toUpperCase();
  }

  logout() {
    this.authService.logout().subscribe({ error: () => {} });
    this.authService.clearAuth();
    this.router.navigate(['/dashboard']);
  }

  goLogin() {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
