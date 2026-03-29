import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  template: `
    <div class="page">
      <div class="card">
        <div class="card-header">
          <button class="btn-back" (click)="router.navigate(['/login'])">&#8592; Kembali ke Login</button>
          <h2>Lupa Password</h2>
          <p>Masukkan username atau email akun Anda. Kami akan mengirimkan link reset password.</p>
        </div>

        <ng-container *ngIf="!sent">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Username atau Email</label>
              <input type="text" formControlName="identifier" placeholder="Masukkan username atau email">
            </div>
            <div class="msg msg-error" *ngIf="errorMsg">{{ errorMsg }}</div>
            <button type="submit" class="btn-primary" [disabled]="loading || form.invalid">
              {{ loading ? 'Mengirim...' : 'Kirim Link Reset' }}
            </button>
          </form>
        </ng-container>

        <ng-container *ngIf="sent">
          <div class="msg msg-success">
            <strong>Email terkirim!</strong><br>
            {{ successMsg }}
          </div>
          <button class="btn-primary" (click)="router.navigate(['/login'])">Kembali ke Login</button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #001f5b 0%, #1a237e 60%, #283593 100%); padding: 16px; }
    .card { background:white; border-radius:16px; padding:36px 32px; width:100%; max-width:420px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
    .card-header { margin-bottom: 24px; }
    .card-header h2 { margin: 12px 0 8px; font-size:20px; color:#1a237e; }
    .card-header p { margin:0; font-size:13px; color:#6b7280; line-height:1.5; }
    .btn-back { background:none; border:none; color:#6b7280; cursor:pointer; font-size:13px;
      padding:0; text-decoration:underline; }
    .form-group { margin-bottom:18px; }
    .form-group label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
    .form-group input { width:100%; padding:11px 13px; border:1.5px solid #e5e7eb; border-radius:8px;
      font-size:14px; outline:none; box-sizing:border-box; transition:border-color .2s; }
    .form-group input:focus { border-color:#1a237e; }
    .msg { padding:12px 14px; border-radius:8px; font-size:13px; line-height:1.5; margin-bottom:16px; }
    .msg-error { background:#fef2f2; color:#dc2626; }
    .msg-success { background:#f0fdf4; color:#166534; }
    .btn-primary { width:100%; padding:12px; background:#1a237e; color:white; border:none;
      border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
    .btn-primary:hover:not(:disabled) { background:#283593; }
    .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
  `]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  sent = false;
  errorMsg = '';
  successMsg = '';

  constructor(public router: Router, private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({ identifier: ['', Validators.required] });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/forgot-password/';
    this.http.post(url, { identifier: this.form.value.identifier }).subscribe({
      next: (res: any) => {
        this.successMsg = res.detail;
        this.sent = true;
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail || 'Terjadi kesalahan, coba lagi.';
        this.loading = false;
      }
    });
  }
}
