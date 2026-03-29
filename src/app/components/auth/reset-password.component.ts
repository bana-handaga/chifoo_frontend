import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  template: `
    <div class="page">
      <div class="card">
        <div class="card-header">
          <h2>Reset Password</h2>
        </div>

        <!-- Token tidak ada di URL -->
        <ng-container *ngIf="!token">
          <div class="msg msg-error">Link reset password tidak valid. Silakan minta ulang.</div>
          <button class="btn-primary" (click)="router.navigate(['/forgot-password'])">Minta Link Baru</button>
        </ng-container>

        <!-- Token ada, belum selesai -->
        <ng-container *ngIf="token && !done">
          <p class="hint">Buat password baru untuk akun Anda.</p>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Password Baru</label>
              <input type="password" formControlName="new_password" placeholder="Minimal 8 karakter">
            </div>
            <div class="form-group">
              <label>Konfirmasi Password Baru</label>
              <input type="password" formControlName="confirm_password" placeholder="Ulangi password baru">
            </div>
            <div class="msg msg-error" *ngIf="errorMsg">{{ errorMsg }}</div>
            <button type="submit" class="btn-primary" [disabled]="loading || form.invalid">
              {{ loading ? 'Menyimpan...' : 'Simpan Password Baru' }}
            </button>
          </form>
        </ng-container>

        <!-- Berhasil -->
        <ng-container *ngIf="done">
          <div class="msg msg-success">
            <strong>Password berhasil direset!</strong><br>
            Silakan login dengan password baru Anda.
          </div>
          <button class="btn-primary" (click)="router.navigate(['/login'])">Login Sekarang</button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #001f5b 0%, #1a237e 60%, #283593 100%); padding:16px; }
    .card { background:white; border-radius:16px; padding:36px 32px; width:100%; max-width:420px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
    .card-header h2 { margin:0 0 8px; font-size:20px; color:#1a237e; }
    .hint { font-size:13px; color:#6b7280; margin:0 0 20px; }
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
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  loading = false;
  done = false;
  errorMsg = '';

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] || '';
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { new_password, confirm_password } = this.form.value;
    if (new_password !== confirm_password) {
      this.errorMsg = 'Konfirmasi password tidak cocok.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/reset-password/';
    this.http.post(url, { token: this.token, new_password, confirm_password }).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail || 'Gagal mereset password.';
        this.loading = false;
      }
    });
  }
}
