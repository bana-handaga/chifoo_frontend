import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ptma_token';
  private userKey = 'ptma_user';
  private _currentUser = new BehaviorSubject<any>(this.getSavedUser());
  currentUser$ = this._currentUser.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    const authUrl = environment.apiUrl.replace('/api', '') + '/api/auth/login/';
    return this.http.post(authUrl, { username, password }).pipe(
      tap((response: any) => {
        if (!response.mfa_required) {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
          this._currentUser.next(response.user);
        }
      })
    );
  }

  verifyMfa(mfaToken: string, otpCode: string): Observable<any> {
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/mfa/verify/';
    return this.http.post(url, { mfa_token: mfaToken, otp_code: otpCode }).pipe(
      tap((response: any) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this._currentUser.next(response.user);
      })
    );
  }

  toggleMfa(enable: boolean): Observable<any> {
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/mfa/toggle/';
    return this.http.post(url, { enable });
  }

  updateEmail(email: string, password: string): Observable<any> {
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/update-email/';
    return this.http.post(url, { email, password }).pipe(
      tap((res: any) => {
        if (res.user) {
          localStorage.setItem(this.userKey, JSON.stringify(res.user));
          this._currentUser.next(res.user);
        }
      })
    );
  }

  updatePassword(oldPassword: string, newPassword: string, confirmPassword: string): Observable<any> {
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/update-password/';
    return this.http.post(url, { old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem(this.tokenKey, res.token);
        }
      })
    );
  }

  logout(): Observable<any> {
    const authUrl = environment.apiUrl.replace('/api', '') + '/api/auth/logout/';
    // const authUrl = environment.apiUrl  + '/auth/logout/';

    return this.http.post(authUrl, {}).pipe(tap(() => this.clearAuth()));
  }

  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._currentUser.next(null);
  }

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  isLoggedIn(): boolean { return !!this.getToken(); }
  getCurrentUser(): any { return this._currentUser.getValue(); }
  isAdmin(): boolean {
    const u = this.getCurrentUser();
    if (!u) return false;
    // Jika is_staff belum ada di cache lama, refresh dari server sekali
    if (u.is_staff === undefined && this.getToken()) {
      this.refreshCurrentUser();
    }
    return !!u.is_staff;
  }

  refreshCurrentUser(): void {
    const meUrl = environment.apiUrl.replace('/api', '') + '/api/auth/me/';
    this.http.get(meUrl).subscribe({
      next: (user: any) => {
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this._currentUser.next(user);
      }
    });
  }
  private getSavedUser(): any {
    const u = localStorage.getItem(this.userKey);
    return u ? JSON.parse(u) : null;
  }
}
