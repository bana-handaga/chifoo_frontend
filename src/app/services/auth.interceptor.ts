import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  private publicPaths = [
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/auth/forgot-password/',
    '/api/auth/reset-password/',
    '/api/auth/mfa/verify/',
  ];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    const isPublic = this.publicPaths.some(p => req.url.includes(p));
    let headers = req.headers.set('Accept', 'application/json');
    if (token && !isPublic) {
      headers = headers.set('Authorization', `Token ${token}`);
    }
    return next.handle(req.clone({ headers }));
  }
}
