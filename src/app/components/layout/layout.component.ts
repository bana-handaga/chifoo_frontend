import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  template: `
    <!-- ── Top Bar ─────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-brand">
        <svg class="brand-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-2 15v-5h4v5h3v-6.27l-5-2.73-5 2.73V18h3z"/>
        </svg>
        <span class="brand-name">PTMA Monitor</span>
      </div>

      <!-- Nav items — tampil di desktop -->
      <nav class="topbar-nav">
        <a routerLink="/dashboard" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
          <span class="nav-label">Dashboard</span>
        </a>
        <a routerLink="/pendidikan-tinggi" routerLinkActive="active"
           [routerLinkActiveOptions]="{exact:false}">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
          <span class="nav-label">Pendidikan Tinggi</span>
        </a>
        <!-- HIDDEN: uncomment to restore individual menu items
        <a routerLink="/perguruan-tinggi" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
          <span class="nav-label">Perguruan Tinggi</span>
        </a>
        <a routerLink="/program-studi" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/>
          </svg>
          <span class="nav-label">Program Studi</span>
        </a>
        <a routerLink="/dosen" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span class="nav-label">Dosen</span>
        </a>
        <a routerLink="/statistik" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
          </svg>
          <span class="nav-label">Laporan</span>
        </a>
        -->
        <a routerLink="/sinta" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 3.09L15 7.59V4h-2v7h7V9h-3.59l4.5-4.5-1.41-1.41zM4 13v2h3.59l-4.5 4.5 1.41 1.41L9 16.41V20h2v-7H4z"/>
          </svg>
          <span class="nav-label">SINTA</span>
        </a>
        <a routerLink="/network-x" routerLinkActive="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12a5 5 0 1 0-4.48 4.97V18h-2v2h2v1h2v-1h2v-2h-2v-1.03A5 5 0 0 0 17 12zm-5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM4 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm2-4a4 4 0 1 0 0 8A4 4 0 0 0 6 2zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
          </svg>
          <span class="nav-label">NetworkX</span>
        </a>
      </nav>

      <!-- Kanan: user / login -->
      <div class="topbar-right">
        <ng-container *ngIf="currentUser; else guestBtn">
          <div class="user-chip" (click)="showUserMenu=!showUserMenu" style="cursor:pointer;position:relative;">
            <span class="user-avatar">{{ userInitial }}</span>
            <span class="user-name">{{ currentUser.first_name || currentUser.username }}</span>
            <div class="user-menu" *ngIf="showUserMenu" (click)="$event.stopPropagation()">
              <div class="user-menu-name">{{ currentUser.first_name || currentUser.username }}</div>
              <div class="user-menu-email">{{ currentUser.email || '-' }}</div>
              <div class="user-menu-item user-menu-link" *ngIf="currentUser?.role === 'superadmin'" (click)="goSync()">Sinkronisasi Data</div>
              <div class="user-menu-item user-menu-link" (click)="goProfile()">Profil &amp; Keamanan</div>
              <div class="user-menu-divider"></div>
              <div class="user-menu-item">
                <span>MFA Email</span>
                <label class="mfa-toggle">
                  <input type="checkbox" [checked]="currentUser.mfa_enabled" (change)="onToggleMfa($event)">
                  <span class="mfa-slider"></span>
                </label>
              </div>
              <div class="user-menu-hint" *ngIf="!currentUser.email">Email belum diatur — hubungi admin</div>
              <div class="user-menu-divider"></div>
              <div class="user-menu-item user-menu-logout" (click)="logout()">Keluar</div>
            </div>
          </div>
          <button class="icon-btn" (click)="logout()" title="Keluar">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </ng-container>
        <ng-template #guestBtn>
          <button class="btn-login" (click)="goLogin()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
            </svg>
            Login
          </button>
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
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
        <span class="tab-label">Dashboard</span>
      </a>
      <a routerLink="/pendidikan-tinggi" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
        </svg>
        <span class="tab-label">Dikti</span>
      </a>
      <!-- HIDDEN: uncomment to restore individual tab items
      <a routerLink="/perguruan-tinggi" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
        </svg>
        <span class="tab-label">PT</span>
      </a>
      <a routerLink="/program-studi" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/>
        </svg>
        <span class="tab-label">Prodi</span>
      </a>
      <a routerLink="/dosen" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span class="tab-label">Dosen</span>
      </a>
      <a routerLink="/statistik" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
        </svg>
        <span class="tab-label">Laporan</span>
      </a>
      -->
      <a routerLink="/sinta" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 3.09L15 7.59V4h-2v7h7V9h-3.59l4.5-4.5-1.41-1.41zM4 13v2h3.59l-4.5 4.5 1.41 1.41L9 16.41V20h2v-7H4z"/>
        </svg>
        <span class="tab-label">SINTA</span>
      </a>
      <a routerLink="/network-x" routerLinkActive="active">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 12a5 5 0 1 0-4.48 4.97V18h-2v2h2v1h2v-1h2v-2h-2v-1.03A5 5 0 0 0 17 12zm-5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM4 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm2-4a4 4 0 1 0 0 8A4 4 0 0 0 6 2zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
        </svg>
        <span class="tab-label">NetworkX</span>
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
    .brand-icon { width: 24px; height: 24px; flex-shrink: 0; color: #90caf9; }
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
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }

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
    .user-menu {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 999;
      background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      min-width: 220px; padding: 8px 0; color: #1f2937;
    }
    .user-menu-name { padding: 10px 16px 2px; font-weight: 700; font-size: 14px; }
    .user-menu-email { padding: 0 16px 10px; font-size: 12px; color: #6b7280; }
    .user-menu-divider { border-top: 1px solid #f3f4f6; margin: 4px 0; }
    .user-menu-item { padding: 9px 16px; font-size: 13px; display: flex; align-items: center; justify-content: space-between; }
    .user-menu-hint { padding: 0 16px 8px; font-size: 11px; color: #ef4444; }
    .user-menu-link { cursor: pointer; color: #1a237e; }
    .user-menu-link:hover { background: #f0f4ff; }
    .user-menu-logout { cursor: pointer; color: #dc2626; font-weight: 600; }
    .user-menu-logout:hover { background: #fef2f2; }
    .mfa-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
    .mfa-toggle input { opacity: 0; width: 0; height: 0; }
    .mfa-slider { position: absolute; cursor: pointer; inset: 0; background: #d1d5db; border-radius: 20px; transition: .3s; }
    .mfa-slider:before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
    .mfa-toggle input:checked + .mfa-slider { background: #16a34a; }
    .mfa-toggle input:checked + .mfa-slider:before { transform: translateX(16px); }
    .icon-btn {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
      color: white; border-radius: 8px; padding: 7px 10px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
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
    .tab-icon { width: 22px; height: 22px; flex-shrink: 0; }
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
      .nav-icon { width: 18px; height: 18px; }
      .main-content { padding: 72px 32px 32px; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  currentUser: any;
  showUserMenu = false;

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
    window.location.href = '/login';
  }

  goLogin() {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  goProfile() {
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  goSync() {
    this.showUserMenu = false;
    this.router.navigate(['/sync']);
  }

  onToggleMfa(event: Event) {
    const enable = (event.target as HTMLInputElement).checked;
    this.authService.toggleMfa(enable).subscribe({
      next: (res: any) => {
        this.currentUser = { ...this.currentUser, mfa_enabled: res.mfa_enabled };
        localStorage.setItem('ptma_user', JSON.stringify(this.currentUser));
      },
      error: (err: any) => {
        alert(err?.error?.detail || 'Gagal mengubah pengaturan MFA.');
        // revert checkbox
        (event.target as HTMLInputElement).checked = !enable;
      }
    });
  }
}
