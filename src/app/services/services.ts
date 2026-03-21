// services/api.service.ts - Main API Service

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============ PERGURUAN TINGGI ============

  getPerguruanTinggiList(params?: any): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/`, { params: httpParams });
  }

  getPerguruanTinggiDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/${id}/`);
  }

  createPerguruanTinggi(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/perguruan-tinggi/`, data);
  }

  updatePerguruanTinggi(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/perguruan-tinggi/${id}/`, data);
  }

  deletePerguruanTinggi(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/perguruan-tinggi/${id}/`);
  }

  getStatistikPT(): Observable<any> {
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/statistik/`);
  }

  getSebaranPeta(): Observable<any> {
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/sebaran_peta/`);
  }

  // ============ WILAYAH ============

  getWilayahList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/wilayah/`);
  }

  // ============ LAPORAN ============

  getLaporanList(params?: any): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(`${this.baseUrl}/laporan-pt/`, { params: httpParams });
  }

  getLaporanDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/laporan-pt/${id}/`);
  }

  submitLaporan(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/submit/`, {});
  }

  approveLaporan(id: number, catatan: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/approve/`, { catatan });
  }

  rejectLaporan(id: number, catatan: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/reject/`, { catatan });
  }

  getRekapKepatuhan(periodeId?: number): Observable<any> {
    const params = periodeId ? new HttpParams().set('periode_id', periodeId.toString()) : undefined;
    return this.http.get(`${this.baseUrl}/laporan-pt/rekap_kepatuhan/`, { params });
  }

  // ============ PERIODE ============

  getPeriodeAktif(): Observable<any> {
    return this.http.get(`${this.baseUrl}/periode-pelaporan/aktif/`);
  }

  getPeriodeList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/periode-pelaporan/`);
  }

  // ============ NOTIFIKASI ============

  getNotifikasi(): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifikasi/`);
  }

  tandaiBacaSemuaNotifikasi(): Observable<any> {
    return this.http.post(`${this.baseUrl}/notifikasi/tandai_baca_semua/`, {});
  }
}


// ============================================================
// services/auth.service.ts - Authentication Service
// ============================================================

import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ptma_token';
  private userKey = 'ptma_user';
  private _currentUser = new BehaviorSubject<any>(this.getSavedUser());
  currentUser$ = this._currentUser.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl.replace('/api', '')}/api/auth/login/`, 
      { username, password }
    ).pipe(
      tap((response: any) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this._currentUser.next(response.user);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl.replace('/api', '')}/api/auth/logout/`, {}).pipe(
      tap(() => this.clearAuth())
    );
  }

  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._currentUser.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): any {
    return this._currentUser.getValue();
  }

  private getSavedUser(): any {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }
}


// ============================================================
// services/auth.interceptor.ts - HTTP Interceptor
// ============================================================

// import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent
} from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Token ${token}`)
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}


// ============================================================
// services/auth.guard.ts - Route Guard
// ============================================================

import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
