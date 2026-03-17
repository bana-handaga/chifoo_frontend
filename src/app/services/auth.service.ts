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
    // const authUrl = environment.apiUrl.replace('/api', '') + '/api/auth/login/';
    const authUrl = environment.apiUrl + '/auth/login/';
    return this.http.post(authUrl, { username, password }).pipe(
      tap((response: any) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this._currentUser.next(response.user);
      })
    );
  }

  logout(): Observable<any> {
    // const authUrl = environment.apiUrl.replace('/api', '') + '/api/auth/logout/';
    const authUrl = environment.apiUrl  + '/auth/logout/';

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
  private getSavedUser(): any {
    const u = localStorage.getItem(this.userKey);
    return u ? JSON.parse(u) : null;
  }
}
