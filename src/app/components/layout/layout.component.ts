import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  template: `
    <!-- Mobile topbar -->
    <div class="topbar" [class.visible]="isMobile">
      <button class="hamburger" (click)="toggleMobile()" aria-label="Toggle menu">
        <span [class.open]="mobileOpen"></span>
        <span [class.open]="mobileOpen"></span>
        <span [class.open]="mobileOpen"></span>
      </button>
      <span class="topbar-title">🏛️ PTMA Monitor</span>
    </div>

    <!-- Backdrop for mobile -->
    <div class="backdrop" [class.visible]="isMobile && mobileOpen" (click)="closeMobile()"></div>

    <div class="app-layout" [class.sidebar-collapsed]="isCollapsed && !isMobile" [class.has-topbar]="isMobile">
      <nav class="sidebar"
           [class.collapsed]="isCollapsed && !isMobile"
           [class.mobile-drawer]="isMobile"
           [class.mobile-open]="isMobile && mobileOpen">

        <div class="sidebar-header">
          <span class="logo-icon">🏛️</span>
          <div class="header-text">
            <div class="app-name">PTMA Monitor</div>
            <div class="app-sub">Muhammadiyah & Aisyiyah</div>
          </div>
        </div>

        <!-- Desktop collapse toggle -->
        <button class="toggle-btn" *ngIf="!isMobile" (click)="toggleSidebar()"
                [title]="isCollapsed ? 'Perluas sidebar' : 'Kecilkan sidebar'">
          <span class="toggle-icon">{{ isCollapsed ? '▶' : '◀' }}</span>
        </button>

        <ul class="nav-menu">
          <li>
            <a routerLink="/dashboard" routerLinkActive="active"
               [title]="isCollapsed && !isMobile ? 'Dashboard' : ''"
               (click)="onNavClick()">
              <span class="nav-icon">📊</span>
              <span class="nav-label">Dashboard</span>
            </a>
          </li>
          <li>
            <a routerLink="/perguruan-tinggi" routerLinkActive="active"
               [title]="isCollapsed && !isMobile ? 'Perguruan Tinggi' : ''"
               (click)="onNavClick()">
              <span class="nav-icon">🏫</span>
              <span class="nav-label">Perguruan Tinggi</span>
            </a>
          </li>
          <!-- Laporan disembunyikan sementara -->
          <!-- <li>
            <a routerLink="/laporan" routerLinkActive="active"
               [title]="isCollapsed && !isMobile ? 'Laporan' : ''"
               (click)="onNavClick()">
              <span class="nav-icon">📋</span>
              <span class="nav-label">Laporan</span>
            </a>
          </li> -->
          <li>
            <a routerLink="/statistik" routerLinkActive="active"
               [title]="isCollapsed && !isMobile ? 'Statistik' : ''"
               (click)="onNavClick()">
              <span class="nav-icon">📈</span>
              <span class="nav-label">Statistik</span>
            </a>
          </li>
        </ul>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-name">{{ currentUser?.first_name || currentUser?.username }}</div>
            <div class="user-role">{{ currentUser?.role_display }}</div>
          </div>
          <button class="btn-logout" (click)="logout()"
                  [title]="isCollapsed && !isMobile ? 'Keluar' : ''">
            <span class="logout-icon">🚪</span>
            <span class="logout-label">Keluar</span>
          </button>
        </div>
      </nav>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    /* ── Topbar (mobile only) ─────────────────────── */
    .topbar {
      display: none;
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      height: 56px; background: #001f5b; color: white;
      align-items: center; gap: 12px; padding: 0 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .topbar.visible { display: flex; }
    .topbar-title { font-weight: 700; font-size: 15px; }

    .hamburger {
      display: flex; flex-direction: column; justify-content: center; gap: 5px;
      width: 36px; height: 36px; padding: 6px;
      background: none; border: none; cursor: pointer;
    }
    .hamburger span {
      display: block; height: 2px; background: white; border-radius: 2px;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .hamburger span:nth-child(1).open { transform: translateY(7px) rotate(45deg); }
    .hamburger span:nth-child(2).open { opacity: 0; }
    .hamburger span:nth-child(3).open { transform: translateY(-7px) rotate(-45deg); }

    /* ── Backdrop ─────────────────────────────────── */
    .backdrop {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.4); z-index: 150;
    }
    .backdrop.visible { display: block; }

    /* ── App layout shell ─────────────────────────── */
    .app-layout { display: flex; min-height: 100vh; }
    .app-layout.has-topbar { padding-top: 56px; }

    /* ── Sidebar ──────────────────────────────────── */
    .sidebar {
      width: 240px; min-height: 100vh; background: #001f5b; color: white;
      display: flex; flex-direction: column; flex-shrink: 0;
      position: fixed; top: 0; left: 0; bottom: 0;
      transition: width 0.3s ease, transform 0.3s ease;
      overflow: hidden; z-index: 100;
    }
    .sidebar.collapsed { width: 64px; }

    /* Mobile drawer: off-screen by default */
    .sidebar.mobile-drawer {
      top: 56px; width: 260px;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      box-shadow: 4px 0 20px rgba(0,0,0,0.2);
    }
    .sidebar.mobile-drawer.mobile-open { transform: translateX(0); }

    /* ── Sidebar header ───────────────────────────── */
    .sidebar-header {
      display: flex; align-items: center; gap: 12px; padding: 24px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      min-height: 80px; overflow: hidden;
    }
    .logo-icon { font-size: 32px; flex-shrink: 0; }
    .header-text { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, width 0.3s ease; }
    .sidebar.collapsed .header-text { opacity: 0; width: 0; }
    .app-name { font-weight: 700; font-size: 15px; }
    .app-sub { font-size: 11px; opacity: 0.7; }

    /* ── Toggle button (desktop only) ────────────── */
    .toggle-btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
      border-radius: 50%; cursor: pointer; color: white; font-size: 11px;
      position: absolute; top: 26px; right: -14px;
      transition: background 0.2s ease; z-index: 101;
    }
    .toggle-btn:hover { background: rgba(255,255,255,0.3); }

    /* ── Nav menu ─────────────────────────────────── */
    .nav-menu { list-style: none; padding: 16px 0; flex: 1; margin: 0; }
    .nav-menu li a {
      display: flex; align-items: center; gap: 10px; padding: 12px 20px;
      color: rgba(255,255,255,0.75); text-decoration: none; font-size: 14px;
      transition: all 0.2s; white-space: nowrap; overflow: hidden;
    }
    .nav-menu li a:hover, .nav-menu li a.active {
      background: rgba(255,255,255,0.12); color: white;
    }
    .nav-icon { flex-shrink: 0; font-size: 18px; width: 24px; text-align: center; }
    .nav-label { transition: opacity 0.2s ease; }
    .sidebar.collapsed .nav-label { opacity: 0; width: 0; overflow: hidden; }
    .sidebar.collapsed .nav-menu li a { justify-content: center; padding: 12px; gap: 0; }

    /* Mobile: always show labels */
    .sidebar.mobile-drawer .nav-label { opacity: 1; width: auto; }
    .sidebar.mobile-drawer .nav-menu li a { justify-content: flex-start; padding: 14px 20px; gap: 12px; }

    /* ── Sidebar footer ───────────────────────────── */
    .sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
    .user-info { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, height 0.3s ease; }
    .sidebar.collapsed .user-info { opacity: 0; height: 0; margin: 0; padding: 0; }
    .user-name { font-weight: 600; font-size: 13px; }
    .user-role { font-size: 11px; opacity: 0.7; margin-bottom: 12px; }
    .btn-logout {
      width: 100%; padding: 8px; background: rgba(255,255,255,0.1); color: white;
      border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer; font-size: 13px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background 0.2s ease;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.2); }
    .logout-label { transition: opacity 0.2s ease; white-space: nowrap; overflow: hidden; }
    .sidebar.collapsed .logout-label { opacity: 0; width: 0; overflow: hidden; }
    .sidebar.mobile-drawer .logout-label { opacity: 1; width: auto; }

    /* ── Main content ─────────────────────────────── */
    .main-content {
      margin-left: 240px; flex: 1; padding: 24px; min-height: 100vh;
      transition: margin-left 0.3s ease;
    }
    .app-layout.sidebar-collapsed .main-content { margin-left: 64px; }

    /* Mobile: no left margin (sidebar is drawer overlay) */
    @media (max-width: 767px) {
      .main-content { margin-left: 0 !important; padding: 16px 12px; }
    }

    /* Tablet: slightly less padding */
    @media (min-width: 768px) and (max-width: 1024px) {
      .main-content { padding: 16px; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  currentUser: any;
  isCollapsed = false;
  isMobile = false;
  mobileOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    this.checkMobile();
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) this.isCollapsed = saved === 'true';

    // Auto-close drawer on navigation
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile) this.mobileOpen = false;
    });
  }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  checkMobile() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (wasMobile && !this.isMobile) this.mobileOpen = false;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebar-collapsed', String(this.isCollapsed));
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  closeMobile()  { this.mobileOpen = false; }
  onNavClick()   { if (this.isMobile) this.mobileOpen = false; }

  logout() {
    this.authService.logout().subscribe({ error: () => {} });
    this.authService.clearAuth();
    this.router.navigate(['/login']);
  }
}
